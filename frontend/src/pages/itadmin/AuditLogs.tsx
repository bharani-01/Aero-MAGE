import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout.tsx';

export default function ItAdminAuditLogs() {
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
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setAuditList(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching IT audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="it_admin">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-headline-lg font-bold text-on-surface mb-1">IT Security &amp; Infrastructure Audit Trail</h1>
            <p className="text-body-md text-on-surface-variant">Trace integration updates, mail relays, and server configuration changes.</p>
          </div>
          <button
            onClick={fetchAudit}
            className="bg-primary text-white font-bold px-4 py-2 rounded-xl text-xs shadow hover:bg-primary/90 transition flex items-center gap-2"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>refresh</span>
            <span>Refresh</span>
          </button>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-outline-variant">
            <h3 className="text-headline-sm font-bold">Scoped Infrastructure &amp; System Log Events</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-on-surface-variant font-medium">Querying IT audit logs...</div>
          ) : auditList.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant font-medium">No IT log events recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 text-left border-b border-outline-variant text-label-md text-on-surface-variant font-semibold">
                    <th className="px-8 py-4">Timestamp</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Actor</th>
                    <th className="px-6 py-4">IP &amp; Location</th>
                    <th className="px-8 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditList.map((log: any, idx: number) => (
                    <tr key={idx} className="border-b border-outline-variant hover:bg-slate-50/50 text-body-md">
                      <td className="px-8 py-4 text-on-surface-variant font-mono text-xs">
                        {new Date(log.created_at || log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-on-surface">{log.action}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{log.user_email || log.user || 'System'}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {log.ip_address || '127.0.0.1'} ({log.city || 'Local'}, {log.country_code || 'US'})
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          (log.status_code || 200) < 400 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {log.status_code || 200} OK
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
