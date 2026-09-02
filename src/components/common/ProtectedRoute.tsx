import React from 'react';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getServiceByAppId } from '../../data/appRegistry';
import { OnboardingWizard } from '../../pages/onboarding/OnboardingWizard';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { activeApp, activeServices, isOnboardingActive, navigate } = useApp();

  // If onboarding is active for first-time user, render OnboardingWizard
  if (isOnboardingActive) {
    return <OnboardingWizard />;
  }

  // Core apps accessible to all authenticated org members
  const coreApps = ['launchpad', 'home', 'contacts', 'documents', 'analytics', 'settings', 'auth'];
  if (coreApps.includes(activeApp)) {
    return <>{children}</>;
  }

  // Find service definition in registry
  const serviceDef = getServiceByAppId(activeApp);

  // Check if organization has active entitlement for this app
  const isEntitled = serviceDef ? activeServices.includes(serviceDef.key) : true;

  if (!isEntitled && serviceDef) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 sm:p-12 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 shadow-xl shadow-amber-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-amber-400 text-xs font-mono font-semibold mb-4">
          <ShieldAlert className="w-3.5 h-3.5" />
          Access Not Enabled
        </div>

        <h1 className="text-3xl font-black text-slate-100 font-heading max-w-md leading-tight">
          {serviceDef.name} is not active for your workspace.
        </h1>

        <p className="text-xs text-slate-400 max-w-lg mt-3 leading-relaxed">
          Your organization does not currently have an active entitlement for {serviceDef.name}. Submit a service request to your NextAura Administrator to enable this module.
        </p>

        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={() => navigate('launchpad')}
            className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-bold transition-colors"
          >
            Return to Launchpad
          </button>
          <button
            onClick={() => navigate('settings', 'services')}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
          >
            <span>Request Access</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
