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
    const code = digits.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await verificationService.verifyLoginVerification(userId, code);
      if (res.success) {
        setSuccessMsg('Identity verified! Redirecting to workspace...');
        setTimeout(() => {
          onVerified();
        }, 600);
      } else {
        if ((res as any).locked) {
          setIsLocked(true);
          setErrorMsg(res.error || 'Too many failed attempts. Account locked.');
        } else {
          setErrorMsg(res.error || 'Invalid verification code.');
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
    <div className="min-h-screen w-full bg-[#090B1A] text-[#F4F6FF] flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Background soft glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#7568E8]/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-[#161B30] border border-[#1F253D] rounded-3xl p-8 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative z-10 text-center space-y-6 animate-in zoom-in-95">
        
        {/* Logo & Header */}
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#7568E8]/20 border border-[#7568E8]/40 text-[#F4F6FF] mx-auto flex items-center justify-center font-black text-xl shadow-[0_0_12px_rgba(117,104,232,0.35)]">
            N
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7568E8]/10 text-[#A499FA] border border-[#7568E8]/30 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#23C99C]" />
            <span>Security Verification</span>
          </div>

          <h1 className="text-xl font-bold text-[#F4F6FF] font-heading">Verify your email</h1>
          <p className="text-xs text-[#A3ABC5] leading-relaxed max-w-xs mx-auto">
            We sent a 6-digit verification code to <span className="font-semibold text-[#F4F6FF]">{maskEmail(email)}</span>
          </p>
        </div>

        {/* Error / Success Banners */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-800 text-xs flex items-center gap-2 text-start">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-[#08B894]/15 text-[#23C99C] border border-[#08B894]/30 text-xs font-semibold text-center">
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
                className="w-11 sm:w-12 h-14 text-center text-2xl font-bold font-mono rounded-xl bg-[#101426] border border-[#2A3048] text-[#A499FA] focus:border-[#7568E8] focus:ring-2 focus:ring-[#7568E8]/25 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full py-3.5 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{loading ? 'Verifying Code...' : 'Verify & Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-between border-t border-[#1F253D] text-xs">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            className="text-[#747E9B] hover:text-[#F4F6FF] disabled:opacity-40 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
            </span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
