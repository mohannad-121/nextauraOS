import React, { useEffect, useState } from 'react';
import { Plus, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { entitlementService } from '../services/entitlementService';
import { automationService } from '../services/automationService';
import { WorkflowBuilder } from './automation/WorkflowBuilder';

export const AutomationsPage: React.FC = () => {
  const { currentOrg, navigate } = useApp(); const [allowed,setAllowed]=useState<boolean|null>(null); const [builder,setBuilder]=useState(false); const [workflows,setWorkflows]=useState<any[]>([]);
  const owner=['Owner','Admin','Administrator'].includes(currentOrg.membershipRole||'');
  useEffect(()=>{setWorkflows([]);void (async()=>{const e=await entitlementService.getPlanEntitlements(currentOrg.id);setAllowed(Boolean(e?.access_active&&e.automation_access));if(e?.access_active&&e.automation_access){const data=await automationService.list(currentOrg.id);setWorkflows(data.workflows||[]);}})();},[currentOrg.id]);
  if(allowed===null)return <div className="p-8 text-sm text-slate-500">Loading automations…</div>;
  if(!allowed)return <div className="p-8"><div className="max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6"><Lock className="h-6 w-6 text-amber-700"/><h1 className="mt-3 text-lg font-semibold">Custom plan required</h1><p className="mt-2 text-sm text-slate-600">Automation is available to active Custom workspaces.</p><button onClick={()=>navigate('pricing')} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">View pricing</button></div></div>;
  return <div className="space-y-6 p-5 md:p-8">{builder&&<WorkflowBuilder onClose={()=>setBuilder(false)}/>}<div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold">Automations</h1><p className="text-sm text-slate-500">Build and monitor organization workflows.</p></div>{owner&&<button onClick={()=>setBuilder(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>New automation</button>}</div><section className="rounded-xl border"><div className="border-b p-4 font-semibold">Workflows</div>{workflows.length?<div className="divide-y">{workflows.map(w=><button key={w.id} onClick={()=>owner&&setBuilder(true)} className="flex w-full justify-between p-4 text-left hover:bg-slate-50"><span><b>{w.name}</b><span className="ms-2 text-xs text-slate-500">{w.trigger_type}</span></span><span className="text-xs text-slate-500">{w.actions?.length||0} actions</span></button>)}</div>:<p className="p-5 text-sm text-slate-500">No automations yet.</p>}</section></div>;
};
