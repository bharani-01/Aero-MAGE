import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.tsx';

export default function HostLiveSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // 3-Second Question Reading Reveal Timer
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);

  // Toggle View for Joined Participants List
  const [showParticipantsList, setShowParticipantsList] = useState(false);

  useEffect(() => {
    fetchSessionState();
    const interval = setInterval(fetchSessionState, 1000); // 1.0s fast polling for real-time scoreboard sync
    return () => clearInterval(interval);
  }, [sessionId]);

  // Handle 3s Question Prompt Reading Countdown
  useEffect(() => {
    if (sessionData?.status === 'active' && !sessionData?.is_options_revealed) {
      setRevealCountdown(3);
      const timer = setInterval(() => {
        setRevealCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            // Automatically trigger options reveal on host & students
            handleHostAction('reveal_options');
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setRevealCountdown(null);
    }
  }, [sessionData?.current_question_index, sessionData?.status, sessionData?.is_options_revealed]);

  const fetchSessionState = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setSessionData(json.data.session);
        setCurrentQuestion(json.data.currentQuestion);
        setTotalQuestions(json.data.totalQuestions);
        setParticipants(json.data.participants || []);
      } else {
        setErrorMsg(json.error?.message || 'Failed to sync live session state.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to live quiz API.');
    } finally {
      setLoading(false);
    }
  };

  const handleHostAction = async (action: 'start' | 'reveal_options' | 'pause' | 'resume' | 'next_question' | 'end') => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/host-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (json.success) {
        fetchSessionState();
      } else {
        alert(json.error?.message || 'Action failed.');
      }
    } catch (err) {
      alert('Failed to execute host command.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="faculty">
        <div className="p-12 text-center font-bold text-primary">Connecting to Live Quiz Host Console...</div>
      </DashboardLayout>
    );
  }

  if (errorMsg || !sessionData) {
    return (
      <DashboardLayout role="faculty">
        <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-2xl text-center font-bold">
          {errorMsg || 'Session not found.'}
          <div className="mt-4">
            <button onClick={() => navigate('/faculty/quizzes')} className="bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-semibold">
              Return to Quizzes Console
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const parsedOptions: string[] = currentQuestion ? (
    typeof currentQuestion.options_json === 'string' 
      ? JSON.parse(currentQuestion.options_json) 
      : (currentQuestion.options_json || [])
  ) : [];

  // Live Scoreboard Sorted Participants
  const sortedParticipants = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));

  const studentJoinUrl = `${window.location.origin}/student/session/${sessionData.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(studentJoinUrl)}`;

  return (
    <DashboardLayout role="faculty">
      <div className="flex flex-col gap-8">
        
        {/* Top Control Header */}
        <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                sessionData.status === 'waiting'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200 animate-pulse'
                  : sessionData.status === 'active'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : sessionData.status === 'paused'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                ● Status: {sessionData.status}
              </span>

              <span className="text-label-md font-bold text-on-surface">
                Quiz: <span className="text-primary">{sessionData.quiz?.title}</span>
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">Host Controls &amp; Synchronized Live Classroom View</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-primary/10 border border-primary/20 px-5 py-2 rounded-xl text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">Room PIN Access Code</span>
              <span className="text-headline-sm font-extrabold text-primary font-mono tracking-widest">
                {sessionData.session_code}
              </span>
            </div>

            <button
              onClick={() => navigate('/faculty/quizzes')}
              className="text-xs font-semibold text-on-surface-variant border border-outline hover:bg-slate-100 px-4 py-2.5 rounded-xl transition"
            >
              Exit Host Mode
            </button>
          </div>
        </div>

        {/* PHASE 1: CLASSROOM HOST LOBBY (QR Code + Room PIN + Toggleable Participants List) */}
        {sessionData.status === 'waiting' && (
          <div className="bg-white border border-outline-variant rounded-2xl p-10 shadow-sm flex flex-col items-center text-center gap-8">
            
            {/* Header Info */}
            <div className="max-w-xl flex flex-col items-center">
              <span className="bg-primary/10 text-primary font-bold text-xs px-4 py-1.5 rounded-full mb-3 border border-primary/20 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">sensors</span>
                LIVE CLASSROOM HOST LOBBY
              </span>
              <h2 className="text-headline-lg font-extrabold text-on-surface mb-2">Join The Quiz Game</h2>
              <p className="text-body-md text-on-surface-variant">
                Scan the QR code with your phone camera or enter the 6-Digit PIN to compete in real time.
              </p>
            </div>

            {/* QR CODE & ROOM ACCESS PIN CARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 max-w-3xl w-full shadow-sm">
              
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-white border border-outline-variant rounded-2xl shadow-sm">
                <img 
                  src={qrCodeUrl} 
                  alt="Scan to Join Live Quiz" 
                  className="w-52 h-52 object-contain rounded-lg"
                />
                <span className="text-[11px] font-bold text-on-surface-variant mt-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-primary">qr_code_scanner</span>
                  Scan with Phone Camera to Join
                </span>
              </div>

              {/* Room Access PIN & Direct Link */}
              <div className="flex flex-col gap-6 text-left">
                <div>
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">6-Digit Room Access PIN:</span>
                  <div className="bg-primary text-white p-4 rounded-2xl text-center shadow-lg">
                    <span className="text-4xl font-black font-mono tracking-widest block">
                      {sessionData.session_code}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Direct Join URL:</span>
                  <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl flex justify-between items-center text-xs font-mono font-medium text-slate-800 overflow-hidden">
                    <span className="truncate">{studentJoinUrl}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(studentJoinUrl);
                        alert('Join link copied to clipboard!');
                      }}
                      className="text-primary font-bold hover:underline ml-2 flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 p-3 rounded-xl border border-green-200">
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  Guests and Students can join using their Nickname/Name!
                </div>
              </div>

            </div>

            {/* TOGGLEABLE CONNECTED PARTICIPANTS LIST */}
            <div className="w-full max-w-3xl bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setShowParticipantsList(!showParticipantsList)}
                className="w-full px-6 py-4 flex justify-between items-center bg-white hover:bg-slate-50 transition border-b border-outline-variant/60 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                    {participants.length}
                  </span>
                  <span className="text-label-md font-bold text-on-surface">
                    Connected Participants ({participants.length} Students)
                  </span>
                  <span className="text-xs text-green-600 font-semibold animate-pulse flex items-center gap-1">
                    ● Live
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <span>{showParticipantsList ? 'Hide List ▲' : 'View Joined Students ▼'}</span>
                </div>
              </button>

              {/* Expanded Participants Drawer */}
              {showParticipantsList && (
                <div className="p-6 bg-slate-50/50 animate-scale">
                  {participants.length === 0 ? (
                    <div className="py-6 text-center text-on-surface-variant font-medium text-xs">
                      No students connected yet. Scan QR or enter PIN <span className="font-mono font-bold">{sessionData.session_code}</span> to enter!
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {participants.map((p) => (
                        <div key={p.id} className="bg-white border border-outline-variant/80 p-3 rounded-xl shadow-sm flex items-center gap-2.5 text-left">
                          <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center">
                            {p.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-xs font-bold text-on-surface block truncate">{p.display_name}</span>
                            <span className="text-[10px] text-green-600 font-semibold">● Connected</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Start Game Action */}
            <button
              onClick={() => handleHostAction('start')}
              disabled={participants.length === 0}
              className="bg-primary text-white font-bold px-12 py-4 rounded-2xl hover:bg-primary/90 transition shadow-xl text-body-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              <span className="material-symbols-outlined text-2xl">play_circle</span>
              START LIVE QUIZ GAME NOW ({participants.length} Joined)
            </button>
          </div>
        )}

        {/* PHASE 2: ACTIVE QUESTION CONTROL & DISPLAY */}
        {(sessionData.status === 'active' || sessionData.status === 'paused') && currentQuestion && (
          <div className="flex flex-col gap-6">
            
            {/* Question Card */}
            <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-sm flex flex-col gap-6 relative overflow-hidden">
              
              {/* Question Meta Header */}
              <div className="flex justify-between items-center border-b border-outline-variant/80 pb-4">
                <span className="bg-primary text-white text-xs font-extrabold px-3.5 py-1 rounded-full">
                  Question {sessionData.current_question_index + 1} of {totalQuestions}
                </span>

                <div className="flex items-center gap-3 flex-wrap">
                  {currentQuestion.time_limit === 0 ? (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">all_inclusive</span>No Timer
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-on-surface-variant">⏱ {currentQuestion.time_limit}s</span>
                  )}
                  {currentQuestion.grace_time > 0 && (
                    <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-xl flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">hourglass_bottom</span>+{currentQuestion.grace_time}s grace
                    </span>
                  )}
                  <span className="text-xs font-bold text-on-surface-variant">⭐ {currentQuestion.points} Pts</span>
                </div>
              </div>

              {/* Question Text */}
              <div className="py-4">
                <h2 className="text-headline-md md:text-headline-lg font-bold text-on-surface leading-snug">
                  {currentQuestion.question_text}
                </h2>
              </div>

              {/* Reveal Sequence & Options Display */}
              {!sessionData.is_options_revealed ? (
                <div className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary font-extrabold text-headline-sm flex items-center justify-center animate-ping">
                    {revealCountdown ?? 3}
                  </div>
                  <h4 className="text-headline-sm font-bold text-primary">Allowing Students to Read Question First...</h4>
                  <p className="text-xs text-on-surface-variant">Options reveal in {revealCountdown ?? 3}s.</p>
                  <button onClick={() => handleHostAction('reveal_options')}
                    className="mt-2 bg-primary text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-primary/90 transition shadow flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">visibility</span> Reveal Options Now
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parsedOptions.map((opt: string, idx: number) => {
                      const isCorrect = (() => {
                        const ca = currentQuestion.correct_answer || '';
                        const qType = currentQuestion.question_type || 'multiple_choice';
                        if (qType === 'multi_select') return ca.split(',').map((s: string) => s.trim()).includes(opt);
                        return opt === ca;
                      })();
                      return (
                        <div key={idx}
                          className={`p-5 rounded-2xl border-2 flex items-center gap-4 text-body-md font-semibold transition ${
                            isCorrect
                              ? 'bg-green-50 border-green-500 text-green-900 shadow-md font-bold'
                              : 'bg-surface-container-lowest border-outline-variant/80 text-on-surface'
                          }`}>
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isCorrect ? 'bg-green-600 text-white' : 'bg-surface-container text-on-surface-variant'
                          }`}>{String.fromCharCode(65 + idx)}</span>
                          <span className="flex-grow">{opt}</span>
                          {isCorrect && <span className="bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1"><span className="material-symbols-outlined text-xs">check</span> Correct</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Short answer / Fill blank correct answer display */}
                  {(currentQuestion.question_type === 'short_answer' || currentQuestion.question_type === 'fill_blank') && (
                    <div className="bg-green-50 border border-green-300 text-green-800 p-4 rounded-xl">
                      <span className="text-xs font-bold uppercase flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-xs">check_circle</span> Correct Answer:</span>
                      <span className="text-headline-sm font-extrabold">{currentQuestion.correct_answer}</span>
                    </div>
                  )}

                  {/* Ordering correct sequence */}
                  {currentQuestion.question_type === 'ordering' && (
                    <div className="bg-teal-50 border border-teal-300 text-teal-800 p-4 rounded-xl">
                      <span className="text-xs font-bold uppercase flex items-center gap-1 mb-2"><span className="material-symbols-outlined text-xs">check_circle</span> Correct Sequence:</span>
                      <div className="flex flex-col gap-1.5">
                        {String(currentQuestion.correct_answer || '').split('|').map((item: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm font-semibold">
                            <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Match the following correct pairs */}
                  {currentQuestion.question_type === 'match_following' && (
                    <div className="bg-rose-50 border border-rose-300 text-rose-800 p-4 rounded-xl">
                      <span className="text-xs font-bold uppercase flex items-center gap-1 mb-2"><span className="material-symbols-outlined text-xs">check_circle</span> Correct Matches:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {String(currentQuestion.correct_answer || '').split(',').map((pair: string, i: number) => {
                          const [l, r] = pair.split(':');
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs font-semibold bg-white border border-rose-200 p-2 rounded-lg">
                              <span className="text-rose-800 font-bold">{l}</span>
                              <span className="material-symbols-outlined text-xs text-rose-500">arrow_forward</span>
                              <span className="text-green-700 font-bold">{r}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Host Live Action Control Bar */}
            <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                {sessionData.status === 'active' ? (
                  <button
                    onClick={() => handleHostAction('pause')}
                    className="bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-amber-700 transition text-xs shadow flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">pause</span>
                    Pause Quiz
                  </button>
                ) : (
                  <button
                    onClick={() => handleHostAction('resume')}
                    className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-green-700 transition text-xs shadow flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                    Resume Quiz
                  </button>
                )}

                {!sessionData.is_options_revealed && (
                  <button
                    onClick={() => handleHostAction('reveal_options')}
                    className="bg-primary text-white font-bold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition text-xs shadow flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    Reveal Options
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleHostAction('next_question')}
                  className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition text-xs shadow flex items-center gap-1.5 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">skip_next</span>
                  {sessionData.current_question_index + 1 >= totalQuestions ? 'Finish Quiz' : 'Next Question'}
                </button>

                <button
                  onClick={() => handleHostAction('end')}
                  className="bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-red-700 transition text-xs shadow flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">stop</span>
                  End Quiz
                </button>
              </div>
            </div>

            {/* Live Standings Scoreboard (Re-ordered dynamically by score descending) */}
            <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-headline-sm font-bold text-on-surface">Live Class Scoreboard</h3>
                <span className="text-xs font-semibold text-green-600 animate-pulse flex items-center gap-1">
                  ● Real-time Live Sync
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedParticipants.map((p, idx) => (
                  <div key={p.id} className="bg-surface-container-lowest border border-outline-variant p-3.5 rounded-xl flex justify-between items-center shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center ${
                        idx === 0 ? 'bg-amber-400 text-slate-900 shadow' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-on-surface">{p.display_name}</span>
                    </div>
                    <span className="text-xs font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                      {p.score || 0} Pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* PHASE 3: COMPLETED RESULTS STANDINGS */}
        {sessionData.status === 'completed' && (
          <div className="bg-white border border-outline-variant rounded-2xl p-12 shadow-sm flex flex-col items-center text-center gap-8">
            <div className="w-20 h-20 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[40px]">emoji_events</span>
            </div>
            <div>
              <h2 className="text-headline-lg font-bold text-on-surface mb-2">Live Quiz Completed!</h2>
              <p className="text-body-md text-on-surface-variant">Here are the final standings for <span className="font-bold text-primary">{sessionData.quiz?.title}</span>.</p>
            </div>

            <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col gap-3">
              {sortedParticipants.map((p, idx) => (
                <div key={p.id} className={`p-4 rounded-xl flex justify-between items-center border ${
                  idx === 0 ? 'bg-amber-50 border-amber-300 font-bold text-amber-900 shadow-sm' : 'bg-white border-outline-variant'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-body-md font-semibold">{p.display_name}</span>
                  </div>
                  <span className="text-body-md font-extrabold text-primary">{p.score || 0} Pts</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/faculty/quizzes')}
              className="bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow-lg text-label-md"
            >
              Return to Quizzes Console
            </button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
