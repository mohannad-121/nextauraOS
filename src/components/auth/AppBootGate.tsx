import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';
import { AuthScreens } from '../../pages/auth/AuthScreens';
import { VerificationScreen } from '../../pages/auth/VerificationScreen';
import { ServiceSelectionScreen } from '../../pages/onboarding/ServiceSelectionScreen';
import { AppShell } from '../layout/AppShell';
import { organizationService } from '../../services/organizationService';
import { getSupabaseSessionId } from '../../utils/sessionHelper';

export type BootState =
  | 'loading'
  | 'unauthenticated'
  | 'emailVerificationRequired'
  | 'serviceSelectionRequired'
  | 'ready'
  | 'bootstrapError';

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
  const [bootstrapErrorMessage, setBootstrapErrorMessage] = useState<string>('');

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

    // BLOCKER 2: Extract real session_id claim. FAIL CLOSED if missing! No user.id fallbacks.
    const currentSessionId = getSupabaseSessionId(session);

    if (!currentSessionId) {
      setBootstrapErrorMessage('Valid session identifier missing from authentication token.');
      setBootState('bootstrapError');
      return;
    }

    const storedVerifiedId = getVerifiedTokenFromStorage();

    if (storedVerifiedId !== currentSessionId) {
      setBootState('emailVerificationRequired');
      return;
    }

    // BLOCKER 3: Workspace & profile bootstrap with strict error handling
    if (isSupabaseConfigured()) {
      try {
        let userOrgs = await organizationService.getUserOrganizations(userId);
        if (userOrgs.length === 0) {
          // Transactionally create atomic workspace
          const newOrg = await organizationService.createOrganizationForUser(
            `${name.split(' ')[0]}'s Workspace`
          );
          userOrgs = [newOrg];
        }

        const activeOrg = userOrgs[0];
        setActiveOrgId(activeOrg.id);

        if (setCurrentOrg && (!currentOrg || currentOrg.id !== activeOrg.id)) {
          setCurrentOrg(activeOrg);
        }

        // Profile read with explicit error inspection
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('initial_service_selection_completed')
          .eq('id', userId)
          .single();

        // Distinguish DB failure vs no profile row
        if (profileErr && profileErr.code !== 'PGRST116') {
          console.error('[AppBootGate] Database profile fetch failure:', profileErr);
          setBootstrapErrorMessage(`Database failure loading profile: ${profileErr.message}`);
          setBootState('bootstrapError');
          return;
        }

        if (!profile || !profile.initial_service_selection_completed) {
          setBootState('serviceSelectionRequired');
          return;
        }
      } catch (err: any) {
        console.error('[AppBootGate] Bootstrap exception:', err);
        // BLOCKER 3: DO NOT open AppShell on error! Set bootstrapError state.
        setBootstrapErrorMessage(err.message || 'Failed to initialize workspace data.');
        setBootState('bootstrapError');
        return;
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
      // PKCE Google OAuth callback URL handling
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session && isMounted) {
            window.history.replaceState({}, document.title, window.location.pathname);
            await evaluateAuthState(data.session);
            return;
          }
        } catch (err) {
          console.error('[AppBootGate] PKCE code exchange error:', err);
        }
      }

      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        await evaluateAuthState(data?.session);
      }
    };

    initializeAuth();

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
        const currentSessionId = getSupabaseSessionId(activeSession);
        if (currentSessionId) {
          setVerifiedTokenInStorage(currentSessionId);
          await evaluateAuthState(activeSession);
        } else {
          setBootstrapErrorMessage('Valid session identifier missing from token.');
          setBootState('bootstrapError');
        }
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

    case 'bootstrapError':
      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-xl">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-100 font-heading">
                We couldn't initialize your NextAura workspace
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                {bootstrapErrorMessage || 'A database or session error occurred while loading your organization workspace.'}
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setBootState('loading');
                  if (isSupabaseConfigured()) {
                    supabase.auth.getSession().then(({ data }) => evaluateAuthState(data?.session));
                  }
                }}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Connection</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      );

    case 'ready':
      return <AppShell>{children}</AppShell>;
  }
};
