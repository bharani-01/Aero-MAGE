import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.tsx';
import QuizShareModal from '../../components/QuizShareModal.tsx';

export default function FacultyLibrary() {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'public' | 'organization' | 'bookmarked'>('all');
  const [cloningQuizId, setCloningQuizId] = useState<string | null>(null);

  // Share modal state
  const [selectedShareQuiz, setSelectedShareQuiz] = useState<any | null>(null);

  useEffect(() => {
    fetchLibraryQuizzes();
  }, []);

  const fetchLibraryQuizzes = async () => {
    setLoading(true);
    setErrorMsg('');
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/quizzes', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setQuizzes(json.data);
      } else {
        setErrorMsg(json.error?.message || 'Failed to load public quizzes.');
      }
    } catch {
      setErrorMsg('Failed to communicate with quiz server.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBookmark = async (quizId: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const res = await fetch(`/api/quizzes/${quizId}/bookmark`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, isBookmarked: json.isBookmarked } : q));
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  const handleCloneQuiz = async (quizId: string, title: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setCloningQuizId(quizId);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/clone`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        alert(`Successfully cloned "${title}" into your private library!`);
        fetchLibraryQuizzes();
      } else {
        alert(json.error?.message || 'Failed to clone quiz.');
      }
    } catch {
      alert('Failed to clone quiz template.');
    } finally {
      setCloningQuizId(null);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const titleMatch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = (quiz.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = titleMatch || descMatch;

    const matchesDiff = difficultyFilter === 'all' || quiz.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
    
    let matchesScope = true;
    if (scopeFilter === 'public') matchesScope = quiz.visibility.toLowerCase() === 'public';
    else if (scopeFilter === 'organization') matchesScope = quiz.visibility.toLowerCase() === 'organization';
    else if (scopeFilter === 'bookmarked') matchesScope = Boolean(quiz.isBookmarked);

    return matchesSearch && matchesDiff && matchesScope;
  });

  return (
    <DashboardLayout role="faculty">
      <div className="flex flex-col gap-6">
        
        {/* Hero Banner Header */}
        <div className="bg-primary-container text-on-primary-container rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
          <div className="z-10 max-w-xl">
            <span className="bg-white/20 text-white text-[10px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider">
              Faculty Quiz Library
            </span>
            <h1 className="text-headline-md sm:text-[32px] font-black text-white leading-tight mt-2">
              Public Quiz Repository
            </h1>
            <p className="text-xs text-white/90 mt-1">
              Explore public quizzes, host live games, bookmark favorites, or clone templates into your collection.
            </p>
          </div>

          <div className="z-10 flex items-center gap-3">
            <button
              onClick={fetchLibraryQuizzes}
              className="bg-white/20 hover:bg-white/30 text-white font-extrabold px-5 py-2.5 rounded-full text-xs transition flex items-center gap-1.5 backdrop-blur-md"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh Library
            </button>
          </div>
        </div>

        {/* Search & Filters Card */}
        <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Search Box */}
          <div className="relative flex-grow max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search public quizzes by title or topic…"
              className="w-full border border-outline rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary bg-slate-50"
            />
          </div>

          {/* Difficulty Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {(['all', 'easy', 'medium', 'hard', 'expert'] as const).map(diff => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
                  difficultyFilter === diff
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Scope Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Scope:</span>
            <select
              value={scopeFilter}
              onChange={e => setScopeFilter(e.target.value as any)}
              className="border border-outline rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:outline-none"
            >
              <option value="all">All Available</option>
              <option value="bookmarked">Saved / Bookmarked 🔖</option>
              <option value="public">Public Only</option>
              <option value="organization">Organization</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {/* Quizzes Grid Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-headline-sm font-extrabold text-on-surface">
            Faculty Library Quizzes ({filteredQuizzes.length})
          </h3>
        </div>

        {/* Quizzes Grid */}
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant font-bold text-headline-sm animate-pulse">
            Scanning public quiz library…
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant text-xs bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">local_library</span>
            </div>
            <p className="font-semibold">No public quizzes match your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredQuizzes.map(quiz => {
              const banner = quiz.cover_image_url || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop';
              const questionCount = quiz.question_count || (quiz.questions ? quiz.questions.length : 0);

              return (
                <div key={quiz.id} className="bg-white border border-outline-variant rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group">
                  
                  {/* Cover Banner */}
                  <div className="h-36 w-full overflow-hidden relative bg-slate-100">
                    <img src={banner} alt={quiz.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {quiz.difficulty}
                      </span>
                      <span className="bg-primary/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {quiz.visibility}
                      </span>
                    </div>

                    {/* Bookmark Button */}
                    <button
                      onClick={() => handleToggleBookmark(quiz.id)}
                      className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-md transition shadow ${
                        quiz.isBookmarked
                          ? 'bg-amber-500 text-white'
                          : 'bg-white/80 text-slate-700 hover:bg-white hover:text-amber-500'
                      }`}
                      title={quiz.isBookmarked ? 'Remove Bookmark' : 'Save / Bookmark Quiz'}
                    >
                      <span className="material-symbols-outlined text-base">
                        {quiz.isBookmarked ? 'bookmark' : 'bookmark_border'}
                      </span>
                    </button>

                    <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-primary font-extrabold text-xs px-2.5 py-0.5 rounded-lg border border-primary/20">
                      {questionCount} Qs
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-grow flex flex-col justify-between gap-4">
                    <div>
                      <h4 className="text-body-lg font-bold text-on-surface line-clamp-1">{quiz.title}</h4>
                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">
                        {quiz.description?.replace(/^\[mode:\w+\]\s*/, '') || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-outline-variant/60 pt-3">
                      <div className="flex justify-between items-center text-xs text-on-surface-variant">
                        <span>Creator: <strong className="text-on-surface">{quiz.creator?.display_name || 'Faculty'}</strong></span>
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                        {/* Share Button */}
                        <button
                          onClick={() => setSelectedShareQuiz(quiz)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-primary transition flex items-center gap-1 text-xs font-bold"
                          title="Share Quiz to Classroom Stream"
                        >
                          <span className="material-symbols-outlined text-sm">share</span>
                          <span>Share</span>
                        </button>

                        {/* Clone Button */}
                        <button
                          onClick={() => handleCloneQuiz(quiz.id, quiz.title)}
                          disabled={cloningQuizId === quiz.id}
                          className="p-2 rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-50 transition flex items-center gap-1 text-xs font-bold disabled:opacity-50"
                          title="Clone Quiz to my collection"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                          <span>Clone</span>
                        </button>

                        {/* Play Solo Button */}
                        <button
                          onClick={() => navigate(`/student/quiz/${quiz.id}`)}
                          className="bg-primary text-white hover:bg-primary/90 transition px-3.5 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1 active:scale-95 ml-auto"
                        >
                          <span className="material-symbols-outlined text-xs">play_arrow</span>
                          <span>Play Solo</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Quiz Share Modal */}
      <QuizShareModal quiz={selectedShareQuiz} onClose={() => setSelectedShareQuiz(null)} />
    </DashboardLayout>
  );
}
