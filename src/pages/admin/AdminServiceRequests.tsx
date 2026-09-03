import React from 'react';
import { ShieldCheck, CheckCircle2, Layers, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NEXTAURA_SERVICES } from '../../data/appRegistry';

export const AdminServiceRequests: React.FC = () => {
  const { currentOrg, activeServices } = useApp();

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            NextAura Platform Administration
          </div>
          <h1 className="text-2xl font-black text-slate-100 font-heading mt-1">Application Entitlements & Access</h1>
          <p className="text-xs text-slate-400 mt-1">
            NextAura features instant application activation for all organization workspaces.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Instant Activation Enabled
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 space-y-2">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase">Active Workspace</div>
          <div className="text-xl font-bold text-slate-100 font-heading">{currentOrg?.name || 'Workspace'}</div>
          <div className="text-xs text-cyan-400 font-mono">Org ID: {currentOrg?.id}</div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 space-y-2">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase">Enabled Applications</div>
          <div className="text-2xl font-black text-slate-100 font-heading">{activeServices.length} / {NEXTAURA_SERVICES.length}</div>
          <div className="text-xs text-slate-400">Applications currently active for this workspace</div>
        </div>
      </div>

      {/* Applications Catalog Status */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Active Applications Inventory</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {NEXTAURA_SERVICES.map((service) => {
            const isActive = activeServices.includes(service.key);
            const Icon = service.icon;

            return (
              <div
                key={service.key}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-slate-950 border-cyan-500/40 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-900 text-slate-600'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">{service.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 capitalize">{service.category}</div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isActive ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-mono">
                      Disabled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
