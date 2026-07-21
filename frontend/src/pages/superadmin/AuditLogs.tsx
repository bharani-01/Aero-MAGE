import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout.tsx';

interface MapPin {
  key: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  country_code: string;
  count: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  latest_event: string;
  latest_user: string;
  latest_timestamp: string;
  ip_addresses: string[];
  events: any[];
}

interface AuditLogEntry {
  id: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  tenant_org_id?: string;
  session_id?: string;
  auth_method?: string;
  action: string;
  resource?: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  ip_address: string;
  user_agent?: string;
  device_type?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  country_code?: string;
  before_state?: string | any;
  after_state?: string | any;
  request_body?: string | any;
  query_params?: string | any;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomaly_flags?: string | string[];
  created_at: string;
}

function DeviceAgentIcon({ deviceType, userAgent }: { deviceType?: string; userAgent?: string }) {
  const dt = (deviceType || userAgent || 'Desktop').toLowerCase();

  if (dt.includes('mobile') || dt.includes('phone') || dt.includes('iphone') || dt.includes('android')) {
    return (
      <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shadow-2xs" title="Mobile Phone Client">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="2" width="10" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
      </div>
    );
  }

  if (dt.includes('tablet') || dt.includes('ipad')) {
    return (
      <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center shadow-2xs" title="Tablet Device">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
      </div>
    );
  }

  if (dt.includes('bot') || dt.includes('crawler') || dt.includes('curl') || dt.includes('postman') || dt.includes('spider')) {
    return (
      <div className="w-7 h-7 rounded-xl bg-red-50 text-red-600 border border-red-200/60 flex items-center justify-center shadow-2xs animate-pulse" title="Automated Bot / API Client">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2"/>
          <circle cx="12" cy="5" r="2"/>
          <path d="M12 7v4"/>
          <line x1="8" y1="15" x2="8.01" y2="15"/>
          <line x1="16" y1="15" x2="16.01" y2="15"/>
        </svg>
      </div>
    );
  }

  // Laptop / Desktop (Default)
  return (
    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shadow-2xs" title="Laptop / Desktop Computer">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    </div>
  );
}

