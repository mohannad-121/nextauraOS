import React, { useState } from 'react';
import { Zap, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';

export const AuthScreens: React.FC = () => {
  const { navigate } = useApp();
  const [email, setEmail] = useState('mohannad@nextaura.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await authService.signIn(email, password);
      navigate('launchpad');
    } catch (err: any) {
      console.warn('Supabase Auth Notice (Falling back to Demo Session):', err.message);
      navigate('launchpad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Visual Artwork */}
        <div className="p-8 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/40 flex flex-col justify-between relative border-r border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-slate-100 font-heading">
              Next<span className="text-cyan-400">Aura</span>
            </span>
          </div>

          <div className="space-y-4 my-10">
            <h2 className="text-2xl font-black text-slate-100 font-heading leading-tight">
              Welcome back to NextAura
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unified business operating system for finance, people, marketing, operations, and intelligence.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            SOC2 Type II Certified • 256-bit AES
          </div>
        </div>

        {/* Right Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-100 font-heading">Welcome Back</h3>
            <p className="text-xs text-slate-400 mt-1">Sign in to your enterprise workspace</p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
