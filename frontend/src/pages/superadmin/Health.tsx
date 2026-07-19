import DashboardLayout from '../../components/DashboardLayout.tsx';

export default function SuperAdminHealth() {
  return (
    <DashboardLayout role="super_admin">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface mb-2">Platform Health Analytics</h1>
          <p className="text-body-md text-on-surface-variant">Real-time status of global server operations.</p>
        </div>

        {/* Status Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-label-md text-on-surface-variant font-medium">Database State</span>
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
            </div>
            <h3 className="text-headline-md font-bold text-on-surface">Connected</h3>
            <p className="text-label-md text-green-600 mt-2 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check_circle</span> PostgreSQL 18
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-label-md text-on-surface-variant font-medium">API Server Load</span>
              <span className="material-symbols-outlined text-on-surface-variant">monitoring</span>
            </div>
            <h3 className="text-headline-md font-bold text-on-surface">1.2% CPU</h3>
            <p className="text-label-md text-on-surface-variant mt-2">Memory: 48MB / 512MB</p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-label-md text-on-surface-variant font-medium">Active Lobbies</span>
              <span className="material-symbols-outlined text-on-surface-variant">sports_esports</span>
            </div>
            <h3 className="text-headline-md font-bold text-on-surface">0 Active</h3>
            <p className="text-label-md text-on-surface-variant mt-2">Socket.IO listener running</p>
          </div>
        </div>

        {/* Central Integration Preview */}
        <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
          <h3 className="text-headline-sm font-bold mb-4">Central Integration Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-2">Mail Provider</label>
              <input className="w-full bg-surface-container-high rounded-xl px-4 py-2 border-none text-label-md text-on-surface-variant" value="Resend Email Service" disabled />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-2">Identity Provider</label>
              <input className="w-full bg-surface-container-high rounded-xl px-4 py-2 border-none text-label-md text-on-surface-variant" value="PostgreSQL Local Database" disabled />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
