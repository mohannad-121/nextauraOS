import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';
import { AuthScreens } from '../../pages/auth/AuthScreens';
import { VerificationScreen } from '../../pages/auth/VerificationScreen';
import { ServiceSelectionScreen } from '../../pages/onboarding/ServiceSelectionScreen';
import { AppShell } from '../layout/AppShell';
import { organizationService } from '../../services/organizationService';
import { verificationService } from '../../services/verificationService';
import { entitlementService } from '../../services/entitlementService';
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

export const AppBootGate: React.FC<AppBootGateProps> = ({ children }) => {
  const { currentOrg, setCurrentOrg, setUserProfile } = useApp();
  const [bootState, setBootState] = useState<BootState>('loading');
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionUserEmail, setSessionUserEmail] = useState<string>('');
  const [activeOrgId, setActiveOrgId] = useState<string>('');
  const [bootstrapErrorMessage, setBootstrapErrorMessage] = useState<string>('');

  // Single-flight & reference stability refs (REMOVES AUTH RENDER LOOP)
  const evaluationInProgressRef = useRef<boolean>(false);
  const lastEvaluatedSessionRef = useRef<string | null>(null);
  const bootStateRef = useRef<BootState>('loading');
  bootStateRef.current = bootState;

  const setCurrentOrgRef = useRef(setCurrentOrg);
  setCurrentOrgRef.current = setCurrentOrg;

  const setUserProfileRef = useRef(setUserProfile);
  setUserProfileRef.current = setUserProfile;

  const currentOrgIdRef = useRef(currentOrg?.id);
  currentOrgIdRef.current = currentOrg?.id;

  const updateBootState = (newState: BootState) => {
    setBootState(newState);
    if (import.meta.env.DEV) {
      console.log(`[AUTH] BOOT_STATE ${newState}`);
    }
  };

  const evaluateAuthState = useCallback(async (session: any, forceReevaluate = false) => {
    if (evaluationInProgressRef.current) {
      if (import.meta.env.DEV) {
        console.log('[AUTH] Evaluation already in progress, skipping concurrent run.');
      }
      return;
    }

    const sessionId = getSupabaseSessionId(session);

    if (
      !forceReevaluate &&
      sessionId &&
      lastEvaluatedSessionRef.current === sessionId &&
      (bootStateRef.current === 'emailVerificationRequired' || bootStateRef.current === 'ready')
    ) {
      if (import.meta.env.DEV) {
        console.log('[AUTH] Session already evaluated for state:', bootStateRef.current);
      }
      return;
    }

    evaluationInProgressRef.current = true;

    try {
      const isSessionPresent = Boolean(session && session.user);
      if (import.meta.env.DEV) {
        console.log(`[AUTH] SESSION_PRESENT ${isSessionPresent}`);
      }

      if (!session || !session.user) {
        lastEvaluatedSessionRef.current = null;
        updateBootState('unauthenticated');
        return;
      }

      const userId = session.user.id;
      const email = session.user.email || '';
      const name =
        session.user.user_metadata?.full_name || email.split('@')[0] || 'Enterprise User';

      setSessionUserId(userId);
      setSessionUserEmail(email);

      if (setUserProfileRef.current) {
        setUserProfileRef.current({ name, email, avatar: session.user.user_metadata?.avatar_url });
      }

      if (!sessionId) {
        setBootstrapErrorMessage('Valid session identifier missing from authentication token.');
        updateBootState('bootstrapError');
        return;
      }

      // Step 1: Server-side OTP Verification Check
      if (isSupabaseConfigured()) {
        const checkRes = await verificationService.checkSessionVerification();

        if (!checkRes.success) {
          setBootstrapErrorMessage(checkRes.error || 'Server error verifying session security state.');
          updateBootState('bootstrapError');
          return;
        }

        if (!checkRes.verified) {
          lastEvaluatedSessionRef.current = sessionId;
          updateBootState('emailVerificationRequired');
          return;
        }
      }

      // Step 2: Ensure user has a workspace organization in PostgreSQL
      if (isSupabaseConfigured()) {
        let userOrgs = await organizationService.getUserOrganizations(userId);
        if (userOrgs.length === 0) {
          const newOrg = await organizationService.createOrganizationForUser(
            `${name.split(' ')[0]}'s Workspace`
          );
          userOrgs = [newOrg];
        }

        const activeOrg = userOrgs[0];
        setActiveOrgId(activeOrg.id);

        if (setCurrentOrgRef.current && currentOrgIdRef.current !== activeOrg.id) {
          setCurrentOrgRef.current(activeOrg);
        }

        // Profile read with explicit error inspection
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('initial_service_selection_completed')
          .eq('id', userId)
          .single();

        if (profileErr && profileErr.code !== 'PGRST116') {
          console.error('[AppBootGate] Database profile fetch failure:', profileErr);
          setBootstrapErrorMessage(`Database failure loading profile: ${profileErr.message}`);
          updateBootState('bootstrapError');
          return;
        }

        if (!profile || !profile.initial_service_selection_completed) {
          lastEvaluatedSessionRef.current = sessionId;
          updateBootState('serviceSelectionRequired');
          return;
        }

        // Verify active organization services
        try {
          await entitlementService.getActiveOrgServices(activeOrg.id);
        } catch (orgServicesErr: any) {
          console.error('[AppBootGate] Failed loading organization services:', orgServicesErr);
        }
      }

      lastEvaluatedSessionRef.current = sessionId;
      updateBootState('ready');
    } catch (err: any) {
      console.error('[AppBootGate] Bootstrap exception:', err);
      setBootstrapErrorMessage(err.message || 'Failed to initialize workspace data.');
      updateBootState('bootstrapError');
    } finally {
      evaluationInProgressRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      updateBootState('ready');
      return;
    }

    let isMounted = true;

    const initializeAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session && isMounted) {
            window.history.replaceState({}, document.title, window.location.pathname);
            await evaluateAuthState(data.session, true);
            return;
          }
        } catch (err) {
          console.error('[AppBootGate] PKCE code exchange error:', err);
        }
      }

      const { data } = await supabase.auth.getSession();
      if (isMounted && data?.session) {
        await evaluateAuthState(data.session);
      } else if (isMounted) {
        updateBootState('unauthenticated');
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (import.meta.env.DEV) {
        console.log(`[AUTH] EVENT ${event}`);
      }

      if (event === 'SIGNED_OUT') {
        lastEvaluatedSessionRef.current = null;
        updateBootState('unauthenticated');
      } else if (event === 'SIGNED_IN') {
        if (session) {
          setTimeout(() => {
            if (isMounted) void evaluateAuthState(session, true);
          }, 0);
        }
      } else if (event === 'INITIAL_SESSION') {
        if (session) {
          setTimeout(() => {
            if (isMounted) void evaluateAuthState(session);
          }, 0);
        } else {
          updateBootState('unauthenticated');
        }
      } else if (event === 'TOKEN_REFRESHED') {
        if (!session) {
          updateBootState('unauthenticated');
        }
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
        await evaluateAuthState(activeSession, true);
      }
    }
  };

  const handleServiceSelectionCompleted = async () => {
    if (import.meta.env.DEV) {
      console.log('[AUTH] SERVICE_SELECTION_START');
    }

    if (!isSupabaseConfigured()) {
      updateBootState('ready');
      return;
    }

    const { data, error } = await supabase.auth.getSession();
    const session = data?.session;

    if (import.meta.env.DEV) {
      console.log(`[AUTH] POST_SELECTION_SESSION ${Boolean(session)}`);
    }

    if (error || !session) {
      console.error('[AppBootGate] Session missing post service activation:', error);
      setBootstrapErrorMessage('Your authentication session could not be verified after service activation. Please click retry.');
      updateBootState('bootstrapError');
      return;
    }

    await evaluateAuthState(session, true);

    if (import.meta.env.DEV) {
      console.log('[AUTH] SERVICE_SELECTION_SUCCESS');
    }
  };

  const handleSignOut = async () => {
    lastEvaluatedSessionRef.current = null;
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    updateBootState('unauthenticated');
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
              supabase.auth.getSession().then(({ data }) => evaluateAuthState(data?.session, true));
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
                    supabase.auth.getSession().then(({ data }) => evaluateAuthState(data?.session, true));
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
