import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.tsx';

interface QuizAttempt {
  id: string;
  score: number;
  total_points: number;
  percentage: number;
  time_taken_seconds: number;
  completed_at: string;
  quiz: {
    id: string;
    title: string;
    description?: string;
  };
}

export default function QuizHistory() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/quizzes/attempts/history', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAttempts(json.data);
      }
    } catch (err) {
      console.error('Failed to load attempt history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttempts = attempts.filter(att => 
    att.quiz?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute overall stats
  const totalTaken = attempts.length;
  const avgAccuracy = attempts.length > 0 
    ? Math.round(attempts.reduce((sum, att) => sum + (Number(att.percentage) || 0), 0) / attempts.length)
    : 0;
  const highestPoints = attempts.length > 0
    ? Math.max(...attempts.map(att => att.score))
    : 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto relative pb-20 px-4 md:px-0">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-on-surface leading-tight">My Quiz Journey</h1>
            <p className="text-xs text-on-surface-variant font-medium mt-1">Review all your past attempts, self-study performance, and learning analytics.</p>
          </div>
          
          {/* Search bar */}
          <div className="relative max-w-md w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
            <input
              type="text"
              placeholder="Search by quiz title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-outline rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">auto_stories</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Attempts</span>
              <span className="text-headline-md font-black text-on-surface">{totalTaken} quizzes</span>
            </div>
          </div>

          <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">insights</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avg. Accuracy</span>
              <span className="text-headline-md font-black text-green-700">{avgAccuracy}% accuracy</span>
            </div>
          </div>

          <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">emoji_events</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Highest Score</span>
              <span className="text-headline-md font-black text-amber-700">{highestPoints} pts</span>
            </div>
          </div>
        </div>

        {/* Attempt History List */}
        {loading ? (
          <div className="bg-white border border-outline-variant rounded-2xl p-12 text-center text-slate-500 font-bold animate-pulse">
            Loading your performance record...
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="bg-white border border-outline-variant rounded-2xl p-12 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-slate-300">history_toggle_off</span>
            <div>
              <h3 className="text-body-lg font-bold text-on-surface">No Quiz Attempts Found</h3>
              <p className="text-xs text-slate-500 mt-0.5">{searchQuery ? "No quiz matched your search query." : "You haven't taken any self-paced quizzes yet."}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredAttempts.map((att) => {
              const accuracy = att.total_points > 0 ? Math.round((att.score / att.total_points) * 100) : 0;
              const dateStr = new Date(att.completed_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={att.id}
                  className="bg-white border border-outline-variant rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-lg">checklist</span>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-on-surface leading-tight hover:text-primary cursor-pointer" onClick={() => navigate(`/student/quiz/${att.quiz.id}`)}>
                        {att.quiz.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>Taken: <strong>{dateStr}</strong></span>
                        <span>•</span>
                        <span>Time: <strong>{Math.floor(att.time_taken_seconds / 60)}m {att.time_taken_seconds % 60}s</strong></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Score</span>
                      <span className="text-xs font-black text-on-surface mt-0.5">
                        {att.score} <span className="text-[10px] text-slate-400 font-semibold">/ {att.total_points} pts</span>
                      </span>
                    </div>

                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Accuracy</span>
                      <span className={`text-xs font-black mt-0.5 ${accuracy >= 80 ? 'text-green-600' : accuracy >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {accuracy}%
                      </span>
                    </div>

                    <button
                      onClick={() => navigate(`/student/quiz/${att.quiz.id}`)}
                      className="bg-primary hover:bg-primary/95 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 active:scale-95 transition"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      Retake
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
