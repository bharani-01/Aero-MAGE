import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface ShortLinkTarget {
  shortCode: string;
  targetType: string;
  targetId: string;
  title?: string;
  quizDetails?: {
    id: string;
    title: string;
    description?: string;
    difficulty: string;
    questionCount: number;
    creatorName: string;
    coverImageUrl?: string;
    category?: string;
  };
}

interface RelatedQuiz {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  question_count?: number;
  questions?: any[];
  category?: string;
}

export default function ShortUrlResolver() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [targetInfo, setTargetInfo] = useState<ShortLinkTarget | null>(null);
  const [relatedQuizzes, setRelatedQuizzes] = useState<RelatedQuiz[]>([]);

  useEffect(() => {
    if (!shortCode) {
      setError('Invalid short link.');
      setLoading(false);
      return;
    }

    const resolveLink = async () => {
      try {
        const res = await fetch(`/api/shortlink/${shortCode}`);
        const json = await res.json();

        if (json.success && json.data) {
          const info: ShortLinkTarget = json.data;
          setTargetInfo(info);

          // Check if user is logged in
          const token = localStorage.getItem('accessToken');
          if (token) {
            // Auto redirect logged in users immediately
            redirectToTarget(info);
            return;
          }

          // Fetch related quizzes for public preview
          fetchRelatedQuizzes();
          setLoading(false);
        } else {
          setError(json.error?.message || 'Short URL link not found or expired.');
          setLoading(false);
        }
      } catch {
        setError('Network error trying to resolve short link.');
        setLoading(false);
      }
    };

    resolveLink();
  }, [shortCode]);

  const fetchRelatedQuizzes = async () => {
    try {
      const res = await fetch('/api/marketplace/explore?limit=4');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRelatedQuizzes(json.data.slice(0, 4));
      }
    } catch (err) {
      console.error('Error loading related quizzes:', err);
    }
  };

  const getTargetUrl = (info: ShortLinkTarget) => {
    if (info.targetType === 'quiz') {
      return `/student/quiz/${info.targetId}`;
    } else if (info.targetType === 'marketplace' || info.targetType === 'public-library') {
      return `/public-library?id=${info.targetId}`;
    } else if (info.targetType === 'room') {
      return `/classroom/${info.targetId}`;
    } else if (info.targetType === 'session') {
      return `/student/session/${info.targetId}`;
    }
    return '/';
  };

  const redirectToTarget = (info: ShortLinkTarget) => {
    const url = getTargetUrl(info);
    navigate(url);
  };

  const handleLoginToAttend = () => {
    if (!targetInfo) return;
    const targetUrl = getTargetUrl(targetInfo);
    navigate(`/login?redirect=${encodeURIComponent(targetUrl)}`);
  };

  const handleRegisterToAttend = () => {
    if (!targetInfo) return;
    const targetUrl = getTargetUrl(targetInfo);
    navigate(`/register?redirect=${encodeURIComponent(targetUrl)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 mt-4 animate-pulse">
          Resolving tiny link <span className="font-mono text-primary">/s/{shortCode}</span>…
        </p>
      </div>
    );
  }

  if (error || !targetInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl flex flex-col items-center gap-4 text-center">
          <span className="material-symbols-outlined text-5xl text-rose-500">link_off</span>
          <h2 className="text-xl font-extrabold text-slate-900">Link Expired or Not Found</h2>
          <p className="text-xs text-slate-500 font-medium">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 bg-primary text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow hover:bg-primary/90 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const quiz = targetInfo.quizDetails;
  const quizTitle = targetInfo.title || quiz?.title || 'Interactive Quiz';
  const creatorName = quiz?.creatorName || 'Educator';
  const questionCount = quiz?.questionCount || 0;
  const difficulty = (quiz?.difficulty || 'medium').toLowerCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      
      {/* LIGHT MODE TOP NAVBAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-md">
            A
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">
            Aero <span className="text-primary">MAGE</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLoginToAttend}
            className="bg-primary hover:bg-primary/90 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition active:scale-95"
          >
            Log In
          </button>
          <button
            onClick={handleRegisterToAttend}
            className="hidden sm:block bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-8 flex-grow">
        
        {/* HERO BANNER CARD */}
        <div className="bg-gradient-to-r from-primary via-indigo-600 to-purple-700 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden flex flex-col gap-6">
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Tag Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm">quiz</span>
              Quiz Share Invitation
            </div>

            <div className="flex items-center gap-2 text-xs font-bold bg-black/20 px-3 py-1 rounded-full border border-white/20">
              <span>Short Link:</span>
              <span className="font-mono text-amber-300">/s/{shortCode}</span>
            </div>
          </div>

          {/* Quiz Title & Main Metadata */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {difficulty}
              </span>
              <span className="text-xs font-bold text-white/80 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
                {questionCount} Questions
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-snug">
              {quizTitle}
            </h1>

            <p className="text-xs sm:text-sm text-white/85 max-w-2xl font-medium leading-relaxed">
              {quiz?.description || 'You have been shared an interactive quiz on Aero MAGE! Sign in to attempt the quiz, track your accuracy, earn XP, and climb the leaderboard.'}
            </p>
          </div>

          {/* Author & CTA Button Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-white/15">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-sm border border-white/30">
                {creatorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-[11px] text-white/70 block uppercase font-bold">Created by</span>
                <span className="text-xs font-extrabold text-white">{creatorName}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLoginToAttend}
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-8 py-3.5 rounded-2xl text-xs sm:text-sm shadow-xl transition flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">login</span>
                <span>Login to Attend Quiz</span>
              </button>
            </div>
          </div>
        </div>

        {/* QUIZ OVERVIEW DETAILS CARD */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 text-slate-900">
            <span className="material-symbols-outlined text-primary text-xl">info</span>
            <h2 className="text-lg font-extrabold">Quiz Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total Questions</span>
              <span className="text-xl font-extrabold text-slate-900">{questionCount} Qs</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">Difficulty</span>
              <span className="text-xl font-extrabold text-slate-900 capitalize">{difficulty}</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">Access Type</span>
              <span className="text-xl font-extrabold text-slate-900">Free Practice</span>
            </div>
          </div>

          <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-primary">lock</span>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">Authentication Required</h4>
                <p className="text-[11px] text-slate-500 font-medium">Log in with your Aero MAGE student/faculty account to attempt this quiz.</p>
              </div>
            </div>

            <button
              onClick={handleLoginToAttend}
              className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition shadow-sm whitespace-nowrap"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* RELATED QUIZZES SECTION */}
        {relatedQuizzes.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
                <h3 className="text-lg font-extrabold text-slate-900">Explore Related Quizzes</h3>
              </div>
              <button
                onClick={() => navigate('/public-library')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedQuizzes.map((rq) => (
                <div
                  key={rq.id}
                  onClick={handleLoginToAttend}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/50 transition cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex flex-col gap-2">
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase w-max">
                      {rq.difficulty || 'medium'}
                    </span>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-primary transition line-clamp-1">
                      {rq.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {rq.description || 'Interactive practice quiz template.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-2 border-t border-slate-100">
                    <span>{rq.question_count || rq.questions?.length || 5} Qs</span>
                    <span className="text-primary font-bold">Attempt →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* LIGHT FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500 font-medium">
        Aero MAGE &copy; 2026. Interactive Quiz &amp; Learning Platform. All rights reserved.
      </footer>

    </div>
  );
}
