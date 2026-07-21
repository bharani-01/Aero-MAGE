import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MaintenanceOverlay from './MaintenanceOverlay.tsx';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleGlobalJoin = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const cleanCode = (customCode || joinCode).trim().toUpperCase();
    if (!cleanCode) {
      setJoinError('Please enter a 6-digit access code.');
      return;
    }

    setJoining(true);
    setJoinError('');

    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    let displayName = 'Student';
    if (userStr) {
      try { displayName = JSON.parse(userStr).displayName || 'Student'; } catch {}
    }

    // 1. Try Live Session PIN join
    if (cleanCode.length === 6) {
      try {
        const liveRes = await fetch(`/api/sessions/${cleanCode}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ displayName })
        });
        const liveJson = await liveRes.json();
        if (liveJson.success && liveJson.data?.session?.id) {
          setShowJoinModal(false);
          setJoinCode('');
          setJoining(false);
          navigate(`/student/session/${liveJson.data.session.id}`);
          return;
        }
      } catch {}
    }

    // 2. Try Classroom Stream Code join
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ roomCode: cleanCode })
      });
      const json = await res.json();

      if (json.success && json.room) {
        setShowJoinModal(false);
        setJoinCode('');
        setJoining(false);
        navigate(`/classroom/${json.room.id}`);
      } else {
        setJoinError(json.error?.message || 'Invalid Live Quiz PIN or Classroom Code.');
      }
    } catch {
      setJoinError('Failed to connect. Please check your network.');
    } finally {
      setJoining(false);
    }
  };

  const links = [
    { label: 'Home', icon: 'home', path: '/student/dashboard' },
    { label: 'Classrooms', icon: 'school', path: '/student/rooms' },
    { label: 'Quiz Library', icon: 'local_library', path: '/student/library' },
    { label: 'Public Library', icon: 'travel_explore', path: '/public-library' },
    { label: 'Gamification', icon: 'emoji_events', path: '/gamification' },
  ];

  const userName = user?.displayName || user?.display_name || user?.name || user?.username || 'Student';
  const userEmail = user?.email || user?.email_address || 'Student Account';
  const userAvatar = user?.photoURL || user?.avatar_url || user?.profile_image || user?.avatar;
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <MaintenanceOverlay userRole="student">
      <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed pb-20 lg:pb-8">
      {/* Top Navigation Bar - Student Dedicated */}
      <nav className="w-full bg-white/95 backdrop-blur-md border-b border-outline-variant shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center px-4 md:px-8 py-3 max-w-7xl mx-auto w-full">
          
          {/* Logo & Role Badge */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/student/dashboard')}>
            <div className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[22px]">widgets</span>
            </div>
            <span className="text-headline-md font-extrabold text-primary tracking-tight">
              Aero MAGE
            </span>
            <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-[11px] font-bold hidden sm:inline">
              Student Hub
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-primary hover:bg-white/60'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{link.icon}</span>
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Top Right Actions: Join Live Quiz Button + Profile Dropdown */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setJoinError(''); setShowJoinModal(true); }}
              className="bg-primary text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow hover:bg-primary/90 transition active:scale-95 whitespace-nowrap"
              title="Join Live Quiz Session"
            >
              <span className="material-symbols-outlined text-base animate-pulse">radio_button_checked</span>
              <span className="hidden sm:inline">Join Live Quiz</span>
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-slate-100 transition border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-95"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary text-white font-extrabold text-xs flex items-center justify-center shadow-sm uppercase">
                    {userInitial}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-700 hidden sm:inline-block max-w-[110px] truncate">
                  {userName}
                </span>
                <span className={`material-symbols-outlined text-base text-slate-500 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {/* Profile Menu Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-outline-variant/60 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                    {userAvatar ? (
                      <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full object-cover border border-primary/20 shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center uppercase shadow-sm">
                        {userInitial}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-extrabold text-slate-900 truncate">{userName}</span>
                      <span className="text-[11px] text-slate-500 truncate">{userEmail}</span>
                      <span className="inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary w-max mt-1">
                        Student Hub
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                      className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition flex items-center gap-2.5 text-left"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">person</span>
                      <span>My Profile</span>
                    </button>

                    <button
                      onClick={() => { setShowProfileMenu(false); navigate('/public-library'); }}
                      className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition flex items-center gap-2.5 text-left"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">local_library</span>
                      <span>Public Library</span>
                    </button>

                    <button
                      onClick={() => { setShowProfileMenu(false); navigate('/gamification'); }}
                      className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition flex items-center gap-2.5 text-left"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">emoji_events</span>
                      <span>Badges &amp; Leaderboard</span>
                    </button>

                    <button
                      onClick={() => { setShowProfileMenu(false); navigate('/student/history'); }}
                      className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition flex items-center gap-2.5 text-left"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">history</span>
                      <span>Quiz History</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                    className="w-full px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-2.5 text-left"
                  >
                    <span className="material-symbols-outlined text-lg text-red-500">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 flex-grow w-full">
        <main className="w-full">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar - Student Dedicated */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-outline-variant shadow-lg py-1">
        <div className="grid grid-cols-5 items-center max-w-lg mx-auto w-full px-1">
          {links.slice(0, 2).map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`flex flex-col items-center justify-center py-1 transition ${
                  isActive ? 'text-primary font-bold' : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{link.icon}</span>
                <span className="text-[10px] mt-0.5 truncate max-w-[64px]">{link.label}</span>
              </button>
            );
          })}

          {/* Center Join Button */}
          <div className="relative flex flex-col items-center justify-center -mt-6">
            <button
              onClick={() => { setJoinError(''); setShowJoinModal(true); }}
              className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-xl border-4 border-white active:scale-90 transition-transform"
              title="Join Live Quiz"
            >
              <span className="material-symbols-outlined text-2xl font-bold animate-pulse">radio_button_checked</span>
            </button>
            <span className="text-[10px] font-extrabold text-primary mt-0.5">Join</span>
          </div>

          {links[2] ? (
            <button
              onClick={() => navigate(links[2].path)}
              className={`flex flex-col items-center justify-center py-1 transition ${
                location.pathname === links[2].path ? 'text-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{links[2].icon}</span>
              <span className="text-[10px] mt-0.5 truncate max-w-[64px]">{links[2].label}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              location.pathname === '/profile' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-xl">person</span>
            <span className="text-[10px] mt-0.5">Profile</span>
          </button>
        </div>
      </nav>

      {/* Global Student Join Live Quiz / Classroom Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-5 animate-scale">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold shadow-sm">
                  <span className="material-symbols-outlined text-2xl animate-pulse">radio_button_checked</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-on-surface">Join Live Quiz</h3>
                  <p className="text-xs text-on-surface-variant">Enter 6-digit session PIN or classroom code</p>
                </div>
              </div>
              <button
                onClick={() => { setShowJoinModal(false); setJoinError(''); }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={(e) => handleGlobalJoin(e)} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5 block">
                  Session PIN / Access Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  placeholder="e.g. 849201 or A1B2C3"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                  className="w-full bg-slate-50 border-2 border-outline/60 focus:border-primary rounded-2xl px-4 py-3 text-center text-lg font-mono font-black uppercase tracking-widest focus:outline-none focus:bg-white transition"
                />
              </div>

              {joinError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-red-500">error</span>
                  <span>{joinError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={joining || !joinCode.trim()}
                className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl text-xs shadow-md hover:bg-primary/90 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
              >
                {joining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting to Live Session…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">login</span>
                    <span>Join Live Session</span>
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-slate-100 pt-3 text-center">
              <p className="text-[11px] text-slate-400 font-medium">
                Ask your instructor or room host for the live quiz PIN or classroom access code.
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </MaintenanceOverlay>
  );
}
