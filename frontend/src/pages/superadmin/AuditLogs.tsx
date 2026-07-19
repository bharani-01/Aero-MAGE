import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout.tsx';

export default function SuperAdminAuditLogs() {
  const [auditList, setAuditList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAudit();
  }, []);

  const fetchAudit = async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    
    try {
      const res = await fetch('/api/admin/audit', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setAuditList(json.data);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="super_admin">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface mb-2">Central Security Audit Trail</h1>
          <p className="text-body-md text-on-surface-variant">Trace registered logins, registrations, tenant creations, and RBAC modifications.</p>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-sm font-bold">Platform-Wide Security Events</h3>
            <button onClick={fetchAudit} className="text-primary text-label-md font-semibold hover:underline">Refresh</button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-on-surface-variant font-medium">Querying database audit trails...</div>
          ) : auditList.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant font-medium">No audit events logged.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low text-left border-b border-outline-variant text-label-md text-on-surface-variant font-semibold">
                    <th className="px-8 py-4">Timestamp</th>
                    <th className="px-6 py-4">Action Event</th>
                    <th className="px-6 py-4">Account Actor</th>
                    <th className="px-8 py-4 text-right">Operation Result</th>
                  </tr>
                </thead>
                <tbody>
                  {auditList.map((log: any, idx: number) => (
                    <tr key={idx} className="border-b border-outline-variant hover:bg-surface-container-lowest/50 text-body-md">
                      <td className="px-8 py-4 text-on-surface-variant">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-on-surface">{log.action}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{log.user}</td>
                      <td className="px-8 py-4 text-right">
                        <span className="bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-green-200">
                          SUCCESS
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
