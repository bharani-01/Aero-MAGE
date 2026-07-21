import { useState, useEffect } from 'react';

interface MaintenanceOverlayProps {
  userRole?: string;
  children: React.ReactNode;
}

export default function MaintenanceOverlay({ userRole, children }: MaintenanceOverlayProps) {
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);

  // Admins bypass maintenance mode completely
  const isAdmin =
    userRole === 'super_admin' ||
    userRole === 'org_admin' ||
    userRole === 'it_admin';

  const checkMaintenanceStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/system/status');
      const json = await res.json();
      if (json.success) {
        setIsMaintenance(!!json.data?.maintenance_mode);
      }
    } catch (err) {
      console.error('Error checking maintenance status:', err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkMaintenanceStatus();
    const interval = setInterval(checkMaintenanceStatus, 6000); // Check every 6s
    return () => clearInterval(interval);
  }, []);

  // If maintenance mode is active AND user is not an admin, show Under Maintenance WebM Video screen!
  if (isMaintenance && !isAdmin) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Under Maintenance Ambient Video Layer */}
        <div className="absolute inset-0 z-0 opacity-60 pointer-events-none overflow-hidden">
          <video
            src="/under-maintenance.webm"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover filter blur-xs scale-105"
          />
        </div>

        {/* Ambient Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40 z-10" />

        {/* Glassmorphic Central Card */}
        <div className="relative z-20 max-w-xl w-full mx-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl text-center flex flex-col items-center gap-6 animate-in fade-in zoom-in-95">
          {/* Animated Wrench Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-3xl animate-bounce">construction</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              System Maintenance Active
            </span>
            <h1 className="text-headline-md sm:text-headline-lg font-black text-white tracking-tight">
              Platform Under Maintenance
            </h1>
            <p className="text-body-md text-slate-300 max-w-md mx-auto mt-1">
              Our engineering team is currently performing scheduled platform upgrades and database maintenance. Normal service will resume shortly.
            </p>
          </div>

          {/* Embedded Video Display Container */}
          <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-black relative">
            <video
              src="/under-maintenance.webm"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-amber-300 font-mono text-[10px] px-2.5 py-0.5 rounded-full border border-amber-500/30 font-bold">
              MAINTENANCE MODE
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 w-full pt-2">
            <button
              onClick={checkMaintenanceStatus}
              disabled={checking}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-base ${checking ? 'animate-spin' : ''}`}>sync</span>
              <span>{checking ? 'Checking Status...' : 'Check Server Status'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
