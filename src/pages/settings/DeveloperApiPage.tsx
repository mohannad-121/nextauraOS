import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, KeyRound, LockKeyhole, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Surface } from '../../components/common/WorkspacePrimitives';
import { formatDate } from '../../utils/formatters';
import { entitlementService } from '../../services/entitlementService';
import { EXTERNAL_API_SCOPES, externalApiService, type ExternalApiScope, type OrganizationApiKey } from '../../services/externalApiService';

const labelForScope = (scope: ExternalApiScope) => scope.replace(':read', '').replace(/^./, (letter) => letter.toUpperCase());

export const DeveloperApiPage: React.FC = () => {
  const { currentOrg, navigate } = useApp();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<OrganizationApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<ExternalApiScope[]>(['employees:read']);
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const loadVersion = useRef(0);

  const endpoint = useMemo(() => `${import.meta.env.VITE_SUPABASE_URL || '<SUPABASE_PROJECT_URL>'}/functions/v1/external-api/employees`, []);
  const orgId = currentOrg?.id || '';
  const isOrganizationReady = Boolean(orgId) && orgId !== 'org_pending' && !orgId.startsWith('org_temp_');
  useEffect(() => {
    const version = ++loadVersion.current;
    const isCurrent = () => loadVersion.current === version;
    // Always clear organization-specific data before a new organization can render.
    setKeys([]); setError(''); setAllowed(null); setLoading(true);
    if (!isOrganizationReady) return;

    void (async () => {
      try {
        const canUseApi = await entitlementService.canUseExternalApi(orgId);
        if (!isCurrent()) return;
        setAllowed(canUseApi);
        if (!canUseApi) return;
        const loadedKeys = await externalApiService.list(orgId);
        if (!isCurrent()) return;
        setKeys(loadedKeys);
        setError('');
      } catch (err: any) {
        if (!isCurrent()) return;
        setKeys([]);
        setError(err.message || 'Unable to load external API settings.');
      } finally {
        if (isCurrent()) setLoading(false);
      }
    })();
  }, [isOrganizationReady, orgId]);

  const toggleScope = (scope: ExternalApiScope) => setScopes((previous) => previous.includes(scope) ? previous.filter((item) => item !== scope) : [...previous, scope]);
  const closeCreate = () => { setCreateOpen(false); setName(''); setScopes(['employees:read']); };
  const createKey = async () => {
    if (!isOrganizationReady) return;
    setBusy(true); setError('');
    try {
      const result = await externalApiService.create(currentOrg.id, name, scopes);
      setNewKey(result.key); setKeys((current) => [result.metadata, ...current]); closeCreate();
    } catch (err: any) { setError(err.message || 'Unable to create API key.'); }
    finally { setBusy(false); }
  };
  const revoke = async (key: OrganizationApiKey) => {
    if (!isOrganizationReady) return;
    if (!window.confirm(`Revoke ${key.name}? Integrations using it will immediately stop working.`)) return;
    setBusy(true); setError('');
    try {
      const result = await externalApiService.revoke(currentOrg.id, key.id);
      setKeys((current) => current.map((item) => item.id === key.id ? result.metadata : item));
    } catch (err: any) { setError(err.message || 'Unable to revoke API key.'); }
    finally { setBusy(false); }
  };
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); } catch { setError('Copy failed. Select the key and copy it manually.'); } };

  if (loading) return <Surface className="px-6 py-12 text-sm text-slate-500">Loading API access…</Surface>;
  if (!allowed) return (
    <Surface padding="none">
      <div className="flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><LockKeyhole className="h-5 w-5" /></span><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Developer API</h2><p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">External API is available on the Custom plan.</p></div></div>
        <Button onClick={() => navigate('pricing')}>View Custom Plan</Button>
      </div>
    </Surface>
  );

  return <div className="space-y-5">
    <Surface padding="none">
      <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"><KeyRound className="h-5 w-5" /></span><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Developer API</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Create scoped keys for this workspace. Keys are shown only once.</p></div></div><Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>Create API key</Button></div>
      {error && <p className="border-t border-rose-100 bg-rose-50 px-6 py-3 text-sm text-rose-700 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
      <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"><tr><th className="px-6 py-3 font-medium">Name</th><th className="px-6 py-3 font-medium">Prefix</th><th className="px-6 py-3 font-medium">Scopes</th><th className="px-6 py-3 font-medium">Last used</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3" /></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{keys.map((key) => <tr key={key.id}><td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{key.name}<p className="mt-1 text-xs font-normal text-slate-500">Created {formatDate(key.created_at)}</p></td><td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{key.key_prefix}…</td><td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">{key.scopes.map(labelForScope).join(', ')}</td><td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">{key.last_used_at ? formatDate(key.last_used_at) : 'Never'}</td><td className="px-6 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${key.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{key.status}</span></td><td className="px-6 py-4 text-right">{key.status === 'active' && <Button size="xs" variant="danger" disabled={busy} onClick={() => void revoke(key)}>Revoke</Button>}</td></tr>)}{!keys.length && <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">No API keys have been created for this workspace.</td></tr>}</tbody></table></div>
    </Surface>
    <Surface><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Read API</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Use a key with the matching read scope. The workspace is resolved from the key; do not send an organization ID.</p><pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{`curl -H "Authorization: Bearer nxa_test_…" \\\n  "${endpoint}"`}</pre><p className="mt-3 text-xs text-slate-500">Available paths: employees, contacts, invoices, expenses, payroll, documents, and approvals. Documents and approvals return 501 until their workspace records are persisted.</p></Surface>
    <Modal isOpen={createOpen} onClose={closeCreate} title="Create API key" subtitle="The secret is displayed once after creation." maxWidth="lg"><div className="space-y-5"><label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Key name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Production reporting" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><fieldset><legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Read scopes</legend><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{EXTERNAL_API_SCOPES.map((scope) => <label key={scope} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} />{labelForScope(scope)}</label>)}</div></fieldset><div className="flex justify-end gap-2"><Button variant="secondary" onClick={closeCreate}>Cancel</Button><Button disabled={!name.trim() || !scopes.length} isLoading={busy} onClick={() => void createKey()}>Create key</Button></div></div></Modal>
    <Modal isOpen={Boolean(newKey)} onClose={() => setNewKey(null)} title="Copy your API key" subtitle="For security, it cannot be shown again." maxWidth="lg"><p className="mb-3 text-sm text-amber-700 dark:text-amber-300">Store this key in your integration’s secret manager before closing this dialog.</p><div className="flex gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{newKey}</code><Button aria-label="Copy API key" variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => newKey && void copy(newKey)}>Copy</Button></div><div className="mt-5 flex justify-end"><Button onClick={() => setNewKey(null)}>I’ve stored it safely</Button></div></Modal>
  </div>;
};
