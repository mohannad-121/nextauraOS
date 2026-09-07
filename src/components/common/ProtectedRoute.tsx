import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getServiceByAppId } from '../../data/appRegistry';
import { entitlementService } from '../../services/entitlementService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { activeApp, activeServices, currentOrg, refreshServices, navigate } = useApp();
  const [activationError, setActivationError] = useState('');

  // Core apps accessible to all authenticated org members
  const coreApps = ['launchpad', 'home', 'contacts', 'documents', 'analytics', 'ai', 'pricing', 'settings', 'auth'];
  if (coreApps.includes(activeApp)) {
    return <>{children}</>;
  }

  // Find service definition in registry
  const serviceDef = getServiceByAppId(activeApp);

  // Check if organization has active entitlement for this app
  const isEntitled = serviceDef ? activeServices.includes(serviceDef.key) : true;

  const handleActivateThisService = async () => {
    if (!serviceDef || !currentOrg) return;
    setActivationError('');
    try {
      await entitlementService.activateOrganizationServices(currentOrg.id, [serviceDef.key]);
      if (refreshServices) refreshServices();
    } catch (error: any) {
      setActivationError(error.message || 'Unable to activate this service.');
    }
  };

  if (!isEntitled && serviceDef) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 sm:p-12 animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-6 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
          <Lock className="w-6 h-6" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-4 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
          <ShieldAlert className="w-3.5 h-3.5" />
          Service Not Enabled
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 font-heading max-w-md leading-tight">
          {serviceDef.name} is not active for your workspace.
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mt-3 leading-relaxed">
          {serviceDef.name} is not currently active for your workspace. You can activate it instantly below.
        </p>
        {activationError && <p className="mt-3 max-w-lg text-sm font-medium text-rose-700 dark:text-rose-300">{activationError}</p>}

        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={() => navigate('launchpad')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Return to apps
          </button>
          <button
            onClick={handleActivateThisService}
            className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all"
          >
            <span>Activate {serviceDef.name}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
