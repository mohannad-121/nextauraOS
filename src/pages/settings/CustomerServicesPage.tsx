import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  Clock,
  Plus,
  Lock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NEXTAURA_SERVICES } from '../../data/appRegistry';
import { entitlementService } from '../../services/entitlementService';
import type { ServiceRequest } from '../../services/entitlementService';
import { emailService } from '../../services/emailService';

export const CustomerServicesPage: React.FC = () => {
  const { currentOrg, user, activeServices, refreshServices } = useApp();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isCatalogModalOpen, setCatalogModalOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = async () => {
    try {
      const allReqs = await entitlementService.getAllServiceRequests();
      const orgReqs = allReqs.filter((r) => r.organizationId === currentOrg.id);
      setRequests(orgReqs);
    } catch (err) {
      console.error('Error fetching service requests:', err);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentOrg.id]);

  // Compute pending service keys for current organization
  const pendingServiceKeys = requests
    .filter((r) => r.status === 'pending' || r.status === 'partially_approved')
    .flatMap((r) => r.items.filter((itm) => itm.status === 'pending').map((itm) => itm.serviceKey));

  // Categorize services
  const activeServiceDefs = NEXTAURA_SERVICES.filter(
    (s) => activeServices.includes(s.key) || s.isCore
  );

  const pendingServiceDefs = NEXTAURA_SERVICES.filter(
    (s) => !activeServices.includes(s.key) && !s.isCore && pendingServiceKeys.includes(s.key)
  );

  const availableServiceDefs = NEXTAURA_SERVICES.filter(
    (s) => !activeServices.includes(s.key) && !s.isCore && !pendingServiceKeys.includes(s.key)
  );

  const handleToggleSelect = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmitAdditionalRequest = async () => {
    if (selectedKeys.length === 0) return;
    setSubmitting(true);
    try {
      await entitlementService.submitServiceRequest(
        currentOrg.id,
        user.id,
        selectedKeys,
        'Additional service request from Customer Services Center'
      );

      const selectedNames = selectedKeys.map(
        (k) => NEXTAURA_SERVICES.find((s) => s.key === k)?.name || k
      );

      await emailService.notifyAdminNewServiceRequest({
        userName: user.name,
        userEmail: user.email,
        companyName: currentOrg.name,
        requestedServices: selectedNames,
        requestDate: new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      });

      setSelectedKeys([]);
      setCatalogModalOpen(false);
      await loadRequests();
    } catch (err) {
      console.error('Failed to submit additional service request:', err);
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
            Workspace Entitlements & Catalog
          </div>
          <h1 className="text-2xl font-black text-slate-100 font-heading mt-1">My NextAura Services</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage active applications, review pending access requests, and activate additional services for {currentOrg.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshServices && refreshServices()}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            title="Refresh Entitlements"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCatalogModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Request More Services
          </button>
        </div>
      </div>

      {/* SECTION 1: ACTIVE SERVICES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100 font-heading">Active Applications ({activeServiceDefs.length})</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">Entitlement: Enabled</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeServiceDefs.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.key}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-100">{service.name}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{service.categoryLabel}</div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase font-mono">
                    Active
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{service.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: PENDING REQUESTS */}
      {pendingServiceDefs.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100 font-heading">Pending Admin Review ({pendingServiceDefs.length})</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingServiceDefs.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.key}
                  className="p-4 rounded-2xl bg-slate-900/50 border border-amber-500/30 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-100">{service.name}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{service.categoryLabel}</div>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[10px] uppercase font-mono">
                      Pending
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: AVAILABLE SERVICES CATALOG */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100 font-heading">Available NextAura Modules ({availableServiceDefs.length})</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableServiceDefs.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.key}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-cyan-500/40 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-100">{service.name}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{service.categoryLabel}</div>
                    </div>
                  </div>

                  <Lock className="w-4 h-4 text-slate-500" />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{service.description}</p>

                <button
                  onClick={() => {
                    setSelectedKeys([service.key]);
                    setCatalogModalOpen(true);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 font-bold text-xs transition-all"
                >
                  Request Access
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* REQUEST MORE SERVICES MODAL */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100 font-heading">Request Additional Services</h3>
                <p className="text-xs text-slate-400 mt-1">Select the NextAura modules you want to request for {currentOrg.name}.</p>
              </div>
              <button
                onClick={() => setCatalogModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {availableServiceDefs.map((service) => {
                const Icon = service.icon;
                const isSelected = selectedKeys.includes(service.key);

                return (
                  <div
                    key={service.key}
                    onClick={() => handleToggleSelect(service.key)}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-400'
                        : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-100">{service.name}</div>
                        <div className="text-[11px] text-slate-400">{service.description}</div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-cyan-500 text-slate-950' : 'border border-slate-800'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {selectedKeys.length} services selected
              </span>

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
                  onClick={handleSubmitAdditionalRequest}
                  disabled={submitting || selectedKeys.length === 0}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20"
                >
                  {submitting ? 'Submitting...' : 'Submit Service Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
