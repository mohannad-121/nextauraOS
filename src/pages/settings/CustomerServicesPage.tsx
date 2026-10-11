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
                className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#7568E8]/10 text-[#7568E8] dark:text-[#867AF0] border border-[#7568E8]/20 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-[#F4F6FF]">{service.name}</div>
                      <div className="text-[10px] font-mono text-[#7568E8] dark:text-[#867AF0] capitalize">{service.category}</div>
                    </div>
                  </div>

                  <StatusBadge status="Active" variant="success" />
                </div>

                <p className="text-xs text-slate-500 dark:text-[#A3ABC5] leading-relaxed">{service.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* AVAILABLE SERVICES GRID */}
      {availableServiceDefs.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-[#1F253D]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">
            Available to Enable ({availableServiceDefs.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableServiceDefs.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.key}
                  className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-[#2A3048] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#101426] border border-slate-200/60 dark:border-[#2A3048] text-slate-500 dark:text-[#A3ABC5] flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-[#F4F6FF]">{service.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-[#6B7694] capitalize">{service.category}</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-[#A3ABC5] leading-relaxed">{service.description}</p>

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
              <div className="py-12 text-center text-xs font-medium text-slate-500 dark:text-[#A3ABC5]">Loading plan access…</div>
            ) : <>
            {isFreePlan && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{freePlanMessage}</p>
                  <button type="button" onClick={() => navigate('pricing')} className="mt-2 font-semibold text-[#7568E8] hover:underline dark:text-[#867AF0]">Upgrade to Standard</button>
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
                      className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${isLocked ? 'cursor-not-allowed border-slate-200/70 bg-slate-50/70 text-slate-400 opacity-70 dark:border-[#1F253D] dark:bg-[#101426]/40' : 'cursor-pointer'} ${
                        isSelected
                          ? 'bg-[#7568E8]/10 dark:bg-[#7568E8]/15 border-[#7568E8]/50 text-slate-900 dark:text-[#F4F6FF] shadow-xs'
                          : 'bg-slate-50/50 dark:bg-[#101426] border-slate-200/80 dark:border-[#1F253D] hover:border-slate-300 dark:hover:border-[#2A3048] text-slate-600 dark:text-[#A3ABC5]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#7568E8] text-white' : 'bg-slate-200 dark:bg-[#1F253D] text-slate-500 dark:text-[#A3ABC5]'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-xs text-slate-900 dark:text-[#F4F6FF] flex items-center justify-between">
                          <span>{service.name}</span>
                          {isLocked && <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-label="Requires an upgrade" />}
                          <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center ${isSelected ? 'bg-[#7568E8] text-white font-bold' : 'border border-slate-300 dark:border-[#2A3048] text-transparent'}`}>✓</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-[#A3ABC5] mt-1">{service.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </>}

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#1F253D] pt-4">
              <span className="text-xs font-mono text-slate-500 dark:text-[#A3ABC5]">{selectedKeys.length} service(s) selected</span>
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
