import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.tsx';

export default function FacultyRooms() {
  const navigate = useNavigate();

  // Modal / Form toggle state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form inputs
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomMode, setRoomMode] = useState('code_only');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Classrooms listing
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomCode(code);
  };

  const handleOpenCreateModal = () => {
    generateRandomCode();
    setShowCreateModal(true);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch('/api/rooms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      
      if (json.success) {
        setRoomsList(json.data);
      } else {
        setErrorMsg(json.error?.message || 'Failed to fetch active classrooms.');
      }
    } catch {
      setErrorMsg('Failed to communicate with API server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!roomName || !roomCode) {
      setErrorMsg('Room name and unique code are required.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: roomName, roomCode, roomMode })
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMsg(`Classroom "${roomName}" [${roomCode.toUpperCase()}] created successfully!`);
        setRoomName('');
        setRoomCode('');
        setRoomMode('code_only');
        setShowCreateModal(false);
        fetchRooms();
      } else {
        setErrorMsg(json.error?.message || 'Failed to create classroom.');
      }
    } catch {
      setErrorMsg('Failed to create classroom.');
    }
  };

  return (
    <DashboardLayout role="faculty">
      <div className="flex flex-col gap-6">
        
        {/* Hero Banner Card */}
        <div className="bg-primary-container text-on-primary-container rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
          <div className="z-10 max-w-xl">
            <span className="bg-white/20 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              Classroom Hub
            </span>
            <h1 className="text-headline-md sm:text-[30px] font-black text-white leading-tight mt-2">
              Classroom Stream Manager
            </h1>
            <p className="text-xs text-white/90 mt-1">
              Create classrooms, publish announcements, assign quizzes, and answer student questions in real-time streams.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="z-10 bg-white text-primary font-extrabold px-6 py-3 rounded-full text-xs hover:shadow-xl transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap shadow"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            Create Classroom
          </button>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-outline-variant rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Total Classrooms</span>
            <span className="text-headline-md font-black text-primary mt-1">{roomsList.length}</span>
          </div>
          <div className="bg-white border border-outline-variant rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Active Org Rooms</span>
            <span className="text-headline-md font-black text-green-700 mt-1">{roomsList.filter(r => r.status === 'active').length}</span>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4 text-xs font-bold flex items-center justify-between shadow-sm">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-slate-600 font-bold">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Classrooms Grid Header */}
        <div className="flex justify-between items-center mt-2">
          <h3 className="text-headline-sm font-extrabold text-on-surface">Your Classrooms ({roomsList.length})</h3>
          <button onClick={fetchRooms} className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">refresh</span> Refresh List
          </button>
        </div>

        {/* Classrooms Cards */}
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant font-medium">Loading active classrooms…</div>
        ) : roomsList.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant text-xs bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">school</span>
            </div>
            <p className="font-semibold">No classrooms created yet. Click "+ Create Classroom" to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {roomsList.map((room) => (
              <div key={room.id} className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-green-200 uppercase">
                      {room.status}
                    </span>
                    <span className="text-headline-sm font-black text-primary font-mono tracking-wider">
                      {room.room_code}
                    </span>
                  </div>
                  <h4 className="text-body-lg font-bold text-on-surface line-clamp-1">{room.name}</h4>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Instructor: <strong className="text-on-surface">{room.creator?.display_name || 'Faculty'}</strong>
                  </p>
                </div>

                <div className="border-t border-outline-variant/60 pt-3.5 mt-4 flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-mono">Code: {room.room_code}</span>
                  <button
                    onClick={() => navigate(`/classroom/${room.id}`)}
                    className="bg-primary text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-primary/90 transition shadow flex items-center gap-1 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xs">forum</span>
                    Open Stream
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── CREATE NEW CLASSROOM MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-6 animate-scale">
            
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">school</span>
                Create New Classroom
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase mb-1.5">Classroom Name *</label>
                <input
                  type="text"
                  className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-xs font-medium"
                  placeholder="e.g. Physics 101 — Mechanics"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-on-surface uppercase">Auto-Generated Access Code *</label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-primary hover:text-primary/80 text-[11px] font-extrabold flex items-center gap-1 hover:underline"
                  >
                    <span className="material-symbols-outlined text-xs">autorenew</span>
                    Randomize Code
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    className="w-full border-2 border-primary/40 bg-slate-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-xs font-mono font-black uppercase tracking-widest text-slate-900"
                    placeholder="e.g. A8K39X"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    required
                  />
                  <span className="absolute right-3 top-3 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                    100% Unique
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase mb-1.5">Classroom Access Mode &amp; Policy *</label>
                <select
                  value={roomMode}
                  onChange={(e) => setRoomMode(e.target.value)}
                  className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-xs font-semibold bg-white"
                >
                  <option value="code_only">🔑 Join Only with 6-Digit Code (Default)</option>
                  <option value="public">🌐 Public to Everyone (Open Access)</option>
                  <option value="org_only">🏛️ Public to Organization Members Only</option>
                  <option value="approval_required">🛡️ Join Request Requires Approval</option>
                  <option value="archived">📦 Archived Course (Read-only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-outline-variant pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-slate-100 text-slate-700 font-bold px-5 py-2.5 rounded-xl hover:bg-slate-200 transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition shadow text-xs flex items-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  Create Classroom
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
