import React, { useState } from 'react';
import { Layers, CheckCircle2, Plus, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NEXTAURA_SERVICES } from '../../data/appRegistry';
import { entitlementService } from '../../services/entitlementService';

export const CustomerServicesPage: React.FC = () => {
  const { currentOrg, activeServices, refreshServices } = useApp();
  const [isCatalogModalOpen, setCatalogModalOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Categorize services
  const activeServiceDefs = NEXTAURA_SERVICES.filter((s) => activeServices.includes(s.key));
  const availableServiceDefs = NEXTAURA_SERVICES.filter((s) => !activeServices.includes(s.key));

  const toggleSelectService = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleActivateNewServices = async () => {
    if (selectedKeys.length === 0 || !currentOrg?.id) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      // Instantly activate selected services in PostgreSQL
      await entitlementService.activateOrganizationServices(currentOrg.id, selectedKeys);

      if (refreshServices) refreshServices();

      setSelectedKeys([]);
      setCatalogModalOpen(false);
    } catch (err: any) {
      console.error('[CustomerServicesPage] Service activation error:', err);
      setErrorMsg(err.message || 'Failed to activate selected applications.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            My NextAura Services & Entitlements
          </div>
          <h1 className="text-2xl font-black text-slate-100 font-heading mt-1">Application Catalog & Access</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage active NextAura applications for <strong>{currentOrg?.name}</strong> or enable new enterprise modules instantly.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedKeys([]);
            setErrorMsg('');
            setCatalogModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Enable New Applications</span>
        </button>
      </div>

      {/* ACTIVE SERVICES GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 font-heading">
            Active Applications ({activeServiceDefs.length})
          </h3>
          <span className="text-xs font-mono text-cyan-400 font-bold">Workspace Entitlements Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeServiceDefs.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.key}
                className="p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 flex flex-col justify-between space-y-4 shadow-lg shadow-cyan-500/5 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-100">{service.name}</div>
                      <div className="text-[10px] font-mono text-cyan-400 capitalize">{service.category}</div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{service.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* AVAILABLE SERVICES GRID */}
      {availableServiceDefs.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 font-heading">
            Available to Enable ({availableServiceDefs.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableServiceDefs.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.key}
                  className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-300">{service.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 capitalize">{service.category}</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{service.description}</p>

                  <button
                    onClick={async () => {
                      if (!currentOrg?.id) return;
                      await entitlementService.activateOrganizationServices(currentOrg.id, [service.key]);
                      if (refreshServices) refreshServices();
                    }}
                    className="w-full py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-xs font-bold transition-all"
                  >
                    + Activate Instantly
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ENABLE APPLICATIONS CATALOG MODAL */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase">
                  <Sparkles className="w-4 h-4" /> NextAura Application Suite
                </div>
                <h2 className="text-xl font-bold text-slate-100 font-heading mt-1">Enable Applications</h2>
              </div>
              <button
                onClick={() => setCatalogModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono font-bold"
              >
                Close ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableServiceDefs.map((service) => {
                  const Icon = service.icon;
                  const isSelected = selectedKeys.includes(service.key);

                  return (
                    <div
                      key={service.key}
                      onClick={() => toggleSelectService(service.key)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-slate-950 border-cyan-500 text-slate-100 shadow-md'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-900 text-slate-500'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-xs text-slate-100 flex items-center justify-between">
                          <span>{service.name}</span>
                          <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center ${isSelected ? 'bg-cyan-500 text-slate-950 font-black' : 'border border-slate-800 text-transparent'}`}>✓</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">{service.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs font-mono text-slate-400">{selectedKeys.length} service(s) selected</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCatalogModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleActivateNewServices}
                  disabled={submitting || selectedKeys.length === 0}
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Activating...' : 'Activate Selected Services'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
