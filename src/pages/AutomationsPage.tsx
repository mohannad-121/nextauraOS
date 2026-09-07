import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { automationService } from '../services/automationService';
import { WorkflowBuilder } from './automation/WorkflowBuilder';
import { RunDetailDrawer } from './automation/RunDetailDrawer';
import { ConnectionsPanel } from './automation/ConnectionsPanel';

export function AutomationsPage() {
  const { currentOrg } = useApp();
  const [workflows, setWorkflows] = useState<any[]>([]); const [runs, setRuns] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null); const [selectedRun, setSelectedRun] = useState<any>(null); const [detail, setDetail] = useState<any>(null); const [detailLoading, setDetailLoading] = useState(false); const [detailError, setDetailError] = useState('');
  const load = async () => { setWorkflows([]); setRuns([]); const [workflowData, runData] = await Promise.all([automationService.list(currentOrg.id), automationService.runs(currentOrg.id)]); setWorkflows(workflowData.workflows || []); setRuns(runData.runs || []); };
  useEffect(() => { void load(); }, [currentOrg.id]);
  const showRun = async (run: any) => { setSelectedRun(run); setDetail(null); setDetailError(''); setDetailLoading(true); try { const data = await automationService.runDetail(currentOrg.id, run.id); setDetail(data.run); } catch (error: any) { setDetailError(error.message || 'Unable to load run details.'); } finally { setDetailLoading(false); } };
  const closeRun = () => { setSelectedRun(null); setDetail(null); setDetailError(''); };
  return <div className="p-6">{open !== null && <WorkflowBuilder organizationId={currentOrg.id} workflow={open.id ? open : undefined} onClose={() => setOpen(null)} onSaved={() => void load()}/>} {selectedRun && <RunDetailDrawer detail={detail} loading={detailLoading} error={detailError} onClose={closeRun}/>}<div className="flex justify-between"><div><h1 className="text-2xl font-semibold">Automations</h1><p className="text-sm text-slate-500">Visual workflow management</p></div><button onClick={() => setOpen({})} className="flex gap-2 rounded bg-blue-700 px-3 py-2 text-sm text-white"><Plus className="h-4 w-4"/>New automation</button></div><div className="mt-6 rounded border">{workflows.length ? workflows.map((workflow) => <button key={workflow.id} onClick={() => setOpen(workflow)} className="block w-full border-b p-4 text-left last:border-b-0"><b>{workflow.name}</b><span className="ms-2 text-xs text-slate-500">{workflow.trigger_type}</span></button>) : <p className="p-4 text-sm text-slate-500">No workflows yet.</p>}</div><ConnectionsPanel key={currentOrg.id} /><section className="mt-8"><div><h2 className="text-lg font-semibold">Run History</h2><p className="text-sm text-slate-500">Recent workflow executions</p></div><div className="mt-3 rounded border">{runs.length ? runs.map((run) => <button key={run.id} onClick={() => void showRun(run)} className="flex w-full items-center justify-between border-b p-4 text-left last:border-b-0 hover:bg-slate-50"><div><p className="font-medium">{run.automation_workflows?.name || 'Workflow run'}</p><p className="text-xs text-slate-500">{run.automation_events?.event_type || 'Automation event'} · {new Date(run.created_at).toLocaleString()}</p></div><span className="rounded bg-slate-100 px-2 py-1 text-xs capitalize text-slate-700">{run.status}</span></button>) : <p className="p-4 text-sm text-slate-500">No workflow runs yet.</p>}</div></section></div>;
}
