import { isSupabaseConfigured, supabase } from './supabaseClient';

export const verificationService = {
  /**
   * Server-side check: Verifies if current Supabase login session has completed 6-digit OTP verification.
   * NEVER relies on client browser storage.
   */
  async checkSessionVerification(): Promise<{ success: boolean; verified: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true, verified: true };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        return { success: false, verified: false, error: 'User session not initialized.' };
      }

      const { data, error } = await supabase.functions.invoke('check-login-verification', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || !data?.success) {
        return { success: false, verified: false, error: data?.error || error?.message || 'Server check failed.' };
      }

      return { success: true, verified: Boolean(data.verified) };
    } catch (err: any) {
      console.error('[Verification Service] Check session Edge Function error:', err);
      return { success: false, verified: false, error: err.message || 'Server verification check failed.' };
    }
  },

  /**
   * Dispatches 6-digit OTP generation and email dispatch via server Edge Function.
   */
  async sendLoginVerification(_userId: string, email: string): Promise<{ success: boolean; error?: string }> {
    if (!email) return { success: false, error: 'Email address is required' };

    if (isSupabaseConfigured()) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          return { success: false, error: 'User authentication session not initialized.' };
        }

        const { data, error } = await supabase.functions.invoke('send-login-verification', {
          body: { email },
          headers: { Authorization: `Bearer ${token}` },
        });

        if (error || !data?.success) {
          const errorMessage = data?.error || error?.message || 'Unable to send verification code. Please try again.';
          return { success: false, error: errorMessage };
        }

        return { success: true };
      } catch (err: any) {
        console.error('[Verification Service] Send Edge Function error:', err);
        return { success: false, error: err.message || 'Unable to send verification code. Please try again.' };
      }
    }

    return { success: false, error: 'Supabase authentication is not configured.' };
  },

  /**
   * Verifies the 6-digit code strictly via server Edge Function.
   */
  async verifyLoginVerification(
    _userId: string,
    code: string
  ): Promise<{ success: boolean; error?: string; code?: string; attemptsRemaining?: number }> {
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return { success: false, error: 'Please enter a valid 6-digit verification code.' };
    }

    if (isSupabaseConfigured()) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          return { success: false, error: 'User authentication session expired. Please sign in again.' };
        }

        const { data, error } = await supabase.functions.invoke('verify-login-verification', {
          body: { code },
          headers: { Authorization: `Bearer ${token}` },
        });

        let payload = data;
        if (error && (error as any).context) {
          try {
            payload = await (error as any).context.json();
          } catch (_) {
            // fallback
          }
        }

        if (error || !payload?.success) {
          const errorMessage =
            payload?.error || error?.message || 'Incorrect verification code. Please try again.';
          return {
            success: false,
            error: errorMessage,
            code: payload?.code || 'INVALID_CODE',
            attemptsRemaining:
              typeof payload?.attemptsRemaining === 'number' ? payload.attemptsRemaining : undefined,
          };
        }

        return { success: true };
      } catch (err: any) {
        console.error('[Verification Service] Verify Edge Function error:', err);
        return { success: false, error: err.message || 'Verification failed. Please try again.' };
      }
    }

    return { success: false, error: 'Supabase authentication is not configured.' };
  },
};
