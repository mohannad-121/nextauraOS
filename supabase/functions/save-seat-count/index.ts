import { authenticate, corsHeaders, json, recordAudit, requireBillingAdmin } from '../_shared/billing.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { admin, user } = await authenticate(req); const body = await req.json();
    const organizationId = String(body.organizationId || ''); const seatCount = Number(body.seatCount);
    if (!organizationId || !Number.isInteger(seatCount) || seatCount < 1 || seatCount > 10000) return json({ success: false, error: 'Valid organization and seat count are required.' }, 400);
    await requireBillingAdmin(admin, user.id, organizationId);
    const { error } = await admin.from('organizations').update({ requested_seats: seatCount }).eq('id', organizationId);
    if (error) throw error;
    await admin.from('profiles').update({ seat_count_configured: true }).eq('id', user.id);
    await recordAudit(admin, organizationId, 'billing.seats_requested', `Workspace requested ${seatCount} seats during onboarding.`);
    return json({ success: true, seatCount });
  } catch (error: any) { return json({ success: false, error: error.message || 'Unable to save requested seats.' }, 400); }
});
