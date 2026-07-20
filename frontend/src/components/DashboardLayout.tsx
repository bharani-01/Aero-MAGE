import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarLink {
  label: string;
  icon: string;
  path: string;
}

interface DashboardLayoutProps {
  role?: 'super_admin' | 'organization_admin' | 'it_admin' | 'faculty' | 'student' | 'user';
  children: React.ReactNode;
}

export default function DashboardLayout({ role: propRole, children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Resolve role dynamically from prop or localStorage
  let resolvedRole = propRole;
  if (!resolvedRole) {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const r = (user.role || user.role_name || user.roles?.[0] || '').toLowerCase();
        if (r.includes('faculty') || r.includes('teacher') || r.includes('professor')) {
          resolvedRole = 'faculty';
        } else if (r.includes('super_admin')) {
          resolvedRole = 'super_admin';
        } else if (r.includes('org')) {
          resolvedRole = 'organization_admin';
        } else if (r.includes('it')) {
          resolvedRole = 'it_admin';
        } else {
          resolvedRole = 'student';
        }
      }
    } catch {}
  }
  if (!resolvedRole) resolvedRole = 'student';

  // Resolve role headers & links
  let roleDisplayName = '';
  let links: SidebarLink[] = [];

  if (resolvedRole === 'super_admin') {
    roleDisplayName = 'Super Admin';
    links = [
      { label: 'Platform Health', icon: 'health_and_safety', path: '/superadmin/health' },
      { label: 'Organizations', icon: 'corporate_fare', path: '/superadmin/organizations' },
      { label: 'Admins', icon: 'manage_accounts', path: '/superadmin/admins' },
      { label: 'Audit Logs', icon: 'receipt_long', path: '/superadmin/audit' },
    ];
  } else if (resolvedRole === 'organization_admin') {
    roleDisplayName = 'Org Admin';
    links = [
      { label: 'Users', icon: 'groups', path: '/orgadmin/dashboard' },
    ];
  } else if (resolvedRole === 'it_admin') {
    roleDisplayName = 'IT Admin';
    links = [
      { label: 'SMTP Config', icon: 'mail', path: '/itadmin/smtp' },
      { label: 'Audit Logs', icon: 'receipt_long', path: '/itadmin/audit' },
    ];
  } else if (resolvedRole === 'faculty') {
    roleDisplayName = 'Faculty Console';
    links = [
      { label: 'Quizzes', icon: 'quiz', path: '/faculty/quizzes' },
      { label: 'Classrooms', icon: 'school', path: '/faculty/rooms' },
      { label: 'Quiz Library', icon: 'local_library', path: '/faculty/library' },
      { label: 'My Profile', icon: 'person', path: '/profile' },
    ];
  } else {
    roleDisplayName = 'Student Hub';
    links = [
      { label: 'Dashboard', icon: 'dashboard', path: '/student/dashboard' },
      { label: 'Classrooms', icon: 'school', path: '/student/rooms' },
      { label: 'Quiz Library', icon: 'local_library', path: '/student/library' },
      { label: 'My Profile', icon: 'person', path: '/profile' },
    ];
  }

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed pb-24 lg:pb-8">
      
      {/* Top Common Navbar (Consistent Header across Web & Mobile) */}
      <nav className="w-full bg-white/95 backdrop-blur-md border-b border-outline-variant shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center px-4 md:px-8 py-3.5 max-w-7xl mx-auto w-full">
          
          {/* Logo & Role Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[22px]">widgets</span>
            </div>
            <span 
              onClick={() => navigate('/')} 
              className="text-headline-md font-extrabold text-primary tracking-tight cursor-pointer"
            >
              Aero MAGE
            </span>
            <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-[11px] font-bold hidden sm:inline">
              {roleDisplayName}
            </span>
          </div>

          {/* Desktop Web View Navigation Links (Inline Header Nav) */}
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

          {/* User Logout Button */}
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogout}
              className="text-on-surface-variant hover:text-primary transition-colors text-xs font-bold border border-outline rounded-xl px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-xs">logout</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Container (Consistent Full Width across Web & Mobile) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 flex-grow w-full">
        <main className="w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Phone / Tablet View) */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-outline-variant shadow-lg flex justify-around items-center px-4 py-2">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`flex flex-col items-center justify-center transition py-1 px-3 ${
                isActive ? 'text-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{link.icon}</span>
              <span className="text-[10px] mt-0.5">{link.label}</span>
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center text-on-surface-variant hover:text-red-600 transition py-1 px-3"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          <span className="text-[10px] mt-0.5">Logout</span>
        </button>
      </nav>
    </div>
  );
}
