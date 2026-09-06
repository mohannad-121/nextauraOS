import React, { useState } from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { billingService } from '../../services/billingService';

interface Props { organizationId: string; onCompleted: (seatCount: number) => void; }

export const SeatCountScreen: React.FC<Props> = ({ organizationId, onCompleted }) => {
  const [seatCount, setSeatCount] = useState(5);
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    setSaving(true); setError('');
    try { await billingService.saveSeatCount(organizationId, seatCount); onCompleted(seatCount); }
    catch (err: any) { setError(err.message || 'Unable to save requested seats.'); }
    finally { setSaving(false); }
  };
  return <div className="min-h-screen w-full bg-[#F8F9FA] dark:bg-slate-950 flex items-center justify-center p-6 text-slate-900 dark:text-slate-100">
    <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><Users className="h-6 w-6" /></div>
      <h1 className="mt-5 text-center text-2xl font-semibold">How many seats do you need?</h1>
      <p className="mt-2 text-center text-sm leading-6 text-slate-600 dark:text-slate-400">Seats are the people who can access this workspace. You can change this later from Billing.</p>
      <label className="mt-8 block text-sm font-medium">Requested seats<input type="number" min={1} max={10000} value={seatCount} onChange={(e) => setSeatCount(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg font-semibold dark:border-slate-700 dark:bg-slate-950" /></label>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      <button type="button" disabled={saving} onClick={submit} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{saving ? 'Saving…' : 'Continue'}<ArrowRight className="h-4 w-4" /></button>
    </div>
  </div>;
};
