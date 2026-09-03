import React, { useState, useEffect, useCallback } from 'react';
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

const SESSION_VERIFIED_KEY = 'nextaura_verified_session_token';

export const AppBootGate: React.FC<AppBootGateProps> = ({ children }) => {
  const { currentOrg, setCurrentOrg, refreshServices, setUserProfile } = useApp();
  const [bootState, setBootState] = useState<BootState>('loading');
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionUserEmail, setSessionUserEmail] = useState<string>('');
  const [activeOrgId, setActiveOrgId] = useState<string>('');

  const getVerifiedTokenFromStorage = (): string | null => {
    try {
      return sessionStorage.getItem(SESSION_VERIFIED_KEY);
    } catch {
      return null;
    }
  };

  const setVerifiedTokenInStorage = (token: string) => {
    try {
      sessionStorage.setItem(SESSION_VERIFIED_KEY, token);
    } catch (err) {
      console.error('Storage error:', err);
    }
  };

  const clearVerifiedTokenInStorage = () => {
    try {
      sessionStorage.removeItem(SESSION_VERIFIED_KEY);
    } catch (err) {
      console.error('Storage error:', err);
    }
  };

  const evaluateAuthState = useCallback(async (session: any) => {
    if (!session || !session.user) {
      clearVerifiedTokenInStorage();
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

    // CRITICAL 15: Session identity linked to current access token signature
    const currentSessionToken = session.access_token ? session.access_token.substring(0, 32) : userId;
    const storedVerifiedToken = getVerifiedTokenFromStorage();

    if (storedVerifiedToken !== currentSessionToken) {
      setBootState('emailVerificationRequired');
      return;
    }

    // Step 2: Ensure user has a workspace organization in PostgreSQL
    if (isSupabaseConfigured()) {
      try {
        let userOrgs = await organizationService.getUserOrganizations(userId);
        if (userOrgs.length === 0) {
          // CRITICAL 11: Transactionally create atomic workspace
          const newOrg = await organizationService.createOrganizationForUser(
            userId,
            `${name.split(' ')[0]}'s Workspace`
          );
          userOrgs = [newOrg];
        }

        const activeOrg = userOrgs[0];
        setActiveOrgId(activeOrg.id);

        // CRITICAL 10: Set active organization in context before service selection
        if (setCurrentOrg && (!currentOrg || currentOrg.id !== activeOrg.id)) {
          setCurrentOrg(activeOrg);
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
        console.error('[AppBootGate] Error during workspace bootstrap:', err);
      }
    }

    setBootState('ready');
  }, [currentOrg, setCurrentOrg, setUserProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setBootState('ready');
      return;
    }

    let isMounted = true;

    const initializeAuth = async () => {
      // CRITICAL 12: PKCE Google OAuth callback URL handling
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session && isMounted) {
            // Clean code parameter from URL without page reload
            window.history.replaceState({}, document.title, window.location.pathname);
            await evaluateAuthState(data.session);
            return;
          }
        } catch (err) {
          console.error('[AppBootGate] PKCE code exchange error:', err);
        }
      }

      // Check active Supabase session
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        await evaluateAuthState(data?.session);
      }
    };

    initializeAuth();

    // Listen to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') {
        clearVerifiedTokenInStorage();
        setBootState('unauthenticated');
      } else if (session) {
        await evaluateAuthState(session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [evaluateAuthState]);

  const handleOTPVerified = async () => {
    if (sessionUserId && isSupabaseConfigured()) {
      const activeSession = (await supabase.auth.getSession()).data?.session;
      if (activeSession) {
        const currentSessionToken = activeSession.access_token ? activeSession.access_token.substring(0, 32) : sessionUserId;
        setVerifiedTokenInStorage(currentSessionToken);
        await evaluateAuthState(activeSession);
      }
    }
  };

  const handleServiceSelectionCompleted = async () => {
    if (refreshServices) refreshServices();
    setBootState('ready');
  };

  const handleSignOut = async () => {
    clearVerifiedTokenInStorage();
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
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
          organizationId={activeOrgId || currentOrg?.id || ''}
          userId={sessionUserId || ''}
          onCompleted={handleServiceSelectionCompleted}
          onRetryWorkspace={() => {
            if (isSupabaseConfigured()) {
              supabase.auth.getSession().then(({ data }) => evaluateAuthState(data?.session));
            }
          }}
        />
      );

    case 'ready':
      return <AppShell>{children}</AppShell>;
  }
};
