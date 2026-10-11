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
          <div className="px-3.5 py-1.5 rounded-xl bg-[#7568E8]/10 dark:bg-[#7568E8]/15 border border-[#7568E8]/20 text-[#7568E8] dark:text-[#867AF0] text-xs font-mono font-semibold flex items-center gap-1.5 shadow-2xs">
            <Zap className="w-3.5 h-3.5" />
            Instant Activation Enabled
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-2">
          <div className="text-xs font-mono font-medium text-slate-500 dark:text-[#A3ABC5] uppercase">Active Workspace</div>
          <div className="text-xl font-bold text-slate-900 dark:text-[#F4F6FF]">{currentOrg?.name || 'Workspace'}</div>
          <div className="text-xs text-[#7568E8] dark:text-[#867AF0] font-mono">Org ID: {currentOrg?.id}</div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-2">
          <div className="text-xs font-mono font-medium text-slate-500 dark:text-[#A3ABC5] uppercase">Enabled Applications</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-[#F4F6FF]">{activeServices.length} / {NEXTAURA_SERVICES.length}</div>
          <div className="text-xs text-slate-500 dark:text-[#A3ABC5]">Applications currently active for this workspace</div>
        </div>
      </div>

      {/* Applications Catalog Status */}
      <div className="bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">
          <Layers className="w-4 h-4 text-[#7568E8] dark:text-[#867AF0]" />
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
                    ? 'bg-[#7568E8]/10 dark:bg-[#7568E8]/15 border-[#7568E8]/30 dark:border-[#7568E8]/30 text-slate-900 dark:text-[#F4F6FF]'
                    : 'bg-slate-50/50 dark:bg-[#101426] border-slate-200/60 dark:border-[#1F253D] text-slate-400 dark:text-[#6B7694]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-[#7568E8] text-white' : 'bg-slate-200 dark:bg-[#1F253D] text-slate-400 dark:text-[#6B7694]'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-[#F4F6FF]">{service.name}</div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-[#A3ABC5] capitalize">{service.category}</div>
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
