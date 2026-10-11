import React, { useState } from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { billingService } from '../../services/billingService';

interface Props {
  organizationId: string;
  onCompleted: (seatCount: number) => void;
}

export const SeatCountScreen: React.FC<Props> = ({ organizationId, onCompleted }) => {
  const [seatCount, setSeatCount] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await billingService.saveSeatCount(organizationId, seatCount);
      onCompleted(seatCount);
    } catch (err: any) {
      setError(err.message || 'Unable to save requested seats.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090B1A] flex items-center justify-center p-6 text-[#F4F6FF] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#7568E8]/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg rounded-3xl border border-[#1F253D] bg-[#161B30] p-8 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative z-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7568E8]/15 border border-[#7568E8]/30 text-[#A499FA] shadow-[0_0_15px_rgba(117,104,232,0.3)]">
          <Users className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[#F4F6FF] font-heading">
          How many seats do you need?
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-[#A3ABC5] max-w-sm mx-auto">
          Seats represent team members who can access and collaborate in this workspace. You can scale your seats anytime.
        </p>

        <div className="mt-8 text-left">
          <label className="block text-xs font-semibold text-[#A3ABC5] mb-2">
            Requested Team Seats
          </label>
          <input
            type="number"
            min={1}
            max={10000}
            value={seatCount}
            onChange={(e) => setSeatCount(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))}
            className="w-full rounded-xl border border-[#2A3048] bg-[#101426] px-4 py-3 text-lg font-bold text-[#F4F6FF] focus:border-[#7568E8] focus:ring-1 focus:ring-[#7568E8] focus:outline-none transition-all tabular-nums text-center"
          />
        </div>

        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="mt-7 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] px-5 py-3.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(117,104,232,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{saving ? 'Saving Seats...' : 'Continue to Workspace'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
