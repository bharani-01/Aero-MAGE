import { useState, useEffect } from 'react';

interface QuizShareModalProps {
  quiz: {
    id: string;
    title: string;
    question_count?: number;
    questions?: any[];
    difficulty: string;
    cover_image_url?: string;
  } | null;
  onClose: () => void;
}

export default function QuizShareModal({ quiz, onClose }: QuizShareModalProps) {
  const [facultyRooms, setFacultyRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState('');
  const [publishError, setPublishError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [shortUrl, setShortUrl] = useState<string>('');
  const [marketplacePublishing, setMarketplacePublishing] = useState(false);
  const [marketplaceSuccess, setMarketplaceSuccess] = useState('');

  const quizId = quiz?.id;
  const quizTitle = quiz?.title;
  const fullQuizUrl = quizId ? `${window.location.origin}/student/quiz/${quizId}` : '';
  const displayUrl = shortUrl || fullQuizUrl;
  const questionCount = quiz?.question_count ?? quiz?.questions?.length ?? 0;

  useEffect(() => {
    if (!quizId) return;
    setCustomMessage(`Check out this quiz: ${quizTitle}`);
    fetchFacultyRooms();
    fetchOrCreateShortUrl();
  }, [quizId, quizTitle]);

  const fetchOrCreateShortUrl = async () => {
    if (!quizId) return;
    try {
      const res = await fetch('/api/shortlink/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'quiz',
          targetId: quizId,
          title: quizTitle
        })
      });
      const json = await res.json();
      if (json.success && json.data?.shortCode) {
        setShortUrl(`${window.location.origin}/s/${json.data.shortCode}`);
      }
    } catch {}
  };

  if (!quiz) return null;

  let isFaculty = false;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      const r = (u.role || u.role_name || u.roles?.[0] || '').toLowerCase();
      if (r.includes('faculty') || r.includes('teacher') || r.includes('professor') || r.includes('super_admin')) {
        isFaculty = true;
      }
    }
  } catch {}

  const fetchFacultyRooms = async () => {
    if (!isFaculty) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const res = await fetch('/api/rooms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFacultyRooms(json.data);
        if (json.data.length > 0) {
          setSelectedRoomId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching faculty rooms:', err);
    }
  };

  const handleShareToStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setPublishError('Please select a classroom stream.');
      return;
    }

    setPublishing(true);
    setPublishSuccess('');
    setPublishError('');

    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/rooms/${selectedRoomId}/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: customMessage.trim(),
          quizId: quiz.id
        })
      });
      const json = await res.json();
      if (json.success) {
        const roomName = facultyRooms.find(r => r.id === selectedRoomId)?.name || 'classroom';
        setPublishSuccess(`Quiz successfully posted to "${roomName}" stream!`);
      } else {
        setPublishError(json.error?.message || 'Failed to post to classroom stream.');
      }
    } catch {
      setPublishError('Failed to post to classroom stream.');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishToMarketplace = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('Please log in to publish quizzes to the public library.');
      return;
    }

    setMarketplacePublishing(true);
    setMarketplaceSuccess('');
    try {
      const res = await fetch('/api/marketplace/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quizId: quiz.id,
          title: quiz.title,
          difficulty: quiz.difficulty
        })
      });
      const json = await res.json();
      if (json.success) {
        setMarketplaceSuccess('Quiz successfully published to the Public Library!');
      } else {
        alert(json.error?.message || 'Failed to publish to public library.');
      }
    } catch {
      alert('Error publishing to public library.');
    } finally {
      setMarketplacePublishing(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Take this quiz: "${quiz.title}"\n${displayUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`Take this interactive quiz: "${quiz.title}"`);
    const url = encodeURIComponent(displayUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Quiz Invitation: ${quiz.title}`);
    const body = encodeURIComponent(`Hi!\n\nYou're invited to take this interactive quiz: "${quiz.title}"\n\nAccess Quiz: ${displayUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-6 animate-scale max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-outline-variant pb-4">
          <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">share</span>
            Share Quiz &amp; Tiny URL
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Quiz Preview Header Card */}
        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-4 flex items-center gap-4">
          {quiz.cover_image_url ? (
            <img src={quiz.cover_image_url} alt="Cover" className="w-16 h-16 rounded-xl object-cover border border-outline-variant flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">quiz</span>
            </div>
          )}
          <div className="overflow-hidden flex-grow">
            <span className="bg-tertiary-container text-on-tertiary-container text-[9px] font-bold px-2 py-0.5 rounded uppercase">
              {quiz.difficulty}
            </span>
            <h4 className="text-body-lg font-bold text-on-surface line-clamp-1 mt-0.5">{quiz.title}</h4>
            <p className="text-xs text-on-surface-variant">{questionCount} Questions</p>
          </div>
        </div>

        {/* SECTION 1: SHARE TO CLASSROOM STREAM (FACULTY ONLY) */}
        {isFaculty && facultyRooms.length > 0 && (
          <form onSubmit={handleShareToStream} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">campaign</span>
              Post to Classroom Stream
            </h4>

            {publishSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-xs font-bold">
                {publishSuccess}
              </div>
            )}
            {publishError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs font-bold">
                {publishError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Select Classroom *</label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full border border-outline rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {facultyRooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name} [{room.room_code}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Stream Message</label>
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full border border-outline rounded-xl px-3 py-2 text-xs bg-white font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Optional announcement message..."
              />
            </div>

            <button
              type="submit"
              disabled={publishing}
              className="bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-primary/90 transition shadow text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              {publishing ? 'Publishing…' : 'Publish to Classroom Stream'}
            </button>
          </form>
        )}

        {/* SECTION 2: PUBLISH TO PUBLIC LIBRARY (FACULTY ONLY) */}
        {isFaculty && (
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-base">local_library</span>
                Public Library
              </h4>
              <span className="text-[10px] font-bold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">Share with World</span>
            </div>

            {marketplaceSuccess && (
              <div className="bg-green-100 border border-green-300 text-green-900 rounded-xl p-3 text-xs font-bold">
                {marketplaceSuccess}
              </div>
            )}

            <p className="text-xs text-indigo-800 font-medium">
              Publish this quiz to the Public Library so educators and students worldwide can clone and attempt it.
            </p>

            <button
              onClick={handlePublishToMarketplace}
              disabled={marketplacePublishing}
              className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-md text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">public</span>
              {marketplacePublishing ? 'Publishing to Public Library…' : 'Publish to Public Library'}
            </button>
          </div>
        )}

        {/* SECTION 3: TINY URL & SOCIAL SHARES */}
        <div className="flex flex-col gap-4 border-t border-outline-variant pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">link</span>
              Tiny Share URL
            </h4>
            {shortUrl && (
              <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Short URL Ready
              </span>
            )}
          </div>

          {/* Copy Link Input Bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={displayUrl}
              className="w-full bg-slate-50 border border-outline rounded-xl px-3 py-2.5 text-xs font-mono text-slate-700 select-all font-bold"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap active:scale-95 shadow ${
                copySuccess ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{copySuccess ? 'check' : 'content_copy'}</span>
              {copySuccess ? 'Copied!' : 'Copy Short Link'}
            </button>
          </div>

          {/* Social Icons Row */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleWhatsAppShare}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              WhatsApp
            </button>

            <button
              onClick={handleTwitterShare}
              className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">tag</span>
              X / Twitter
            </button>

            <button
              onClick={handleEmailShare}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">mail</span>
              Email
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
