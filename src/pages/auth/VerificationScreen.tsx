import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, LogOut, RefreshCw, ArrowRight, AlertCircle } from 'lucide-react';
import { verificationService } from '../../services/verificationService';

interface VerificationScreenProps {
  userId: string;
  email: string;
  onVerified: () => void;
  onSignOut: () => void;
}

export const VerificationScreen: React.FC<VerificationScreenProps> = ({
  userId,
  email,
  onVerified,
  onSignOut,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  // Prevent duplicate OTP emails on remount/StrictMode
  const initialCodeSentRef = useRef(false);

  // Mask email e.g. m***h@gmail.com
  const maskEmail = (str: string) => {
    if (!str || !str.includes('@')) return str;
    const [name, domain] = str.split('@');
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  };

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Initial code send on mount — strictly executed once per mounted session
  useEffect(() => {
    if (userId && email && !initialCodeSentRef.current) {
      initialCodeSentRef.current = true;
      verificationService.sendLoginVerification(userId, email);
    }
  }, [userId, email]);

  const handleDigitChange = (index: number, val: string) => {
    if (isLocked) return;
    const cleanVal = val.replace(/\D/g, '');
    if (val && !cleanVal) return;

    const newDigits = [...digits];
    newDigits[index] = cleanVal.slice(-1);
    setDigits(newDigits);

    // Auto focus next input
    if (cleanVal && index < 5) {
      const nextEl = document.getElementById(`digit-input-${index + 1}`);
      nextEl?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isLocked) return;
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevEl = document.getElementById(`digit-input-${index - 1}`);
      prevEl?.focus();
    }
  };

  // Full 6-digit paste support
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isLocked) return;
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').trim();
    if (pastedText.length === 6) {
      const newDigits = pastedText.split('');
      setDigits(newDigits);
      const lastInput = document.getElementById('digit-input-5');
      lastInput?.focus();
    } else if (pastedText.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < Math.min(pastedText.length, 6); i++) {
        newDigits[i] = pastedText[i];
      }
      setDigits(newDigits);
      const targetIdx = Math.min(pastedText.length, 5);
      const targetInput = document.getElementById(`digit-input-${targetIdx}`);
      targetInput?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    const codeStr = digits.join('');
    if (codeStr.length < 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await verificationService.verifyLoginVerification(userId, codeStr);
      if (result.success) {
        setSuccessMsg('Email verified successfully! Opening workspace...');
        setTimeout(() => {
          onVerified();
        }, 800);
      } else {
        if (result.code === 'MAX_ATTEMPTS' || result.attemptsRemaining === 0) {
          setIsLocked(true);
          setErrorMsg(result.error || 'Too many incorrect attempts. Please request a new verification code.');
        } else {
          setErrorMsg(result.error || 'Incorrect verification code. Please try again.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await verificationService.sendLoginVerification(userId, email);
      if (res.success) {
        setIsLocked(false);
        setDigits(['', '', '', '', '', '']);
        setSuccessMsg(`A new 6-digit verification code was sent to ${email}`);
        setResendCooldown(60);
      } else {
        setErrorMsg(res.error || 'Failed to resend verification code.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Fullscreen Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 text-center space-y-6 animate-in zoom-in-95">
        
        {/* Logo & Header */}
        <div className="space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 p-0.5 mx-auto shadow-xl shadow-cyan-500/20">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center font-black text-cyan-400 text-xl">
              N
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            NextAura Security Verification
          </div>

          <h1 className="text-2xl font-black text-slate-100 font-heading">Verify your email</h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            We sent a 6-digit verification code to <span className="font-bold text-slate-200">{maskEmail(email)}</span>
          </p>
        </div>

        {/* Error / Success Banners */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-start animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold text-center animate-in fade-in">
            {successMsg}
          </div>
        )}

        {/* 6 Digit Input Form */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex items-center justify-center gap-2 sm:gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                id={`digit-input-${idx}`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={loading || isLocked}
                className="w-11 h-13 text-center text-xl font-bold font-mono rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all pointer-events-auto"
          >
            <span>{loading ? 'Verifying Code...' : 'Verify & Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            className="text-slate-400 hover:text-slate-200 disabled:opacity-40 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
            </span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
