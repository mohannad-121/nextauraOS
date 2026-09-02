import React from 'react';
import { Leaf, Sparkles, ShieldCheck, Heart } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';

export const ESGDashboard: React.FC = () => {
  const { navigate, esgMetrics } = useApp();

  const envMetrics = esgMetrics.filter((m) => m.category === 'Environmental');
  const socMetrics = esgMetrics.filter((m) => m.category === 'Social');
  const govMetrics = esgMetrics.filter((m) => m.category === 'Governance');

  return (
    <div className="space-y-8">
      <PageHeader
        title="ESG & Sustainability Hub"
        subtitle="Measure Environmental, Social, and Governance performance, CSRD metrics & sustainability goals."
        actions={
          <button
            onClick={() => navigate('esg', 'carbon')}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
          >
            Carbon Calculator
          </button>
        }
      />

      {/* Main Scorecard Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            2026 CSRD & ESRS READINESS
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 font-heading">
            Overall ESG Scorecard: <span className="text-emerald-400">74 / 100</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Your company is currently performing above industry benchmarks for tech enterprise SaaS platforms.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center shrink-0">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Environment</div>
            <div className="text-2xl font-black text-slate-100 mt-1">68</div>
            <div className="text-[10px] text-slate-500">Target 80</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-cyan-400">Social</div>
            <div className="text-2xl font-black text-slate-100 mt-1">82</div>
            <div className="text-[10px] text-slate-500">Exceeded</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-indigo-400">Governance</div>
            <div className="text-2xl font-black text-slate-100 mt-1">77</div>
            <div className="text-[10px] text-slate-500">SOC2 Ready</div>
          </div>
        </div>
      </div>

      {/* Metrics Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Environmental */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100 font-heading">Environmental Metrics</h3>
          </div>
          <div className="space-y-3">
            {envMetrics.map((m) => (
              <div key={m.name} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{m.name}</div>
                  <div className="text-[10px] text-slate-400">Target: {m.targetValue} {m.unit}</div>
                </div>
                <div className="text-end">
                  <div className="font-mono font-bold text-emerald-400">{m.currentValue} {m.unit}</div>
                  <StatusBadge status={m.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Heart className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100 font-heading">Social & Diversity</h3>
          </div>
          <div className="space-y-3">
            {socMetrics.map((m) => (
              <div key={m.name} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{m.name}</div>
                  <div className="text-[10px] text-slate-400">Target: {m.targetValue} {m.unit}</div>
                </div>
                <div className="text-end">
                  <div className="font-mono font-bold text-cyan-400">{m.currentValue} {m.unit}</div>
                  <StatusBadge status={m.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Governance */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100 font-heading">Governance & Ethics</h3>
          </div>
          <div className="space-y-3">
            {govMetrics.map((m) => (
              <div key={m.name} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{m.name}</div>
                  <div className="text-[10px] text-slate-400">Target: {m.targetValue} {m.unit}</div>
                </div>
                <div className="text-end">
                  <div className="font-mono font-bold text-indigo-400">{m.currentValue} {m.unit}</div>
                  <StatusBadge status={m.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
