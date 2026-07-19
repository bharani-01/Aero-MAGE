import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

interface RoleProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleProtectedRoute({ allowedRoles, children }: RoleProtectedRouteProps) {
  const token = localStorage.getItem('accessToken');
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (json.success) {
          setRole(json.data.role_name);
          localStorage.setItem('user', JSON.stringify({
            id: json.data.id,
            email: json.data.email,
            displayName: json.data.displayName,
            avatarUrl: json.data.avatarUrl,
            role: json.data.role_name
          }));
        } else {
          // Token expired or invalid
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      } catch (err) {
        // Fallback to cache if network fails
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          setRole(JSON.parse(cachedUser).role);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="bg-surface min-h-screen flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-label-md font-bold mt-4 text-on-surface-variant animate-pulse">
          Validating authorization...
        </p>
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="bg-surface min-h-screen flex flex-col justify-center items-center p-8 text-center">
        <span className="material-symbols-outlined text-[72px] text-error mb-4">gpp_bad</span>
        <h1 className="text-headline-lg font-bold text-on-surface mb-2">Access Denied</h1>
        <p className="text-body-md text-on-surface-variant mb-6 max-w-md">
          You do not have the required permissions to view this dashboard page.
        </p>
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}
          className="bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition shadow-md"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
