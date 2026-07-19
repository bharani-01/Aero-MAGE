import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Chrome, ArrowRight, User, CheckCircle2, XCircle } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password requirements state
  const [reqs, setReqs] = useState({
    length: false,
    uppercase: false,
    digit: false,
    special: false,
  });

  const [strengthScore, setStrengthScore] = useState(0);

  // Live password validation
  useEffect(() => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      digit: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    setReqs(checks);

    // Calculate strength score (0 to 4)
    const score = Object.values(checks).filter(Boolean).length;
    setStrengthScore(score);
  }, [password]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all the fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (strengthScore < 3) {
      setErrorMsg('Please choose a stronger password.');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('You must agree to the Terms and Privacy Policy.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Registration failed.');
      }

      setSuccessMsg('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    alert('Connecting to Google OAuth authentication window...');
  };

  const getStrengthLabel = () => {
    switch (strengthScore) {
      case 0:
      case 1:
        return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500' };
      case 2:
        return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500' };
      case 3:
        return { label: 'Good', color: 'bg-indigo-500', text: 'text-indigo-500' };
      case 4:
        return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500' };
      default:
        return { label: 'Weak', color: 'bg-slate-350', text: 'text-slate-500' };
    }
  };

  const strength = getStrengthLabel();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-body-md text-on-surface">
      {/* Left Panel */}
      <div className="md:w-1/2 bg-primary text-on-primary flex flex-col justify-between p-12 relative overflow-hidden">
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
            Join the Next-Gen Playroom
          </h2>
          <p className="text-white/80 leading-relaxed text-sm">
            Sign up for a free creator account. Access playrooms instantly, build customized question banks, and sync scores in real-time.
          </p>
        </div>

        <div className="relative z-10 text-xs text-white/50 text-left">
          © 2026 Aero MAGE Inc.
        </div>
      </div>

      {/* Right Panel */}
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md flex flex-col my-8">
          <div className="mb-6 text-center md:text-left">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Create Your Account</h3>
            <p className="text-sm text-slate-500">Launch playroom lobbies and compile question decks.</p>
          </div>

          <button 
            onClick={handleGoogleSignUp}
            className="flex items-center justify-center gap-3 w-full border border-slate-200 hover:bg-slate-50 px-4 py-3 rounded-xl font-bold text-slate-700 transition shadow-sm mb-6"
          >
            <Chrome className="w-5 h-5 text-red-500" />
            Continue with Google
          </button>

          <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-400 mb-6">
            <div className="h-px bg-slate-200 flex-grow"></div>
            <span>or create account with email</span>
            <div className="h-px bg-slate-200 flex-grow"></div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-800 text-sm mb-6">
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-800 text-sm mb-6">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Display Name</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User className="w-4 h-4" /></span>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:bg-white outline-none transition"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Mail className="w-4 h-4" /></span>
                <input
                  type="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:bg-white outline-none transition"
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
                {password && (
                  <span className={`text-xs font-bold ${strength.text}`}>
                    Strength: {strength.label}
                  </span>
                )}
              </div>
              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="w-4 h-4" /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:bg-white outline-none transition"
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

              {/* Password strength meter visual bar */}
              {password && (
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full transition-all duration-350 ${strength.color}`} 
                    style={{ width: `${(strengthScore / 4) * 100}%` }}
                  ></div>
                </div>
              )}

              {/* Password Requirements Checklist */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${reqs.length ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <span className={reqs.length ? 'text-slate-600' : ''}>8+ Characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${reqs.uppercase ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <span className={reqs.uppercase ? 'text-slate-600' : ''}>Uppercase Letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${reqs.digit ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <span className={reqs.digit ? 'text-slate-600' : ''}>Contains Digit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${reqs.special ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <span className={reqs.special ? 'text-slate-600' : ''}>Special Symbol</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="w-4 h-4" /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:bg-white outline-none transition"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2 text-left">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 rounded border-slate-300 text-primary focus:ring-primary outline-none"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="terms" className="text-xs text-slate-500 leading-normal">
                I agree to the{' '}
                <span className="text-primary font-bold hover:underline cursor-pointer" onClick={() => alert('Opening Terms of Service...')}>Terms of Service</span>
                {' '}and{' '}
                <span className="text-primary font-bold hover:underline cursor-pointer" onClick={() => alert('Opening Privacy Policy...')}>Privacy Policy</span>.
              </label>
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
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <span 
              onClick={() => navigate('/login')} 
              className="text-primary hover:underline font-bold cursor-pointer"
            >
              Log In
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
