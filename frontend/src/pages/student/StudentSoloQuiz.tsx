import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';

export default function StudentSoloQuiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Attempt Policy State
  const [assignmentInfo, setAssignmentInfo] = useState<any | null>(null);
  const [attemptBlocked, setAttemptBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  const [previousSub, setPreviousSub] = useState<any | null>(null);

  // Quiz progression state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, {
    rawAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
  }>>({});

  // Active question temporary state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [orderedItems, setOrderedItems] = useState<string[]>([]);
  const [matchSelections, setMatchSelections] = useState<Record<string, string>>({});
  const [questionSubmitted, setQuestionSubmitted] = useState(false);

  // Timer & Grace state
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Quiz summary state
  const [quizFinished, setQuizFinished] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [totalPossiblePoints, setTotalPossiblePoints] = useState(0);

  useEffect(() => {
    fetchQuizDetails();
    checkAttemptPolicy();
  }, [quizId]);

  const checkAttemptPolicy = async () => {
    const locState = (location.state as any) || {};
    const assignmentId = locState.assignmentId || searchParams.get('assignmentId');
    const targetRoomId = locState.roomId || searchParams.get('roomId');
    const token = localStorage.getItem('accessToken');

    if (assignmentId && targetRoomId && token) {
      try {
        const res = await fetch(`/api/rooms/${targetRoomId}/assignments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && json.data) {
          const currentAssignment = json.data.find((a: any) => a.id === assignmentId);
          if (currentAssignment) {
            setAssignmentInfo(currentAssignment);
            const maxAttempts = currentAssignment.maxAttempts !== undefined ? currentAssignment.maxAttempts : 1;
            const sub = currentAssignment.userSubmission;

            if (sub && maxAttempts > 0) {
              setAttemptBlocked(true);
              setPreviousSub(sub);
              setBlockedReason(`This classroom assignment is governed by a Single Attempt Policy (${maxAttempts} max attempt). You have already turned in your work.`);
            }
          }
        }
      } catch (err) {
        console.error('Error checking assignment attempt policy:', err);
      }
    }
  };

  const fetchQuizDetails = async () => {
    setLoading(true);
    setErrorMsg('');
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data) {
        const qData = json.data;
        setQuiz(qData);
        const qList = qData.questions || [];
        setQuestions(qList);

        let totalPts = 0;
        qList.forEach((q: any) => {
          totalPts += q.points || 10;
        });
        setTotalPossiblePoints(totalPts);
      } else {
        setErrorMsg(json.error?.message || 'Failed to load quiz details.');
      }
    } catch {
      setErrorMsg('Failed to connect to quiz service.');
    } finally {
      setLoading(false);
    }
  };

  const currentQ = questions[currentIdx] || null;

  // Reset local answer state whenever question changes
  useEffect(() => {
    if (!currentQ) return;
    setSelectedOption(null);
    setSelectedOptions([]);
    setTypedAnswer('');
    setOrderedItems(parseOptions(currentQ));
    setMatchSelections({});
    setQuestionSubmitted(false);

    // Initialize Question Timer if present
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (graceRef.current) clearInterval(graceRef.current);

    const timeLimit = currentQ.time_limit ?? 30;
    if (timeLimit > 0) {
      setCountdown(timeLimit);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownRef.current!);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(null);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (graceRef.current) clearInterval(graceRef.current);
    };
  }, [currentIdx, questions]);

  const handleTimeUp = () => {
    setQuestionSubmitted(true);
  };

  const parseOptions = (q: any): string[] => {
    if (!q) return [];
    if (Array.isArray(q.options)) return q.options;
    if (typeof q.options_json === 'string') {
      try { return JSON.parse(q.options_json); } catch {}
    }
    return [];
  };

  const handleConfirmAnswer = () => {
    if (!currentQ || questionSubmitted) return;
    setQuestionSubmitted(true);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (graceRef.current) clearInterval(graceRef.current);

    let isCorrect = false;
    let rawAnswer = '';
    const points = currentQ.points || 10;

    const qType = currentQ.question_type || 'multiple_choice';

    if (qType === 'multiple_choice' || qType === 'true_false' || qType === 'audio_mcq' || qType === 'video_mcq') {
      rawAnswer = selectedOption || '';
      isCorrect = (selectedOption?.trim().toLowerCase() === String(currentQ.correct_answer || '').trim().toLowerCase());
    } else if (qType === 'multi_select') {
      rawAnswer = selectedOptions.join(', ');
      let correctArr: string[] = [];
      try { correctArr = JSON.parse(currentQ.correct_answer || '[]'); } catch { correctArr = [currentQ.correct_answer]; }
      const sortedSelected = [...selectedOptions].sort();
      const sortedCorrect = [...correctArr].sort();
      isCorrect = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
    } else if (qType === 'short_answer' || qType === 'fill_blank') {
      rawAnswer = typedAnswer.trim();
      isCorrect = (typedAnswer.trim().toLowerCase() === String(currentQ.correct_answer || '').trim().toLowerCase());
    } else if (qType === 'ordering') {
      rawAnswer = orderedItems.join(' -> ');
      let correctOrder: string[] = [];
      try { correctOrder = JSON.parse(currentQ.correct_answer || '[]'); } catch {}
      isCorrect = JSON.stringify(orderedItems) === JSON.stringify(correctOrder);
    } else if (qType === 'match_following') {
      rawAnswer = JSON.stringify(matchSelections);
      let correctPairs: Record<string, string> = {};
      try { correctPairs = JSON.parse(currentQ.correct_answer || '{}'); } catch {}
      let allMatch = true;
      Object.keys(correctPairs).forEach(key => {
        if (matchSelections[key] !== correctPairs[key]) allMatch = false;
      });
      isCorrect = allMatch;
    }

    setUserAnswers(prev => ({
      ...prev,
      [currentIdx]: {
        rawAnswer,
        isCorrect,
        pointsEarned: isCorrect ? points : 0
      }
    }));

    if (isCorrect) {
      setTotalScore(prev => prev + points);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
    } else {
      finishAndSaveAttempt();
    }
  };

  const finishAndSaveAttempt = async () => {
    setQuizFinished(true);
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const locState = (location.state as any) || {};
    const assignmentId = locState.assignmentId || searchParams.get('assignmentId');
    const targetRoomId = locState.roomId || searchParams.get('roomId');

    // 1. Record general quiz attempt in DB
    try {
      await fetch(`/api/quizzes/${quizId}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          score: totalScore,
          totalPoints: totalPossiblePoints,
          timeTakenSeconds: 45,
          answers: userAnswers
        })
      });
    } catch (err) {
      console.error('Failed to save quiz attempt result:', err);
    }

    // 2. IF classroom assignment, record assignment submission in DB
    if (assignmentId && targetRoomId) {
      try {
        await fetch(`/api/rooms/${targetRoomId}/assignments/${assignmentId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            score: totalScore,
            totalPoints: totalPossiblePoints,
            timeTakenSeconds: 45
          })
        });
      } catch (err) {
        console.error('Failed to submit classroom assignment:', err);
      }
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIdx(0);
    setUserAnswers({});
    setTotalScore(0);
    setQuizFinished(false);
    setSelectedOption(null);
    setSelectedOptions([]);
    setTypedAnswer('');
    setMatchSelections({});
    setQuestionSubmitted(false);
  };

  // ── ATTEMPT BLOCKED VIEW ──────────────────────────────────────────────────

  if (attemptBlocked && previousSub) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-outline-variant rounded-3xl p-8 max-w-md w-full text-center shadow-xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h2 className="text-headline-sm font-extrabold text-on-surface">Maximum Attempts Reached</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {blockedReason}
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full flex flex-col gap-1.5 text-xs">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Your Turned In Result</span>
            <div className="flex justify-between items-center text-on-surface font-bold pt-1">
              <span>Marks Achieved:</span>
              <strong className="text-sm text-primary">{previousSub.score} / {previousSub.total_points || assignmentInfo?.totalPoints || 100}</strong>
            </div>
            <div className="flex justify-between items-center text-on-surface font-bold">
              <span>Percentage:</span>
              <strong className="text-sm text-green-700">{previousSub.percentage}%</strong>
            </div>
          </div>

          <button
            onClick={() => {
              const locState = (location.state as any) || {};
              const targetRoomId = locState.roomId || searchParams.get('roomId');
              if (targetRoomId) {
                navigate(`/classroom/${targetRoomId}`);
                return;
              }
              let role = 'student';
              try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                  const u = JSON.parse(userStr);
                  const r = (u.role || u.role_name || '').toLowerCase();
                  if (r.includes('faculty') || r.includes('teacher')) role = 'faculty';
                }
              } catch {}
              if (role === 'faculty') navigate('/faculty/quizzes');
              else navigate('/student/dashboard');
            }}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl text-xs shadow hover:bg-primary/90 transition active:scale-95 mt-2"
          >
            Return to Classroom Stream
          </button>
        </div>
      </div>
    );
  }

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8">
        <div className="text-headline-sm font-bold text-primary animate-pulse">Loading Quiz Content...</div>
      </div>
    );
  }

  if (errorMsg || !quiz) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-2xl text-center font-bold max-w-md w-full shadow-md">
          {errorMsg || 'Quiz not found.'}
          <div className="mt-4">
            <button onClick={() => navigate('/student/dashboard')} className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold">
              Return to Student Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const parsedOpts = currentQ ? parseOptions(currentQ) : [];
  const qType = currentQ?.question_type || 'multiple_choice';
  const timeLimit = currentQ?.time_limit ?? 30;
  const noTimer = timeLimit === 0;

  // ── FINAL RESULTS SCREEN ───────────────────────────────────────────────────

  if (quizFinished) {
    const accuracy = totalPossiblePoints > 0 ? Math.round((totalScore / totalPossiblePoints) * 100) : 0;
    const correctCount = Object.values(userAnswers).filter(a => a.isCorrect).length;
    const isSingleAttemptAssignment = Boolean(assignmentInfo && (assignmentInfo.maxAttempts === 1 || assignmentInfo.maxAttempts > 0));

    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 via-surface to-surface flex flex-col items-center justify-center p-4 md:p-8">
        <div className="bg-white border border-outline-variant rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl flex flex-col items-center text-center gap-8 animate-scale">
          
          <div className="w-24 h-24 bg-amber-100 border-4 border-amber-300 rounded-full flex items-center justify-center text-amber-700 shadow-lg">
            <span className="material-symbols-outlined text-[54px]">
              {accuracy >= 80 ? 'emoji_events' : accuracy >= 50 ? 'star' : 'target'}
            </span>
          </div>

          <div>
            <span className="bg-primary/10 text-primary font-extrabold text-xs px-4 py-1.5 rounded-full border border-primary/20 uppercase tracking-wider">
              {isSingleAttemptAssignment ? 'Classroom Assignment Submitted' : 'Solo Quiz Completed'}
            </span>
            <h1 className="text-headline-lg font-extrabold text-on-surface mt-2">{quiz.title}</h1>
            <p className="text-body-md text-on-surface-variant mt-1">
              {isSingleAttemptAssignment ? 'Your marks and submission have been recorded!' : 'Here is your self-paced performance summary!'}
            </p>
          </div>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-3 gap-4 w-full">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Score</span>
              <span className="text-headline-md font-black text-primary mt-1">{totalScore} <span className="text-xs font-semibold text-slate-500">/ {totalPossiblePoints}</span></span>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">Accuracy</span>
              <span className="text-headline-md font-black text-green-700 mt-1">{accuracy}%</span>
            </div>

            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Correct</span>
              <span className="text-headline-md font-black text-violet-700 mt-1">{correctCount} <span className="text-xs font-semibold text-slate-500">/ {questions.length}</span></span>
            </div>
          </div>

          {/* Breakdown List */}
          <div className="w-full text-left bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 max-h-60 overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Question Breakdown</h3>
            {questions.map((q, idx) => {
              const ans = userAnswers[idx];
              return (
                <div key={q.id || idx} className="bg-white border border-outline-variant p-3.5 rounded-xl flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${ans?.isCorrect ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
                      <span className="material-symbols-outlined text-xs">{ans?.isCorrect ? 'check' : 'close'}</span>
                    </span>
                    <span className="font-semibold text-on-surface truncate">Q{idx + 1}. {q.question_text}</span>
                  </div>
                  <span className={`font-bold ml-2 flex-shrink-0 ${ans?.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                    +{ans?.pointsEarned || 0} pts
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            {!isSingleAttemptAssignment ? (
              <button
                onClick={handleRestartQuiz}
                className="bg-secondary-container text-on-secondary-container font-bold px-6 py-3.5 rounded-xl hover:bg-secondary-container/80 transition text-label-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Retake Quiz
              </button>
            ) : (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-sm">info</span>
                Single Attempt Policy: Retaking is restricted for this assignment.
              </div>
            )}

            <button
              onClick={() => {
                const locState = (location.state as any) || {};
                const targetRoomId = locState.roomId || searchParams.get('roomId');
                if (targetRoomId) {
                  navigate(`/classroom/${targetRoomId}`);
                  return;
                }
                let role = 'student';
                try {
                  const userStr = localStorage.getItem('user');
                  if (userStr) {
                    const u = JSON.parse(userStr);
                    const r = (u.role || u.role_name || '').toLowerCase();
                    if (r.includes('faculty') || r.includes('teacher')) role = 'faculty';
                  }
                } catch {}
                if (role === 'faculty') navigate('/faculty/quizzes');
                else navigate('/student/dashboard');
              }}
              className="bg-primary text-white font-bold px-8 py-3.5 rounded-xl hover:bg-primary/90 transition shadow-lg text-label-md flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              {searchParams.get('roomId') || (location.state as any)?.roomId ? 'Return to Classroom Stream' : 'Back to Dashboard'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ── ACTIVE QUESTION VIEW ──
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between p-4 md:p-8 max-w-4xl mx-auto">
      
      {/* Quiz Header Bar */}
      <div className="flex justify-between items-center bg-white border border-outline-variant rounded-2xl p-4 shadow-sm">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
            Question {currentIdx + 1} of {questions.length}
          </span>
          <h2 className="text-body-lg font-bold text-on-surface">{quiz.title}</h2>
        </div>

        {/* Question Timer */}
        {!noTimer && countdown !== null && (
          <div className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm ${
            countdown <= 5 ? 'bg-red-500 text-white animate-bounce' : 'bg-primary/10 text-primary'
          }`}>
            <span className="material-symbols-outlined text-base">timer</span>
            <span>{countdown}s</span>
          </div>
        )}
      </div>

      {/* Question Card */}
      <div className="my-6 bg-white border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-md flex flex-col gap-6">
        
        {/* Question Text */}
        <div>
          <div className="flex justify-between items-center text-xs text-on-surface-variant font-bold mb-2">
            <span className="capitalize text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
              {qType.replace('_', ' ')}
            </span>
            <span className="bg-slate-100 px-2.5 py-0.5 rounded text-slate-700 font-mono">
              +{currentQ.points || 10} Points
            </span>
          </div>
          <h3 className="text-headline-sm font-black text-on-surface leading-snug">
            {currentQ.question_text}
          </h3>
        </div>

        {/* Options / Answer Input based on Question Type */}
        <div className="flex flex-col gap-3">
          {(qType === 'multiple_choice' || qType === 'true_false' || qType === 'audio_mcq' || qType === 'video_mcq') && (
            parsedOpts.map((opt: string, i: number) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={i}
                  disabled={questionSubmitted}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full text-left p-4 rounded-2xl text-xs font-extrabold border-2 transition flex items-center justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <span className="material-symbols-outlined text-base">check_circle</span>}
                </button>
              );
            })
          )}

          {qType === 'multi_select' && (
            parsedOpts.map((opt: string, i: number) => {
              const isSelected = selectedOptions.includes(opt);
              return (
                <button
                  key={i}
                  disabled={questionSubmitted}
                  onClick={() => {
                    if (isSelected) setSelectedOptions(selectedOptions.filter(o => o !== opt));
                    else setSelectedOptions([...selectedOptions, opt]);
                  }}
                  className={`w-full text-left p-4 rounded-2xl text-xs font-extrabold border-2 transition flex items-center justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <span>{opt}</span>
                  <span className="material-symbols-outlined text-base">
                    {isSelected ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                </button>
              );
            })
          )}

          {(qType === 'short_answer' || qType === 'fill_blank') && (
            <input
              type="text"
              disabled={questionSubmitted}
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full border-2 border-slate-200 rounded-2xl p-4 text-xs font-bold bg-slate-50 focus:bg-white focus:border-primary focus:outline-none"
            />
          )}
        </div>

      </div>

      {/* Bottom Footer Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate('/student/dashboard')}
          className="text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          Exit Quiz
        </button>

        {!questionSubmitted ? (
          <button
            onClick={handleConfirmAnswer}
            disabled={
              (qType === 'multiple_choice' && !selectedOption) ||
              (qType === 'multi_select' && selectedOptions.length === 0) ||
              ((qType === 'short_answer' || qType === 'fill_blank') && !typedAnswer.trim())
            }
            className="bg-primary text-white font-extrabold px-8 py-3 rounded-2xl text-xs shadow-lg hover:bg-primary/90 transition disabled:opacity-50 active:scale-95"
          >
            Confirm &amp; Submit
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="bg-green-600 text-white font-extrabold px-8 py-3 rounded-2xl text-xs shadow-lg hover:bg-green-700 transition active:scale-95 flex items-center gap-1"
          >
            <span>{currentIdx + 1 < questions.length ? 'Next Question' : 'View Results'}</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        )}
      </div>

    </div>
  );
}
