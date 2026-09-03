import React, { useState } from 'react';
import { Layers, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { NEXTAURA_SERVICES } from '../../data/appRegistry';
import { entitlementService } from '../../services/entitlementService';

interface ServiceSelectionScreenProps {
  organizationId: string;
  userId: string;
  onCompleted: (selectedServiceKeys: string[]) => void;
  onRetryWorkspace?: () => void;
}

export const ServiceSelectionScreen: React.FC<ServiceSelectionScreenProps> = ({
  organizationId,
  userId,
  onCompleted,
  onRetryWorkspace,
}) => {
  // CRITICAL 6: Must start empty [] (No pre-selected services)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // CRITICAL 10: Invariant check for missing organization ID
  if (!organizationId) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Workspace Setup Error</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your workspace organization could not be initialized or retrieved. Please try setting up your workspace again.
          </p>
          {onRetryWorkspace && (
            <button
              onClick={onRetryWorkspace}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Workspace Setup</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const toggleService = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleActivateServices = async () => {
    if (selectedKeys.length === 0) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Activate selected services in database
      await entitlementService.activateOrganizationServices(organizationId, selectedKeys);

      // 2. Mark initial service selection completed in profile
      await entitlementService.completeUserOnboarding(userId);

      // CRITICAL 7: Only transition to dashboard AFTER confirmed database persistence!
      onCompleted(selectedKeys);
    } catch (err: any) {
      console.error('[ServiceSelection] Service activation failed:', err);
      // CRITICAL 7: DO NOT call onCompleted inside catch! Show error and keep user on screen.
      setErrorMsg(err.message || 'Failed to activate selected applications. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { key: 'finance', label: 'FINANCE' },
    { key: 'hr', label: 'HUMAN RESOURCES' },
    { key: 'marketing', label: 'MARKETING' },
    { key: 'global', label: 'GLOBAL PLATFORM' },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col min-h-[660px] relative z-10">
        
        {/* Top Header */}
        <div className="px-8 py-6 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-black text-cyan-400 text-lg">
                N
              </div>
            </div>
            <div>
              <span className="font-extrabold text-slate-100 font-heading text-lg">
                Welcome to Next<span className="text-cyan-400">Aura</span>
              </span>
              <p className="text-xs text-slate-400">Select the NextAura applications you want to enable for your workspace.</p>
            </div>
          </div>

          <div className="px-4 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs font-mono">
            {selectedKeys.length} services selected
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mx-8 mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Applications Grid */}
        <div className="flex-1 p-8 sm:p-10 overflow-y-auto space-y-8">
          {categories.map((cat) => {
            const catServices = NEXTAURA_SERVICES.filter((s) => s.category === cat.key);
            if (catServices.length === 0) return null;

            return (
              <div key={cat.key} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{cat.label}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {catServices.map((service) => {
                    const Icon = service.icon;
                    const isSelected = selectedKeys.includes(service.key);

                    return (
                      <div
                        key={service.key}
                        onClick={() => toggleService(service.key)}
                        className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/50 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9.5 h-9.5 rounded-xl flex items-center justify-center ${
                                isSelected
                                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800'
                              }`}
                            >
                              <Icon className="w-4.5 h-4.5" />
                            </div>
                            <div className="font-bold text-xs text-slate-100">{service.name}</div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-cyan-500 text-slate-950'
                                : 'bg-slate-900 border border-slate-800 text-transparent'
                            }`}
                          >
                            ✓
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {service.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="px-8 py-5 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {selectedKeys.length === 0
              ? 'Please select at least one application to continue.'
              : `${selectedKeys.length} application(s) will be activated instantly.`}
          </span>

          <button
            type="button"
            onClick={handleActivateServices}
            disabled={submitting || selectedKeys.length === 0}
            className="px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <span>{submitting ? 'Activating Applications...' : 'Activate Services'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
