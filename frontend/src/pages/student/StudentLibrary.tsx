import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.tsx';
import QuizShareModal from '../../components/QuizShareModal.tsx';

export default function StudentLibrary() {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard' | 'expert'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'bookmarked'>('all');
  const [selectedShareQuiz, setSelectedShareQuiz] = useState<any | null>(null);

  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    fetchLibraryQuizzes();
  }, []);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, difficultyFilter, scopeFilter]);

  const fetchLibraryQuizzes = async () => {
    setLoading(true);
    setErrorMsg('');
    const token = localStorage.getItem('accessToken');
    try {
      const [quizzesRes, bookmarksRes] = await Promise.all([
        fetch('/api/quizzes', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }),
        fetch('/api/quizzes/bookmarks/my', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      ]);

      const quizzesJson = await quizzesRes.json();
      const bookmarksJson = await bookmarksRes.json();

      if (quizzesJson.success && Array.isArray(quizzesJson.data)) {
        const bookmarkedSet = new Set(
          bookmarksJson.success && Array.isArray(bookmarksJson.data)
            ? bookmarksJson.data.map((b: any) => b.quiz_id)
            : []
        );

        const mapped = quizzesJson.data.map((q: any) => ({
          ...q,
          isBookmarked: bookmarkedSet.has(q.id)
        }));

        setQuizzes(mapped);
      } else {
        setErrorMsg(quizzesJson.error?.message || 'Failed to load practice quizzes.');
      }
    } catch {
      setErrorMsg('Failed to connect to quiz library service.');
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
        setQuizzes(prev =>
          prev.map(q => q.id === quizId ? { ...q, isBookmarked: json.bookmarked } : q)
        );
      }
    } catch {
      alert('Failed to update bookmark status.');
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchSearch =
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quiz.description && quiz.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchDiff = difficultyFilter === 'all' || quiz.difficulty === difficultyFilter;
    const matchScope = scopeFilter === 'all' || (scopeFilter === 'bookmarked' && quiz.isBookmarked);

    return matchSearch && matchDiff && matchScope;
  });

  const displayedQuizzes = filteredQuizzes.slice(0, visibleCount);
  const hasMoreQuizzes = visibleCount < filteredQuizzes.length;

  // Infinite Scroll Listener
  const handleScroll = useCallback(() => {
    if (loading || !hasMoreQuizzes) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    if (scrollTop + clientHeight >= scrollHeight - 350) {
      setVisibleCount(prev => prev + 12);
    }
  }, [loading, hasMoreQuizzes]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <DashboardLayout role="student">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">

        {/* Hero Banner Header */}
        <div className="bg-primary text-on-primary rounded-3xl p-8 sm:p-10 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
          <div className="z-10 max-w-xl">
            <span className="bg-white/20 text-white text-[10px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider">
              Student Quiz Library
            </span>
            <h1 className="text-headline-md sm:text-[32px] font-black text-white leading-tight mt-2">
              Discover &amp; Practice Quizzes
            </h1>
            <p className="text-xs text-white/90 mt-1">
              Explore public practice quizzes created by educators, save your bookmarks, test your skills solo, and track your progress. Auto-scroll dynamically loads more quizzes.
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

        {/* Search & Difficulty Filter Card */}
        <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Search Box */}
          <div className="relative flex-grow max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search quizzes by title or subject…"
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
              <option value="all">All Quizzes</option>
              <option value="bookmarked">Saved / Bookmarked 🔖</option>
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
            Available Practice Quizzes ({filteredQuizzes.length})
          </h3>
          <span className="text-xs text-on-surface-variant font-semibold">
            Showing <strong className="text-primary">{displayedQuizzes.length}</strong> of {filteredQuizzes.length} quizzes
          </span>
        </div>

        {/* Quizzes Grid */}
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant font-bold text-headline-sm animate-pulse">
            Loading practice quizzes…
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant text-xs bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">local_library</span>
            </div>
            <p className="font-semibold">No practice quizzes match your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedQuizzes.map(quiz => {
              const banner = quiz.cover_image_url || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop';
              const questionCount = quiz.question_count || (quiz.questions ? quiz.questions.length : 0);

              return (
                <div key={quiz.id} className="bg-white border border-outline-variant rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group">
                  
                  {/* Cover Banner */}
                  <div className="h-36 w-full overflow-hidden relative bg-slate-100">
                    <img src={banner} alt={quiz.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute top-3 left-3">
                      <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {quiz.difficulty}
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
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex flex-col gap-2">
                    <h4 className="text-body-lg font-bold text-on-surface line-clamp-1 group-hover:text-primary transition">
                      {quiz.title}
                    </h4>
                    <p className="text-xs text-on-surface-variant line-clamp-2">
                      {quiz.description || 'Test your knowledge on this subject with interactive questions.'}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">quiz</span>
                        {questionCount} Questions
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">grade</span>
                        {quiz.total_points || questionCount * 10} Pts
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedShareQuiz(quiz)}
                      className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition"
                      title="Share Quiz"
                    >
                      <span className="material-symbols-outlined text-base">share</span>
                    </button>

                    <button
                      onClick={() => navigate(`/student/quiz/${quiz.id}`)}
                      className="bg-primary text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-primary/90 transition shadow flex items-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-xs">play_arrow</span>
                      Practice Solo
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* INFINITE SCROLL AUTOMATIC LOADING INDICATOR */}
        {hasMoreQuizzes && (
          <div className="py-6 flex items-center justify-center gap-2 text-xs font-extrabold text-primary animate-pulse">
            <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Auto-loading more practice quizzes…
          </div>
        )}

        {!hasMoreQuizzes && filteredQuizzes.length > 0 && (
          <div className="py-6 text-center text-xs text-slate-400 font-medium">
            ✓ You have reached the end of the quiz library.
          </div>
        )}

      </div>

      {/* Quiz Share Modal */}
      <QuizShareModal quiz={selectedShareQuiz} onClose={() => setSelectedShareQuiz(null)} />
    </DashboardLayout>
  );
}
