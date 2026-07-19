import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Chrome, ArrowRight, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

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

      // Redirect to dashboard
      navigate('/dashboard');
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

  const handleGoogleSignIn = () => {
    alert('Connecting to Google OAuth authentication window...');
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
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md flex flex-col">
          <div className="mb-8 text-center md:text-left">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Welcome Back</h3>
            <p className="text-sm text-slate-500">Sign in to your Aero MAGE account to join rooms.</p>
          </div>

          {/* Social login */}
          <button 
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-3 w-full border border-slate-200 hover:bg-slate-50 px-4 py-3 rounded-xl font-bold text-slate-700 transition shadow-sm mb-6"
          >
            <Chrome className="w-5 h-5 text-red-500" />
            Continue with Google
          </button>

          <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-400 mb-6">
            <div className="h-px bg-slate-200 flex-grow"></div>
            <span>or sign in with email</span>
            <div className="h-px bg-slate-200 flex-grow"></div>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className={`flex items-start gap-3 bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-800 text-sm mb-6 ${shake ? 'animate-bounce' : ''}`}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-5 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Mail className="w-4 h-4" /></span>
                <input
                  type="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:bg-white outline-none transition"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <span 
                  onClick={() => alert('Forgot password helper: Token will be generated in server logs.')} 
                  className="text-xs text-primary hover:underline font-bold cursor-pointer"
                >
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="w-4 h-4" /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-primary focus:bg-white outline-none transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Testing Autofill Helper Buttons */}
            <div className="flex flex-wrap gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@aeromage.com');
                  setPassword('Password123!');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('org@aeromage.com');
                  setPassword('Password123!');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition"
              >
                Org Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('it@aeromage.com');
                  setPassword('Password123!');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition"
              >
                IT Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('faculty@aeromage.com');
                  setPassword('Password123!');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition"
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('student@aeromage.com');
                  setPassword('Password123!');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition"
              >
                Student
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold text-sm hover:bg-primary/95 transition shadow-md active:scale-98 flex items-center justify-center gap-2"
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

          <p className="mt-8 text-center text-sm text-slate-500">
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
