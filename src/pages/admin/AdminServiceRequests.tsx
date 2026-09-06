import React from 'react';
import { Layers, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NEXTAURA_SERVICES } from '../../data/appRegistry';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminServiceRequests: React.FC = () => {
  const { currentOrg, activeServices } = useApp();

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <PageHeader
        title="Application Entitlements & Access"
        subtitle="NextAura features instant application activation for all organization workspaces."
        actions={
          <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-medium flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Instant Activation Enabled
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 uppercase">Active Workspace</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{currentOrg?.name || 'Workspace'}</div>
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">Org ID: {currentOrg?.id}</div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 uppercase">Enabled Applications</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeServices.length} / {NEXTAURA_SERVICES.length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Applications currently active for this workspace</div>
        </div>
      </div>

      {/* Applications Catalog Status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Active Applications Inventory</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {NEXTAURA_SERVICES.map((service) => {
            const isActive = activeServices.includes(service.key);
            const Icon = service.icon;

            return (
              <div
                key={service.key}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-800/40 text-slate-900 dark:text-slate-100'
                    : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{service.name}</div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 capitalize">{service.category}</div>
                  </div>
                </div>

                <div className="shrink-0">
                  <StatusBadge
                    status={isActive ? 'Active' : 'Disabled'}
                    variant={isActive ? 'success' : 'neutral'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
