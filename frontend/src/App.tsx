import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';

// Role Protected Guard
import RoleProtectedRoute from './components/RoleProtectedRoute.tsx';

// Super Admin Pages
import SuperAdminHealth from './pages/superadmin/Health.tsx';
import SuperAdminOrgs from './pages/superadmin/Orgs.tsx';
import SuperAdminAdmins from './pages/superadmin/Admins.tsx';
import SuperAdminAuditLogs from './pages/superadmin/AuditLogs.tsx';

// Org Admin Pages
import OrgAdminDashboard from './pages/orgadmin/Dashboard.tsx';

// IT Admin Pages
import ItAdminSmtp from './pages/itadmin/Smtp.tsx';
import ItAdminAuditLogs from './pages/itadmin/AuditLogs.tsx';

// Faculty Pages
import FacultyRooms from './pages/faculty/Rooms.tsx';
import FacultyQuizzes from './pages/faculty/Quizzes.tsx';
import HostLiveSession from './pages/faculty/HostLiveSession.tsx';
import FacultyLibrary from './pages/faculty/FacultyLibrary.tsx';

// Student Pages
import StudentDashboard from './pages/student/Dashboard.tsx';
import StudentLiveSession from './pages/student/StudentLiveSession.tsx';
import StudentSoloQuiz from './pages/student/StudentSoloQuiz.tsx';
import StudentLibrary from './pages/student/StudentLibrary.tsx';
import StudentRooms from './pages/student/StudentRooms.tsx';
import QuizHistory from './pages/student/QuizHistory.tsx';
import ClassroomStream from './pages/ClassroomStream.tsx';
import QuizLibrary from './pages/QuizLibrary.tsx';
import UserProfile from './pages/UserProfile.tsx';

// Protected Route Wrapper Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// Dispatcher that routes /dashboard to default landing routes based on resolved role
function DashboardLoader() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

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
            displayName: json.data.display_name,
            role: json.data.role_name,
            avatarUrl: json.data.avatar_url
          }));
        }
      } catch (err) {
        console.error('Error fetching profile for redirect:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center font-body-md text-on-surface">
        <div className="text-headline-sm font-bold text-primary animate-pulse">Loading Workspace...</div>
      </div>
    );
  }

  if (role === 'super_admin') return <Navigate to="/superadmin/health" replace />;
  if (role === 'organization_admin') return <Navigate to="/orgadmin/dashboard" replace />;
  if (role === 'it_admin') return <Navigate to="/itadmin/smtp" replace />;
  if (role === 'faculty') return <Navigate to="/faculty/quizzes" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLoader /></ProtectedRoute>} />

        {/* Super Admin Scoped Routes */}
        <Route 
          path="/superadmin/health" 
          element={
            <RoleProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminHealth />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/organizations" 
          element={
            <RoleProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminOrgs />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/admins" 
          element={
            <RoleProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminAdmins />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/audit" 
          element={
            <RoleProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminAuditLogs />
            </RoleProtectedRoute>
          } 
        />

        {/* Org Admin Scoped Routes */}
        <Route 
          path="/orgadmin/dashboard" 
          element={
            <RoleProtectedRoute allowedRoles={['organization_admin']}>
              <OrgAdminDashboard />
            </RoleProtectedRoute>
          } 
        />

        {/* IT Admin Scoped Routes */}
        <Route 
          path="/itadmin/smtp" 
          element={
            <RoleProtectedRoute allowedRoles={['it_admin']}>
              <ItAdminSmtp />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="/itadmin/audit" 
          element={
            <RoleProtectedRoute allowedRoles={['it_admin']}>
              <ItAdminAuditLogs />
            </RoleProtectedRoute>
          } 
        />

        {/* Faculty Scoped Routes */}
        <Route 
          path="/faculty/rooms" 
          element={
            <RoleProtectedRoute allowedRoles={['faculty']}>
              <FacultyRooms />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="/faculty/quizzes" 
          element={
            <RoleProtectedRoute allowedRoles={['faculty']}>
              <FacultyQuizzes />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="/faculty/session/:sessionId" 
          element={
            <RoleProtectedRoute allowedRoles={['faculty']}>
              <HostLiveSession />
            </RoleProtectedRoute>
          } 
        />

        <Route 
          path="/faculty/library" 
          element={
            <RoleProtectedRoute allowedRoles={['faculty']}>
              <FacultyLibrary />
            </RoleProtectedRoute>
          } 
        />

        {/* Student/User Scoped Routes */}
        <Route 
          path="/student/dashboard" 
          element={
            <RoleProtectedRoute allowedRoles={['student', 'user']}>
              <StudentDashboard />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="/student/rooms" 
          element={
            <RoleProtectedRoute allowedRoles={['student', 'user']}>
              <StudentRooms />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="/student/library" 
          element={
            <RoleProtectedRoute allowedRoles={['student', 'user']}>
              <StudentLibrary />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="/student/history" 
          element={
            <RoleProtectedRoute allowedRoles={['student', 'user']}>
              <QuizHistory />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="/student/session/:sessionId" 
          element={<StudentLiveSession />} 
        />
        <Route 
          path="/student/quiz/:quizId" 
          element={<StudentSoloQuiz />} 
        />
        <Route 
          path="/classroom/:roomId" 
          element={<ClassroomStream />} 
        />
        <Route 
          path="/rooms/:roomId" 
          element={<ClassroomStream />} 
        />
        <Route 
          path="/dashboard" 
          element={<DashboardLoader />} 
        />
        <Route 
          path="/library" 
          element={<QuizLibrary />} 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/join" 
          element={<StudentLiveSession />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
