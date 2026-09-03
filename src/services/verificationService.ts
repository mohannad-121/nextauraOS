import { isSupabaseConfigured, supabase } from './supabaseClient';

export const verificationService = {
  /**
   * Dispatches 6-digit OTP generation and email dispatch via server Edge Function
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
          body: { email, sessionId: token.substring(0, 32) },
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
   * Verifies the 6-digit code strictly via server Edge Function
   */
  async verifyLoginVerification(_userId: string, code: string): Promise<{ success: boolean; error?: string }> {
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

        if (error || !data?.success) {
          const errorMessage = data?.error || error?.message || 'Incorrect verification code. Please try again.';
          return { success: false, error: errorMessage };
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
