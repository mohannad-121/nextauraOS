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

  if (loading) return <Surface className="px-6 py-12 text-sm text-[#747E9B] text-center">Loading API access…</Surface>;

  if (!allowed) return (
    <Surface padding="none">
      <div className="flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7568E8]/15 border border-[#7568E8]/30 text-[#A499FA]">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#F4F6FF] font-heading">Developer REST API</h2>
            <p className="mt-1 text-xs text-[#A3ABC5]">External API access is exclusively available on the Custom enterprise tier.</p>
          </div>
        </div>
        <Button onClick={() => navigate('pricing')}>View Custom Plan</Button>
      </div>
    </Surface>
  );

  return (
    <div className="space-y-6">
      <Surface padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7568E8]/15 border border-[#7568E8]/30 text-[#A499FA] shadow-[0_0_12px_rgba(117,104,232,0.25)]">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#F4F6FF] font-heading">Developer API</h2>
              <p className="mt-1 text-xs text-[#A3ABC5]">Create scoped API keys for this workspace. Secrets are displayed only once upon generation.</p>
            </div>
          </div>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>Create API key</Button>
        </div>

        {error && (
          <p className="border-t border-rose-900/50 bg-rose-950/30 px-6 py-3 text-xs text-rose-300">{error}</p>
        )}

        <div className="overflow-x-auto border-t border-[#1F253D]">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-[#101426] text-[11px] font-semibold uppercase tracking-wider text-[#747E9B] border-b border-[#1F253D]">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Prefix</th>
                <th className="px-6 py-3.5">Scopes</th>
                <th className="px-6 py-3.5">Last used</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F253D] font-medium">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-[#1A2035] transition-colors">
                  <td className="px-6 py-4 font-semibold text-[#F4F6FF]">
                    {key.name}
                    <p className="mt-0.5 text-[11px] font-normal text-[#747E9B]">Created {formatDate(key.created_at)}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[#A499FA]">{key.key_prefix}…</td>
                  <td className="px-6 py-4 text-xs text-[#A3ABC5]">{key.scopes.map(labelForScope).join(', ')}</td>
                  <td className="px-6 py-4 text-xs text-[#747E9B]">{key.last_used_at ? formatDate(key.last_used_at) : 'Never'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        key.status === 'active'
                          ? 'bg-[#08B894]/15 text-[#23C99C] border border-[#08B894]/30'
                          : 'bg-[#101426] text-[#747E9B] border border-[#1F253D]'
                      }`}
                    >
                      {key.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-[#23C99C]" />}
                      {key.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {key.status === 'active' && (
                      <Button size="xs" variant="danger" disabled={busy} onClick={() => void revoke(key)}>
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!keys.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-xs text-[#747E9B]">
                    No API keys have been created for this workspace yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Surface>

      <Surface>
        <h3 className="text-sm font-bold text-[#F4F6FF] font-heading">REST API Reference</h3>
        <p className="mt-1 text-xs text-[#A3ABC5]">
          Use a key with the matching read scope in the HTTP Authorization header. The workspace is resolved from the key; do not supply an organization ID parameter.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-[#090B1A] border border-[#1F253D] p-4 text-xs font-mono leading-6 text-[#A499FA]">
          {`curl -H "Authorization: Bearer nxa_live_…" \\\n  "${endpoint}"`}
        </pre>
        <p className="mt-3 text-[11px] text-[#747E9B]">
          Supported resource endpoints: employees, contacts, invoices, expenses, payroll, documents, and approvals.
        </p>
      </Surface>

      {/* Create Key Modal */}
      <Modal isOpen={createOpen} onClose={closeCreate} title="Create API key" subtitle="The secret token is displayed once after creation." maxWidth="lg">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#A3ABC5] mb-1.5">Key Name / Description</label>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="e.g. Production BI Integration"
              className="w-full rounded-xl border border-[#2A3048] bg-[#101426] px-3.5 py-2.5 text-xs text-[#F4F6FF] placeholder-[#6B7694] focus:border-[#7568E8] focus:ring-1 focus:ring-[#7568E8] focus:outline-none"
            />
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-[#A3ABC5] mb-2">Read Scopes</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EXTERNAL_API_SCOPES.map((scope) => (
                <label
                  key={scope}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-colors ${
                    scopes.includes(scope)
                      ? 'border-[#7568E8] bg-[#7568E8]/10 text-[#F4F6FF]'
                      : 'border-[#1F253D] bg-[#101426] text-[#A3ABC5] hover:border-[#2D3555]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-[#2A3048] bg-[#101426] text-[#7568E8] focus:ring-0 cursor-pointer"
                  />
                  <span>{labelForScope(scope)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1F253D]">
            <Button variant="secondary" onClick={closeCreate}>Cancel</Button>
            <Button disabled={!name.trim() || !scopes.length} isLoading={busy} onClick={() => void createKey()}>
              Create Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* Secret Display Modal */}
      <Modal isOpen={Boolean(newKey)} onClose={() => setNewKey(null)} title="Copy your API key" subtitle="For security, this secret token cannot be viewed again." maxWidth="lg">
        <div className="space-y-4">
          <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 p-3 rounded-xl">
            Store this key securely in your integration’s environment secret manager before closing this dialog.
          </p>
          <div className="flex gap-2">
            <code className="min-w-0 flex-1 break-all rounded-xl bg-[#090B1A] border border-[#1F253D] p-3 text-xs font-mono text-[#23C99C]">
              {newKey}
            </code>
            <Button aria-label="Copy API key" variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => newKey && void copy(newKey)}>
              Copy
            </Button>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setNewKey(null)}>I’ve stored it safely</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
