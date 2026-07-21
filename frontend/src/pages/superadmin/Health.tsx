import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout.tsx';

interface SystemHealthData {
  status: string;
  cpu_usage_pct: number;
  memory: {
    total_mb: number;
    used_mb: number;
    heap_used_mb: number;
    usage_pct: number;
  };
  uptime_seconds: number;
  database: {
    status: string;
    type: string;
    latency_ms: number;
  };
  users: {
    active_online: number;
    total_registered: number;
  };
  active_live_sessions: number;
  controls: {
    maintenance_mode: boolean;
    security_shield: boolean;
  };
}

export default function SuperAdminHealth() {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>('');

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 10000); // Live poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/admin/system/health', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setHealthData(json.data);
      }
    } catch (err) {
      console.error('Error fetching system health:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/admin/system/toggle-maintenance', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(json.message);
        fetchHealthData();
      }
    } catch {
      setActionMessage('Failed to toggle maintenance mode.');
    }
  };

  const handleToggleSecurityShield = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/admin/system/toggle-security-shield', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(json.message);
        fetchHealthData();
      }
    } catch {
      setActionMessage('Failed to toggle security attack shield.');
    }
  };

  const handleClearCache = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/admin/system/clear-cache', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(json.message);
      }
    } catch {
      setActionMessage('Failed to clear system cache.');
    }
  };

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <DashboardLayout role="super_admin">
      <div className="flex flex-col gap-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-headline-lg font-black text-on-surface tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">developer_board</span>
              Platform System Control &amp; Telemetry
            </h1>
            <p className="text-body-md text-on-surface-variant mt-1">
              Real-time server infrastructure load, concurrent active users, database state, and master control operations.
            </p>
          </div>
          <button
            onClick={fetchHealthData}
            disabled={loading}
            className="bg-primary text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow hover:bg-primary/90 transition active:scale-95 self-start sm:self-auto"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>sync</span>
            <span>{loading ? 'Polling Telemetry...' : 'Refresh Health'}</span>
          </button>
        </div>

        {/* Control Action Toast Message */}
        {actionMessage && (
          <div className="bg-primary/10 border border-primary/30 text-primary font-bold px-4 py-3 rounded-2xl text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage('')} className="text-slate-500 hover:text-slate-800">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* SYSTEM LOAD METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* CPU & RAM Load Tile */}
          <div className="bg-white border border-outline-variant/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">System Load &amp; CPU</span>
              <span className="material-symbols-outlined text-primary text-xl">memory</span>
            </div>
            <div>
              <h3 className="text-headline-md font-black text-slate-900">
                {healthData ? `${healthData.cpu_usage_pct}%` : '1.2%'} CPU
              </h3>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, healthData?.cpu_usage_pct || 5)}%` }}
                />
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-2">
                RAM: {healthData ? `${healthData.memory.used_mb}MB / ${healthData.memory.total_mb}MB` : '48MB / 512MB'} ({healthData?.memory.usage_pct || 12}%)
              </p>
            </div>
          </div>

          {/* Active Concurrent Users Tile */}
          <div className="bg-white border border-outline-variant/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Online Users</span>
              <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
            </div>
            <div>
              <h3 className="text-headline-md font-black text-slate-900">
                {healthData ? healthData.users.active_online : 1} Active
              </h3>
              <p className="text-[11px] font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">group</span>
                {healthData ? `${healthData.users.total_registered} Registered Users Total` : 'Registered Users Connected'}
              </p>
            </div>
          </div>

          {/* Database State & Latency Tile */}
          <div className="bg-white border border-outline-variant/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Database Connection</span>
              <span className="material-symbols-outlined text-emerald-600 text-xl">database</span>
            </div>
            <div>
              <h3 className="text-headline-md font-black text-emerald-600">
                {healthData?.database.status || 'CONNECTED'}
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">speed</span>
                {healthData?.database.type || 'PostgreSQL 18'} ({healthData?.database.latency_ms || 4}ms Ping)
              </p>
            </div>
          </div>

          {/* System Uptime & Live Sessions Tile */}
          <div className="bg-white border border-outline-variant/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">System Uptime</span>
              <span className="material-symbols-outlined text-primary text-xl">schedule</span>
            </div>
            <div>
              <h3 className="text-headline-md font-black text-slate-900">
                {healthData ? formatUptime(healthData.uptime_seconds) : '0h 42m'}
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">sports_esports</span>
                {healthData?.active_live_sessions || 0} Live Quiz Sessions Running
              </p>
            </div>
          </div>
        </div>

        {/* MASTER FULL SYSTEM CONTROL CONSOLE */}
        <div className="bg-white border border-outline-variant/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-headline-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">tune</span>
              Master System Controls &amp; Administrative Actions
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Toggle platform security shields, maintenance modes, flush caches, and execute system diagnostics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Cyber Security Shield Toggle Button */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Cyber Security Shield</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    healthData?.controls.security_shield !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {healthData?.controls.security_shield !== false ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Enforces automated SQL Injection prevention, XSS payload blocking, and request rate limiting.
                </p>
              </div>
              <button
                onClick={handleToggleSecurityShield}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs ${
                  healthData?.controls.security_shield !== false
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <span className="material-symbols-outlined text-base">security</span>
                <span>{healthData?.controls.security_shield !== false ? 'Pause Cyber Shield' : 'Activate Cyber Shield'}</span>
              </button>
            </div>

            {/* System Maintenance Mode Toggle Button */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Maintenance Mode</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    healthData?.controls.maintenance_mode ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {healthData?.controls.maintenance_mode ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Restricts non-admin user access and displays a temporary maintenance banner across all routes.
                </p>
              </div>
              <button
                onClick={handleToggleMaintenance}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs ${
                  healthData?.controls.maintenance_mode
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-base">construction</span>
                <span>{healthData?.controls.maintenance_mode ? 'Disable Maintenance' : 'Enable Maintenance'}</span>
              </button>
            </div>

            {/* Flush System Cache Button */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Flush Memory &amp; Cache</span>
                  <span className="material-symbols-outlined text-slate-500 text-base">cleaning_services</span>
                </div>
                <p className="text-xs text-slate-500">
                  Clears in-memory geolocation caches, temporary telemetry buffers, and triggers garbage collection.
                </p>
              </div>
              <button
                onClick={handleClearCache}
                className="w-full bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                <span className="material-symbols-outlined text-base">delete_sweep</span>
                <span>Purge System Cache</span>
              </button>
            </div>
          </div>
        </div>

        {/* Central Integration Configuration */}
        <div className="bg-white border border-outline-variant/80 rounded-3xl p-6 shadow-sm">
          <h3 className="text-headline-sm font-extrabold text-slate-900 mb-4">Central Environment Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Mail Provider</label>
              <input className="w-full bg-slate-100 rounded-xl px-4 py-2.5 border border-slate-200 text-xs font-mono font-bold text-slate-700" value="Resend Email Service" disabled />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Identity &amp; Database Provider</label>
              <input className="w-full bg-slate-100 rounded-xl px-4 py-2.5 border border-slate-200 text-xs font-mono font-bold text-slate-700" value="PostgreSQL 18 Local Database" disabled />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
