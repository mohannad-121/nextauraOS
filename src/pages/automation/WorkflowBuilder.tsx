import { useCallback, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, addEdge, useEdgesState, useNodesState, type Connection, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Bell, ChevronLeft, GitBranch, Plus, Send, Trash2, UserPlus, Webhook } from 'lucide-react';
import { automationService } from '../../services/automationService';

type WorkflowNode = Node<Record<string, any>>;
const triggerMap: Record<string, string> = { employee_created: 'employee.created', contact_created: 'contact.created', expense_status_changed: 'expense.status_changed', incoming_webhook: 'incoming_webhook' };
const items = [['employee_created', 'Employee Created', UserPlus], ['contact_created', 'Contact Created', UserPlus], ['expense_status_changed', 'Expense Status Changed', UserPlus], ['incoming_webhook', 'Incoming Webhook', Webhook], ['if', 'IF', GitBranch], ['create_notification', 'Create Notification', Bell], ['outgoing_webhook', 'Send Webhook', Send]] as const;

function restoreGraph(workflow: any) {
  if (workflow?.graph_nodes?.length) return { nodes: workflow.graph_nodes, edges: workflow.graph_edges || [] };
  const nodes: any[] = [{ id: 'trigger', position: { x: 80, y: 160 }, type: workflow?.trigger_type?.replace('.', '_') || 'employee_created', data: { config: workflow?.trigger_config || {} } }];
  const edges: any[] = []; let last = 'trigger';
  if (workflow?.conditions?.length) { nodes.push({ id: 'if', position: { x: 360, y: 160 }, type: 'if', data: { config: workflow.conditions[0] } }); edges.push({ id: 'trigger-if', source: last, target: 'if' }); last = 'if'; }
  (workflow?.actions || []).forEach((action: any, index: number) => { const id = `action-${index}`; nodes.push({ id, position: { x: 640 + index * 280, y: 160 }, type: action.type, data: { config: action.config } }); edges.push({ id: `${last}-${id}`, source: last, target: id }); last = id; });
  return { nodes, edges };
}

function compatibilityDefinition(nodes: WorkflowNode[], edges: Edge[]) {
  const triggers = nodes.filter((node) => triggerMap[node.type || '']);
  if (triggers.length !== 1) throw Error('Add exactly one trigger node.');
  if (new Set(edges.map((edge) => edge.target)).has(triggers[0].id)) throw Error('The trigger must begin the graph.');
  const conditions = nodes.filter((node) => node.type === 'if').map((node) => node.data.config || {});
  if (conditions.length > 1) throw Error('Only one IF node is supported.');
  const actions = nodes.filter((node) => node.type === 'create_notification' || node.type === 'outgoing_webhook').map((node) => ({ type: node.type, config: node.data.config || {} }));
  if (!actions.length) throw Error('Add at least one action node.');
  return { triggerType: triggerMap[triggers[0].type || ''], triggerConfig: triggers[0].data.config || {}, conditions, actions };
}

function IfNode() {
  return <div className="relative rounded border border-violet-300 bg-violet-50 px-7 py-3 text-sm font-medium text-violet-950 shadow-sm"><Handle type="target" position={Position.Left}/><span>IF</span><Handle id="true" type="source" position={Position.Right} style={{ top: '35%' }}/><Handle id="false" type="source" position={Position.Right} style={{ top: '70%' }}/><span className="absolute right-2 top-[20%] text-[10px] text-violet-700">true</span><span className="absolute right-2 top-[58%] text-[10px] text-violet-700">false</span></div>;
}
const visualNodeTypes = { if: IfNode };

export function WorkflowBuilder({ onClose, organizationId, workflow, onSaved }: { onClose: () => void; organizationId: string; workflow?: any; onSaved: () => void }) {
  const graph = useMemo(() => restoreGraph(workflow), [workflow]);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graph.edges);
  const [selected, setSelected] = useState<WorkflowNode | null>(null);
  const [name, setName] = useState(workflow?.name || 'Untitled automation');
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const connect = useCallback((connection: Connection) => setEdges((current) => addEdge(connection, current)), [setEdges]);
  const add = (item: typeof items[number]) => setNodes((current) => [...current, { id: crypto.randomUUID(), type: item[0], position: { x: 150 + current.length * 45, y: 90 + current.length * 45 }, data: { config: {} } }]);
  const save = async () => { try { setSaving(true); setError(''); const definition = compatibilityDefinition(nodes, edges); const body = { organizationId, name, ...definition, graphNodes: nodes.map((node) => ({ id: node.id, type: node.type, position: node.position, config: node.data.config || {} })), graphEdges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle })), enabled: workflow?.enabled || false }; if (workflow) await automationService.update({ ...body, workflowId: workflow.id }); else await automationService.create(body); onSaved(); onClose(); } catch (saveError: any) { setError(saveError.message || 'Unable to save graph.'); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-[70] flex bg-slate-950/30 p-3 md:p-6"><div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center gap-3 border-b p-3"><button onClick={onClose} aria-label="Close builder"><ChevronLeft/></button><input value={name} onChange={(event) => setName(event.target.value)} className="flex-1 font-semibold"/><button onClick={save} disabled={saving} className="rounded bg-blue-700 px-3 py-2 text-sm text-white">{saving ? 'Saving…' : 'Save'}</button></header>{error && <div role="alert" className="bg-red-50 p-2 text-sm text-red-700">{error}</div>}<div className="grid min-h-0 flex-1 grid-cols-[200px_1fr_260px]"><aside className="border-e p-3">{items.map((item) => { const Icon = item[2]; return <button key={item[0]} onClick={() => add(item)} className="mb-2 flex w-full gap-2 rounded border p-2 text-left text-xs"><Icon className="h-4 w-4"/>{item[1]}<Plus className="ms-auto h-3 w-3"/></button>; })}</aside><main><ReactFlow nodes={nodes} edges={edges} nodeTypes={visualNodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect} onNodeClick={(_, node: any) => setSelected(node)} onPaneClick={() => setSelected(null)} fitView><Background/><Controls/><MiniMap/></ReactFlow></main><aside className="border-s p-3">{selected ? <><b>{selected.type}</b><label className="mt-3 block text-xs">Config<textarea value={JSON.stringify(selected.data.config || {})} onChange={(event) => { try { const config = JSON.parse(event.target.value); setNodes((current) => current.map((node) => node.id === selected.id ? { ...node, data: { ...node.data, config } } : node)); } catch {} }} className="mt-1 h-28 w-full border p-2 text-xs"/></label><button onClick={() => { setNodes((current) => current.filter((node) => node.id !== selected.id)); setEdges((current) => current.filter((edge) => edge.source !== selected.id && edge.target !== selected.id)); setSelected(null); }} className="mt-3 flex gap-1 text-sm text-red-600"><Trash2 className="h-4 w-4"/>Delete</button></> : <p className="text-sm text-slate-500">Select a node.</p>}</aside></div></div></div>;
}
