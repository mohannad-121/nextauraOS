import { adminClient } from '../_shared/billing.ts';

const DEFAULT_BATCH_SIZE = 25;
const LEASE_SECONDS = 120;
const RESULT_SUMMARY = 'Definition matched; action execution not implemented yet.';

function boundedBatchSize(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : DEFAULT_BATCH_SIZE;
}

function requireInternalServiceCall(req: Request) {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authorization = req.headers.get('authorization') ?? '';
  const apiKey = req.headers.get('apikey') ?? '';
  if (!serviceRoleKey || (authorization !== `Bearer ${serviceRoleKey}` && apiKey !== serviceRoleKey)) {
    throw new Error('Unauthorized internal worker invocation.');
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed.' }, { status: 405 });
  }

  try {
    requireInternalServiceCall(req);
    let body: Record<string, unknown> = {};
    if (req.headers.get('content-type')?.includes('application/json')) {
      body = await req.json();
    }
    const batchSize = boundedBatchSize(body.batchSize);
    const admin = adminClient();

    const { data: enqueueResult, error: enqueueError } = await admin.rpc('enqueue_automation_runs', {
      p_event_batch_size: batchSize,
    });
    if (enqueueError) throw enqueueError;

    const leaseToken = crypto.randomUUID();
    const { data: claimedRuns, error: claimError } = await admin.rpc('claim_automation_runs', {
      p_run_batch_size: batchSize,
      p_lease_seconds: LEASE_SECONDS,
      p_lease_token: leaseToken,
    });
    if (claimError) throw claimError;

    let completedRuns = 0;
    for (const run of claimedRuns || []) {
      const { error: completionError } = await admin.rpc('complete_automation_run', {
        p_run_id: run.id,
        p_lease_token: leaseToken,
        p_succeeded: true,
        p_summary: RESULT_SUMMARY,
      });
      if (completionError) throw completionError;
      completedRuns += 1;
    }

    return Response.json({
      success: true,
      events_processed: enqueueResult?.events_processed ?? 0,
      runs_created: enqueueResult?.runs_created ?? 0,
      runs_claimed: (claimedRuns || []).length,
      runs_completed: completedRuns,
    });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message || 'Unable to process automation runs.' }, { status: 401 });
  }
});
