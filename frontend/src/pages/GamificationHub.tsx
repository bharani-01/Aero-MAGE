import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  category: string;
  rarity: string;
  criteria_type: string;
  criteria_value: number;
  xp_reward: number;
  isEarned: boolean;
  earnedAt?: string;
  isPinned?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  roleName: string;
  totalXp: number;
  level: number;
  quizzesPlayed: number;
}

export default function GamificationHub() {
  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'leaderboard'>('overview');

  useEffect(() => {
    fetchGamificationData();
  }, []);

  const fetchGamificationData = async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    try {
      // 1. Fetch user gamification profile if logged in
      if (token) {
        const pRes = await fetch('/api/gamification/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const pJson = await pRes.json();
        if (pJson.success) {
          setProfile(pJson.data);
        }
      }

      // 2. Fetch Badges
      const bRes = await fetch('/api/gamification/badges', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const bJson = await bRes.json();
      if (bJson.success && Array.isArray(bJson.data)) {
        setBadges(bJson.data);
      }

      // 3. Fetch Global Leaderboard
      const lRes = await fetch('/api/gamification/leaderboard');
      const lJson = await lRes.json();
      if (lJson.success && Array.isArray(lJson.data)) {
        setLeaderboard(lJson.data);
      }
    } catch (err) {
      console.error('Error fetching gamification data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (badgeId: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await fetch(`/api/gamification/badges/${badgeId}/pin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setBadges(prev => prev.map(b => b.id === badgeId ? { ...b, isPinned: json.isPinned } : b));
      }
    } catch {}
  };

  const getRarityBadgeStyle = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'epic':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'rare':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <DashboardLayout>
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 animate-pulse">Loading gamification rankings &amp; badges…</p>
        </div>
      ) : (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
        
        {/* HERO LEVEL & XP PROFILE HEADER CARD */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 flex flex-col gap-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-xl border-2 border-white/20">
                {profile?.stats?.currentLevel || 1}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {profile?.user?.displayName || 'Scholar'}
                  </h1>
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                    Level {profile?.stats?.currentLevel || 1}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Total XP: <strong className="text-amber-400 font-mono text-sm">{profile?.stats?.totalXp || 0} XP</strong>
                </p>
              </div>
            </div>

            {/* Streak Counter Box */}
            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 flex items-center gap-3 w-full sm:w-auto">
              <span className="material-symbols-outlined text-3xl text-amber-400 animate-pulse">local_fire_department</span>
              <div>
                <span className="text-lg font-black text-white">{profile?.stats?.currentStreak || 0} Days</span>
                <p className="text-[11px] text-slate-300 font-semibold">Active Streak</p>
              </div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="flex flex-col gap-2 bg-black/30 p-4 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-300">Level {profile?.stats?.currentLevel || 1} Progress</span>
              <span className="text-amber-400 font-mono">{profile?.stats?.xpProgress || 0}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500 shadow-md"
                style={{ width: `${profile?.stats?.xpProgress || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'overview' ? 'bg-primary text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            Overview
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'badges' ? 'bg-primary text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-base">workspace_premium</span>
            Badges Showcase ({badges.filter(b => b.isEarned).length}/{badges.length})
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'leaderboard' ? 'bg-primary text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-base">leaderboard</span>
            Global Leaderboard
          </button>
        </div>

        {/* TAB 1: OVERVIEW & BADGES */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Earned Badges Showcase */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">workspace_premium</span>
                Earned Badges
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {badges.filter(b => b.isEarned).length === 0 ? (
                  <div className="col-span-2 bg-white border border-outline-variant rounded-2xl p-8 text-center flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-slate-300">workspace_premium</span>
                    <h4 className="text-sm font-bold text-slate-700">No Badges Earned Yet</h4>
                    <p className="text-xs text-slate-400">Play quizzes, create custom content, or publish to marketplace to earn badges!</p>
                  </div>
                ) : (
                  badges.filter(b => b.isEarned).map(badge => (
                    <div key={badge.id} className="bg-white border border-outline-variant rounded-2xl p-4 shadow-sm flex items-start gap-3 relative">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                        <span className="material-symbols-outlined text-2xl">{badge.icon_name}</span>
                      </div>
                      <div className="overflow-hidden flex-grow">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase border ${getRarityBadgeStyle(badge.rarity)}`}>
                            {badge.rarity}
                          </span>
                          <button
                            onClick={() => handleTogglePin(badge.id)}
                            className={`text-xs font-bold ${badge.isPinned ? 'text-primary' : 'text-slate-300 hover:text-slate-500'}`}
                            title={badge.isPinned ? 'Unpin Badge' : 'Pin to Profile'}
                          >
                            <span className="material-symbols-outlined text-base">{badge.isPinned ? 'push_pin' : 'keep'}</span>
                          </button>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{badge.name}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{badge.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Top 5 Global Leaderboard Mini Preview */}
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">trophy</span>
                Top Players
              </h2>

              <div className="bg-white border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                {leaderboard.slice(0, 5).map(entry => (
                  <div key={entry.userId} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        entry.rank === 1 ? 'bg-amber-400 text-slate-950' : entry.rank === 2 ? 'bg-slate-300 text-slate-900' : entry.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {entry.rank}
                      </span>
                      <span className="text-xs font-bold text-slate-900 line-clamp-1">{entry.displayName}</span>
                    </div>
                    <span className="text-xs font-extrabold text-primary font-mono">{entry.totalXp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FULL BADGES GALLERY */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {badges.map(badge => (
              <div
                key={badge.id}
                className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-4 transition ${
                  badge.isEarned ? 'border-primary/50' : 'border-outline-variant opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${
                    badge.isEarned ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined text-3xl">{badge.icon_name}</span>
                  </div>
                  <div>
                    <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded uppercase border ${getRarityBadgeStyle(badge.rarity)}`}>
                      {badge.rarity}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">{badge.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{badge.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                  <span className="font-mono font-bold text-amber-600">+{badge.xp_reward} XP</span>
                  <span className={`font-extrabold text-[11px] ${badge.isEarned ? 'text-green-600' : 'text-slate-400'}`}>
                    {badge.isEarned ? '✓ Earned' : 'Locked'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: FULL LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="bg-white border border-outline-variant rounded-3xl p-6 shadow-sm flex flex-col gap-6">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-2xl">trophy</span>
              Global Scholar Leaderboard
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Scholar</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Level</th>
                    <th className="py-3 px-4 text-right">Total XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {leaderboard.map((entry) => (
                    <tr key={entry.userId} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                          entry.rank === 1 ? 'bg-amber-400 text-slate-950 shadow' : entry.rank === 2 ? 'bg-slate-300 text-slate-900' : entry.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {entry.displayName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {entry.roleName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                        {entry.level}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-primary font-mono text-sm">
                        {entry.totalXp} XP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      )}
    </DashboardLayout>
  );
}

