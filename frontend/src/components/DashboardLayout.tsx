import React from 'react';
import FacultyLayout from './FacultyLayout';
import StudentLayout from './StudentLayout';
import AdminLayout from './AdminLayout';

interface DashboardLayoutProps {
  role?: 'super_admin' | 'organization_admin' | 'it_admin' | 'faculty' | 'student' | 'user';
  children: React.ReactNode;
}

export default function DashboardLayout({ role: propRole, children }: DashboardLayoutProps) {
  let resolvedRole = propRole;

  if (!resolvedRole) {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        const r = (u.role || u.role_name || u.roles?.[0] || '').toLowerCase();
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

  if (resolvedRole === 'faculty') {
    return <FacultyLayout>{children}</FacultyLayout>;
  }

  if (
    resolvedRole === 'super_admin' ||
    resolvedRole === 'organization_admin' ||
    resolvedRole === 'it_admin'
  ) {
    return <AdminLayout role={resolvedRole}>{children}</AdminLayout>;
  }

  return <StudentLayout>{children}</StudentLayout>;
}

export { FacultyLayout, StudentLayout, AdminLayout };
