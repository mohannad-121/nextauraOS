import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export const emailService = {
  /**
   * Real backend email dispatch helper via Supabase Edge Function
   */
  async sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; error?: string; messageId?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: payload,
        });

        if (!error && data?.success) {
          return { success: true, messageId: data.id };
        } else {
          const errMsg = data?.error || error?.message || 'Email delivery failed on server';
          console.error('[Email Transport Error]', errMsg);
          return { success: false, error: errMsg };
        }
      } catch (err: any) {
        console.error('[Email Transport Exception]', err);
        return { success: false, error: err.message || 'Email dispatch failed' };
      }
    }

    return { success: false, error: 'Supabase email service not configured.' };
  },

  /**
   * Dispatch 6-Digit NextAura Verification Code to user email
   */
  async sendVerificationOtpEmail(email: string, code: string) {
    const subject = 'Your NextAura verification code';
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background-color:#020617; color:#f8fafc; padding:32px; border-radius:16px; max-width:500px; margin:0 auto; border:1px solid #1e293b; text-align:center;">
        <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg, #06b6d4, #6366f1); display:inline-flex; align-items:center; justify-content:center; color:#020617; font-weight:900; font-size:24px; margin-bottom:20px;">N</div>
        
        <h2 style="font-size:22px; font-weight:800; color:#f8fafc; margin:0 0 8px 0;">Verify your login</h2>
        <p style="font-size:14px; color:#94a3b8; margin:0 0 28px 0; line-height:1.5;">
          Use this code to continue to your NextAura workspace:
        </p>

        <div style="background-color:#0f172a; border:1px solid #38bdf8; padding:20px; border-radius:14px; display:inline-block; margin-bottom:28px;">
          <span style="font-family:monospace; font-size:36px; font-weight:900; letter-spacing:8px; color:#38bdf8;">${code}</span>
        </div>

        <p style="font-size:12px; color:#64748b; margin:0;">
          This code expires in 10 minutes. If you did not attempt to sign in to NextAura, you can ignore this email.
        </p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, html });
  },
};
