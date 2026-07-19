import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function StudentSoloQuiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

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
  const [mediaEnded, setMediaEnded] = useState(false);
  const [graceCountdown, setGraceCountdown] = useState<number | null>(null);
  const graceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Quiz summary state
  const [quizFinished, setQuizFinished] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [totalPossiblePoints, setTotalPossiblePoints] = useState(0);

  useEffect(() => {
    fetchQuizDetails();
  }, [quizId]);

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
    setMediaEnded(false);
    setGraceCountdown(null);

    if (graceRef.current) clearInterval(graceRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    const tl = currentQ.time_limit ?? 30;
    if (tl > 0) {
      setCountdown(tl);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            // Auto submit empty when timeout
            handleAnswerSubmit('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(null); // No Limit mode
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (graceRef.current) clearInterval(graceRef.current);
    };
  }, [currentIdx, currentQ?.id]);

  function parseOptions(q: any): string[] {
    try {
      return typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []);
    } catch { return []; }
  }

  // Grace countdown for Audio/Video questions
  const startGracePeriod = () => {
    if (graceRef.current) clearInterval(graceRef.current);
    const grace = currentQ?.grace_time ?? 15;
    if (grace <= 0 || questionSubmitted) return;

    setGraceCountdown(grace);
    graceRef.current = setInterval(() => {
      setGraceCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (graceRef.current) clearInterval(graceRef.current);
          if (!questionSubmitted) {
            handleAnswerSubmit(selectedOption || typedAnswer || selectedOptions.join(',') || '');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleMediaEnded = () => {
    setMediaEnded(true);
    startGracePeriod();
  };

  // Grade an answer locally for immediate feedback
  const gradeLocalAnswer = (q: any, rawAns: string): { isCorrect: boolean; points: number } => {
    const maxPts = q.points || 10;
    const qType = q.question_type || 'multiple_choice';
    const correctStr = String(q.correct_answer || '').trim();

    let isCorrect = false;

    if (['multiple_choice', 'true_false', 'audio_mcq', 'video_mcq', 'image_choice'].includes(qType)) {
      isCorrect = rawAns.trim() === correctStr;
    } else if (['short_answer', 'fill_blank'].includes(qType)) {
      isCorrect = rawAns.trim().toLowerCase() === correctStr.toLowerCase();
    } else if (qType === 'multi_select') {
      const sub = rawAns.split(',').map(s => s.trim()).filter(Boolean).sort().join(',');
      const corr = correctStr.split(',').map(s => s.trim()).filter(Boolean).sort().join(',');
      isCorrect = sub === corr;
    } else if (qType === 'ordering') {
      const sub = rawAns.split('|').map(s => s.trim()).join('|');
      isCorrect = sub === correctStr.split('|').map(s => s.trim()).join('|');
    } else if (qType === 'match_following') {
      const norm = (s: string) => s.split(',').map(p => p.trim()).sort().join(',');
      isCorrect = norm(rawAns) === norm(correctStr);
    }

    return {
      isCorrect,
      points: isCorrect ? maxPts : 0
    };
  };

  const handleAnswerSubmit = (ansToSubmit: string) => {
    if (questionSubmitted || !currentQ) return;

    if (countdownRef.current) clearInterval(countdownRef.current);
    if (graceRef.current) clearInterval(graceRef.current);

    setQuestionSubmitted(true);

    const { isCorrect, points } = gradeLocalAnswer(currentQ, ansToSubmit);

    setUserAnswers(prev => ({
      ...prev,
      [currentIdx]: {
        rawAnswer: ansToSubmit,
        isCorrect,
        pointsEarned: points
      }
    }));

    setTotalScore(prev => prev + points);
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIdx(0);
    setUserAnswers({});
    setTotalScore(0);
    setQuizFinished(false);
  };

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
              Solo Quiz Completed
            </span>
            <h1 className="text-headline-lg font-extrabold text-on-surface mt-2">{quiz.title}</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Here is your self-paced performance summary!</p>
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
            <button
              onClick={handleRestartQuiz}
              className="bg-secondary-container text-on-secondary-container font-bold px-6 py-3.5 rounded-xl hover:bg-secondary-container/80 transition text-label-md flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Retake Quiz
            </button>

            <button
              onClick={() => navigate('/student/dashboard')}
              className="bg-primary text-white font-bold px-8 py-3.5 rounded-xl hover:bg-primary/90 transition shadow-lg text-label-md flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">dashboard</span>
              Back to Dashboard
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ── ACTIVE QUESTION SCREEN ─────────────────────────────────────────────────

  const activeUserAnswer = userAnswers[currentIdx];

  return (
    <div className="min-h-screen bg-surface flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full">
      
      {/* Header Bar */}
      <div className="bg-white border border-outline-variant rounded-2xl p-4 md:p-6 shadow-sm flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="text-xs font-semibold text-on-surface-variant hover:text-primary transition border border-outline rounded-xl px-3 py-1.5 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Exit
          </button>
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Self-Paced Practice</span>
            <h2 className="text-headline-sm font-bold text-on-surface truncate max-w-xs md:max-w-md">{quiz.title}</h2>
          </div>
        </div>

        <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl text-center">
          <span className="text-[10px] font-bold uppercase block">Your Score</span>
          <span className="text-xs font-extrabold">{totalScore} Pts</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-6">
        <div
          className="bg-primary h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Main Question Card */}
      {currentQ && (
        <div className="bg-white border border-outline-variant rounded-2xl p-6 md:p-10 shadow-sm flex flex-col gap-6 flex-grow">
          
          {/* Question Meta Header */}
          <div className="flex justify-between items-center border-b border-outline-variant pb-4 flex-wrap gap-2">
            <span className="bg-primary text-white font-extrabold text-xs px-3.5 py-1 rounded-full">
              Question {currentIdx + 1} of {questions.length}
            </span>

            <div className="flex items-center gap-3">
              {!noTimer && countdown !== null && !questionSubmitted && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-sm border ${
                  countdown <= 5 ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : 'bg-primary/10 border-primary/20 text-primary'
                }`}>
                  <span className="material-symbols-outlined text-sm">timer</span>
                  {countdown}s
                </div>
              )}

              {noTimer && (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">all_inclusive</span>Self-Paced (No Limit)
                </span>
              )}

              {graceCountdown !== null && graceCountdown > 0 && !questionSubmitted && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-sm border bg-cyan-50 border-cyan-300 text-cyan-700 animate-pulse">
                  <span className="material-symbols-outlined text-sm">hourglass_bottom</span>
                  Grace: {graceCountdown}s
                </div>
              )}

              <span className="text-xs font-bold text-on-surface-variant">⭐ {currentQ.points || 10} Pts</span>
            </div>
          </div>

          {/* Question Prompt */}
          <h2 className="text-headline-md md:text-headline-lg font-bold text-on-surface leading-snug">
            {currentQ.question_text}
          </h2>

          {/* ── QUESTION TYPE INPUT RENDERERS ── */}
          <div className="flex flex-col gap-4">

            {/* Audio MCQ */}
            {qType === 'audio_mcq' && currentQ.media_url && (
              <div className="flex flex-col gap-2">
                <audio
                  controls
                  src={currentQ.media_url}
                  className="w-full rounded-lg"
                  onEnded={handleMediaEnded}
                />
                {mediaEnded && !questionSubmitted && graceCountdown !== null && (
                  <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-200 text-cyan-800 p-3 rounded-xl text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">hourglass_bottom</span>
                    Audio ended — answer in {graceCountdown}s!
                  </div>
                )}
              </div>
            )}

            {/* Video MCQ */}
            {qType === 'video_mcq' && currentQ.media_url && (
              <div className="flex flex-col gap-2">
                <video
                  controls
                  src={currentQ.media_url}
                  className="w-full rounded-xl max-h-64 object-contain bg-black"
                  onEnded={handleMediaEnded}
                />
              </div>
            )}

            {/* Standard MCQ / True-False / Audio / Video */}
            {['multiple_choice', 'true_false', 'audio_mcq', 'video_mcq'].includes(qType) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {parsedOpts.map((opt: string, idx: number) => {
                  const isSelected = selectedOption === opt;
                  return (
                    <button
                      key={idx}
                      disabled={questionSubmitted}
                      onClick={() => {
                        setSelectedOption(opt);
                        handleAnswerSubmit(opt);
                      }}
                      className={`p-5 rounded-2xl border-2 text-left font-bold text-body-md transition flex items-center gap-4 active:scale-95 ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-xl'
                          : questionSubmitted
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white hover:bg-primary/5 border-outline-variant hover:border-primary text-on-surface'
                      }`}
                    >
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                        isSelected ? 'bg-white text-primary' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-grow">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multi-Select */}
            {qType === 'multi_select' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-on-surface-variant">Select all correct options, then click Submit.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {parsedOpts.map((opt: string, idx: number) => {
                    const isChosen = selectedOptions.includes(opt);
                    return (
                      <button
                        key={idx}
                        disabled={questionSubmitted}
                        onClick={() => {
                          setSelectedOptions(prev => isChosen ? prev.filter(x => x !== opt) : [...prev, opt]);
                        }}
                        className={`p-4 rounded-2xl border-2 text-left font-semibold flex items-center gap-3 transition ${
                          isChosen ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant hover:border-primary'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-xs font-bold ${
                          isChosen ? 'bg-primary border-primary text-white' : 'border-outline'
                        }`}>
                          {isChosen ? <span className="material-symbols-outlined text-xs">check</span> : String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {!questionSubmitted && (
                  <button
                    onClick={() => handleAnswerSubmit(selectedOptions.join(','))}
                    disabled={selectedOptions.length === 0}
                    className="self-end bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow active:scale-95 disabled:opacity-50"
                  >
                    Submit Choice ({selectedOptions.length})
                  </button>
                )}
              </div>
            )}

            {/* Short Answer */}
            {qType === 'short_answer' && (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  autoFocus
                  disabled={questionSubmitted}
                  className="w-full border-2 border-primary/40 focus:border-primary rounded-xl px-4 py-3 text-headline-sm font-bold text-center focus:outline-none bg-primary/5 disabled:opacity-60"
                  placeholder="Type your answer…"
                  value={typedAnswer}
                  onChange={e => setTypedAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && typedAnswer.trim()) handleAnswerSubmit(typedAnswer.trim()); }}
                />
                {!questionSubmitted && (
                  <button
                    onClick={() => handleAnswerSubmit(typedAnswer.trim())}
                    disabled={!typedAnswer.trim()}
                    className="self-center bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow active:scale-95 disabled:opacity-50"
                  >
                    Submit Answer
                  </button>
                )}
              </div>
            )}

            {/* Fill in the Blank */}
            {qType === 'fill_blank' && (
              <div className="flex flex-col gap-3">
                <div className="text-headline-md font-bold text-on-surface bg-slate-50 border border-slate-200 rounded-xl p-4 leading-loose">
                  {currentQ.question_text.split('___').map((part: string, i: number, arr: string[]) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <input
                          type="text"
                          disabled={questionSubmitted}
                          className="inline-block border-b-2 border-primary bg-transparent text-center font-bold text-primary focus:outline-none min-w-[100px] w-32 mx-1 disabled:opacity-60"
                          placeholder="___"
                          value={typedAnswer}
                          onChange={e => setTypedAnswer(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && typedAnswer.trim()) handleAnswerSubmit(typedAnswer.trim()); }}
                        />
                      )}
                    </span>
                  ))}
                </div>
                {!questionSubmitted && (
                  <button
                    onClick={() => handleAnswerSubmit(typedAnswer.trim())}
                    disabled={!typedAnswer.trim()}
                    className="self-center bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow active:scale-95 disabled:opacity-50"
                  >
                    Submit Answer
                  </button>
                )}
              </div>
            )}

            {/* Ordering */}
            {qType === 'ordering' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-on-surface-variant">Reorder the items into correct sequence.</p>
                <div className="flex flex-col gap-2">
                  {(orderedItems.length ? orderedItems : parsedOpts).map((item: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 bg-white border border-outline-variant rounded-xl p-3.5 shadow-sm">
                      <span className="w-7 h-7 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                      <span className="flex-grow text-sm font-semibold text-on-surface">{item}</span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          disabled={idx === 0 || questionSubmitted}
                          onClick={() => {
                            const arr = [...orderedItems];
                            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                            setOrderedItems(arr);
                          }}
                          className="text-slate-400 hover:text-primary disabled:opacity-20"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_upward</span>
                        </button>
                        <button
                          disabled={idx === orderedItems.length - 1 || questionSubmitted}
                          onClick={() => {
                            const arr = [...orderedItems];
                            [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                            setOrderedItems(arr);
                          }}
                          className="text-slate-400 hover:text-primary disabled:opacity-20"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_downward</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {!questionSubmitted && (
                  <button
                    onClick={() => handleAnswerSubmit(orderedItems.join('|'))}
                    className="self-center bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow active:scale-95"
                  >
                    Lock In Order
                  </button>
                )}
              </div>
            )}

            {/* Match the Following */}
            {qType === 'match_following' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-on-surface-variant">Click a left item, then click its matching right item to pair them.</p>
                <MatchFollowingBoard
                  options={parsedOpts}
                  selections={matchSelections}
                  submitted={questionSubmitted}
                  onSelect={(left, right) => {
                    const updated = { ...matchSelections, [left]: right };
                    setMatchSelections(updated);
                  }}
                  onSubmit={() => {
                    const ansStr = Object.entries(matchSelections).map(([l, r]) => `${l}:${r}`).join(',');
                    handleAnswerSubmit(ansStr);
                  }}
                />
              </div>
            )}

            {/* Image Choice */}
            {qType === 'image_choice' && (
              <div className="grid grid-cols-2 gap-4">
                {parsedOpts.map((imgUrl: string, idx: number) => {
                  const isSelected = selectedOption === String(idx);
                  return (
                    <button
                      key={idx}
                      disabled={questionSubmitted}
                      onClick={() => {
                        setSelectedOption(String(idx));
                        handleAnswerSubmit(String(idx));
                      }}
                      className={`rounded-2xl border-4 overflow-hidden transition active:scale-95 ${
                        isSelected ? 'border-primary shadow-xl' : 'border-outline-variant hover:border-primary/50'
                      }`}
                    >
                      {imgUrl ? (
                        <img src={imgUrl} alt={`Option ${String.fromCharCode(65 + idx)}`} className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-3xl">image</span>
                        </div>
                      )}
                      <div className={`py-2 text-xs font-bold text-center ${isSelected ? 'bg-primary text-white' : 'bg-white text-on-surface-variant'}`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

          </div>

          {/* ── IMMEDIATE FEEDBACK BOX ── */}
          {questionSubmitted && activeUserAnswer && (
            <div className={`p-4 rounded-xl border font-bold text-xs flex justify-between items-center animate-scale ${
              activeUserAnswer.isCorrect ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">
                  {activeUserAnswer.isCorrect ? 'check_circle' : 'cancel'}
                </span>
                <span>
                  {activeUserAnswer.isCorrect ? `Correct! +${activeUserAnswer.pointsEarned} Points` : `Incorrect. Correct Answer: ${currentQ.correct_answer}`}
                </span>
              </div>

              <button
                onClick={handleNextQuestion}
                className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition shadow text-xs flex items-center gap-1 active:scale-95 ml-4 flex-shrink-0"
              >
                <span className="flex items-center gap-1">
                  {currentIdx + 1 >= questions.length ? 'View Results' : 'Next Question'}
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </span>
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ─── Match the Following Board Sub-Component ──────────────────────────────────

interface MatchBoardProps {
  options: string[];     // "Left:Right" pairs
  selections: Record<string, string>;
  submitted: boolean;
  onSelect: (left: string, right: string) => void;
  onSubmit: () => void;
}

function MatchFollowingBoard({ options, selections, submitted, onSelect, onSubmit }: MatchBoardProps) {
  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  const pairs = options.map((o: string) => { const [l, r] = o.split(':'); return { left: l || o, right: r || '' }; });
  const leftItems = pairs.map(p => p.left);
  const rightItems = [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5);

  const allMatched = leftItems.every(l => selections[l]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-center">Column A</span>
          {leftItems.map((left, i) => (
            <button key={i} disabled={submitted} onClick={() => setActiveLeft(activeLeft === left ? null : left)}
              className={`p-3 rounded-xl border-2 text-xs font-bold text-left transition ${activeLeft === left ? 'border-primary bg-primary text-white' : selections[left] ? 'border-green-400 bg-green-50 text-green-800' : 'border-outline-variant bg-white hover:border-primary'}`}>
              {left}
              {selections[left] && <span className="block text-[10px] font-normal opacity-70">→ {selections[left]}</span>}
            </button>
          ))}
        </div>
        {/* Right column */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-center">Column B</span>
          {rightItems.map((right, i) => {
            const isMatched = Object.values(selections).includes(right);
            return (
              <button key={i} disabled={submitted || !activeLeft}
                onClick={() => { if (activeLeft) { onSelect(activeLeft, right); setActiveLeft(null); } }}
                className={`p-3 rounded-xl border-2 text-xs font-bold text-left transition ${isMatched ? 'border-green-400 bg-green-50 text-green-800 opacity-70 cursor-default' : activeLeft ? 'border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 cursor-pointer' : 'border-outline-variant bg-white opacity-60 cursor-default'}`}>
                {right}
              </button>
            );
          })}
        </div>
      </div>
      {!submitted && (
        <button onClick={onSubmit} disabled={!allMatched}
          className="self-center bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow active:scale-95 disabled:opacity-50">
          Submit Matches ({Object.keys(selections).length}/{leftItems.length} matched)
        </button>
      )}
    </div>
  );
}
