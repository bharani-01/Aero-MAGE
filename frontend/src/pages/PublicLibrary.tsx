import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.tsx';

interface PublicLibraryItem {
  id: string;
  quiz_id: string;
  creator_user_id: string;
  creator_name: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  question_count: number;
  clone_count: number;
  rating_count: number;
  average_rating: number;
  favorite_count: number;
  short_code: string;
  shortUrl: string;
  published_at: string;
}

export default function PublicLibrary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('id');

  const [items, setItems] = useState<PublicLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedSort, setSelectedSort] = useState('trending');

  // Rate Modal State
  const [rateItem, setRateItem] = useState<PublicLibraryItem | null>(null);
  const [userRating, setUserRating] = useState(5);
  const [submittingRate, setSubmittingRate] = useState(false);

  // Copy Tiny Link toast
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const categories = ['All', 'Computer Science', 'STEM', 'Languages', 'History', 'Arts', 'Business', 'General'];
  const difficulties = ['All', 'easy', 'medium', 'hard', 'expert'];

  useEffect(() => {
    fetchPublicLibraryItems();
  }, [selectedCategory, selectedDifficulty, selectedSort]);

  const fetchPublicLibraryItems = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.set('q', searchQuery);
      if (selectedCategory !== 'All') queryParams.set('category', selectedCategory);
      if (selectedDifficulty !== 'All') queryParams.set('difficulty', selectedDifficulty);
      queryParams.set('sort', selectedSort);

      const res = await fetch(`/api/marketplace/explore?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch (err) {
      console.error('Error fetching public library:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPublicLibraryItems();
  };

  const handleCloneQuiz = async (listingId: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('Please sign in to clone quizzes to your library.');
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(`/api/marketplace/${listingId}/clone`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data?.id) {
        alert('Quiz successfully cloned into your personal library!');
        setItems(prev => prev.map(item => item.id === listingId ? { ...item, clone_count: item.clone_count + 1 } : item));
      } else {
        alert(json.error?.message || 'Failed to clone quiz.');
      }
    } catch {
      alert('Network error trying to clone quiz.');
    }
  };

  const handleCopyTinyUrl = (code: string) => {
    const tinyUrl = `${window.location.origin}/s/${code}`;
    navigator.clipboard.writeText(tinyUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateItem) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('Please log in to rate quizzes.');
      return;
    }

    setSubmittingRate(true);
    try {
      const res = await fetch(`/api/marketplace/${rateItem.id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: userRating })
      });
      const json = await res.json();
      if (json.success) {
        setRateItem(null);
        fetchPublicLibraryItems();
      } else {
        alert(json.error?.message || 'Failed to submit rating.');
      }
    } catch {
      alert('Error submitting rating.');
    } finally {
      setSubmittingRate(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
        
        {/* HERO EXPLORE BANNER */}
        <div className="bg-gradient-to-r from-primary via-indigo-600 to-purple-700 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col gap-4">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/15 px-3 py-1 rounded-full w-max">
            <span className="material-symbols-outlined text-sm animate-pulse">local_library</span>
            Aero MAGE Public Library
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Explore Quizzes &amp; Learn Together
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-2xl font-medium">
            Discover community-created quizzes across all subjects. Clone to your library, share short URLs, and test your knowledge.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3 mt-2 max-w-xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                placeholder="Search by title, topic, or creator name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-slate-900 font-semibold rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto bg-slate-900 text-white font-bold px-6 py-3 rounded-2xl text-xs hover:bg-slate-800 transition shadow-lg active:scale-95 whitespace-nowrap"
            >
              Search
            </button>
          </form>
        </div>

        {/* FILTERS & SORTING ROW */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-outline-variant p-4 rounded-2xl shadow-sm">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Difficulty & Sort Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Difficulty:</span>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none"
              >
                {difficulties.map(d => (
                  <option key={d} value={d}>{d === 'All' ? 'All Difficulties' : d.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Sort:</span>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="trending">🔥 Trending</option>
                <option value="rating">⭐ Highest Rated</option>
                <option value="popular">🚀 Most Cloned</option>
                <option value="newest">✨ Newest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* PUBLIC LIBRARY ITEMS GRID */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 animate-pulse">Loading Public Library quizzes…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-outline-variant rounded-3xl p-12 text-center flex flex-col items-center gap-3 shadow-sm">
            <span className="material-symbols-outlined text-6xl text-slate-300">local_library</span>
            <h3 className="text-lg font-bold text-slate-800">No Quizzes Found in Public Library</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Try adjusting your search query, category, or difficulty filter. Be the first to publish a quiz to the public library!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className={`bg-white border rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between gap-4 ${
                  highlightId === item.id ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant'
                }`}
              >
                <div className="flex flex-col gap-3">
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between">
                    <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      {item.difficulty}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 line-clamp-1 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium">
                      {item.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Rating & Metadata */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-amber-500 text-base fill-current">star</span>
                      <span className="font-extrabold text-slate-900">{item.average_rating > 0 ? item.average_rating : 'New'}</span>
                      {item.rating_count > 0 && <span className="text-[11px] text-slate-400">({item.rating_count})</span>}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span>{item.question_count} Qs</span>
                      <span>•</span>
                      <span>{item.clone_count} Clones</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCloneQuiz(item.id)}
                      className="flex-grow bg-primary text-white font-bold py-2.5 rounded-xl text-xs shadow hover:bg-primary/90 transition flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">file_copy</span>
                      <span>Clone to Library</span>
                    </button>

                    <button
                      onClick={() => setRateItem(item)}
                      className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 p-2.5 rounded-xl transition"
                      title="Rate Quiz"
                    >
                      <span className="material-symbols-outlined text-base">star</span>
                    </button>
                  </div>

                  {/* Tiny URL Share Bar */}
                  {item.short_code && (
                    <button
                      onClick={() => handleCopyTinyUrl(item.short_code)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition"
                    >
                      <span className="material-symbols-outlined text-sm text-primary">link</span>
                      <span>
                        {copiedCode === item.short_code ? 'Copied Link!' : `/s/${item.short_code}`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* RATING MODAL */}
      {rateItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-5 border border-outline-variant/30 animate-scale">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Rate Quiz</h3>
              <button onClick={() => setRateItem(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium line-clamp-1">
              "{rateItem.title}" by {rateItem.creator_name}
            </p>

            <form onSubmit={handleSubmitRating} className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setUserRating(star)}
                    className="p-1 text-2xl transition hover:scale-125 focus:outline-none"
                  >
                    <span className={`material-symbols-outlined text-3xl ${star <= userRating ? 'text-amber-500 fill-current' : 'text-slate-300'}`}>
                      star
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={submittingRate}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl text-xs shadow hover:bg-primary/90 transition flex items-center justify-center gap-2"
              >
                {submittingRate ? 'Submitting…' : 'Submit Star Rating'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
