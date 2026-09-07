import React, { useEffect, useState } from 'react';
import { BadgeDollarSign, Building2, FileClock, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { Surface } from '../../components/common/WorkspacePrimitives';
import { formatDate } from '../../utils/formatters';
import { billingService, type OrganizationSubscription } from '../../services/billingService';
import { DeveloperApiPage } from './DeveloperApiPage';

type SettingsTab = 'company' | 'team' | 'billing' | 'developer' | 'audit';

export const SettingsPage: React.FC = () => {
  const { currentOrg, user, auditLogs, navigate, activeSubView } = useApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [seatCount, setSeatCount] = useState(1); const [billingBusy, setBillingBusy] = useState(false); const [billingError, setBillingError] = useState('');
  useEffect(() => { billingService.getSubscription(currentOrg.id).then((value) => { setSubscription(value); if (value) setSeatCount(value.seat_count); }).catch((err) => setBillingError(err.message)); }, [currentOrg.id]);
  useEffect(() => { if (activeSubView === 'billing') setActiveTab('billing'); }, [activeSubView]);
  const updateSeats = async () => { setBillingBusy(true); setBillingError(''); try { await billingService.updateSeats(currentOrg.id, seatCount); setSubscription(await billingService.getSubscription(currentOrg.id)); } catch (err: any) { setBillingError(err.message); } finally { setBillingBusy(false); } };
  const openPortal = async () => { setBillingBusy(true); setBillingError(''); try { const result = await billingService.openPortal(currentOrg.id); if (result.url) window.location.assign(result.url); } catch (err: any) { setBillingError(err.message); } finally { setBillingBusy(false); } };
  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'company', label: 'Company' },
    { id: 'team', label: 'Team & permissions' },
    { id: 'billing', label: 'Billing & plans' },
    { id: 'developer', label: 'Developer & API' },
    { id: 'audit', label: 'Audit log' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-14">
      <PageHeader title="Settings" subtitle="Workspace identity, membership, plans, and activity." />

      <div role="tablist" aria-label="Settings sections" className="flex items-center gap-6 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`settings-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 border-b-2 px-0.5 pb-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-blue-700 text-slate-900 dark:border-blue-400 dark:text-slate-100' : 'border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section id={`settings-${activeTab}`} role="tabpanel">
        {activeTab === 'company' && (
          <Surface padding="none">
            <div className="flex items-start gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"><Building2 className="h-5 w-5" /></span>
              <div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Workspace details</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">The organization currently selected in NextAura.</p></div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2">
              {[
                ['Organization name', currentOrg.name],
                ['Legal name', currentOrg.legalName || 'Not provided'],
                ['Tax ID / VAT', currentOrg.taxId || 'Not provided'],
                ['Base currency', currentOrg.baseCurrency],
                ['Country', currentOrg.country || 'Not provided'],
                ['Fiscal year end', currentOrg.fiscalYearEnd || 'Not provided'],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-slate-100 px-6 py-5 odd:sm:border-e dark:border-slate-700">
                  <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</dt>
                  <dd className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</dd>
                </div>
              ))}
            </dl>
          </Surface>
        )}

        {activeTab === 'team' && (
          <Surface padding="none">
            <div className="flex items-start gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><ShieldCheck className="h-5 w-5" /></span>
              <div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Signed-in member</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Your active session identity and current application role.</p></div>
            </div>
            <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <Avatar src={user.avatar} name={user.name} className="h-11 w-11 rounded-xl" />
                <div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</p><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{user.email}</p></div>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><UserRound className="h-3.5 w-3.5" />{user.role}</span>
            </div>
            <p className="border-t border-slate-200 px-6 py-4 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:text-slate-400">Additional membership administration is not exposed on this screen. NextAura AI verifies the database membership role independently on every request.</p>
          </Surface>
        )}

        {activeTab === 'billing' && (
          <Surface padding="none">
            <div className="flex flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><BadgeDollarSign className="h-5 w-5" /></span>
                <div className="max-w-xl"><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Plans and billing</h2><p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400">{subscription ? `${subscription.plan === 'one_app_free' ? 'One App Free' : subscription.plan} · ${subscription.status} · ${subscription.seat_count} seats` : 'No billing plan is active yet.'}</p></div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2"><Button onClick={() => navigate('pricing')}>View pricing</Button>{subscription?.billing_provider === 'paddle' && subscription.provider_customer_id && <Button variant="secondary" disabled={billingBusy} onClick={openPortal}>Manage billing</Button>}</div>
            </div>
            <div className="border-t border-slate-200 px-6 py-6 dark:border-slate-700"><dl className="mb-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-4"><div><dt className="text-slate-500">Current plan</dt><dd className="mt-1 font-medium">{subscription?.plan === 'one_app_free' ? 'One App Free' : subscription?.plan || 'Not active'}</dd></div><div><dt className="text-slate-500">Billing cycle</dt><dd className="mt-1 font-medium capitalize">{subscription?.billing_cycle || '—'}</dd></div><div><dt className="text-slate-500">Status</dt><dd className="mt-1 font-medium capitalize">{subscription?.status || '—'}</dd></div><div><dt className="text-slate-500">Renewal date</dt><dd className="mt-1 font-medium">{subscription?.next_billed_at ? formatDate(subscription.next_billed_at) : subscription?.current_period_end ? formatDate(subscription.current_period_end) : '—'}</dd></div></dl><label className="block max-w-xs text-sm font-medium">Seat quantity<input type="number" min={1} max={10000} value={seatCount} onChange={(e) => setSeatCount(Math.max(1, Number(e.target.value) || 1))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" /></label><Button className="mt-3" disabled={billingBusy || !subscription} onClick={updateSeats}>Save seat quantity</Button>{billingError && <p className="mt-3 text-sm text-rose-600">{billingError}</p>}</div>
          </Surface>
        )}

        {activeTab === 'developer' && <DeveloperApiPage />}

        {activeTab === 'audit' && (
          <Surface padding="none" className="overflow-hidden">
            <div className="flex items-start gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"><FileClock className="h-5 w-5" /></span>
              <div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Workspace activity</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Recorded audit events for this organization.</p></div>
            </div>
            {auditLogs.length > 0 ? (
              <ol className="divide-y divide-slate-100 dark:divide-slate-700">
                {auditLogs.map((log) => (
                  <li key={log.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{log.action}</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{log.details}</p></div>
                    <div className="shrink-0 text-xs text-slate-600 dark:text-slate-400 sm:text-end"><p>{log.userName}</p><p className="mt-1">{formatDate(log.timestamp)}</p></div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="px-6 py-14 text-center"><FileClock className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">No activity recorded yet</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Workspace audit events will appear here.</p></div>
            )}
          </Surface>
        )}
      </section>
    </div>
  );
};
