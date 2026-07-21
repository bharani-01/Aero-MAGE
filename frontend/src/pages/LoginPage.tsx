import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  // Selected Organization Demo Filter
  const [selectedDomain, setSelectedDomain] = useState('school.com');

  const demoOrgs = [
    { label: 'Global Main', domain: 'school.com' },
    { label: 'MIT', domain: 'mit.edu' },
    { label: 'Stanford', domain: 'stanford.edu' },
    { label: 'Harvard', domain: 'harvard.edu' },
    { label: 'Caltech', domain: 'caltech.edu' },
    { label: 'Oxford', domain: 'oxford.ac.uk' },
    { label: 'Cambridge', domain: 'cam.ac.uk' },
    { label: 'ETH Zurich', domain: 'ethz.ch' },
    { label: 'UC Berkeley', domain: 'berkeley.edu' }
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      triggerShake();
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Login failed. Invalid credentials.');
      }

      // Persist auth details
      localStorage.setItem('accessToken', result.data.accessToken);
      localStorage.setItem('refreshToken', result.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(result.data.user));

      // Redirect to target quiz or default dashboard
      if (redirectPath) {
        navigate(redirectPath);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-body-md text-on-surface">
      {/* Left Panel: Branding & Tagline */}
      <div className="md:w-1/2 bg-primary text-on-primary flex flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative background grid/shapes */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary opacity-90 z-0"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>

        <div className="relative z-10 text-left">
          <span 
            onClick={() => navigate('/')} 
            className="text-2xl font-extrabold tracking-tight cursor-pointer"
          >
            Aero MAGE
          </span>
        </div>

        <div className="relative z-10 max-w-md text-left my-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6">
            Where Learning Meets Play
          </h2>
          <p className="text-white/80 leading-relaxed text-sm">
            Host live playrooms for classrooms, study teams, or competitive multiplayer quizzes. Explore thousands of community categories, earn custom achievements, and track metrics.
          </p>
        </div>

        <div className="relative z-10 text-xs text-white/50 text-left">
          © 2026 Aero MAGE Inc.
        </div>
      </div>

      {/* Right Panel: Authentication Form */}
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md flex flex-col my-auto">
          <div className="mb-6 text-center md:text-left">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Welcome Back</h3>
            <p className="text-xs text-slate-500">Sign in to your Aero MAGE account to enter classrooms &amp; quizzes.</p>
          </div>

          {errorMsg && (
            <div className={`mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-3 ${shake ? 'animate-shake' : ''}`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none transition"
                  placeholder="name@school.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Organization Credentials Quick Selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-primary tracking-wider">
                  ⚡ Demo Login Quick Selector
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Password: Password123!</span>
              </div>

              {/* Organization Picker Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {demoOrgs.map((org) => (
                  <button
                    key={org.domain}
                    type="button"
                    onClick={() => setSelectedDomain(org.domain)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition ${
                      selectedDomain === org.domain
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {org.label}
                  </button>
                ))}
              </div>

              {/* Quick Role Fill Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail(`faculty@${selectedDomain}`);
                    setPassword('Password123!');
                  }}
                  className="bg-violet-100 hover:bg-violet-200 text-violet-900 text-[11px] font-extrabold py-2 rounded-xl transition text-center shadow-sm"
                >
                  Prof / Faculty
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail(`student@${selectedDomain}`);
                    setPassword('Password123!');
                  }}
                  className="bg-sky-100 hover:bg-sky-200 text-sky-900 text-[11px] font-extrabold py-2 rounded-xl transition text-center shadow-sm"
                >
                  Student
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail(`admin@${selectedDomain}`);
                    setPassword('Password123!');
                  }}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-extrabold py-2 rounded-xl transition text-center shadow-sm"
                >
                  Org Admin
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold text-sm hover:bg-primary/95 transition shadow-md active:scale-98 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              ) : (
                <>
                  Log In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <span 
              onClick={() => navigate('/register')} 
              className="text-primary hover:underline font-bold cursor-pointer"
            >
              Register for Free
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
