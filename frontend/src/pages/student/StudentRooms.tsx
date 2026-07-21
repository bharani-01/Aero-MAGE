import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.tsx';

export default function StudentRooms() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeScope, setActiveScope] = useState<'enrolled' | 'all'>('enrolled');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Pagination & Infinite Scroll State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRoomsCount, setTotalRoomsCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Ref to prevent duplicate concurrent page fetches
  const isFetchingRef = useRef(false);

  // Initial / Filter Change Fetch (Resets list to Page 1)
  useEffect(() => {
    setRooms([]);
    setPage(1);
    setHasMore(true);
    fetchExploreRooms(1, true);
  }, [searchQuery, activeScope]);

  const fetchExploreRooms = async (pageNum: number, isReset: boolean = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isReset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const token = localStorage.getItem('accessToken');
    try {
      const queryParams = new URLSearchParams({
        q: searchQuery.trim(),
        page: String(pageNum),
        limit: '12',
        scope: activeScope
      });

      const res = await fetch(`/api/rooms/explore?${queryParams.toString()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();

      if (json.success && json.data) {
        if (isReset) {
          setRooms(json.data);
        } else {
          setRooms(prev => [...prev, ...json.data]);
        }

        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalRoomsCount(json.pagination.total || 0);
          setHasMore(pageNum < json.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error('Failed to fetch rooms from server:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  // Scroll Listener for Infinite Scroll
  const handleScroll = useCallback(() => {
    if (loading || loadingMore || !hasMore || isFetchingRef.current) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    if (scrollTop + clientHeight >= scrollHeight - 300) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchExploreRooms(nextPage, false);
    }
  }, [loading, loadingMore, hasMore, page]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleJoinRoom = async (e?: React.FormEvent, codeToJoin?: string) => {
    if (e) e.preventDefault();
    const targetCode = codeToJoin || roomCodeInput;
    if (!targetCode.trim()) return;

    setJoining(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomCode: targetCode.trim() })
      });
      const json = await res.json();
      const roomIdToOpen = json.data?.id || json.room?.id;

      if (json.success && roomIdToOpen) {
        setRoomCodeInput('');
        setShowJoinModal(false);
        navigate(`/classroom/${roomIdToOpen}`);
      } else {
        alert(json.error?.message || 'Failed to join classroom. Invalid code.');
      }
    } catch (err) {
      alert('Failed to connect to room server.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-16">
        
        {/* Minimal Hero Header */}
        <div className="w-full rounded-3xl bg-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-xs">school</span>
              <span>Student Classrooms Explorer</span>
            </div>
            <h1 className="text-headline-md md:text-[32px] font-black text-slate-900 tracking-tight leading-tight">
              Classrooms &amp; Learning Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-1 max-w-xl">
              Search enrolled classrooms or discover new courses across your institution. Auto-scroll dynamically loads more classrooms.
            </p>
          </div>

          <button
            onClick={() => setShowJoinModal(true)}
            className="bg-primary text-white font-extrabold px-5 py-2.5 rounded-xl text-xs hover:bg-primary/90 transition shadow flex items-center gap-2 active:scale-95 whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>Join via Code</span>
          </button>
        </div>

        {/* Scope Tabs & Backend Search Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Scope Tabs (Enrolled vs Explore All) */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setActiveScope('enrolled')}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                activeScope === 'enrolled'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-base">school</span>
              Enrolled Classrooms
            </button>

            <button
              onClick={() => setActiveScope('all')}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                activeScope === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-base">explore</span>
              Explore All Courses
            </button>
          </div>

          {/* Backend Search Field */}
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Live backend search by course, faculty, code…"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

        </div>

        {/* Results Counter Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-headline-sm font-extrabold text-on-surface">
            {activeScope === 'enrolled' ? 'My Enrolled Classrooms' : 'Institution Course Directory'} ({totalRoomsCount})
          </h3>
          <span className="text-xs text-on-surface-variant font-semibold">
            Showing <strong className="text-primary">{rooms.length}</strong> of {totalRoomsCount} records (Page {page} of {totalPages})
          </span>
        </div>

        {/* Classrooms Grid */}
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant font-bold animate-pulse">
            Querying backend database records…
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-white border border-outline-variant rounded-3xl p-12 text-center text-xs shadow-sm flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-5xl text-slate-300">school</span>
            <h3 className="text-headline-sm font-bold text-on-surface">No Classrooms Found</h3>
            <p className="text-slate-500 max-w-sm">
              {searchQuery ? `No classrooms matching "${searchQuery}" found in backend.` : activeScope === 'enrolled' ? 'You are not enrolled in any classrooms yet.' : 'No active course records.'}
            </p>
            {activeScope === 'enrolled' && (
              <button
                onClick={() => setActiveScope('all')}
                className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow hover:bg-primary/90 transition mt-2"
              >
                Browse All Institution Courses
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const banner = room.banner_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop';
              const isEnrolled = room.isEnrolled;

              return (
                <div key={room.id} className="bg-white border border-outline-variant rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                  <div>
                    {/* Cover Banner Header */}
                    <div className="h-32 w-full relative overflow-hidden">
                      <img src={banner} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      
                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase backdrop-blur-md shadow ${
                          isEnrolled ? 'bg-green-600 text-white' : 'bg-slate-900/80 text-white'
                        }`}>
                          {isEnrolled ? '✓ Enrolled' : 'Not Enrolled'}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-4 right-4 text-white flex justify-between items-end">
                        <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded text-[10px] font-mono font-bold">
                          Code: {room.room_code}
                        </span>
                        <span className="text-[10px] text-white/90 font-semibold">
                          {room.memberCount} Students
                        </span>
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-5 flex flex-col gap-2">
                      <h3 className="text-body-lg font-bold text-on-surface line-clamp-1 group-hover:text-primary transition">
                        {room.name}
                      </h3>
                      <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-primary">person</span>
                        Instructor: <strong className="text-on-surface font-semibold">{room.creatorName}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 border-t border-outline-variant/60 bg-slate-50 flex items-center justify-between gap-2">
                    {isEnrolled ? (
                      <button
                        onClick={() => navigate(`/classroom/${room.id}`)}
                        className="w-full bg-primary text-white font-bold py-2 rounded-xl text-xs hover:bg-primary/90 transition shadow flex items-center justify-center gap-1 active:scale-95"
                      >
                        <span>Open Stream</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>
                    ) : room.status === 'archived' ? (
                      <button
                        disabled
                        className="w-full bg-slate-200 text-slate-500 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-xs">archive</span>
                        Course Archived
                      </button>
                    ) : room.status === 'approval_required' ? (
                      <button
                        disabled={joining}
                        onClick={(e) => handleJoinRoom(e, room.room_code)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-xl text-xs transition shadow flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-xs">shield</span>
                        {joining ? 'Submitting Request…' : `Request Access (${room.room_code})`}
                      </button>
                    ) : room.status === 'org_only' ? (
                      <button
                        disabled={joining}
                        onClick={(e) => handleJoinRoom(e, room.room_code)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition shadow flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-xs">corporate_fare</span>
                        {joining ? 'Enrolling…' : `Join Org Course (${room.room_code})`}
                      </button>
                    ) : (
                      <button
                        disabled={joining}
                        onClick={(e) => handleJoinRoom(e, room.room_code)}
                        className="w-full bg-violet-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-violet-700 transition shadow flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-xs">add_circle</span>
                        {joining ? 'Enrolling…' : `Join Course (${room.room_code})`}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* INFINITE SCROLL AUTOMATIC LOADING INDICATOR */}
        {loadingMore && (
          <div className="py-6 flex items-center justify-center gap-2 text-xs font-extrabold text-primary animate-pulse">
            <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Auto-loading more classrooms…
          </div>
        )}

        {!hasMore && rooms.length > 0 && (
          <div className="py-6 text-center text-xs text-slate-400 font-medium">
            ✓ You have reached the end of all classroom records.
          </div>
        )}

      </div>

      {/* JOIN ROOM MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={(e) => handleJoinRoom(e)} className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-5 animate-scale">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">key</span>
                Join Classroom Room
              </h3>
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              Ask your professor or instructor for the 6-digit classroom access code to join the stream.
            </p>

            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">Classroom Access Code *</label>
              <input
                type="text"
                required
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. CS101A"
                className="w-full border-2 border-outline rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-widest text-center uppercase focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={joining}
                className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition text-xs shadow flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {joining ? 'Joining…' : 'Join Classroom'}
              </button>
            </div>
          </form>
        </div>
      )}

    </DashboardLayout>
  );
}
