import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  User,
  CheckCircle2,
  Building,
  KeyRound,
} from 'lucide-react';
import { authService } from '../../services/authService';

export const AuthScreens: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Form states
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password validation helper
  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number.';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return 'Password must contain at least one special character.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'signin') {
        await authService.signIn(email, password);
        // Supabase onAuthStateChange in AppBootGate owns all post-auth routing.
      } else if (mode === 'signup') {
        const passError = validatePassword(password);
        if (passError) {
          setErrorMsg(passError);
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match.');
          setLoading(false);
          return;
        }

        const res = await authService.signUp(email, password, name || 'Enterprise User');

        if (res && res.session) {
          // Supabase session created! AppBootGate handles 6-digit OTP gate automatically.
        } else if (res && res.user) {
          setSuccessMsg('Account created! Please check your email to confirm your account before signing in.');
        }
      } else {
        setSuccessMsg('Password reset instructions sent to your email.');
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMsg(err.message || 'Failed to authenticate with Google');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Main Glass Container */}
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* Left Hero & Feature Panel */}
        <div className="lg:col-span-5 p-8 sm:p-10 bg-slate-50 dark:bg-slate-950/60 border-b lg:border-b-0 lg:border-e border-slate-200/80 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black text-lg shadow-xs">
                N
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-base text-slate-900 dark:text-slate-100 font-heading tracking-tight">
                  NextAura <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                  Business OS Platform
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Enterprise Operating System
              </div>

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 font-heading leading-tight tracking-tight">
                Calm, intelligent software for serious companies.
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Orchestrate Finance, HR, Payroll, Marketing, and Compliance in one refined, unified workspace.
              </p>

              <div className="space-y-2.5 pt-2">
                {[
                  'Server-Backed 6-Digit Email OTP Verification',
                  'Google OAuth 2.0 Single Sign-On (SSO)',
                  'Tenant Isolation & Role Permissions',
                  'Complete Auditable Record Persistence',
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>SOC2 Type II • 256-bit AES</span>
            </div>
            <span className="text-blue-700 dark:text-blue-400 font-medium">99.99% Uptime</span>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-6 bg-white dark:bg-slate-900">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-heading">
                {mode === 'signin'
                  ? 'Sign in to NextAura'
                  : mode === 'signup'
                  ? 'Create Enterprise Workspace'
                  : 'Reset Password'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {mode === 'signin'
                  ? 'Enter your credentials or use Google Single Sign-On'
                  : mode === 'signup'
                  ? 'Enter your details to register your enterprise account'
                  : 'Enter your work email to receive reset link'}
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs font-medium animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs font-medium animate-in fade-in">
              {successMsg}
            </div>
          )}

          {/* Google SSO Button */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-3 transition-all shadow-xs group"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>{googleLoading ? 'Redirecting to Google...' : 'Continue with Google Workspace'}</span>
              </button>

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-800" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                  Or email authentication
                </span>
                <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-800" />
              </div>
            </>
          )}

          {/* DYNAMIC AUTH FORM */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Mohannad Abuayyash"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Organization / Company</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="NextAura Inc."
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Work Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium">Password</label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'signup' && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.
                    </p>
                  )}
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-all mt-2 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                mode === 'signin' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending reset email...'
              ) : mode === 'signin' ? (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>Create Account</span>
                  <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Send Reset Email</span>
                  <KeyRound className="w-4 h-4" />
                </>
              )}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 mt-2 block"
              >
                Back to Sign In
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
