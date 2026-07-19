import DashboardLayout from '../../components/DashboardLayout.tsx';

export default function ItAdminAuditLogs() {
  return (
    <DashboardLayout role="it_admin">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface mb-2">IT Security Audit Trail</h1>
          <p className="text-body-md text-on-surface-variant">Trace integration updates, mail relays, and server configuration changes.</p>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-outline-variant">
            <h3 className="text-headline-sm font-bold">Scoped IT Integration Events</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low text-left border-b border-outline-variant text-label-md text-on-surface-variant font-semibold">
                  <th className="px-8 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Scope</th>
                  <th className="px-8 py-4 text-right">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: '10:42:24 pm', action: 'smtp_verify', actor: 'it@aeromage.com', scope: 'it_operations', outcome: 'SUCCESS' },
                  { time: '10:41:10 pm', action: 'smtp_host_update', actor: 'it@aeromage.com', scope: 'it_operations', outcome: 'SUCCESS' },
                  { time: '10:38:00 pm', action: 'role_assign_it', actor: 'admin@aeromage.com', scope: 'rbac_operations', outcome: 'SUCCESS' }
                ].map((log, idx) => (
                  <tr key={idx} className="border-b border-outline-variant hover:bg-surface-container-lowest/50 text-body-md">
                    <td className="px-8 py-4 text-on-surface-variant">{log.time}</td>
                    <td className="px-6 py-4 font-semibold text-on-surface">{log.action}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{log.actor}</td>
                    <td className="px-6 py-4 text-on-surface-variant font-mono">{log.scope}</td>
                    <td className="px-8 py-4 text-right">
                      <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-green-200">
                        {log.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
