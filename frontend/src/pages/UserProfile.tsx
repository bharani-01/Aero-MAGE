import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';

export default function UserProfile() {
  const [user, setUser] = useState<any>(null);
  
  // Profile Form Fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');

  // Status State
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const storedUserStr = localStorage.getItem('user');
    if (storedUserStr) {
      try {
        const u = JSON.parse(storedUserStr);
        setUser(u);
        setDisplayName(u.displayName || u.display_name || '');
        setUsername(u.username || u.email?.split('@')[0] || '');
        setEmail(u.email || '');
        setPhoneNumber(u.phoneNumber || u.phone_number || '+1 (555) 019-2834');
        setLocation(u.profile?.location || u.location || 'New York, USA');
        setBio(u.profile?.bio || u.bio || 'Passionate educator & quiz enthusiast.');
      } catch {}
    }

    // Also fetch fresh from API
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        const u = json.data;
        setUser(u);
        setDisplayName(u.display_name || u.displayName || '');
        setUsername(u.username || u.email?.split('@')[0] || '');
        setEmail(u.email || '');
        if (u.phone_number) setPhoneNumber(u.phone_number);
        if (u.profile?.location) setLocation(u.profile.location);
        if (u.profile?.bio) setBio(u.profile.bio);
      }
    } catch (err) {
      console.error('Error fetching me profile:', err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName,
          username,
          phoneNumber,
          location,
          bio
        })
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMsg('Profile updated successfully!');
        
        // Update local storage user
        const updatedUser = {
          ...user,
          displayName,
          display_name: displayName,
          username,
          phoneNumber,
          phone_number: phoneNumber,
          profile: { ...user?.profile, bio, location }
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        setErrorMsg(json.error?.message || 'Failed to update profile.');
      }
    } catch {
      setErrorMsg('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const userRoleStr = (user?.role || user?.role_name || 'STUDENT').toUpperCase();
  const initials = (displayName || email || 'U').substring(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        
        {/* Hero Profile Banner */}
        <div className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
          
          {/* Avatar Circle */}
          <div className="w-24 h-24 rounded-full bg-primary text-white font-extrabold text-3xl flex items-center justify-center shadow-lg border-4 border-white flex-shrink-0 relative group">
            {initials}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
              <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
            </div>
          </div>

          {/* User Overview */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-grow">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <h1 className="text-headline-md font-extrabold text-on-surface">{displayName || 'User Profile'}</h1>
              <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
                {userRoleStr}
              </span>
              <span className="bg-green-100 text-green-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Active
              </span>
            </div>

            <p className="text-xs text-on-surface-variant font-mono mt-1">@{username || 'user_handle'}</p>
            <p className="text-xs text-on-surface-variant mt-2 max-w-md">{bio}</p>
          </div>
        </div>

        {/* Success / Error Alerts */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4 text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {errorMsg}
          </div>
        )}

        {/* Profile Settings Form */}
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
          
          {/* Card 1: Personal Details */}
          <div className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
            <h3 className="text-headline-sm font-extrabold text-on-surface border-b border-outline-variant pb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person</span>
              Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Display Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1.5">Full Display Name *</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border border-outline rounded-xl px-4 py-2.5 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g. Dr. Eleanor Vance"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1.5">Username Handle *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border border-outline rounded-xl pl-8 pr-4 py-2.5 text-xs font-mono font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="eleanor_vance"
                  />
                </div>
              </div>

              {/* Email Address (Read-only) */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1.5">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    readOnly
                    value={email}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold bg-slate-100 text-slate-600 select-all cursor-not-allowed"
                  />
                  <span className="material-symbols-outlined text-green-600 text-base absolute right-3 top-1/2 -translate-y-1/2" title="Email Verified">
                    verified
                  </span>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1.5">Phone / Mobile Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full border border-outline rounded-xl px-4 py-2.5 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="+1 (555) 019-2834"
                />
              </div>

              {/* Location */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1.5">Location / Department</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-outline rounded-xl px-4 py-2.5 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g. Computer Science Department, New York"
                />
              </div>

              {/* Bio */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1.5">Bio / About</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full border border-outline rounded-xl px-4 py-2.5 text-xs font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Share a short intro about yourself..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-primary/90 transition shadow-md flex items-center gap-2 text-xs active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">save</span>
              {saving ? 'Saving Profile…' : 'Save Profile Changes'}
            </button>
          </div>

        </form>

      </div>
    </DashboardLayout>
  );
}
