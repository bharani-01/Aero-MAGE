import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.tsx';
import QuizShareModal from '../../components/QuizShareModal.tsx';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchQuery] = useState('');
  const [user, setUser] = useState<any>(null);

  const [typedCode, setTypedCode] = useState('');

  // Quizzes state
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);

  // Joined rooms state
  const [joinedRooms, setJoinedRooms] = useState<any[]>([]);
  const [joinedRoomsLoading, setJoinedRoomsLoading] = useState(false);

  // Share modal state
  const [selectedShareQuiz, setSelectedShareQuiz] = useState<any | null>(null);
  
  // QR scanner state
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedQrRoomCode, setSelectedQrRoomCode] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success'>('idle');

  useEffect(() => {
    // Load persisted user info
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch {}
    }
    fetchQuizzes();
    fetchJoinedRooms();
  }, []);

  const fetchQuizzes = async () => {
    setQuizzesLoading(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/quizzes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setQuizzes(json.data);
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setQuizzesLoading(false);
    }
  };

  const fetchJoinedRooms = async () => {
    setJoinedRoomsLoading(true);
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const res = await fetch('/api/rooms/joined/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setJoinedRooms(json.data);
      }
    } catch (err) {
      console.error('Error fetching joined rooms:', err);
    } finally {
      setJoinedRoomsLoading(false);
    }
  };

  const handleJoinByCode = async (codeToJoin?: string) => {
    const cleanCode = (codeToJoin || typedCode).trim().toUpperCase();
    if (!cleanCode) {
      alert('Please enter a 6-digit access code.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('Authentication token missing. Please log in again.');
      return;
    }

    // Check if live session first
    if (cleanCode.length === 6) {
      try {
        const liveRes = await fetch(`/api/sessions/${cleanCode}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ displayName: user?.displayName || 'Student Guest' })
        });
        const liveJson = await liveRes.json();
        if (liveJson.success && liveJson.data?.session?.id) {
          navigate(`/student/session/${liveJson.data.session.id}`);
          return;
        }
      } catch {}
    }

    // Otherwise join classroom stream page
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomCode: cleanCode })
      });
      const json = await res.json();

      if (json.success && json.room) {
        setTypedCode('');
        setShowQrModal(false);
        fetchJoinedRooms();
        navigate(`/classroom/${json.room.id}`);
      } else {
        alert(json.error?.message || 'Invalid classroom code or inactive room.');
      }
    } catch (err) {
      alert('Failed to connect to classroom.');
    }
  };

  const handleSimulateQrScan = () => {
    if (!selectedQrRoomCode) {
      alert('Enter a room code to simulate scanning.');
      return;
    }
    setScanStatus('scanning');
    
    setTimeout(() => {
      setScanStatus('success');
      setTimeout(() => {
        handleJoinByCode(selectedQrRoomCode);
        setShowQrModal(false);
        setScanStatus('idle');
      }, 1000);
    }, 1500);
  };

  const handleStartQuiz = (quizId: string) => {
    navigate(`/student/quiz/${quizId}`);
  };

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (quiz.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout role="student">
      <div className="flex flex-col gap-8">
        
        {/* Banner Section */}
        <section className="relative w-full rounded-3xl overflow-hidden bg-primary-container p-6 md:p-10 flex flex-col md:flex-row items-center justify-between text-on-primary-container shadow-md">
          <div className="max-w-xl text-center md:text-left z-10">
            <span className="bg-white/20 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              Welcome Back
            </span>
            <h2 className="text-headline-md md:text-[32px] md:leading-tight font-black text-white mt-2 mb-2">
              Welcome back, {user?.displayName || user?.display_name || 'Student'}! 👋
            </h2>
            <p className="text-xs text-white/90 font-medium">
              Ready to challenge your knowledge, join classroom streams, or explore public quizzes today?
            </p>
          </div>

          <div className="flex -space-x-3 mt-6 md:mt-0 z-10">
            <img className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover" alt="Student 1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1Znv3gOtLaV-eXDKmgKb0cJl_CbpHG3GHiOgrqi9maY-_K16xxext3uak9B0qcsyWnRIdIPIQuDdhh8cmBXYMBSL2OPW5CzwYu8vCuHPO7L1meT_PBnT0uDv2XA95vtYY8GdIHLqb8wdsaHmAyvUYMlEsLUl699gfvBKC9020o1pv4zav1Nr-SPhBmAY17SPLV2urv7CI2MfQhdKip_UwUGYLjWrO8cTqSB0zowmDERyaf1o28LLbbP4HQ4EIhJsk2YruoyhIML0" />
            <img className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover z-10 -translate-y-1" alt="Student 2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuQ1LTtKpdO_cMF8l0-JLc1lgYvFGqwX5vWoiypWSxn41aRr1iaKmAckVQGGoKqdJ9O77HpDCHNLZRO2oQnAkG4B-Dy88poO6zPvgVikItwSkXivTHCMEjzGk0KcJAdWFKp-vztvmeygACwpNaMDyY4edhAes_sk93teR_QNg5HbaSkCWEsm12OzUVZx7jvDXWDMu6V3CPnoDlhMyXegevqAJJ-Th2ArVj2GxyspEyaZyrQkBIdlp_UceiQUH-_AyXnb_56c2Rq90" />
            <img className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover" alt="Student 3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnBA5ZD2b2_pPU8Zp54zpJwqfML07rwyacbMdb62Ud8bEv045L5E7ZZCWUkLIBPfUkHGQ6O_WhqHNIR3fhL3C7HxHBdWu8M3klxAMj4hhq1dkGuixQ2Z2opn4LnwcI34i3giJ-e2FPskYuMJy9rKbjhp5M-RynEGpz1os0gFxIBEIFl_CUYvNwdbD1Hk58vAAyggdCGAi3zU7tq2RjWY8ynIU5auE-YcxEXdFs3XQkEV9YbXdyE9H566Mw77ExHlHufuG_kMjtDlU" />
            <div className="w-12 h-12 rounded-full border-2 border-white bg-secondary-container text-on-secondary-container font-extrabold text-xs flex items-center justify-center shadow-md">
              +12
            </div>
          </div>
        </section>

        {/* Join Classroom via Access Code Section */}
        <section className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Classroom Access
              </span>
              <h3 className="text-headline-sm font-extrabold text-on-surface mt-1">Join Your Classroom Stream</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Enter the 6-digit access code provided by your instructor to open your classroom.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                maxLength={6}
                placeholder="6-Digit Code"
                value={typedCode}
                onChange={(e) => setTypedCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoinByCode(typedCode); }}
                className="bg-slate-50 border border-outline rounded-xl px-4 py-3 text-xs font-mono w-40 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary font-bold"
              />
              <button
                onClick={() => handleJoinByCode(typedCode)}
                className="bg-primary text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow flex items-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                Join Classroom
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="border border-outline text-slate-700 px-4 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1"
                title="Scan Classroom QR Code"
              >
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                Scan QR
              </button>
            </div>
          </div>

          {/* MY ENROLLED CLASSROOMS PERMANENT LIST (Sleek Vertical Scrollable List) */}
          <div className="border-t border-outline-variant/60 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-body-lg font-extrabold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">school</span>
                My Enrolled Classrooms ({joinedRooms.length})
              </h4>

              <button
                onClick={() => navigate('/student/rooms')}
                className="text-primary hover:text-primary/80 font-bold text-xs flex items-center gap-1 hover:underline"
              >
                <span>See All Classrooms</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {joinedRoomsLoading ? (
              <div className="p-6 text-center text-xs text-on-surface-variant animate-pulse font-bold">
                Loading joined classrooms…
              </div>
            ) : joinedRooms.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-on-surface-variant">
                You haven't joined any classrooms yet. Enter a code above to get started!
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto pr-1.5 flex flex-col gap-3.5">
                {joinedRooms.slice(0, 8).map((room) => (
                  <div key={room.id} className="bg-slate-50 border border-slate-200 hover:border-primary/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 group">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0 group-hover:bg-primary group-hover:text-white transition">
                        <span className="material-symbols-outlined text-xl">school</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/10 text-primary font-mono text-[9px] font-extrabold px-2 py-0.5 rounded">
                            {room.room_code}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Instructor: <strong className="text-slate-700">{room.creatorName}</strong>
                          </span>
                        </div>
                        <h5 className="text-body-md font-bold text-on-surface group-hover:text-primary transition mt-0.5">{room.name}</h5>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => navigate(`/classroom/${room.id}`)}
                        className="bg-primary text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-primary/90 transition shadow flex items-center gap-1 active:scale-95"
                      >
                        <span>Open Stream</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Discovery Quizzes Grid */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-headline-sm font-extrabold text-on-surface">Available Practice Quizzes</h3>
            <button
              onClick={() => navigate('/student/library')}
              className="text-primary font-bold text-xs hover:underline flex items-center gap-1"
            >
              Explore Full Library <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          {quizzesLoading ? (
            <div className="p-8 text-center text-on-surface-variant font-bold text-xs animate-pulse">
              Scanning quiz library…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
                  <div className="h-36 w-full relative bg-slate-100">
                    <img
                      src={quiz.cover_image_url || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop'}
                      alt={quiz.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      {quiz.difficulty}
                    </div>
                  </div>

                  <div className="p-5 flex-grow flex flex-col justify-between gap-4">
                    <div>
                      <h4 className="text-body-lg font-bold text-on-surface line-clamp-1">{quiz.title}</h4>
                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">
                        {quiz.description?.replace(/^\[mode:\w+\]\s*/, '') || 'No description available.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-outline-variant/60">
                      <button
                        onClick={() => setSelectedShareQuiz(quiz)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-primary transition flex items-center gap-1 text-xs font-bold"
                        title="Share Quiz"
                      >
                        <span className="material-symbols-outlined text-sm">share</span>
                        <span>Share</span>
                      </button>

                      <button
                        onClick={() => handleStartQuiz(quiz.id)}
                        className="bg-primary text-white hover:bg-primary/90 font-bold px-4 py-2 rounded-xl text-xs shadow flex items-center gap-1 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-xs">play_arrow</span>
                        Play Solo
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* QR Code Simulator Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-outline-variant/30 flex flex-col items-center text-center gap-4 animate-scale">
            <span className="material-symbols-outlined text-4xl text-primary">qr_code_scanner</span>
            <h3 className="text-headline-sm font-bold text-on-surface">Scan Classroom QR Code</h3>

            {scanStatus === 'scanning' ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-primary">Scanning classroom code…</p>
              </div>
            ) : scanStatus === 'success' ? (
              <div className="py-8 flex flex-col items-center gap-2 text-green-600">
                <span className="material-symbols-outlined text-5xl animate-bounce">check_circle</span>
                <p className="text-xs font-bold">Classroom Code Verified!</p>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-3">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter Room Code (e.g. A1B2C3)"
                  value={selectedQrRoomCode}
                  onChange={(e) => setSelectedQrRoomCode(e.target.value.toUpperCase())}
                  className="w-full border border-outline rounded-xl p-3 text-xs font-mono text-center font-bold uppercase tracking-widest bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleSimulateQrScan}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl text-xs shadow hover:bg-primary/90 transition"
                >
                  Simulate QR Camera Scan
                </button>
              </div>
            )}

            <button
              onClick={() => { setShowQrModal(false); setScanStatus('idle'); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quiz Share Modal */}
      <QuizShareModal quiz={selectedShareQuiz} onClose={() => setSelectedShareQuiz(null)} />
    </DashboardLayout>
  );
}
