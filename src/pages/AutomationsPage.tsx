import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { automationService } from '../services/automationService';
import { WorkflowBuilder } from './automation/WorkflowBuilder';
import { RunDetailDrawer } from './automation/RunDetailDrawer';
import { ConnectionsPanel } from './automation/ConnectionsPanel';
import { PageHeader } from '../components/common/PageHeader';

export function AutomationsPage() {
  const { currentOrg } = useApp();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const load = async () => {
    setWorkflows([]);
    setRuns([]);
    const [workflowData, runData] = await Promise.all([
      automationService.list(currentOrg.id),
      automationService.runs(currentOrg.id),
    ]);
    setWorkflows(workflowData.workflows || []);
    setRuns(runData.runs || []);
  };

  useEffect(() => {
    void load();
  }, [currentOrg.id]);

  const showRun = async (run: any) => {
    setSelectedRun(run);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const data = await automationService.runDetail(currentOrg.id, run.id);
      setDetail(data.run);
    } catch (error: any) {
      setDetailError(error.message || 'Unable to load run details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeRun = () => {
    setSelectedRun(null);
    setDetail(null);
    setDetailError('');
  };

  return (
    <div className="space-y-8">
      {open !== null && (
        <WorkflowBuilder
          organizationId={currentOrg.id}
          workflow={open.id ? open : undefined}
          onClose={() => setOpen(null)}
          onSaved={() => void load()}
        />
      )}

      {selectedRun && (
        <RunDetailDrawer
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onClose={closeRun}
        />
      )}

      <PageHeader
        category="Platform"
        title="Visual Automations"
        subtitle="Manage triggers, webhooks, multi-step actions, and connected enterprise integrations."
        actions={
          <button
            onClick={() => setOpen({})}
            className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all"
          >
            <Plus className="h-4 w-4" />
            New automation
          </button>
        }
      />

      {/* Active Workflows Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">Active Workflows</h2>
        <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-[#1F253D]">
          {workflows.length ? (
            workflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => setOpen(workflow)}
                className="flex w-full items-center justify-between p-4 text-start hover:bg-slate-50/50 dark:hover:bg-[#1A2035]/50 transition-colors"
              >
                <div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-[#F4F6FF]">{workflow.name}</span>
                  <span className="ms-3 text-xs text-slate-500 dark:text-[#A3ABC5] font-mono">{workflow.trigger_type}</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    workflow.enabled
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#23C99C] border border-emerald-500/20'
                      : 'bg-slate-100 dark:bg-[#101426] text-slate-600 dark:text-[#A3ABC5] border border-slate-200 dark:border-[#2A3048]'
                  }`}
                >
                  {workflow.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </button>
            ))
          ) : (
            <p className="p-6 text-center text-xs text-slate-500 dark:text-[#A3ABC5]">No workflows configured yet. Create one to get started.</p>
          )}
        </div>
      </div>

      {/* Connected Integrations Panel */}
      <ConnectionsPanel key={currentOrg.id} />

      {/* Run History Section */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">Run History</h2>
          <p className="text-xs text-slate-500 dark:text-[#A3ABC5]">Recent automated workflow executions and status receipts</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-[#1F253D]">
          {runs.length ? (
            runs.map((run) => {
              const isTest =
                run.automation_events?.source === 'meta_test' ||
                Boolean(run.automation_events?.payload?.test_event);
              const pageName = run.automation_events?.payload?.page_name;
              const triggerLabel =
                run.automation_events?.event_type === 'facebook.page.comment.created'
                  ? 'Facebook — New Page Comment'
                  : run.automation_events?.event_type || 'Automation event';
              const isMismatch =
                run.result_summary &&
                (run.result_summary.includes('does not match') ||
                  run.result_summary.includes('not contain') ||
                  run.result_summary.includes('ignored'));

              return (
                <button
                  key={run.id}
                  onClick={() => void showRun(run)}
                  className="flex w-full items-center justify-between p-4 text-start hover:bg-slate-50/50 dark:hover:bg-[#1A2035]/50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-900 dark:text-[#F4F6FF]">
                        {run.automation_workflows?.name || 'Workflow run'}
                      </p>
                      {isTest && (
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Test run
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A3ABC5]">
                      {triggerLabel}
                      {pageName ? ` · Page: ${pageName}` : ''} ·{' '}
                      {new Date(run.created_at).toLocaleString()}
                    </p>
                    {run.result_summary && (
                      <p className="text-xs text-slate-400 dark:text-[#6B7694] italic">
                        {run.result_summary}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] capitalize font-semibold ${
                      isMismatch
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : run.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#23C99C] border border-emerald-500/20'
                        : run.status === 'failed'
                        ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-slate-100 dark:bg-[#101426] text-slate-600 dark:text-[#A3ABC5] border border-slate-200 dark:border-[#2A3048]'
                    }`}
                  >
                    {isMismatch ? 'Condition mismatch' : run.status}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="p-6 text-center text-xs text-slate-500 dark:text-[#A3ABC5]">No workflow runs recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
