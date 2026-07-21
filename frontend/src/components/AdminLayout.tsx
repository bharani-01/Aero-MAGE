import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarLink {
  label: string;
  icon: string;
  path: string;
}

interface AdminLayoutProps {
  role?: 'super_admin' | 'organization_admin' | 'it_admin';
  children: React.ReactNode;
}

export default function AdminLayout({ role: propRole, children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);

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

  // Determine active admin role
  let activeRole = propRole;
  if (!activeRole && user) {
    const r = (user.role || user.role_name || '').toLowerCase();
    if (r.includes('super_admin')) activeRole = 'super_admin';
    else if (r.includes('org')) activeRole = 'organization_admin';
    else if (r.includes('it')) activeRole = 'it_admin';
  }
  if (!activeRole) activeRole = 'super_admin';

  let roleDisplayName = '';
  let links: SidebarLink[] = [];

  if (activeRole === 'super_admin') {
    roleDisplayName = 'Super Admin';
    links = [
      { label: 'Platform Health', icon: 'health_and_safety', path: '/superadmin/health' },
      { label: 'Organizations', icon: 'corporate_fare', path: '/superadmin/organizations' },
      { label: 'Admins', icon: 'manage_accounts', path: '/superadmin/admins' },
      { label: 'Audit Logs', icon: 'receipt_long', path: '/superadmin/audit' },
    ];
  } else if (activeRole === 'organization_admin') {
    roleDisplayName = 'Org Admin';
    links = [
      { label: 'Users', icon: 'groups', path: '/orgadmin/dashboard' },
    ];
  } else {
    roleDisplayName = 'IT Admin';
    links = [
      { label: 'SMTP Config', icon: 'mail', path: '/itadmin/smtp' },
      { label: 'Audit Logs', icon: 'receipt_long', path: '/itadmin/audit' },
    ];
  }

  const userName = user?.displayName || user?.display_name || user?.name || user?.username || 'Administrator';
  const userEmail = user?.email || user?.email_address || 'Admin Account';
  const userAvatar = user?.photoURL || user?.avatar_url || user?.profile_image || user?.avatar;
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed pb-20 lg:pb-8">
      {/* Top Navigation Bar - Admin Dedicated */}
      <nav className="w-full bg-white/95 backdrop-blur-md border-b border-outline-variant shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center px-4 md:px-8 py-3 max-w-7xl mx-auto w-full">
          
          {/* Logo & Role Badge */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(links[0]?.path || '/')}>
            <div className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
            </div>
            <span className="text-headline-md font-extrabold text-primary tracking-tight">
              Aero MAGE
            </span>
            <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-[11px] font-bold hidden sm:inline">
              {roleDisplayName}
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

          {/* Profile Avatar Dropdown */}
          <div className="flex items-center gap-3">
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
                        {roleDisplayName}
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

      {/* Mobile Bottom Navigation Bar - Admin Dedicated */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-outline-variant shadow-lg py-1">
        <div className="flex items-center justify-around max-w-lg mx-auto w-full px-1">
          {links.slice(0, 4).map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`flex flex-col items-center justify-center py-1 flex-1 transition ${
                  isActive ? 'text-primary font-bold' : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{link.icon}</span>
                <span className="text-[10px] mt-0.5 truncate max-w-[64px]">{link.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition ${
              location.pathname === '/profile' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-xl">person</span>
            <span className="text-[10px] mt-0.5">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
