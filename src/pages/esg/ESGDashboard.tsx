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

  const overallScore = esgMetrics.length > 0
    ? Math.round(esgMetrics.reduce((sum, m) => sum + (m.currentValue || 0), 0) / esgMetrics.length)
    : 0;

  const envScore = envMetrics.length > 0 ? Math.round(envMetrics.reduce((sum, m) => sum + (m.currentValue || 0), 0) / envMetrics.length) : 0;
  const socScore = socMetrics.length > 0 ? Math.round(socMetrics.reduce((sum, m) => sum + (m.currentValue || 0), 0) / socMetrics.length) : 0;
  const govScore = govMetrics.length > 0 ? Math.round(govMetrics.reduce((sum, m) => sum + (m.currentValue || 0), 0) / govMetrics.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        category="Finance"
        title="ESG & Sustainability Hub"
        subtitle="Measure Environmental, Social, and Governance performance, CSRD metrics & sustainability goals."
        actions={
          <button
            onClick={() => navigate('esg', 'carbon')}
            className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Leaf className="w-3.5 h-3.5" />
            Carbon Calculator
          </button>
        }
      />

      {/* Main Scorecard Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-[#08B894]/10 text-emerald-700 dark:text-[#23C99C] text-[10px] font-semibold tracking-wider uppercase border border-emerald-200 dark:border-[#08B894]/20">
            <Sparkles className="w-3 h-3 text-[#08B894] dark:text-[#23C99C]" />
            2026 CSRD & ESRS READINESS
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F6FF] font-heading">
            Overall ESG Scorecard: <span className="text-[#08B894] dark:text-[#23C99C]">{overallScore} / 100</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#A3ABC5] max-w-xl">
            {overallScore > 0
              ? 'Your company sustainability performance derived from active environmental, social & governance metrics.'
              : 'No CSRD sustainability metrics recorded yet. Add carbon activities to generate your company scorecard.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center shrink-0 w-full md:w-auto">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/80 dark:border-[#1F253D]">
            <div className="text-[10px] uppercase font-bold text-[#08B894] dark:text-[#23C99C]">Environment</div>
            <div className="text-xl font-bold text-slate-900 dark:text-[#F4F6FF] mt-0.5 tabular-nums">{envScore}</div>
            <div className="text-[10px] text-slate-400 dark:text-[#6B7694]">{envMetrics.length} Metrics</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/80 dark:border-[#1F253D]">
            <div className="text-[10px] uppercase font-bold text-[#178CFF] dark:text-[#52A8FF]">Social</div>
            <div className="text-xl font-bold text-slate-900 dark:text-[#F4F6FF] mt-0.5 tabular-nums">{socScore}</div>
            <div className="text-[10px] text-slate-400 dark:text-[#6B7694]">{socMetrics.length} Metrics</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/80 dark:border-[#1F253D]">
            <div className="text-[10px] uppercase font-bold text-[#7568E8] dark:text-[#A499FA]">Governance</div>
            <div className="text-xl font-bold text-slate-900 dark:text-[#F4F6FF] mt-0.5 tabular-nums">{govScore}</div>
            <div className="text-[10px] text-slate-400 dark:text-[#6B7694]">{govMetrics.length} Metrics</div>
          </div>
        </div>
      </div>

      {/* Metrics Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Environmental */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#1F253D] pb-3">
            <Leaf className="w-4 h-4 text-[#08B894] dark:text-[#23C99C]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6FF] font-heading">Environmental Metrics</h3>
          </div>
          <div className="space-y-2.5">
            {envMetrics.map((m) => (
              <div key={m.name} className="p-3 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/60 dark:border-[#1F253D] flex justify-between items-center text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{m.name}</div>
                  <div className="text-[10px] text-slate-400 dark:text-[#6B7694]">Target: {m.targetValue} {m.unit}</div>
                </div>
                <div className="text-end">
                  <div className="font-mono font-semibold text-[#08B894] dark:text-[#23C99C] tabular-nums">{m.currentValue} {m.unit}</div>
                  <StatusBadge status={m.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#1F253D] pb-3">
            <Heart className="w-4 h-4 text-[#178CFF] dark:text-[#52A8FF]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6FF] font-heading">Social & Diversity</h3>
          </div>
          <div className="space-y-2.5">
            {socMetrics.map((m) => (
              <div key={m.name} className="p-3 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/60 dark:border-[#1F253D] flex justify-between items-center text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{m.name}</div>
                  <div className="text-[10px] text-slate-400 dark:text-[#6B7694]">Target: {m.targetValue} {m.unit}</div>
                </div>
                <div className="text-end">
                  <div className="font-mono font-semibold text-[#178CFF] dark:text-[#52A8FF] tabular-nums">{m.currentValue} {m.unit}</div>
                  <StatusBadge status={m.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Governance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#1F253D] pb-3">
            <ShieldCheck className="w-4 h-4 text-[#7568E8] dark:text-[#A499FA]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6FF] font-heading">Governance & Ethics</h3>
          </div>
          <div className="space-y-2.5">
            {govMetrics.map((m) => (
              <div key={m.name} className="p-3 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/60 dark:border-[#1F253D] flex justify-between items-center text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{m.name}</div>
                  <div className="text-[10px] text-slate-400 dark:text-[#6B7694]">Target: {m.targetValue} {m.unit}</div>
                </div>
                <div className="text-end">
                  <div className="font-mono font-semibold text-[#7568E8] dark:text-[#A499FA] tabular-nums">{m.currentValue} {m.unit}</div>
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

