import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuizShareModal from '../../components/QuizShareModal.tsx';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [typedCode, setTypedCode] = useState('');

  // Quizzes state
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);

  // Share modal state
  const [selectedShareQuiz, setSelectedShareQuiz] = useState<any | null>(null);
  
  // QR scanner state
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedQrRoomCode, setSelectedQrRoomCode] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success'>('idle');

  // Active Bottom Nav Tab
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'join' | 'create' | 'profile'>('home');

  useEffect(() => {
    // Load persisted user info
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch {}
    }
    fetchQuizzes();
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

  const handleJoinByCode = async (codeToJoin: string) => {
    if (!codeToJoin) {
      alert('Please enter a session PIN or room code.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    const cleanCode = codeToJoin.trim().toUpperCase();

    // Check if 6-digit numeric live quiz session code
    if (/^\d{6}$/.test(cleanCode)) {
      try {
        const res = await fetch('/api/sessions/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sessionCode: cleanCode })
        });
        const json = await res.json();

        if (json.success) {
          navigate(`/student/session/${json.data.session.id}`);
          return;
        } else {
          alert(json.error?.message || 'Failed to join live session.');
          return;
        }
      } catch (err) {
        alert('Failed to connect to live session API.');
        return;
      }
    }

    // Otherwise join room classroom stream
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
        navigate(`/classroom/${json.room.id}`);
      } else {
        alert(json.error?.message || 'Failed to join classroom.');
      }
    } catch (err) {
      alert('Failed to connect to classroom.');
    }
  };

  const handleSimulateQrScan = () => {
    if (!selectedQrRoomCode) {
      alert('Select a room code to simulate scanning.');
      return;
    }
    setScanStatus('scanning');
    
    setTimeout(() => {
      setScanStatus('success');
      setTimeout(() => {
        handleJoinByCode(selectedQrRoomCode);
        setScanStatus('idle');
      }, 800);
    }, 1500);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      alert(`Searching Aero MAGE for: "${searchQuery}"`);
    } else {
      alert('Please enter a query to search.');
    }
  };

  const handleStartQuiz = (quizId: string) => {
    navigate(`/student/quiz/${quizId}`);
  };

  const handleJoinGame = () => {
    const code = prompt('Enter 6-digit Playroom Code:');
    if (code) {
      handleJoinByCode(code);
    }
  };

  const handleAuthorClick = (name: string) => {
    alert(`Opening profile for Creator: ${name}`);
  };

  const handleLogoutClick = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  // Filter quizzes by search query
  const filteredQuizzes = quizzes.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.description && q.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed pb-24 md:pb-8">
      
      {/* ── Top Header Navigation Bar ── */}
      <header className="w-full sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-outline-variant shadow-sm px-4 md:px-8 py-3.5 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[22px]">widgets</span>
          </div>
          <span 
            onClick={() => navigate('/')} 
            className="text-headline-md font-extrabold text-primary tracking-tight cursor-pointer"
          >
            Aero MAGE <span className="text-xs font-normal text-on-surface-variant hidden sm:inline">Quizzo</span>
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <a className="text-primary font-bold border-b-2 border-primary pb-0.5 text-label-md" href="#home">Home</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors text-label-md font-semibold" href="#library">Library</a>
          <button className="text-on-surface-variant hover:text-primary transition-colors text-label-md font-semibold" onClick={handleJoinGame}>Join Code</button>
          <button className="text-on-surface-variant hover:text-primary transition-colors text-label-md font-semibold" onClick={() => alert('Faculty accounts can build new quizzes!')}>Create</button>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Desktop Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative hidden lg:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input
              className={`bg-surface-container border-none rounded-full pl-9 pr-4 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary w-56 transition-all ${
                isSearchFocused ? 'w-64 ring-2 ring-primary bg-white' : ''
              }`}
              placeholder="Search for quizzes..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </form>

          {/* Mobile Search Toggle */}
          <button onClick={() => setShowSearchModal(!showSearchModal)} className="w-9 h-9 flex md:hidden items-center justify-center text-on-surface hover:bg-surface-container rounded-full transition">
            <span className="material-symbols-outlined text-[22px]">search</span>
          </button>

          {/* Join Game Primary Button */}
          <button 
            onClick={handleJoinGame}
            className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-primary/90 transition shadow active:scale-95"
          >
            Join Game
          </button>

          {/* Avatar / Logout */}
          <div 
            onClick={handleLogoutClick}
            title="Click to Log Out"
            className="w-9 h-9 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant cursor-pointer group relative flex-shrink-0"
          >
            <img 
              className="w-full h-full object-cover group-hover:opacity-75 transition" 
              alt="Avatar"
              src={user?.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuDsvBA2F-QY-De4qY0Qnk2OImoX5MIoe9U9b_w6LkDNb27Jc7171CJvUgJIrWftVbEh4GSPA01eqA5MfgtOc2FhCEXcswVce9Oj_7HGpJbcjv95jaGK4z3pe-K6cbeoN0H5ZrzSWcH6v2CGvTOQWf2UODIo4SJV67v6d2wRdq5mBY36SX_KooRBjioQVx9xsOcXFUFzAxfY4DeNUSV3SxjfATTzhXSZCC174nM8abXmeia9fDpP_UMjHqp2EUDr7iRjMbRYwKJI4Fc"}
            />
          </div>
        </div>
      </header>

      {/* Mobile Inline Search Modal */}
      {showSearchModal && (
        <div className="md:hidden bg-white px-4 py-3 border-b border-outline-variant shadow-md animate-fade-in">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              autoFocus
              className="w-full border border-outline rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="Search for quizzes or topics…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl">Search</button>
          </form>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex-grow w-full flex flex-col gap-8">
        
        {/* Banner Section */}
        <section className="relative w-full rounded-3xl overflow-hidden bg-primary-container p-6 md:p-10 flex flex-col md:flex-row items-center justify-between text-on-primary-container shadow-md">
          {/* Decorative Pattern */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-15 pointer-events-none hidden sm:block">
            <div className="grid grid-cols-4 gap-2 p-4">
              <div className="w-8 h-8 rounded-full bg-white"></div>
              <div className="w-8 h-8 rounded-full bg-white mt-4"></div>
              <div className="w-8 h-8 rounded-full bg-white"></div>
              <div className="w-8 h-8 rounded-full bg-white mt-6"></div>
            </div>
          </div>

          <div className="max-w-xl text-center md:text-left z-10">
            <h2 className="text-headline-md md:text-[32px] md:leading-tight font-extrabold text-white mb-4">
              Play quiz together with your friends, {user?.displayName || 'Student'}!
            </h2>
            <button 
              onClick={() => alert('Opening Friends list to invite...')}
              className="bg-white text-primary font-bold px-6 py-3 rounded-full text-body-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 mx-auto md:mx-0"
            >
              <span className="material-symbols-outlined text-sm">group</span>
              Find Friends
            </button>
          </div>

          {/* Avatar Stack */}
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
        <section className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-sm">
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
                placeholder="6-Digit Access Code"
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
                onClick={() => {
                  setShowQrModal(true);
                }}
                className="bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-1 transition"
              >
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                Scan QR
              </button>
            </div>
          </div>
        </section>

        {/* Discover Top Quizzes Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-headline-sm font-extrabold text-on-surface">Discover Quizzes</h3>
              <p className="text-xs text-on-surface-variant">Published quizzes available for solo practice or multiplayer.</p>
            </div>
            <button 
              onClick={() => fetchQuizzes()}
              className="text-primary font-bold text-xs flex items-center gap-1 hover:underline"
            >
              Refresh Library
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>
          
          {quizzesLoading ? (
            <div className="p-8 text-center text-on-surface-variant font-medium">Scanning quiz library…</div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="bg-surface-container border border-outline-variant/40 rounded-2xl p-6 text-center text-on-surface-variant text-xs font-medium">
              No quizzes match your search query.
            </div>
          ) : (
            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-none">
              {filteredQuizzes.map((quiz) => {
                const banner = quiz.cover_image_url || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop';
                const questionCount = quiz.question_count || (quiz.questions ? quiz.questions.length : 0);

                return (
                  <div key={quiz.id} className="min-w-[250px] sm:min-w-0 flex-shrink-0 bg-white border border-outline-variant rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group">
                    {/* Cover Banner */}
                    <div className="h-36 w-full overflow-hidden relative bg-slate-100">
                      <img src={banner} alt={quiz.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <div className="absolute top-3 left-3">
                        <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {quiz.difficulty}
                        </span>
                      </div>
                      <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-primary font-extrabold text-xs px-2 py-0.5 rounded-lg border border-primary/20">
                        {questionCount} Qs
                      </span>
                    </div>

                    <div className="p-4 flex-grow flex flex-col justify-between">
                      <div>
                        <h4 className="text-body-lg font-bold text-on-surface line-clamp-1">{quiz.title}</h4>
                        <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">
                          {quiz.description?.replace(/^\[mode:\w+\]\s*/, '') || 'No description provided.'}
                        </p>
                      </div>

                      <div className="flex justify-between items-center border-t border-outline-variant/60 pt-3 mt-3">
                        <span className="text-[11px] text-on-surface-variant">By: <strong className="text-on-surface">{quiz.creator?.display_name || 'Faculty'}</strong></span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedShareQuiz(quiz)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-primary transition"
                            title="Share Quiz"
                          >
                            <span className="material-symbols-outlined text-sm">share</span>
                          </button>
                          <button
                            onClick={() => handleStartQuiz(quiz.id)}
                            className="bg-primary text-white hover:bg-primary/90 transition px-3.5 py-1.5 rounded-xl text-xs font-bold shadow flex items-center gap-1 active:scale-95"
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
        </section>

        {/* Top Authors Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-headline-sm font-extrabold text-on-surface">Top Authors</h3>
            <button onClick={() => alert('View all authors')} className="text-primary font-bold text-xs flex items-center gap-1 hover:underline">
              View all <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-none">
            {[
              { name: 'Rayford', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9nwdEMs4fDXLwUAcriD9kNnm_gNa8JRQ5tHaDSvAcJzxQZbG4NjkO29-rJwvbUaCgGn91lNMPVGa5vRV6JnMX1fALc379kj6UhEfbtFCbmPGBapwTgKyXgojM1HLSWVj4yRWgGK15apb4B6dEo73tNxvXpB-zqOFsN3kLI1tCuyjBXrqi5uVgNw-9XrI2U_mpbH7m_wvT9FtRAvB7mbLK_JkJ7DKFY-dtCVyn6TS5c4VSUZ8EZkd-jszORFanhi5RH9DlBxxml0o' },
              { name: 'Willard', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC27Cx-rvbMNQbMcv1pOM2nNIjsValZBX-pMovbXxL3Z2citGd5ZM50fiZVrpvcfjOoJXJvxdQxbmJWRng6RmPeihZYW0DreyGWUR5pdd9S29w5jquWQl-1Wa8gJ-4K3zaA4DzaIRD94uwRyjwkss4oPolGltWFwE0lMGhvOT3R1m5Q37A4T-u6uvHYdoxceIXSMGOeGFt1YVwmxe_ASkC4cvK-w2dpbTsFFzXuA_6xUD8m91Fc85YQozoByKHN6ZCnpTl8jHwv4nA' },
              { name: 'Hannah', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuoSjseyNzhqUzdylAIEgH-whMnb5RTzwi8D3XcDlIgAu07LQfBEiGboHoEotxsoDScZM-pAiZnROzgiFnMLVlUbtq21Ir02tqtmbyX52Vf8WhJNTCC6wSAhjRcD6cbYQ1vzSYxNQEh-9DLKOpKbkKJZvWy65Asokodpbdn1hc-FrN12fzKFus2tjgmaeyWrPS3OHVqNBQfxkVVwW17LIWnFHyxvoNQjC0WYDiv7U73Vhu-0F_ZDO75r5CeCVoPzTn8RVMDXWVhb0' },
              { name: 'Geoffrey', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuClSBoaYTfc4haq3Qo7-Vrg1-ySBJMDrQ_vGDbf6E5ZXNQbwSuP120qebkikHgBfzXqschN1QTt2vkImW7vxDbLuFTXoAyp59dlvmNgtbMqcqpAXYXGGkQDJys6d09YJwFEC35mupmy0T8cEC9D117M5r1FQ9zmcxGJKy9W26r6Pku_vdVQI9J63YSyRruvI13_99gJIX8akGgucX7pehOJMsC89QNErfkcjGGX-uc790ajZjkpmsjnED1fBL7sUvuCpZj70Eo9t80' },
              { name: 'Elena', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZzdPRdlfQbPVZpZ0yjEtih5D5tjgcrssAq2kGKnITifk4siYtqNubS0Qke2bp2toY9TdHr_DGHvzYX4GXDkCvNZEVIExv5MxVT8TOaQqJvsz-X0l5U43FdfEhrnQIn8K_nRLOr09TCdZl4izEhB__zF8xs4hoMOT2o7yktFcoY5LmvArlf4VL8_tprwcSRVhAkzhbJAT4Yg6mBr1iXkkE6xWhoOFAcjvrcmbgiiqL1wz5iKA9laAfUQ3lWWVmKPU7FYEj3TGsSAU' }
            ].map((author, idx) => (
              <div 
                key={idx}
                onClick={() => handleAuthorClick(author.name)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 group cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full border-2 border-primary/30 p-0.5 shadow group-hover:border-primary transition">
                  <img className="w-full h-full object-cover rounded-full" alt={author.name} src={author.avatar}/>
                </div>
                <span className="text-xs font-bold text-on-surface group-hover:text-primary transition">
                  {author.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Top Collections Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-headline-sm font-extrabold text-on-surface">Top Collections</h3>
            <button onClick={() => alert('View all collections')} className="text-primary font-bold text-xs flex items-center gap-1 hover:underline">
              View all <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-video sm:aspect-square rounded-2xl bg-surface-container overflow-hidden group relative border border-outline-variant cursor-pointer" onClick={() => alert('Opening Science & Tech collection')}>
              <img className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="Science & Tech" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5v6ZUQqC8NGL5rMnHqcVCqVx5kbGQNtZrBZhZVdWkRLFEI294pr7i9NSedmLtIkFXfKm_UqTblD12euilZ0WeNPt_ufZtOzwwIa640UW90Q2fupMFlWRBcnjnj_e3ExGy2XRN1DMKNiehBDEPOT4lUDw2OF6QoOeho0pzAvZUW14UaBU15b1i28HamaijEu9a0elG-tQiPr0gVzzchDkv1y-xAewq0lCj-xOp2Puk3VwfnvzWVYOeJc62YzJFrN0jeFXqlf_f_Oo" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
                <span className="text-white font-extrabold text-xs">Science &amp; Tech</span>
              </div>
            </div>

            <div className="aspect-video sm:aspect-square rounded-2xl bg-surface-container overflow-hidden group relative border border-outline-variant cursor-pointer" onClick={() => alert('Opening Art & Culture collection')}>
              <img className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="Art & Culture" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFOzE6CBCvq2n98MF-ifYyxaO6eQKKCjObpkwlsc-TCQtHVwGsK5wX_V1nQoo-7JC5uK7KPLpRIuUr5CbL3O1tC9KvbLQydUWktbv42-GVTnMsHbIH4fODBCLSr6lJIb9rMFw-qeTQ8XzcC7s2uunreXzIL1II5SteRdsuQXKv-1JCAatZw7CeKV0JgENywxcWdv4Azo5uhKQgoikYua9M3LyGWQxxC9YkpPrLZF2Bc0qMRGrnCaLxiRuPJYCgqtOmchhQz6zqGAE" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
                <span className="text-white font-extrabold text-xs">Art &amp; Culture</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Fixed Bottom Navigation Bar (Mobile View) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-outline-variant shadow-lg flex justify-around items-center px-4 py-2">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center transition ${activeTab === 'home' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-xl">home</span>
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        <button 
          onClick={() => { setActiveTab('library'); fetchQuizzes(); }}
          className={`flex flex-col items-center justify-center transition ${activeTab === 'library' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-xl">grid_view</span>
          <span className="text-[10px] mt-0.5">Library</span>
        </button>

        {/* Floating Join Action Button */}
        <button 
          onClick={() => { setActiveTab('join'); handleJoinGame(); }}
          className="flex flex-col items-center justify-center -translate-y-3"
        >
          <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition active:scale-95">
            <span className="material-symbols-outlined text-2xl">adjust</span>
          </div>
          <span className="text-[10px] font-bold text-primary mt-0.5">Join</span>
        </button>

        <button 
          onClick={() => { setActiveTab('create'); alert('Faculty members can create quizzes from the builder console.'); }}
          className={`flex flex-col items-center justify-center transition ${activeTab === 'create' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-xl">add_box</span>
          <span className="text-[10px] mt-0.5">Create</span>
        </button>

        <button 
          onClick={() => { setActiveTab('profile'); handleLogoutClick(); }}
          className={`flex flex-col items-center justify-center transition ${activeTab === 'profile' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-xl">person</span>
          <span className="text-[10px] mt-0.5">Logout</span>
        </button>
      </nav>

      {/* QR Code Joining Simulator Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl relative text-center border border-outline-variant/30 flex flex-col items-center">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            <h3 className="text-headline-sm font-bold mb-2">QR Code Join Simulator</h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Simulate scanning a playroom QR code using your webcam scanner.
            </p>

            <div className="w-56 h-56 border-2 border-primary rounded-xl relative overflow-hidden bg-slate-50 mb-6 flex flex-col items-center justify-center">
              {scanStatus === 'idle' && (
                <div className="text-slate-400 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[48px]">qr_code_2</span>
                  <span className="text-xs font-semibold">Camera Ready</span>
                </div>
              )}
              {scanStatus === 'scanning' && (
                <div className="flex flex-col items-center gap-2 text-primary">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold">Scanning Code...</span>
                </div>
              )}
              {scanStatus === 'success' && (
                <div className="flex flex-col items-center gap-2 text-green-600">
                  <span className="material-symbols-outlined text-[48px]">check_circle</span>
                  <span className="text-xs font-bold">QR Scanned!</span>
                </div>
              )}
            </div>

            <div className="w-full flex flex-col gap-3">
              <input
                type="text"
                maxLength={6}
                value={selectedQrRoomCode}
                onChange={(e) => setSelectedQrRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit QR room code..."
                className="w-full border border-outline rounded-xl px-4 py-2.5 text-xs bg-white font-mono uppercase tracking-wider focus:ring-2 focus:ring-primary"
              />

              <button
                onClick={handleSimulateQrScan}
                disabled={!selectedQrRoomCode || scanStatus !== 'idle'}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition shadow text-xs disabled:opacity-50"
              >
                Scan &amp; Join Room
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quiz Share Modal */}
      <QuizShareModal quiz={selectedShareQuiz} onClose={() => setSelectedShareQuiz(null)} />
    </div>
  );
}
