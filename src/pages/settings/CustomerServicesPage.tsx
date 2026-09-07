import React, { useState } from 'react';
import { Lock, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NEXTAURA_SERVICES } from '../../data/appRegistry';
import { entitlementService } from '../../services/entitlementService';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const CustomerServicesPage: React.FC = () => {
  const { currentOrg, activeServices, refreshServices, navigate } = useApp();
  const [isCatalogModalOpen, setCatalogModalOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [catalogEntitlements, setCatalogEntitlements] = useState<Awaited<ReturnType<typeof entitlementService.getPlanEntitlements>>>(null);
  const [loadingCatalogEntitlements, setLoadingCatalogEntitlements] = useState(false);

  // Categorize services
  const activeServiceDefs = NEXTAURA_SERVICES.filter((s) => activeServices.includes(s.key));
  const availableServiceDefs = NEXTAURA_SERVICES.filter((s) => !activeServices.includes(s.key));

  const isFreePlan = catalogEntitlements?.plan === 'one_app_free';
  const freePlanHasActiveApp = isFreePlan && catalogEntitlements.active_services.length >= 1;
  const freePlanHasSelectedApp = isFreePlan && selectedKeys.length >= 1;
  const freePlanMessage = 'One App Free includes one active business app. Upgrade to Standard to unlock the full app catalog.';
  const isServiceLocked = (key: string) => isFreePlan && !selectedKeys.includes(key) && (freePlanHasActiveApp || freePlanHasSelectedApp);

  const toggleSelectService = (key: string) => {
    if (isServiceLocked(key)) return;
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const openCatalog = async () => {
    if (!currentOrg?.id) return;
    setSelectedKeys([]);
    setErrorMsg('');
    setCatalogEntitlements(null);
    setCatalogModalOpen(true);
    setLoadingCatalogEntitlements(true);
    try {
      setCatalogEntitlements(await entitlementService.getPlanEntitlements(currentOrg.id));
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load your plan access.');
    } finally {
      setLoadingCatalogEntitlements(false);
    }
  };

  const handleActivateNewServices = async () => {
    if (selectedKeys.length === 0 || !currentOrg?.id) return;
    if (isFreePlan && (freePlanHasActiveApp || selectedKeys.length > 1)) {
      setErrorMsg(freePlanMessage);
      return;
    }
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

  const handleActivateSingleService = async (serviceKey: string) => {
    if (!currentOrg?.id) return;
    setErrorMsg('');
    try {
      if (!await entitlementService.canEnableService(currentOrg.id, serviceKey)) {
        const entitlements = await entitlementService.getPlanEntitlements(currentOrg.id);
        setErrorMsg(entitlements?.plan === 'one_app_free' ? freePlanMessage : 'This application is not available for your current subscription.');
        return;
      }
      await entitlementService.activateOrganizationServices(currentOrg.id, [serviceKey]);
      if (refreshServices) refreshServices();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to activate this application.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Application Catalog & Access"
        subtitle={`Manage active NextAura applications for ${currentOrg?.name || 'your workspace'} or enable new enterprise modules instantly.`}
        actions={
          <Button
            onClick={openCatalog}
            icon={<Plus className="w-4 h-4" />}
          >
            Enable New Applications
          </Button>
        }
      />

      {errorMsg && !isCatalogModalOpen && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-400">
          {errorMsg}
        </div>
      )}

      {/* ACTIVE SERVICES GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Active Applications ({activeServiceDefs.length})
          </h2>
          <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">Workspace Entitlements Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeServiceDefs.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.key}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{service.name}</div>
                      <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 capitalize">{service.category}</div>
                    </div>
                  </div>

                  <StatusBadge status="Active" variant="success" />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{service.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* AVAILABLE SERVICES GRID */}
      {availableServiceDefs.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Available to Enable ({availableServiceDefs.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableServiceDefs.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.key}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{service.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 capitalize">{service.category}</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{service.description}</p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleActivateSingleService(service.key)}
                  >
                    + Activate Instantly
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ENABLE APPLICATIONS CATALOG MODAL */}
      {isCatalogModalOpen && (
        <Modal
          isOpen={isCatalogModalOpen}
          onClose={() => setCatalogModalOpen(false)}
          title="Enable Applications"
          subtitle="NextAura Application Suite"
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {loadingCatalogEntitlements ? (
              <div className="py-12 text-center text-xs font-medium text-slate-500 dark:text-slate-400">Loading plan access…</div>
            ) : <>
            {isFreePlan && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{freePlanMessage}</p>
                  <button type="button" onClick={() => navigate('pricing')} className="mt-2 font-semibold text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-300">Upgrade to Standard</button>
                </div>
              </div>
            )}
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableServiceDefs.map((service) => {
                  const Icon = service.icon;
                  const isSelected = selectedKeys.includes(service.key);
                  const isLocked = isServiceLocked(service.key);

                  return (
                    <div
                      key={service.key}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-disabled={isLocked}
                      tabIndex={isLocked ? -1 : 0}
                      onClick={() => toggleSelectService(service.key)}
                      onKeyDown={(event) => {
                        if (!isLocked && (event.key === ' ' || event.key === 'Enter')) {
                          event.preventDefault();
                          toggleSelectService(service.key);
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${isLocked ? 'cursor-not-allowed border-slate-200/70 bg-slate-50/70 text-slate-400 opacity-70 dark:border-slate-800 dark:bg-slate-950/40' : 'cursor-pointer'} ${
                        isSelected
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-500/50 text-slate-900 dark:text-slate-100 shadow-2xs'
                          : 'bg-slate-50/50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
                          <span>{service.name}</span>
                          {isLocked && <Lock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" aria-label="Requires an upgrade" />}
                          <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white font-bold' : 'border border-slate-300 dark:border-slate-700 text-transparent'}`}>✓</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{service.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </>}

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{selectedKeys.length} service(s) selected</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCatalogModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleActivateNewServices}
                  isLoading={submitting}
                  disabled={selectedKeys.length === 0 || loadingCatalogEntitlements || freePlanHasActiveApp}
                >
                  Activate Selected Services
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
