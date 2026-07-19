import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.tsx';

interface RoomPost {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
  attachedQuiz?: {
    id: string;
    title: string;
    questionCount: number;
    difficulty: string;
    coverImageUrl?: string;
  };
  comments: Array<{
    id: string;
    authorName: string;
    text: string;
    createdAt: string;
  }>;
}

export default function ClassroomStream() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<any | null>(null);
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Active view tab
  const [activeTab, setActiveTab] = useState<'stream' | 'members'>('stream');

  // Members state
  const [membersList, setMembersList] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // User state
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const isFaculty = currentUser?.role === 'faculty' || currentUser?.role === 'super_admin' || currentUser?.role === 'organization_admin';

  // Post form state
  const [isPostExpanded, setIsPostExpanded] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [posting, setPosting] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setCurrentUser(JSON.parse(storedUser)); } catch {}
    }
    fetchStreamData();
    fetchFacultyQuizzes();
    fetchMembers();
  }, [roomId]);

  const fetchStreamData = async () => {
    setLoading(true);
    setErrorMsg('');
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/feed`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data) {
        setRoom(json.data.room);
        setPosts(json.data.posts || []);
      } else {
        setErrorMsg(json.error?.message || 'Failed to load classroom stream.');
      }
    } catch {
      setErrorMsg('Failed to connect to classroom service.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    setMembersLoading(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/members`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMembersList(json.data);
      }
    } catch (err) {
      console.error('Failed to load room members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this student from the classroom?')) return;
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/members/${memberId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success) {
        fetchMembers();
      } else {
        alert(json.error?.message || 'Failed to remove member.');
      }
    } catch {
      alert('Failed to remove member from classroom.');
    }
  };

  const fetchFacultyQuizzes = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const res = await fetch('/api/quizzes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setAvailableQuizzes(json.data);
      }
    } catch {}
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && !selectedQuizId) {
      alert('Please enter an announcement or select a quiz to attach.');
      return;
    }

    setPosting(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: postContent.trim(),
          quizId: selectedQuizId || undefined
        })
      });
      const json = await res.json();
      if (json.success) {
        setPostContent('');
        setSelectedQuizId('');
        setIsPostExpanded(false);
        fetchStreamData();
      } else {
        alert(json.error?.message || 'Failed to post announcement.');
      }
    } catch {
      alert('Failed to post to classroom stream.');
    } finally {
      setPosting(false);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentText[postId];
    if (!text || !text.trim()) return;

    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/feed/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });
      const json = await res.json();
      if (json.success) {
        setCommentText(prev => ({ ...prev, [postId]: '' }));
        fetchStreamData();
      }
    } catch {
      alert('Failed to post comment.');
    }
  };

  const activeRole = isFaculty ? 'faculty' : 'student';

  if (loading) {
    return (
      <DashboardLayout role={activeRole}>
        <div className="p-12 text-center text-primary font-bold text-headline-sm animate-pulse">
          Loading Classroom Stream…
        </div>
      </DashboardLayout>
    );
  }

  if (errorMsg || !room) {
    return (
      <DashboardLayout role={activeRole}>
        <div className="p-12 text-center bg-red-50 border border-red-200 text-red-700 rounded-2xl max-w-md mx-auto">
          <p className="font-bold">{errorMsg || 'Classroom not found.'}</p>
          <button
            onClick={() => navigate(isFaculty ? '/faculty/rooms' : '/student/dashboard')}
            className="mt-4 bg-red-600 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow"
          >
            Back to Classrooms
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={activeRole}>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        
        {/* Navigation Back Header */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(isFaculty ? '/faculty/rooms' : '/student/dashboard')}
            className="text-xs font-bold text-on-surface-variant hover:text-primary transition flex items-center gap-1 border border-outline rounded-xl px-4 py-2 bg-white"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to {isFaculty ? 'Classrooms Workspace' : 'Student Dashboard'}
          </button>

          <button
            onClick={() => { fetchStreamData(); fetchMembers(); }}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-xs">refresh</span>
            Refresh
          </button>
        </div>

        {/* Classroom Header Banner */}
        <div className="bg-gradient-to-r from-primary to-primary-container text-white p-8 md:p-10 rounded-3xl shadow-lg flex flex-col justify-between gap-4 relative overflow-hidden">
          <div className="z-10">
            <span className="bg-white/20 text-white font-extrabold text-[10px] px-3.5 py-1 rounded-full uppercase tracking-wider">
              Classroom Stream
            </span>
            <h1 className="text-headline-lg md:text-[36px] font-black leading-tight mt-2">{room.name}</h1>
            <p className="text-xs text-white/90 mt-2 flex items-center gap-3">
              <span>Instructor: <strong className="text-white">{room.creator?.display_name || 'Faculty'}</strong></span>
              <span>•</span>
              <span>Room Code: <strong className="font-mono bg-white/20 px-2 py-0.5 rounded text-white">{room.room_code}</strong></span>
            </p>
          </div>
        </div>

        {/* Classroom Section Navigation Tabs */}
        <div className="flex border-b border-outline-variant bg-white rounded-2xl p-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab('stream')}
            className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'stream'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">forum</span>
            Classroom Stream ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'members'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">group</span>
            Class Members &amp; People ({membersList.length})
          </button>
        </div>

        {/* ── TAB 1: STREAM ── */}
        {activeTab === 'stream' && (
          <div className="flex flex-col gap-6">
            
            {/* Post Announcement Form (Faculty Only) */}
            {isFaculty && (
              !isPostExpanded ? (
                <div
                  onClick={() => setIsPostExpanded(true)}
                  className="bg-white border border-outline-variant hover:border-primary hover:shadow-md rounded-2xl p-5 cursor-pointer transition flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                      <span className="material-symbols-outlined text-lg">campaign</span>
                    </div>
                    <span className="text-body-md font-semibold text-on-surface-variant group-hover:text-on-surface transition">
                      Announce something to your class…
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition">
                    expand_more
                  </span>
                </div>
              ) : (
                <form onSubmit={handleCreatePost} className="bg-white border-2 border-primary rounded-2xl p-6 flex flex-col gap-4 shadow-lg animate-fade-in">
                  <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3">
                    <h3 className="text-label-md font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">campaign</span>
                      Announce Something to Your Class
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsPostExpanded(false)}
                      className="text-on-surface-variant hover:text-slate-700 text-xs font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">expand_less</span>
                      Collapse
                    </button>
                  </div>

                  <textarea
                    className="w-full border border-outline rounded-xl p-4 text-label-md font-medium focus:ring-2 focus:ring-primary focus:outline-none bg-slate-50 h-28"
                    placeholder="Share an announcement, assignment update, or message with your students…"
                    value={postContent}
                    onChange={e => setPostContent(e.target.value)}
                    autoFocus
                  />

                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-t border-outline-variant/60 pt-3">
                    <div className="flex items-center gap-2 flex-grow max-w-md">
                      <span className="material-symbols-outlined text-on-surface-variant text-sm">quiz</span>
                      <select
                        className="w-full border border-outline rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        value={selectedQuizId}
                        onChange={e => setSelectedQuizId(e.target.value)}
                      >
                        <option value="">-- Attach Quiz to Post (Optional) --</option>
                        {availableQuizzes.map(q => (
                          <option key={q.id} value={q.id}>
                            [{q.difficulty.toUpperCase()}] {q.title} ({q.question_count || q.questions?.length || 0} Qs)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsPostExpanded(false)}
                        className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-200 transition text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={posting}
                        className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition shadow text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm">send</span>
                        {posting ? 'Posting…' : 'Post Announcement'}
                      </button>
                    </div>
                  </div>
                </form>
              )
            )}

            {/* Stream Timeline */}
            <div className="flex flex-col gap-6">
              <h3 className="text-headline-sm font-bold text-on-surface">Class Feed ({posts.length})</h3>

              {posts.length === 0 ? (
                <div className="p-10 text-center text-on-surface-variant text-xs bg-white rounded-2xl border border-slate-200">
                  No announcements or assigned quizzes posted in this classroom stream yet.
                </div>
              ) : (
                posts.map(post => (
                  <div key={post.id} className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                    
                    {/* Post Author Header */}
                    <div className="flex items-center gap-3 border-b border-outline-variant/60 pb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                        {post.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-label-md font-bold text-on-surface">{post.authorName}</h4>
                          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded">{post.authorRole}</span>
                        </div>
                        <span className="text-[10px] text-on-surface-variant">{new Date(post.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Post Body Content */}
                    {post.content && (
                      <p className="text-body-md text-on-surface font-medium whitespace-pre-line leading-relaxed">{post.content}</p>
                    )}

                    {/* Attached Quiz Card */}
                    {post.attachedQuiz && (
                      <div className="bg-surface-container-lowest border-2 border-primary/40 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                          {post.attachedQuiz.coverImageUrl ? (
                            <img src={post.attachedQuiz.coverImageUrl} alt="Quiz Cover" className="w-16 h-16 rounded-xl object-cover border border-outline-variant flex-shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-2xl">quiz</span>
                            </div>
                          )}
                          <div>
                            <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              {post.attachedQuiz.difficulty}
                            </span>
                            <h4 className="text-headline-sm font-bold text-on-surface mt-1">{post.attachedQuiz.title}</h4>
                            <p className="text-xs text-on-surface-variant">{post.attachedQuiz.questionCount} Questions</p>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/student/quiz/${post.attachedQuiz!.id}`)}
                          className="bg-primary text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-primary/90 transition shadow flex items-center gap-1 whitespace-nowrap active:scale-95"
                        >
                          <span className="material-symbols-outlined text-xs">play_arrow</span>
                          Take Quiz
                        </button>
                      </div>
                    )}

                    {/* Class Comments & Replies */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 mt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Class Comments ({post.comments?.length || 0})</span>

                      {post.comments && post.comments.map(c => (
                        <div key={c.id} className="bg-white border border-slate-200 p-3 rounded-lg text-xs flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <strong className="text-primary">{c.authorName}</strong>
                            <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-slate-700">{c.text}</p>
                        </div>
                      ))}

                      {/* Comment Input */}
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          className="w-full border border-outline rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Add a class comment…"
                          value={commentText[post.id] || ''}
                          onChange={e => setCommentText({ ...commentText, [post.id]: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddComment(post.id); }}
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-xl hover:bg-primary/90 transition flex-shrink-0"
                        >
                          Comment
                        </button>
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* ── TAB 2: MEMBERS & PEOPLE MANAGEMENT ── */}
        {activeTab === 'members' && (
          <div className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <div>
                <h3 className="text-headline-sm font-extrabold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">groups</span>
                  Classroom Members ({membersList.length})
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Students enrolled in this classroom stream.
                </p>
              </div>

              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                Code: {room.room_code}
              </span>
            </div>

            {membersLoading ? (
              <div className="p-8 text-center text-on-surface-variant font-medium">Loading classroom members…</div>
            ) : membersList.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant text-xs bg-slate-50 rounded-2xl border border-slate-200">
                No students enrolled in this classroom yet. Share the 6-digit access code <strong>[{room.room_code}]</strong> with your students to let them join!
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {membersList.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100/80 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-on-surface block">{member.name}</strong>
                        <span className="text-[10px] text-on-surface-variant">{member.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 hidden sm:inline">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </span>

                      {isFaculty && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-xl border border-red-200 transition flex items-center gap-1"
                          title="Remove student from classroom"
                        >
                          <span className="material-symbols-outlined text-sm">person_remove</span>
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
