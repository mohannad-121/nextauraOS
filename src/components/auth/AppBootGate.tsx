import React, { useState, useEffect } from 'react';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';
import { AuthScreens } from '../../pages/auth/AuthScreens';
import { VerificationScreen } from '../../pages/auth/VerificationScreen';
import { ServiceSelectionScreen } from '../../pages/onboarding/ServiceSelectionScreen';
import { AppShell } from '../layout/AppShell';
import { organizationService } from '../../services/organizationService';

export type BootState =
  | 'loading'
  | 'unauthenticated'
  | 'emailVerificationRequired'
  | 'serviceSelectionRequired'
  | 'ready';

interface AppBootGateProps {
  children: React.ReactNode;
}

export const AppBootGate: React.FC<AppBootGateProps> = ({ children }) => {
  const { currentOrg, refreshServices, setUserProfile } = useApp();
  const [bootState, setBootState] = useState<BootState>('loading');
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionUserEmail, setSessionUserEmail] = useState<string>('');
  const [verifiedSessionId, setVerifiedSessionId] = useState<string | null>(null);

  const evaluateAuthState = async (session: any) => {
    if (!session || !session.user) {
      setBootState('unauthenticated');
      return;
    }

    const userId = session.user.id;
    const email = session.user.email || '';
    const name =
      session.user.user_metadata?.full_name || email.split('@')[0] || 'Enterprise User';

    setSessionUserId(userId);
    setSessionUserEmail(email);

    if (setUserProfile) {
      setUserProfile({ name, email, avatar: session.user.user_metadata?.avatar_url });
    }

    // Step 1: Check if current session has verified 6-digit OTP
    const currentSessionId = session.access_token?.substring(0, 16) || userId;
    if (verifiedSessionId !== currentSessionId) {
      setBootState('emailVerificationRequired');
      return;
    }

    // Step 2: Ensure user has a workspace organization in PostgreSQL
    if (isSupabaseConfigured()) {
      try {
        let userOrgs = await organizationService.getUserOrganizations(userId);
        if (userOrgs.length === 0) {
          // Automatically create clean workspace: "{User Full Name}'s Workspace"
          const newOrg = await organizationService.createOrganizationForUser(
            userId,
            `${name.split(' ')[0]}'s Workspace`
          );
          userOrgs = [newOrg];
        }

        // Step 3: Check profile initial service selection
        const { data: profile } = await supabase
          .from('profiles')
          .select('initial_service_selection_completed')
          .eq('id', userId)
          .single();

        if (!profile || !profile.initial_service_selection_completed) {
          setBootState('serviceSelectionRequired');
          return;
        }
      } catch (err) {
        console.error('Error during workspace bootstrap:', err);
      }
    }

    setBootState('ready');
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setBootState('ready');
      return;
    }

    // Check initial Supabase session
    supabase.auth.getSession().then(({ data }) => {
      evaluateAuthState(data?.session);
    });

    // Listen to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === 'SIGNED_OUT') {
        setVerifiedSessionId(null);
        setBootState('unauthenticated');
      } else if (session) {
        await evaluateAuthState(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [verifiedSessionId]);

  const handleOTPVerified = async () => {
    if (sessionUserId) {
      const activeSession = (await supabase.auth.getSession()).data?.session;
      const currentSessionId = activeSession?.access_token?.substring(0, 16) || sessionUserId;
      setVerifiedSessionId(currentSessionId);
      await evaluateAuthState(activeSession);
    }
  };

  const handleServiceSelectionCompleted = async () => {
    if (refreshServices) refreshServices();
    setBootState('ready');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setVerifiedSessionId(null);
    setBootState('unauthenticated');
  };

  // State Machine Render Dispatcher
  switch (bootState) {
    case 'loading':
      return (
        <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 p-0.5 animate-pulse">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center font-black text-cyan-400 text-lg">
              N
            </div>
          </div>
          <div className="text-xs font-mono font-bold text-slate-400">Loading NextAura Workspace...</div>
        </div>
      );

    case 'unauthenticated':
      return <AuthScreens />;

    case 'emailVerificationRequired':
      return (
        <VerificationScreen
          userId={sessionUserId || ''}
          email={sessionUserEmail}
          onVerified={handleOTPVerified}
          onSignOut={handleSignOut}
        />
      );

    case 'serviceSelectionRequired':
      return (
        <ServiceSelectionScreen
          organizationId={currentOrg?.id || ''}
          userId={sessionUserId || ''}
          onCompleted={handleServiceSelectionCompleted}
        />
      );

    case 'ready':
      return <AppShell>{children}</AppShell>;
  }
};