export default function SuperAdminAuditLogs() {
  const [auditList, setAuditList] = useState<AuditLogEntry[]>([]);
  const [mapPins, setMapPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  // Leaflet Map Ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  const fetchInitialLogs = useCallback(async () => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    const token = localStorage.getItem('accessToken');

    try {
      // 1. Fetch map pins
      const mapRes = await fetch('/api/admin/audit/map-pins', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mapJson = await mapRes.json();
      if (mapJson.success) {
        setMapPins(mapJson.data || []);
      }

      // 2. Fetch initial page of audit logs
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (riskFilter !== 'ALL') queryParams.append('risk_level', riskFilter);
      if (methodFilter !== 'ALL') queryParams.append('method', methodFilter);
      queryParams.append('page', '1');
      queryParams.append('limit', '50');

      const res = await fetch(`/api/admin/audit?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const logs = json.data || [];
        setAuditList(logs);
        if (logs.length < 50 || (json.meta && json.meta.page >= json.meta.total_pages)) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error('Error fetching initial audit data:', err);
    } finally {
      setLoading(false);
    }
  }, [search, riskFilter, methodFilter]);

  const loadMoreLogs = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    const token = localStorage.getItem('accessToken');
    const nextPage = page + 1;

    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (riskFilter !== 'ALL') queryParams.append('risk_level', riskFilter);
      if (methodFilter !== 'ALL') queryParams.append('method', methodFilter);
      queryParams.append('page', nextPage.toString());
      queryParams.append('limit', '50');

      const res = await fetch(`/api/admin/audit?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const newLogs = json.data || [];
        if (newLogs.length > 0) {
          setAuditList((prev) => [...prev, ...newLogs]);
          setPage(nextPage);
        }
        if (newLogs.length < 50 || (json.meta && nextPage >= json.meta.total_pages)) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error('Error loading more audit logs on scroll:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loading, loadingMore, hasMore, search, riskFilter, methodFilter]);

  useEffect(() => {
    fetchInitialLogs();
  }, [fetchInitialLogs]);

  // Infinite Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 400 &&
        !loading &&
        !loadingMore &&
        hasMore
      ) {
        loadMoreLogs();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, loadingMore, hasMore, loadMoreLogs]);

  // Dynamically load Leaflet library and initialize Light Theme Map Tiles
  useEffect(() => {
    const loadLeaflet = async () => {
      if ((window as any).L) {
        initLeafletMap();
        return;
      }

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initLeafletMap();
        document.body.appendChild(script);
      } else {
        initLeafletMap();
      }
    };

    loadLeaflet();
  }, []);

  useEffect(() => {
    if (leafletMapRef.current && (window as any).L && mapPins.length > 0) {
      renderMarkersOnMap();
    }
  }, [mapPins]);

  const initLeafletMap = () => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      // Centered on Chennai, India (13.0827, 80.2707)
      const map = L.map(mapContainerRef.current, {
        center: [13.0827, 80.2707],
        zoom: 3,
        zoomControl: true,
      });

      // CartoDB Positron LIGHT THEME Map Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      leafletMapRef.current = map;
    }

    renderMarkersOnMap();
  };

  const renderMarkersOnMap = () => {
    const L = (window as any).L;
    const map = leafletMapRef.current;
    if (!L || !map) return;

    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    mapPins.forEach((pin) => {
      const color =
        pin.risk_level === 'CRITICAL' ? '#ef4444' :
        pin.risk_level === 'HIGH' ? '#f97316' :
        pin.risk_level === 'MEDIUM' ? '#eab308' : '#10b981';

      const circle = L.circleMarker([pin.latitude, pin.longitude], {
        radius: Math.min(16, Math.max(9, pin.count * 3)),
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      }).addTo(map);

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
          <div style="font-weight: 800; font-size: 13px;">📍 ${pin.city}, ${pin.country}</div>
          <div style="margin-top: 4px; color: #475569;">
            <b>IP:</b> <code style="color:#0284c7;">${pin.ip_addresses.join(', ')}</code><br/>
            <b>Threat:</b> <span style="color:${color}; font-weight: bold;">${pin.risk_level}</span>
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml);
      circle.on('click', () => {
        setSelectedPin(pin);
      });
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInitialLogs();
  };

  const openLogDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-[10px] font-black border border-red-300 uppercase animate-pulse">CRITICAL THREAT</span>;
      case 'HIGH':
        return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md text-[10px] font-black border border-orange-300 uppercase">HIGH RISK</span>;
      case 'MEDIUM':
        return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-300 uppercase">MEDIUM RISK</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-300 uppercase">SAFE / NORMAL</span>;
    }
  };

  const parseJsonSafe = (val: any) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return val; }
  };

  return (
    <DashboardLayout role="super_admin">
      <div className="flex flex-col gap-8 pb-12">
        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-headline-lg font-black text-on-surface tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">public</span>
              Security Audit Trail
            </h1>
            <p className="text-body-md text-on-surface-variant mt-1">
              Real-time activity stream tracking API calls, device agent SVGs, authentication requests, and cyber threats.
            </p>
          </div>
          <button
            onClick={fetchInitialLogs}
            disabled={loading}
            className="bg-primary text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow hover:bg-primary/90 transition active:scale-95 self-start sm:self-auto"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>refresh</span>
            <span>{loading ? 'Refreshing...' : 'Refresh Logs'}</span>
          </button>
        </div>

        {/* REAL WORLD LEAFLET MAP VISUALIZER - LIGHT THEME */}
        <div className="bg-white border border-outline-variant/80 rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 z-10 relative">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="text-slate-900 text-headline-sm font-black tracking-wide">
                Access Geolocation Map
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Low</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Med</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> High</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" /> Critical</span>
            </div>
          </div>

          {/* Leaflet Light-Theme Map Container */}
          <div
            ref={mapContainerRef}
            className="w-full h-[400px] rounded-2xl border border-slate-200 shadow-xs z-0 overflow-hidden"
          />

          {/* Selected Pin Details Sidebar/Modal */}
          {selectedPin && (
            <div className="absolute right-6 top-20 max-w-sm w-full bg-white/95 backdrop-blur-md border border-slate-200 text-slate-900 rounded-2xl p-4 shadow-2xl z-40 animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <h4 className="font-extrabold text-sm">{selectedPin.city}, {selectedPin.country}</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Lat: {selectedPin.latitude}, Lng: {selectedPin.longitude}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPin(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Threat Level:</span>
                  {getRiskBadge(selectedPin.risk_level)}
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 font-medium">Client IP:</span>
                  <span className="font-mono text-[11px] text-right text-primary truncate max-w-[180px]">
                    {selectedPin.ip_addresses.join(', ')}
                  </span>
                </div>

                <button
                  onClick={() => { setSearch(selectedPin.city); setSelectedPin(null); }}
                  className="w-full mt-2 bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold py-2 rounded-xl text-xs transition text-center"
                >
                  Filter Logs by {selectedPin.city}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="bg-white border border-outline-variant rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search action, email, endpoint, IP address, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-outline-variant/60 focus:border-primary rounded-xl pl-9 pr-4 py-2 text-xs text-on-surface focus:outline-none focus:bg-white transition"
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-white font-bold px-4 py-2 rounded-xl text-xs shadow hover:bg-primary/90 transition"
            >
              Search
            </button>
          </form>

          {/* Risk & Method Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
              {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setRiskFilter(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    riskFilter === lvl ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
              {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((mth) => (
                <button
                  key={mth}
                  onClick={() => setMethodFilter(mth)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition whitespace-nowrap ${
                    methodFilter === mth ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mth}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECURITY AUDIT LOGS TABLE */}
        <div className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant bg-slate-50/50">
            <h3 className="text-headline-sm font-extrabold text-on-surface">
              Activity Stream
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-on-surface-variant font-medium flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Querying PostgreSQL Security Audit Logs...</span>
            </div>
          ) : auditList.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant font-medium">
              No audit log entries matching your current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-outline-variant text-[11px] uppercase tracking-wider text-slate-500 font-extrabold">
                    <th className="px-6 py-3.5">Device &amp; Time</th>
                    <th className="px-6 py-3.5">Action &amp; Endpoint</th>
                    <th className="px-6 py-3.5">Actor User</th>
                    <th className="px-6 py-3.5">IP &amp; Geolocation</th>
                    <th className="px-4 py-3.5 text-center">Latency</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center">Risk</th>
                    <th className="px-6 py-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {auditList.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <DeviceAgentIcon deviceType={log.device_type} userAgent={log.user_agent} />
                          <div>
                            <span className="font-bold text-slate-800 block text-[11px]">
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 font-medium max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                            log.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                            log.method === 'POST' ? 'bg-emerald-100 text-emerald-800' :
                            log.method === 'PUT' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {log.method}
                          </span>
                          <span className="font-bold text-slate-800 truncate" title={log.action}>
                            {log.action}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 truncate block mt-0.5 max-w-[240px]">
                          {log.endpoint}
                        </span>
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="font-bold text-slate-900 truncate max-w-[160px]">
                          {log.user_email || 'Anonymous / System'}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">
                          {log.user_role || 'guest'}
                        </span>
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span className="text-sm">📍</span>
                          <span>{log.city || 'Chennai'}, {log.country_code || 'IN'}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 block mt-0.5">
                          {log.ip_address}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono text-slate-500 text-[11px]">
                        {log.response_time_ms || 12} ms
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold font-mono border ${
                          log.status_code < 300 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          log.status_code < 400 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          log.status_code < 500 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {log.status_code}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {getRiskBadge(log.risk_level)}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => openLogDetails(log)}
                          className="bg-slate-100 hover:bg-primary hover:text-white text-slate-700 font-bold px-3 py-1.5 rounded-xl text-[11px] transition shadow-sm"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* INFINITE SCROLL SPINNER FOOTER */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 text-center">
            {loadingMore ? (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary animate-pulse py-1">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Loading more audit logs...</span>
              </div>
            ) : !hasMore && auditList.length > 0 ? (
              <span className="text-[11px] font-bold text-slate-400">
                End of Activity Stream
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* INSPECT AUDIT LOG & BEFORE/AFTER STATE DIFF MODAL */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-6 animate-scale max-h-[90vh]">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <DeviceAgentIcon deviceType={selectedLog.device_type} userAgent={selectedLog.user_agent} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-on-surface">Audit Event Inspection</h3>
                    {getRiskBadge(selectedLog.risk_level)}
                  </div>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">Log ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Timestamp</span>
                <span className="font-bold text-slate-800">{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Actor Identity</span>
                <span className="font-bold text-slate-800 truncate block">{selectedLog.user_email || 'Anonymous'}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Client IP &amp; Device</span>
                <span className="font-mono font-bold text-primary block">{selectedLog.ip_address}</span>
                <span className="text-[10px] text-slate-500">{selectedLog.device_type || 'Desktop'}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Geolocation</span>
                <span className="font-bold text-slate-800">{selectedLog.city || 'Chennai'}, {selectedLog.country || 'India'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">difference</span>
                State Change Record (Before vs After Update Snapshot)
              </h4>

              {selectedLog.before_state || selectedLog.after_state ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-red-950/10 border border-red-200/80 rounded-2xl p-4 flex flex-col gap-2">
                    <span className="text-[11px] font-extrabold uppercase text-red-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Before Modification State
                    </span>
                    <pre className="bg-slate-900 text-red-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                      {JSON.stringify(parseJsonSafe(selectedLog.before_state) || { note: 'No prior record state existed' }, null, 2)}
                    </pre>
                  </div>

                  <div className="bg-emerald-950/10 border border-emerald-200/80 rounded-2xl p-4 flex flex-col gap-2">
                    <span className="text-[11px] font-extrabold uppercase text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      After Modification State
                    </span>
                    <pre className="bg-slate-900 text-emerald-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                      {JSON.stringify(parseJsonSafe(selectedLog.after_state) || { note: 'No post record state created' }, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-2xl text-center text-slate-500 text-xs font-medium">
                  This action was a read-only request or did not modify entity states.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-black uppercase text-slate-500">Request Payload &amp; Scheme</span>
                <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-36">
                  {JSON.stringify(parseJsonSafe(selectedLog.request_body) || { query: selectedLog.query_params || 'None', auth_scheme: selectedLog.auth_method || 'JWT' }, null, 2)}
                </pre>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-black uppercase text-slate-500">User Agent &amp; Security Anomaly Flags</span>
                <div className="bg-slate-900 text-slate-300 p-3 rounded-xl text-[11px] font-mono flex flex-col gap-2 max-h-36 overflow-y-auto">
                  <div>
                    <span className="text-slate-400 block text-[10px]">USER AGENT:</span>
                    <span className="truncate block">{selectedLog.user_agent || 'Standard Client Agent'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ANOMALY FLAGS:</span>
                    {selectedLog.anomaly_flags && parseJsonSafe(selectedLog.anomaly_flags).length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parseJsonSafe(selectedLog.anomaly_flags).map((flag: string, idx: number) => (
                          <span key={idx} className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/40">
                            {flag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-emerald-400 font-bold">No Security Anomalies Flagged</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-slate-800 transition"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
