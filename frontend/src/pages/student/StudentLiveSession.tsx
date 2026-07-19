import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function StudentLiveSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Guest Registration
  const [joinedParticipant, setJoinedParticipant] = useState<any | null>(null);
  const [guestName, setGuestName] = useState('');
  const [joiningGuest, setJoiningGuest] = useState(false);

  // Answer state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]); // multi_select
  const [typedAnswer, setTypedAnswer] = useState('');                   // short_answer / fill_blank
  const [orderedItems, setOrderedItems] = useState<string[]>([]);       // ordering
  const [matchSelections, setMatchSelections] = useState<Record<string, string>>({}); // match_following
  const [score, setScore] = useState(0);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Record<string, boolean>>({});
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  // Countdown timer state
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerStartTimeRef = useRef<number | null>(null); // When options revealed → for elapsed seconds calc

  // Media (audio/video) grace period state
  const [mediaEnded, setMediaEnded] = useState(false);
  const [graceCountdown, setGraceCountdown] = useState<number | null>(null);
  const graceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`participant_${sessionId}`);
    if (stored) { try { setJoinedParticipant(JSON.parse(stored)); } catch {} }
    fetchSessionState();
    const interval = setInterval(fetchSessionState, 1000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Reset all answer state when question changes
  useEffect(() => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    if (!answeredQuestionIds[qId]) {
      setSelectedOption(null);
      setSelectedOptions([]);
      setTypedAnswer('');
      setOrderedItems(parseOptions(currentQuestion));
      setMatchSelections({});
      setAnswerSubmitted(false);
      setMediaEnded(false);
      setGraceCountdown(null);
      if (graceRef.current) clearInterval(graceRef.current);
    }
  }, [currentQuestion?.id, sessionData?.current_question_index]);

  // Countdown timer — starts when options revealed, respects timeLimit=0 (no timer)
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (
      sessionData?.status === 'active' &&
      sessionData?.is_options_revealed &&
      currentQuestion &&
      !answerSubmitted &&
      !answeredQuestionIds[currentQuestion.id]
    ) {
      const tl = currentQuestion.time_limit ?? 30;
      if (tl === 0) {
        // No timer mode — don't start any countdown
        setCountdown(null);
        answerStartTimeRef.current = Date.now();
        return;
      }

      setCountdown(tl);
      answerStartTimeRef.current = Date.now();

      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            // Auto-submit empty if time runs out
            setAnswerSubmitted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(null);
    }

    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [sessionData?.is_options_revealed, currentQuestion?.id, sessionData?.status, answerSubmitted]);

  // Grace period countdown — starts when media ends
  const startGracePeriod = () => {
    if (graceRef.current) clearInterval(graceRef.current);
    const qt = currentQuestion;
    const grace = qt?.grace_time ?? 15;
    if (grace <= 0 || answerSubmitted) return;

    setGraceCountdown(grace);
    graceRef.current = setInterval(() => {
      setGraceCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (graceRef.current) clearInterval(graceRef.current);
          setAnswerSubmitted(true); // lock answers when grace expires
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

  const fetchSessionState = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success) {
        const fetchedSession = json.data.session;
        const fetchedParticipants: any[] = json.data.participants || [];
        setSessionData(fetchedSession);
        setCurrentQuestion(json.data.currentQuestion);
        setTotalQuestions(json.data.totalQuestions);
        setParticipants(fetchedParticipants);

        // Auto-join if authenticated
        const storedUser = localStorage.getItem('user');
        let currentP = joinedParticipant;
        if (!currentP && storedUser) {
          try {
            const userObj = JSON.parse(storedUser);
            currentP = fetchedParticipants.find((p: any) => p.display_name === userObj.displayName || p.user_id === userObj.id);
            if (currentP) {
              setJoinedParticipant(currentP);
              localStorage.setItem(`participant_${sessionId}`, JSON.stringify(currentP));
            } else if (localStorage.getItem('accessToken') && fetchedSession?.session_code) {
              const joinRes = await fetch('/api/sessions/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
                body: JSON.stringify({ sessionCode: fetchedSession.session_code, displayName: userObj.displayName })
              });
              const joinJson = await joinRes.json();
              if (joinJson.success?.participant) {
                currentP = joinJson.data.participant;
                setJoinedParticipant(currentP);
                localStorage.setItem(`participant_${sessionId}`, JSON.stringify(currentP));
              }
            }
          } catch {}
        }

        if (currentP) {
          const match = fetchedParticipants.find((p: any) => p.id === currentP.id);
          if (match?.score !== undefined) setScore(match.score);
        }
      } else {
        setErrorMsg(json.error?.message || 'Failed to sync with live session.');
      }
    } catch {
      setErrorMsg('Failed to connect to live quiz API.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) { alert('Please enter a name.'); return; }
    setJoiningGuest(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ sessionCode: sessionData.session_code, displayName: guestName.trim() })
      });
      const json = await res.json();
      if (json.success) {
        const p = json.data.participant;
        setJoinedParticipant(p);
        localStorage.setItem(`participant_${sessionId}`, JSON.stringify(p));
        fetchSessionState();
      } else {
        alert(json.error?.message || 'Failed to join session.');
      }
    } catch { alert('Failed to join session.'); }
    finally { setJoiningGuest(false); }
  };

  const submitAnswer = async (answerStr: string) => {
    if (answerSubmitted || !currentQuestion) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (graceRef.current) clearInterval(graceRef.current);

    setAnswerSubmitted(true);
    setAnsweredQuestionIds(prev => ({ ...prev, [currentQuestion.id]: true }));

    const elapsed = answerStartTimeRef.current ? Math.floor((Date.now() - answerStartTimeRef.current) / 1000) : undefined;

    let pId = joinedParticipant?.id;
    if (!pId) {
      const stored = localStorage.getItem(`participant_${sessionId}`);
      if (stored) { try { pId = JSON.parse(stored).id; } catch {} }
    }

    if (pId) {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/submit-answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: pId, selectedAnswer: answerStr, elapsedSeconds: elapsed })
        });
        const json = await res.json();
        if (json.success && json.data) {
          setScore(json.data.score);
          fetchSessionState();
        }
      } catch (e) { console.error('Answer submit failed:', e); }
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  function parseOptions(q: any): string[] {
    try { return typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []); }
    catch { return []; }
  }

  const isMediaType = currentQuestion?.question_type === 'audio_mcq' || currentQuestion?.question_type === 'video_mcq';
  const parsedOptions = currentQuestion ? parseOptions(currentQuestion) : [];
  const qType = currentQuestion?.question_type || 'multiple_choice';
  const timeLimit = currentQuestion?.time_limit ?? 30;
  const noTimer = timeLimit === 0;

  // ── Loading / Error / Guest Join ──────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8">
      <div className="text-headline-sm font-bold text-primary animate-pulse">Connecting to Live Classroom…</div>
    </div>
  );

  if (errorMsg || !sessionData) return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8">
      <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-2xl text-center font-bold max-w-md w-full">
        {errorMsg || 'Session not found.'}
        <div className="mt-4">
          <button onClick={() => navigate('/login')} className="bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-semibold">Return to Login</button>
        </div>
      </div>
    </div>
  );

  if (!joinedParticipant && sessionData.status !== 'completed') return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-surface flex flex-col items-center justify-center p-4">
      <div className="bg-white border border-outline-variant rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-[36px]">sports_esports</span>
        </div>
        <div>
          <span className="bg-primary/10 text-primary font-bold text-xs px-3 py-1 rounded-full border border-primary/20">PIN: {sessionData.session_code}</span>
          <h2 className="text-headline-md font-extrabold text-on-surface mt-2">{sessionData.quiz?.title}</h2>
          <p className="text-xs text-on-surface-variant mt-1">Enter your Nickname to join the live room!</p>
        </div>
        <form onSubmit={handleGuestJoinSubmit} className="w-full flex flex-col gap-4">
          <input type="text" className="w-full border-2 border-primary/40 focus:border-primary rounded-xl px-4 py-3 text-headline-sm font-bold text-center focus:outline-none bg-primary/5"
            placeholder="e.g. Jordan" value={guestName} onChange={e => setGuestName(e.target.value)} required autoFocus />
          <button type="submit" disabled={joiningGuest}
            className="bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary/90 transition shadow-lg text-body-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">login</span>
            {joiningGuest ? 'Joining Room…' : 'Join Live Quiz Room'}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full">

      {/* Top Header */}
      <div className="bg-white border border-outline-variant rounded-2xl p-4 md:p-6 shadow-sm flex justify-between items-center mb-6">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider block">Live Game Room</span>
          <h2 className="text-headline-sm font-bold text-on-surface truncate">{sessionData.quiz?.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] font-bold uppercase block">Player</span>
            <span className="text-xs font-extrabold">{joinedParticipant?.display_name || 'Guest'}</span>
          </div>
          <div className="bg-green-50 text-green-800 border border-green-200 px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] font-bold uppercase block">Score</span>
            <span className="text-xs font-extrabold">{score} Pts</span>
          </div>
        </div>
      </div>

      {/* Lobby Waiting */}
      {sessionData.status === 'waiting' && (
        <div className="bg-white border border-outline-variant rounded-2xl p-12 text-center flex flex-col items-center gap-6 shadow-sm">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse">
            <span className="material-symbols-outlined text-[40px]">hourglass_top</span>
          </div>
          <div>
            <h3 className="text-headline-md font-bold text-on-surface mb-2">Connected to Lobby!</h3>
            <p className="text-body-md text-on-surface-variant">Waiting for the Faculty Host to launch Question 1…</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl max-w-md w-full text-xs font-semibold text-slate-700 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm text-primary">group</span>
            Total Joined: <strong className="text-primary">{participants.length}</strong>
          </div>
        </div>
      )}

      {/* Paused */}
      {sessionData.status === 'paused' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-12 text-center flex flex-col items-center gap-4 shadow-md">
          <span className="material-symbols-outlined text-[48px] text-amber-600">pause_circle</span>
          <h3 className="text-headline-md font-bold text-amber-900">Game Paused by Host</h3>
          <p className="text-body-md text-amber-800">Please standby. The host will resume shortly.</p>
        </div>
      )}

      {/* Active Question */}
      {sessionData.status === 'active' && currentQuestion && (
        <div className="bg-white border border-outline-variant rounded-2xl p-6 md:p-10 shadow-sm flex flex-col gap-6">

          {/* Question Meta */}
          <div className="flex justify-between items-center border-b border-outline-variant pb-4 flex-wrap gap-2">
            <span className="bg-primary text-white font-extrabold text-xs px-3.5 py-1 rounded-full">
              Question {sessionData.current_question_index + 1} of {totalQuestions}
            </span>
            <div className="flex items-center gap-3">
              {/* Timer display */}
              {!noTimer && countdown !== null && sessionData.is_options_revealed && !answerSubmitted && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-sm border ${countdown <= 5 ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : countdown <= 10 ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                  <span className="material-symbols-outlined text-sm">timer</span>
                  {countdown}s
                </div>
              )}
              {noTimer && (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">all_inclusive</span>No Timer
                </span>
              )}
              {/* Grace period counter */}
              {graceCountdown !== null && graceCountdown > 0 && !answerSubmitted && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-sm border bg-cyan-50 border-cyan-300 text-cyan-700 animate-pulse">
                  <span className="material-symbols-outlined text-sm">hourglass_bottom</span>
                  Grace: {graceCountdown}s
                </div>
              )}
              <span className="text-xs font-bold text-on-surface-variant">⭐ {currentQuestion.points} Pts</span>
            </div>
          </div>

          {/* Timer progress bar */}
          {!noTimer && countdown !== null && timeLimit > 0 && sessionData.is_options_revealed && !answerSubmitted && (
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden -mt-3">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${countdown <= 5 ? 'bg-red-500' : countdown <= 10 ? 'bg-amber-400' : 'bg-primary'}`}
                style={{ width: `${(countdown / timeLimit) * 100}%` }}
              />
            </div>
          )}

          {/* Question Text */}
          <h2 className="text-headline-md md:text-headline-lg font-bold text-on-surface leading-snug">
            {currentQuestion.question_text}
          </h2>

          {/* OPTIONS REVEAL WAITING */}
          {!sessionData.is_options_revealed ? (
            <div className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary font-extrabold text-headline-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">menu_book</span>
              </div>
              <h3 className="text-headline-sm font-bold text-primary">Read the Question Prompt</h3>
              <p className="text-xs text-on-surface-variant">Options will reveal shortly!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">

              {/* ── Audio MCQ ── */}
              {qType === 'audio_mcq' && currentQuestion.media_url && (
                <div className="flex flex-col gap-2">
                  <audio
                    ref={mediaRef as React.RefObject<HTMLAudioElement>}
                    controls
                    src={currentQuestion.media_url}
                    className="w-full rounded-lg"
                    onEnded={handleMediaEnded}
                  />
                  {mediaEnded && !answerSubmitted && graceCountdown !== null && (
                    <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-200 text-cyan-800 p-3 rounded-xl text-xs font-bold">
                      <span className="material-symbols-outlined text-sm">hourglass_bottom</span>
                      Audio ended — answer in the next <strong>{graceCountdown}s</strong>!
                    </div>
                  )}
                  {mediaEnded && !answerSubmitted && graceCountdown === 0 && (
                    <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Time's up for this question!
                    </div>
                  )}
                </div>
              )}

              {/* ── Video MCQ ── */}
              {qType === 'video_mcq' && currentQuestion.media_url && (
                <div className="flex flex-col gap-2">
                  <video
                    ref={mediaRef as React.RefObject<HTMLVideoElement>}
                    controls
                    src={currentQuestion.media_url}
                    className="w-full rounded-xl max-h-64 object-contain bg-black"
                    onEnded={handleMediaEnded}
                  />
                  {!mediaEnded && (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 p-3 rounded-xl text-xs font-semibold">
                      <span className="material-symbols-outlined text-sm animate-pulse text-primary">play_circle</span>
                      Watch the full video, then pick your answer below.
                    </div>
                  )}
                  {mediaEnded && !answerSubmitted && graceCountdown !== null && graceCountdown > 0 && (
                    <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-200 text-cyan-800 p-3 rounded-xl text-xs font-bold">
                      <span className="material-symbols-outlined text-sm">hourglass_bottom</span>
                      Video ended — <strong>{graceCountdown}s</strong> left to answer!
                      <div className="ml-auto h-1.5 w-24 bg-cyan-200 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-600 rounded-full transition-all duration-1000"
                          style={{ width: `${(graceCountdown / (currentQuestion.grace_time || 15)) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── MCQ / True-False / Audio / Video options ── */}
              {(qType === 'multiple_choice' || qType === 'true_false' || qType === 'audio_mcq' || qType === 'video_mcq') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {parsedOptions.map((opt: string, idx: number) => {
                    const isSelected = selectedOption === opt;
                    const locked = answerSubmitted || (isMediaType && !mediaEnded && qType !== 'audio_mcq');
                    return (
                      <button key={idx} disabled={locked || selectedOption !== null}
                        onClick={() => { setSelectedOption(opt); submitAnswer(opt); }}
                        className={`p-5 rounded-2xl border-2 text-left font-bold text-body-md transition flex items-center gap-4 active:scale-95 ${isSelected ? 'bg-primary text-white border-primary shadow-xl' : selectedOption !== null || locked ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white hover:bg-primary/5 border-outline-variant hover:border-primary text-on-surface'}`}>
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-white text-primary' : 'bg-slate-100 text-slate-700'}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-grow">{opt}</span>
                        {isSelected && <span className="material-symbols-outlined text-white">check_circle</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Multi-Select ── */}
              {qType === 'multi_select' && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold text-on-surface-variant">Select all correct answers, then tap Submit.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parsedOptions.map((opt: string, idx: number) => {
                      const isChosen = selectedOptions.includes(opt);
                      return (
                        <button key={idx} type="button" disabled={answerSubmitted}
                          onClick={() => setSelectedOptions(prev => isChosen ? prev.filter(x => x !== opt) : [...prev, opt])}
                          className={`p-4 rounded-2xl border-2 text-left font-semibold flex items-center gap-3 transition ${isChosen ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant hover:border-primary'}`}>
                          <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition ${isChosen ? 'bg-primary border-primary text-white' : 'border-outline'}`}>
                            {isChosen ? <span className="material-symbols-outlined text-xs">check</span> : String.fromCharCode(65 + idx)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  {!answerSubmitted && (
                    <button onClick={() => submitAnswer(selectedOptions.join(','))}
                      disabled={selectedOptions.length === 0}
                      className="self-end bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow active:scale-95 disabled:opacity-50">
                      Submit Selection ({selectedOptions.length} chosen)
                    </button>
                  )}
                </div>
              )}

              {/* ── Short Answer ── */}
              {qType === 'short_answer' && (
                <div className="flex flex-col gap-3">
                  <input type="text" autoFocus disabled={answerSubmitted}
                    className="w-full border-2 border-primary/40 focus:border-primary rounded-xl px-4 py-3 text-headline-sm font-bold text-center focus:outline-none bg-primary/5 disabled:opacity-60"
                    placeholder="Type your answer here…"
                    value={typedAnswer} onChange={e => setTypedAnswer(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && typedAnswer.trim()) submitAnswer(typedAnswer.trim()); }} />
                  {!answerSubmitted && (
                    <button onClick={() => submitAnswer(typedAnswer.trim())} disabled={!typedAnswer.trim()}
                      className="self-center bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow active:scale-95 disabled:opacity-50">
                      Submit Answer
                    </button>
                  )}
                </div>
              )}

              {/* ── Fill in the Blank ── */}
              {qType === 'fill_blank' && (
                <div className="flex flex-col gap-3">
                  <div className="text-headline-md font-bold text-on-surface bg-slate-50 border border-slate-200 rounded-xl p-4 leading-loose">
                    {currentQuestion.question_text.split('___').map((part: string, i: number, arr: string[]) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <input type="text" disabled={answerSubmitted}
                            className="inline-block border-b-2 border-primary bg-transparent text-center font-bold text-primary focus:outline-none min-w-[100px] w-32 mx-1 disabled:opacity-60"
                            placeholder="___"
                            value={typedAnswer} onChange={e => setTypedAnswer(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && typedAnswer.trim()) submitAnswer(typedAnswer.trim()); }} />
                        )}
                      </span>
                    ))}
                  </div>
                  {!answerSubmitted && (
                    <button onClick={() => submitAnswer(typedAnswer.trim())} disabled={!typedAnswer.trim()}
                      className="self-center bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow active:scale-95 disabled:opacity-50">
                      Submit Answer
                    </button>
                  )}
                </div>
              )}

              {/* ── Ordering ── */}
              {qType === 'ordering' && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold text-on-surface-variant">Arrange the items in the correct order using the arrows.</p>
                  <div className="flex flex-col gap-2">
                    {(orderedItems.length ? orderedItems : parsedOptions).map((item: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-white border border-outline-variant rounded-xl p-3.5 shadow-sm">
                        <span className="w-7 h-7 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                        <span className="flex-grow text-sm font-semibold text-on-surface">{item}</span>
                        <div className="flex flex-col gap-0.5">
                          <button disabled={idx === 0 || answerSubmitted} onClick={() => {
                            const arr = [...orderedItems]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; setOrderedItems(arr);
                          }} className="text-slate-400 hover:text-primary disabled:opacity-20">
                            <span className="material-symbols-outlined text-sm">arrow_upward</span>
                          </button>
                          <button disabled={idx === orderedItems.length - 1 || answerSubmitted} onClick={() => {
                            const arr = [...orderedItems]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; setOrderedItems(arr);
                          }} className="text-slate-400 hover:text-primary disabled:opacity-20">
                            <span className="material-symbols-outlined text-sm">arrow_downward</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!answerSubmitted && (
                    <button onClick={() => submitAnswer(orderedItems.join('|'))}
                      className="self-center bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow active:scale-95">
                      Lock In Order
                    </button>
                  )}
                </div>
              )}

              {/* ── Match the Following ── */}
              {qType === 'match_following' && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold text-on-surface-variant">Click a left item, then click its matching right item to pair them.</p>
                  <MatchFollowingBoard
                    options={parsedOptions}
                    selections={matchSelections}
                    submitted={answerSubmitted}
                    onSelect={(left, right) => {
                      const updated = { ...matchSelections, [left]: right };
                      setMatchSelections(updated);
                    }}
                    onSubmit={() => {
                      const ansStr = Object.entries(matchSelections).map(([l, r]) => `${l}:${r}`).join(',');
                      submitAnswer(ansStr);
                    }}
                  />
                </div>
              )}

              {/* ── Image Choice ── */}
              {qType === 'image_choice' && (
                <div className="grid grid-cols-2 gap-4">
                  {parsedOptions.map((imgUrl: string, idx: number) => {
                    const isSelected = selectedOption === String(idx);
                    return (
                      <button key={idx} disabled={answerSubmitted || selectedOption !== null}
                        onClick={() => { setSelectedOption(String(idx)); submitAnswer(String(idx)); }}
                        className={`rounded-2xl border-4 overflow-hidden transition active:scale-95 ${isSelected ? 'border-primary shadow-xl' : 'border-outline-variant hover:border-primary/50'}`}>
                        {imgUrl ? (
                          <img src={imgUrl} alt={`Option ${String.fromCharCode(65 + idx)}`} className="w-full h-32 object-cover" />
                        ) : (
                          <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-3xl">image</span>
                          </div>
                        )}
                        <div className={`py-2 text-xs font-bold text-center flex items-center justify-center gap-1 ${isSelected ? 'bg-primary text-white' : 'bg-white text-on-surface-variant'}`}>
                          {String.fromCharCode(65 + idx)} {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* Submitted confirmation */}
          {answerSubmitted && (
            <div className="bg-green-50 border border-green-300 text-green-800 p-4 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Answer recorded! Waiting for host to move to the next question…
            </div>
          )}
        </div>
      )}

      {/* Completed */}
      {sessionData.status === 'completed' && (
        <div className="bg-white border border-outline-variant rounded-2xl p-12 text-center flex flex-col items-center gap-6 shadow-sm">
          <div className="w-20 h-20 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[40px]">emoji_events</span>
          </div>
          <div>
            <h2 className="text-headline-lg font-bold text-on-surface mb-1">Quiz Completed!</h2>
            <p className="text-body-md text-on-surface-variant">Your final score: <strong className="text-primary font-extrabold text-headline-sm">{score} Pts</strong></p>
          </div>
          <button onClick={() => navigate('/dashboard')}
            className="bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow-lg text-label-md">
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Match the Following Board ─────────────────────────────────────────────────

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
  const rightItems = [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5); // shuffled on first render

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
