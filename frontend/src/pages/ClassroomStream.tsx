import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';

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

  // Active view tab (Only 2 tabs now: stream & members)
  const [activeTab, setActiveTab] = useState<'stream' | 'members' | 'settings'>('stream');
  const [membersList, setMembersList] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Unenroll Confirmation State
  const [showUnenrollConfirmModal, setShowUnenrollConfirmModal] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState(false);

  // Assignments state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);

  // Create Assignment Form State (Advanced Settings)
  const [assignQuizId, setAssignQuizId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignPoints, setAssignPoints] = useState(100);
  const [assignMaxAttempts, setAssignMaxAttempts] = useState<number>(1); // 1 = Single Attempt, 0 = Unlimited
  const [assignTimeLimitMinutes, setAssignTimeLimitMinutes] = useState<number>(0);
  const [assignShowAnswers, setAssignShowAnswers] = useState<boolean>(true);
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  // Floating Action Button FAB State
  const [fabOpen, setFabOpen] = useState(false);

  // Analytics Modal State
  const [selectedAnalyticsAssignment, setSelectedAnalyticsAssignment] = useState<any | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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

  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Faculty Classroom Management States
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomMode, setEditRoomMode] = useState('code_only');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [updatingRoom, setUpdatingRoom] = useState(false);

  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);

  const handleOpenEditModal = () => {
    setEditRoomName(room?.name || '');
    setEditRoomMode(room?.status || 'code_only');
    setEditBannerUrl(room?.banner_url || '');
    setShowEditRoomModal(true);
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingRoom(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editRoomName,
          roomMode: editRoomMode,
          bannerUrl: editBannerUrl
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Classroom details updated successfully!');
        setShowEditRoomModal(false);
        fetchStreamData();
      } else {
        alert(json.error?.message || 'Failed to update classroom.');
      }
    } catch {
      alert('Failed to update classroom.');
    } finally {
      setUpdatingRoom(false);
    }
  };

  const handleDeleteRoom = async () => {
    setDeletingRoom(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        alert('Classroom deleted permanently.');
        navigate('/faculty/rooms');
      } else {
        alert(json.error?.message || 'Failed to delete classroom.');
      }
    } catch {
      alert('Failed to delete classroom.');
    } finally {
      setDeletingRoom(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setCurrentUser(JSON.parse(storedUser)); } catch { }
    }
    fetchStreamData();
    fetchFacultyQuizzes();
    fetchMembers();
    fetchAssignments();
    fetchPendingRequests();
  }, [roomId]);

  const fetchStreamData = async () => {
    setLoading(true);
    setErrorMsg('');
    setIsPendingApproval(false);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/feed`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.pending) {
        setIsPendingApproval(true);
        setErrorMsg(json.error?.message || 'Your join request for this classroom is pending faculty approval.');
      } else if (json.success && json.data) {
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

  const fetchPendingRequests = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/requests`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPendingRequests(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        fetchPendingRequests();
        fetchMembers();
      }
    } catch {
      alert('Failed to approve request.');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        fetchPendingRequests();
      }
    } catch {
      alert('Failed to reject request.');
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

  const fetchAssignments = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/assignments`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAssignments(json.data);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    }
  };

  const handleLeaveRoomConfirm = async () => {
    setLeavingRoom(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success) {
        setShowUnenrollConfirmModal(false);
        navigate('/student/rooms');
      } else {
        alert(json.error?.message || 'Failed to unenroll from classroom.');
      }
    } catch {
      alert('Failed to unenroll from classroom.');
    } finally {
      setLeavingRoom(false);
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
        if (json.data.length > 0) {
          setAssignQuizId(json.data[0].id);
          setAssignTitle(`Assignment: ${json.data[0].title}`);
          setAssignPoints(json.data[0].total_points || 100);
        }
      }
    } catch { }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignQuizId || !assignTitle.trim()) {
      alert('Please select a quiz and enter an assignment title.');
      return;
    }

    setCreatingAssignment(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quizId: assignQuizId,
          title: assignTitle.trim(),
          instructions: assignInstructions.trim(),
          dueDate: assignDueDate || undefined,
          totalPoints: Number(assignPoints) || 100,
          maxAttempts: Number(assignMaxAttempts),
          timeLimitMinutes: Number(assignTimeLimitMinutes) || undefined,
          showAnswers: assignShowAnswers
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowCreateAssignmentModal(false);
        setAssignInstructions('');
        fetchAssignments();
        fetchStreamData();
      } else {
        alert(json.error?.message || 'Failed to create assignment.');
      }
    } catch {
      alert('Failed to create classroom assignment.');
    } finally {
      setCreatingAssignment(false);
    }
  };

  const openAnalyticsModal = async (assignment: any) => {
    setSelectedAnalyticsAssignment(assignment);
    setAnalyticsLoading(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${roomId}/assignments/${assignment.id}/analytics`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAnalyticsData(json.data);
      }
    } catch (err) {
      console.error('Failed to load assignment analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
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
        body: JSON.stringify({ text: text.trim() })
      });
      const json = await res.json();
      if (json.success) {
        setCommentText(prev => ({ ...prev, [postId]: '' }));
        fetchStreamData();
      }
    } catch {
      alert('Failed to add comment.');
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-on-surface-variant font-bold text-headline-sm animate-pulse">
          Opening classroom stream…
        </div>
      </DashboardLayout>
    );
  }

  if (errorMsg || !room) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-3xl p-8 text-center max-w-xl mx-auto my-12 shadow">
          <span className="material-symbols-outlined text-4xl mb-2">error</span>
          <h3 className="text-headline-sm font-bold mb-1">Classroom Access Error</h3>
          <p className="text-xs mb-6">{errorMsg || 'Classroom not found.'}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow hover:bg-primary/90 transition"
          >
            Return to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (isPendingApproval) {
    return (
      <DashboardLayout>
        <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-3xl p-8 text-center max-w-xl mx-auto my-16 shadow-lg flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">hourglass_top</span>
          </div>
          <div>
            <h3 className="text-headline-sm font-black text-amber-950">Join Request Pending Approval</h3>
            <p className="text-xs text-amber-800 leading-relaxed mt-1">
              Your request to join this classroom has been submitted. The course instructor must approve your request before you can access the stream feed, assignments, and announcements.
            </p>
          </div>
          <button
            onClick={() => navigate('/student/rooms')}
            className="bg-amber-600 text-white font-black px-6 py-3 rounded-xl text-xs shadow hover:bg-amber-700 transition active:scale-95"
          >
            Return to Classrooms Explorer
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const classroomBanner = room.banner_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop';

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto relative pb-28">

        {/* HERO CLASSROOM COVER BANNER */}
        <div className="h-56 sm:h-64 w-full rounded-3xl overflow-hidden relative shadow-lg group">
          <img src={classroomBanner} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

          <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 right-6 z-10 text-white flex flex-col justify-end gap-2">
            <span className="bg-white/20 backdrop-blur-md text-white font-extrabold text-[10px] px-3.5 py-1 rounded-full uppercase tracking-wider w-fit">
              Classroom Stream
            </span>
            <h1 className="text-headline-lg sm:text-[36px] font-black leading-tight drop-shadow">{room.name}</h1>
            <div className="flex items-center gap-3 text-xs font-semibold text-white/90 flex-wrap">
              <span>Instructor: <strong className="text-white">{room.creator?.display_name || 'Faculty'}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Room Code: <strong className="font-mono bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded text-white">{room.room_code}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs (Stream, Members & Settings) */}
        <div className="flex border-b border-outline-variant bg-white rounded-2xl p-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab('stream')}
            className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 ${activeTab === 'stream'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:text-primary'
              }`}
          >
            <span className="material-symbols-outlined text-base">forum</span>
            Class Stream ({posts.length + assignments.length})
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 relative ${activeTab === 'members'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:text-primary'
              }`}
          >
            <span className="material-symbols-outlined text-base">group</span>
            Members ({membersList.length})
            {isFaculty && pendingRequests.length > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce">
                {pendingRequests.length} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 ${activeTab === 'settings'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:text-primary'
              }`}
          >
            <span className="material-symbols-outlined text-base">settings</span>
            Settings &amp; Options
          </button>
        </div>

        {/* ── TAB 1: INTEGRATED STREAM & CHAT FEED ── */}
        {activeTab === 'stream' && (
          <div className="flex flex-col gap-6">

            {/* Inline Announcement / Post Form (Faculty Only) */}
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
                      className="text-slate-400 hover:text-slate-600 font-bold"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Share an announcement, message, or update with your class…"
                    className="w-full border border-outline rounded-xl p-4 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none bg-slate-50"
                  />

                  {availableQuizzes.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-primary">extension</span>
                        Attach Quiz to Stream (Optional)
                      </label>
                      <select
                        value={selectedQuizId}
                        onChange={(e) => setSelectedQuizId(e.target.value)}
                        className="w-full border border-outline rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:ring-2 focus:ring-primary"
                      >
                        <option value="">-- No Quiz Attached --</option>
                        {availableQuizzes.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title} ({q.question_count || q.questions?.length || 0} Questions)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsPostExpanded(false)}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={posting}
                      className="bg-primary text-white font-bold px-6 py-2 rounded-xl hover:bg-primary/90 transition text-xs shadow flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">send</span>
                      {posting ? 'Publishing…' : 'Post Announcement'}
                    </button>
                  </div>
                </form>
              )
            )}

            {/* Assignments & Announcements Integrated Stream List */}
            {assignments.length === 0 && posts.length === 0 ? (
              <div className="bg-white border border-outline-variant rounded-2xl p-12 text-center text-on-surface-variant text-xs shadow-sm flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl text-slate-300">chat_bubble_outline</span>
                <p className="font-semibold">No posts or classwork in this stream feed yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">

                {/* Render Classwork / Assignments Cards directly in Stream Feed */}
                {assignments.map((assignment) => {
                  const isSubmitted = Boolean(assignment.userSubmission);
                  const sub = assignment.userSubmission;

                  return (
                    <div key={`assign-feed-${assignment.id}`} className="bg-gradient-to-r from-violet-50/70 to-purple-50/30 border-2 border-violet-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4 relative">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md flex-shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-xl">assignment</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-violet-600 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider">
                                Classwork Assignment
                              </span>
                              <span className="bg-amber-100 text-amber-900 text-[9px] font-extrabold px-2.5 py-0.5 rounded">
                                {assignment.maxAttempts === 1 ? 'Single Attempt' : 'Multiple Attempts'}
                              </span>
                              {assignment.dueDate && (
                                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">event</span>
                                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <h4 className="text-headline-sm font-extrabold text-on-surface mt-1">{assignment.title}</h4>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              Quiz: <strong className="text-on-surface">{assignment.quiz?.title}</strong> ({assignment.quiz?.question_count || 0} Questions • {assignment.totalPoints} Marks)
                            </p>
                            {assignment.instructions && (
                              <p className="text-xs text-slate-700 italic mt-2 bg-white/80 p-3 rounded-xl border border-violet-100">{assignment.instructions}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isFaculty ? (
                            <button
                              onClick={() => openAnalyticsModal(assignment)}
                              className="bg-violet-700 text-white hover:bg-violet-800 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
                            >
                              <span className="material-symbols-outlined text-sm">analytics</span>
                              Marks Analytics
                            </button>
                          ) : (
                            isSubmitted ? (
                              <div className="bg-green-100 text-green-900 font-extrabold px-4 py-2 rounded-xl text-xs flex flex-col items-end border border-green-300">
                                <span className="flex items-center gap-1 text-[10px] uppercase">
                                  <span className="material-symbols-outlined text-xs">check_circle</span> Turned In
                                </span>
                                <span>Score: {sub.score} / {assignment.totalPoints} ({sub.percentage}%)</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => navigate(`/student/quiz/${assignment.quizId}?assignmentId=${assignment.id}&roomId=${assignment.roomId || roomId}`, { state: { assignmentId: assignment.id, roomId: assignment.roomId || roomId } })}
                                className="bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-violet-700 transition shadow flex items-center gap-1 active:scale-95"
                              >
                                <span className="material-symbols-outlined text-xs">play_arrow</span>
                                Take Assignment
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Render Stream Posts & Announcements */}
                {posts.map((post) => (
                  <div key={post.id} className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center shadow">
                        {post.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-body-md font-bold text-on-surface">{post.authorName}</h4>
                          <span className="bg-tertiary-container text-on-tertiary-container text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
                            {post.authorRole}
                          </span>
                        </div>
                        <span className="text-[11px] text-on-surface-variant">
                          {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {post.content && (
                      <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap pl-1">{post.content}</p>
                    )}

                    {post.attachedQuiz && (
                      <div className="bg-surface-container-low border border-primary/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                          {post.attachedQuiz.coverImageUrl ? (
                            <img src={post.attachedQuiz.coverImageUrl} alt="Cover" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <span className="material-symbols-outlined text-xl">quiz</span>
                            </div>
                          )}
                          <div>
                            <span className="bg-secondary-container text-on-secondary-container text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                              Attached Quiz
                            </span>
                            <h5 className="text-body-md font-bold text-on-surface mt-0.5">{post.attachedQuiz.title}</h5>
                            <p className="text-[11px] text-on-surface-variant">
                              {post.attachedQuiz.questionCount} Questions • Difficulty: <span className="capitalize font-semibold">{post.attachedQuiz.difficulty}</span>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/student/quiz/${post.attachedQuiz!.id}`)}
                          className="w-full sm:w-auto bg-primary text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-primary/90 transition shadow flex items-center justify-center gap-1 active:scale-95"
                        >
                          <span className="material-symbols-outlined text-xs">play_arrow</span>
                          Take Quiz Now
                        </button>
                      </div>
                    )}

                    <div className="border-t border-outline-variant/60 pt-4 flex flex-col gap-3">
                      {post.comments && post.comments.length > 0 && (
                        <div className="flex flex-col gap-2.5 pl-2">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="bg-slate-50 rounded-xl p-3 text-xs flex flex-col gap-1 border border-slate-100">
                              <div className="flex justify-between items-center">
                                <strong className="text-on-surface font-bold">{comment.authorName}</strong>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-on-surface-variant">{comment.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={commentText[post.id] || ''}
                          onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(post.id); }}
                          placeholder="Add a class comment…"
                          className="w-full border border-outline rounded-xl px-3.5 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="bg-primary text-white font-bold px-3.5 py-2 rounded-xl text-xs hover:bg-primary/90 transition active:scale-95 flex-shrink-0"
                        >
                          Reply
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: MEMBERS ── */}
        {activeTab === 'members' && (
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">Classroom Members</h3>
                <p className="text-xs text-on-surface-variant">Enrolled students and instructors in this classroom.</p>
              </div>
              <span className="bg-primary/10 text-primary font-bold text-xs px-3 py-1 rounded-full">
                {membersList.length} Members
              </span>
            </div>

            {/* FACULTY PENDING JOIN REQUESTS SECTION */}
            {isFaculty && pendingRequests.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-amber-200 pb-3">
                  <h4 className="text-body-lg font-black text-amber-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600">notifications_active</span>
                    Pending Student Join Requests ({pendingRequests.length})
                  </h4>
                  <span className="text-[11px] font-bold text-amber-700">Approval Required Mode</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="bg-white border border-amber-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                          {req.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{req.name}</h5>
                          <p className="text-[10px] text-slate-500">{req.email}</p>
                          <span className="text-[9px] text-amber-600 font-medium">Requested {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleApproveRequest(req.id)}
                          className="bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-sm transition"
                        >
                          Approve ✓
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition"
                        >
                          Reject ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {membersLoading ? (
              <div className="p-8 text-center text-on-surface-variant font-bold animate-pulse">
                Loading members list…
              </div>
            ) : membersList.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant text-xs">
                No students enrolled yet.
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/60">
                {membersList.map((member) => (
                  <div key={member.id} className="py-3.5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shadow-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-body-md font-bold text-on-surface">{member.name}</h4>
                        <p className="text-[11px] text-on-surface-variant">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 hidden sm:inline">
                        Enrolled {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                      {isFaculty && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition"
                          title="Remove student from class"
                        >
                          <span className="material-symbols-outlined text-base">person_remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: CLASSROOM SETTINGS & OPTIONS ── */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
            <div className="border-b border-outline-variant/60 pb-4">
              <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">settings</span>
                Classroom Settings &amp; Preferences
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Manage your classroom membership, view course information, and configure options.
              </p>
            </div>

            {/* Course Overview Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Classroom Code</span>
                <div className="text-lg font-mono font-black text-slate-900 flex items-center gap-2 mt-0.5">
                  <span>{room?.room_code}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(room?.room_code || '');
                      alert('Classroom code copied to clipboard!');
                    }}
                    className="text-xs text-primary font-sans hover:underline font-bold"
                  >
                    Copy Code
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Instructor: <strong>{room?.creator?.display_name || 'Faculty'}</strong></p>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-xl">
                  {membersList.length} Enrolled Students
                </span>
              </div>
            </div>

            {/* FACULTY MANAGEMENT CONTROLS */}
            {isFaculty && (
              <div className="border-t border-slate-200 pt-6 flex flex-col gap-5">
                <h4 className="text-body-md font-black text-slate-900 uppercase tracking-wider text-[11px]">
                  Instructor Administration Controls
                </h4>

                {/* Edit Details Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">edit</span>
                      Edit Course Details &amp; Access Policy
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Update classroom title, cover banner URL, and change access policy mode.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenEditModal}
                    className="bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow hover:bg-primary/90 transition flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-sm">tune</span>
                    Edit Course
                  </button>
                </div>



                {/* Delete Course Card */}
                <div className="bg-red-50/70 border border-red-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h5 className="text-xs font-extrabold text-red-950 flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-600 text-base">delete_forever</span>
                      Delete Classroom Permanently
                    </h5>
                    <p className="text-[11px] text-red-800 mt-1">
                      Permanently delete classroom, stream posts, assignments, and student grades.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteRoomModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow transition flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete Classroom
                  </button>
                </div>

              </div>
            )}

            {/* Unenrollment Action for Students */}
            {!isFaculty && (
              <div className="border-t border-red-100 pt-6 flex flex-col gap-3">
                <h4 className="text-body-md font-extrabold text-red-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600">warning</span>
                  Unenrollment Zone
                </h4>
                <p className="text-xs text-slate-600">
                  Unenrolling will remove you from this classroom stream. You will lose access to stream announcements, assignments, and classroom marks.
                </p>

                <button
                  onClick={() => setShowUnenrollConfirmModal(true)}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold px-6 py-3 rounded-2xl text-xs transition w-fit flex items-center gap-2 shadow-sm active:scale-95 mt-1"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Unenroll / Leave Classroom
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── FLOATING ACTION BUTTON (FAB +) POSITIONED HIGH ABOVE MOBILE NAV ── */}
        {isFaculty && (
          <div className="fixed bottom-[85px] lg:bottom-8 right-5 lg:right-8 z-[9999] flex flex-col items-end gap-3 group">
            {/* Expanded FAB Menu Items */}
            <div className={`flex flex-col items-end gap-2.5 transition-all duration-300 ${fabOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
              }`}>
              <button
                onClick={() => { setFabOpen(false); setShowCreateAssignmentModal(true); }}
                className="bg-violet-600 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-xl hover:bg-violet-700 transition flex items-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">assignment</span>
                Add Assignment
              </button>

              <button
                onClick={() => { setFabOpen(false); setIsPostExpanded(true); setActiveTab('stream'); }}
                className="bg-primary text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-xl hover:bg-primary/90 transition flex items-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">campaign</span>
                Post Announcement
              </button>
            </div>

            {/* Main Primary FAB Trigger Button */}
            <button
              onClick={() => setFabOpen(!fabOpen)}
              onMouseEnter={() => setFabOpen(true)}
              className="w-14 h-14 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group-hover:rotate-45"
              title="Quick Create Menu"
            >
              <span className="material-symbols-outlined text-3xl">add</span>
            </button>
          </div>
        )}

      </div>

      {/* CREATE ASSIGNMENT MODAL WITH SINGLE ATTEMPT & TIMER OPTIONS */}
      {showCreateAssignmentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateAssignment} className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-5 animate-scale max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">assignment</span>
                Create Classroom Assignment
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateAssignmentModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Select Quiz *</label>
              <select
                value={assignQuizId}
                onChange={(e) => {
                  setAssignQuizId(e.target.value);
                  const selected = availableQuizzes.find(q => q.id === e.target.value);
                  if (selected) {
                    setAssignTitle(`Assignment: ${selected.title}`);
                    setAssignPoints(selected.total_points || 100);
                  }
                }}
                className="w-full border border-outline rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:ring-2 focus:ring-primary"
              >
                {availableQuizzes.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.title} ({q.question_count || 0} Questions)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Assignment Title *</label>
              <input
                type="text"
                required
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                className="w-full border border-outline rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary"
                placeholder="e.g. Midterm Quiz Assignment"
              />
            </div>

            {/* ATTEMPT LIMIT & TIMER OPTIONS */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
              <span className="text-[11px] font-extrabold uppercase text-primary tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">tune</span> Assignment Rules &amp; Restrictions
              </span>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Attempt Policy</label>
                  <select
                    value={assignMaxAttempts}
                    onChange={(e) => setAssignMaxAttempts(Number(e.target.value))}
                    className="w-full border border-outline rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:ring-2 focus:ring-primary"
                  >
                    <option value={1}>Single Attempt (1)</option>
                    <option value={2}>2 Attempts</option>
                    <option value={3}>3 Attempts</option>
                    <option value={0}>Unlimited Attempts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Timer Limit</label>
                  <select
                    value={assignTimeLimitMinutes}
                    onChange={(e) => setAssignTimeLimitMinutes(Number(e.target.value))}
                    className="w-full border border-outline rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:ring-2 focus:ring-primary"
                  >
                    <option value={0}>No Overall Timer</option>
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="showAnswersCheck"
                  checked={assignShowAnswers}
                  onChange={(e) => setAssignShowAnswers(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="showAnswersCheck" className="text-xs font-bold text-on-surface cursor-pointer">
                  Show correct answer key to students after submission
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Due Date</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full border border-outline rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Total Points</label>
                <input
                  type="number"
                  value={assignPoints}
                  onChange={(e) => setAssignPoints(Number(e.target.value))}
                  className="w-full border border-outline rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Instructions / Notes</label>
              <textarea
                rows={2}
                value={assignInstructions}
                onChange={(e) => setAssignInstructions(e.target.value)}
                className="w-full border border-outline rounded-xl px-3 py-2 text-xs font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary"
                placeholder="Enter instructions for your students..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateAssignmentModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingAssignment}
                className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition text-xs shadow flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                {creatingAssignment ? 'Publishing…' : 'Publish Assignment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FACULTY MARKS ANALYTICS MODAL */}
      {selectedAnalyticsAssignment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <div>
                <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
                  Marks Analytics Report
                </span>
                <h3 className="text-headline-sm font-extrabold text-on-surface mt-1">
                  {selectedAnalyticsAssignment.title}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedAnalyticsAssignment(null); setAnalyticsData(null); }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {analyticsLoading || !analyticsData ? (
              <div className="p-12 text-center text-on-surface-variant font-bold animate-pulse">
                Generating student marks analytics…
              </div>
            ) : (
              <div className="flex flex-col gap-6">

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">Total Enrolled</span>
                    <h4 className="text-2xl font-black text-slate-800 mt-1">{analyticsData.stats.totalAssigned}</h4>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                    <span className="text-[10px] font-extrabold uppercase text-green-700">Turned In</span>
                    <h4 className="text-2xl font-black text-green-800 mt-1">{analyticsData.stats.turnedInCount}</h4>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                    <span className="text-[10px] font-extrabold uppercase text-amber-700">Missing</span>
                    <h4 className="text-2xl font-black text-amber-800 mt-1">{analyticsData.stats.missingCount}</h4>
                  </div>
                  <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-center">
                    <span className="text-[10px] font-extrabold uppercase text-sky-700">Class Average</span>
                    <h4 className="text-2xl font-black text-sky-800 mt-1">{analyticsData.stats.avgScore} pts</h4>
                  </div>
                </div>

                {analyticsData.studentReport.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-slate-400">group_off</span>
                    <p className="font-bold text-on-surface">No students enrolled or submitted yet.</p>
                    <p>Students can join this classroom using the access code: <strong className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{room?.room_code}</strong></p>
                  </div>
                ) : (
                  <div className="border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-outline-variant text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                          <th className="p-3.5">Student Name &amp; Email</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Score / Marks</th>
                          <th className="p-3.5">Percentage</th>
                          <th className="p-3.5">Time Taken</th>
                          <th className="p-3.5">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60 text-xs font-medium">
                        {analyticsData.studentReport.map((row: any) => (
                          <tr key={row.studentId} className="hover:bg-slate-50 transition">
                            <td className="p-3.5">
                              <strong className="text-on-surface block font-bold">{row.studentName}</strong>
                              <span className="text-[11px] text-slate-400">{row.studentEmail}</span>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${row.status === 'Turned In' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-on-surface">
                              {row.score} / {row.totalPoints}
                            </td>
                            <td className="p-3.5 font-bold">
                              <span className={row.percentage >= 70 ? 'text-green-700' : 'text-amber-700'}>
                                {row.percentage}%
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-slate-600">
                              {row.timeTakenSeconds ? `${Math.floor(row.timeTakenSeconds / 60)}m ${row.timeTakenSeconds % 60}s` : 'N/A'}
                            </td>
                            <td className="p-3.5 text-slate-500">
                              {row.submittedAt ? new Date(row.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}
      {/* EDIT CLASSROOM DETAILS & POLICY MODAL */}
      {showEditRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleUpdateRoom} className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-5 animate-scale">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit</span>
                Edit Course Details &amp; Access Policy
              </h3>
              <button
                type="button"
                onClick={() => setShowEditRoomModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Classroom Title / Name *</label>
              <input
                type="text"
                required
                value={editRoomName}
                onChange={(e) => setEditRoomName(e.target.value)}
                className="w-full border border-outline rounded-xl px-4 py-3 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary"
                placeholder="e.g. CS101 — Data Structures & Algorithms"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Access Mode &amp; Policy *</label>
              <select
                value={editRoomMode}
                onChange={(e) => setEditRoomMode(e.target.value)}
                className="w-full border border-outline rounded-xl px-4 py-3 text-xs font-semibold bg-white focus:ring-2 focus:ring-primary"
              >
                <option value="code_only">🔑 Join Only with 6-Digit Code (Hidden from Public Directory)</option>
                <option value="public">🌐 Public to Everyone (Listed in Explore Directory)</option>
                <option value="org_only">🏛️ Organization Members Only (Listed in Directory)</option>
                <option value="approval_required">🛡️ Request Access with Faculty Approval (Listed in Directory)</option>
                <option value="archived">📦 Archived Course (Read-only — Hidden from Directory)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Cover Banner Image URL</label>
              <input
                type="url"
                value={editBannerUrl}
                onChange={(e) => setEditBannerUrl(e.target.value)}
                className="w-full border border-outline rounded-xl px-4 py-3 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary"
                placeholder="https://images.unsplash.com/photo-..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditRoomModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingRoom}
                className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition text-xs shadow flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {updatingRoom ? 'Saving Changes…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}



      {/* DELETE ROOM 2-STEP CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={showDeleteRoomModal}
        title={`Delete Classroom "${room?.name || 'Classroom'}"?`}
        message="This action is PERMANENT. All stream posts, classroom assignments, attached quizzes, and student grade records will be deleted forever."
        confirmText={deletingRoom ? 'Deleting Classroom…' : 'Delete Classroom Permanently'}
        requireTextMatch={room?.room_code}
        onConfirm={handleDeleteRoom}
        onClose={() => setShowDeleteRoomModal(false)}
      />

      {/* 2-Step Verification Confirmation Modal for Unenrollment */}
      <ConfirmationModal
        isOpen={showUnenrollConfirmModal}
        title={`Unenroll from "${room?.name || 'Classroom'}"?`}
        message="You are about to leave this classroom. You will lose access to stream posts, assignments, and grades."
        confirmText={leavingRoom ? 'Unenrolling…' : 'Unenroll Now'}
        requireTextMatch={room?.room_code}
        onConfirm={handleLeaveRoomConfirm}
        onClose={() => setShowUnenrollConfirmModal(false)}
      />

    </DashboardLayout>
  );
}
