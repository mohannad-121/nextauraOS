import React, { useEffect, useState } from 'react';
import { BadgeDollarSign, Building2, FileClock, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { Surface } from '../../components/common/WorkspacePrimitives';
import { formatDate } from '../../utils/formatters';
import { billingService, type OrganizationSubscription } from '../../services/billingService';
import { entitlementService, type PlanEntitlements } from '../../services/entitlementService';
import { DeveloperApiPage } from './DeveloperApiPage';

type SettingsTab = 'company' | 'team' | 'billing' | 'developer' | 'audit';

export const SettingsPage: React.FC = () => {
  const { currentOrg, user, auditLogs, navigate, activeSubView, organizations, switchOrg, refreshOrganizations } = useApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [billingRootName, setBillingRootName] = useState('');
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingReload, setBillingReload] = useState(0);
  const [seatCount, setSeatCount] = useState(1); const [billingBusy, setBillingBusy] = useState(false); const [billingError, setBillingError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadBilling = async () => {
      setBillingLoading(true);
      setBillingError('');
      setEntitlements(null);
      setSubscription(null);

      try {
        const resolvedEntitlements = await entitlementService.getPlanEntitlements(currentOrg.id);
        if (!resolvedEntitlements) throw new Error('Unable to resolve this company’s billing plan.');

        let availableOrganizations = organizations;
        let billingRoot = availableOrganizations.find((organization) => organization.id === resolvedEntitlements.billing_root_organization_id);
        if (!billingRoot) {
          availableOrganizations = await refreshOrganizations();
          billingRoot = availableOrganizations.find((organization) => organization.id === resolvedEntitlements.billing_root_organization_id);
        }
        if (!billingRoot) throw new Error('Your main company membership could not be resolved. Please refresh and try again.');

        const rootSubscription = resolvedEntitlements.organization_id === resolvedEntitlements.billing_root_organization_id
          ? await billingService.getSubscription(resolvedEntitlements.billing_root_organization_id)
          : null;
        if (cancelled) return;

        setEntitlements(resolvedEntitlements);
        setBillingRootName(billingRoot.name);
        setSubscription(rootSubscription);
        if (rootSubscription) setSeatCount(rootSubscription.seat_count);
      } catch (err: any) {
        if (!cancelled) setBillingError(err.message || 'Unable to load billing details.');
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    };

    void loadBilling();
    return () => { cancelled = true; };
  }, [currentOrg.id, billingReload, organizations, refreshOrganizations]);

  useEffect(() => { if (activeSubView === 'billing') setActiveTab('billing'); }, [activeSubView]);
  const updateSeats = async () => { setBillingBusy(true); setBillingError(''); try { await billingService.updateSeats(currentOrg.id, seatCount); setSubscription(await billingService.getSubscription(currentOrg.id)); } catch (err: any) { setBillingError(err.message); } finally { setBillingBusy(false); } };
  const openPortal = async () => { setBillingBusy(true); setBillingError(''); try { const result = await billingService.openPortal(currentOrg.id); if (result.url) window.location.assign(result.url); } catch (err: any) { setBillingError(err.message); } finally { setBillingBusy(false); } };
  const manageBillingInMainCompany = async () => {
    if (!entitlements?.billing_root_organization_id) return;
    setBillingBusy(true);
    setBillingError('');
    try {
      await switchOrg(entitlements.billing_root_organization_id);
      navigate('settings', 'billing');
    } catch (err: any) {
      setBillingError(err.message || 'Unable to switch to the main company.');
    } finally {
      setBillingBusy(false);
    }
  };
  const planName = (plan?: PlanEntitlements['plan'] | OrganizationSubscription['plan']) => plan === 'one_app_free' ? 'One App Free' : plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Not active';
  const isChildCompany = Boolean(entitlements && entitlements.organization_id !== entitlements.billing_root_organization_id);
  const childLifecycleMessage = entitlements?.organization_lifecycle_status === 'locked'
    ? 'Access to this company is locked because the current billing plan no longer includes additional companies.'
    : entitlements?.organization_lifecycle_status === 'archived'
      ? 'This company is archived. Its plan is shown for reference only.'
      : 'This company inherits its plan and access from the main company.';
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

      <div role="tablist" aria-label="Settings sections" className="flex items-center gap-6 overflow-x-auto border-b border-slate-200 dark:border-[#1F253D]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`settings-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 border-b-2 px-0.5 pb-3 text-sm font-semibold transition-all cursor-pointer ${activeTab === tab.id ? 'border-[#7568E8] text-slate-900 dark:border-[#7568E8] dark:text-[#F4F6FF]' : 'border-transparent text-slate-600 hover:text-slate-800 dark:text-[#A3ABC5] dark:hover:text-[#F4F6FF]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section id={`settings-${activeTab}`} role="tabpanel">
        {activeTab === 'company' && (
          <Surface padding="none">
            <div className="flex items-start gap-4 border-b border-slate-200 px-6 py-5 dark:border-[#1F253D]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-[#101426] dark:text-[#A499FA] border border-indigo-200/50 dark:border-[#7568E8]/30"><Building2 className="h-5 w-5" /></span>
              <div><h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FF]">Workspace details</h2><p className="mt-1 text-sm text-slate-600 dark:text-[#A3ABC5]">The organization currently selected in NextAura.</p></div>
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
                <div key={label} className="border-b border-slate-100 px-6 py-5 odd:sm:border-e dark:border-[#1F253D]">
                  <dt className="text-xs font-semibold text-slate-500 dark:text-[#747E9B] uppercase tracking-wider">{label}</dt>
                  <dd className="mt-1.5 text-sm font-medium text-slate-900 dark:text-[#F4F6FF]">{value}</dd>
                </div>
              ))}
            </dl>
          </Surface>
        )}

        {activeTab === 'team' && (
          <Surface padding="none">
            <div className="flex items-start gap-4 border-b border-slate-200 px-6 py-5 dark:border-[#1F253D]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-[#101426] dark:text-[#A499FA] border border-indigo-200/50 dark:border-[#7568E8]/30"><ShieldCheck className="h-5 w-5" /></span>
              <div><h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FF]">Signed-in member</h2><p className="mt-1 text-sm text-slate-600 dark:text-[#A3ABC5]">Your active session identity and current application role.</p></div>
            </div>
            <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <Avatar src={user.avatar} name={user.name} className="h-11 w-11 rounded-xl" />
                <div><p className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">{user.name}</p><p className="mt-0.5 text-xs text-slate-600 dark:text-[#A3ABC5]">{user.email}</p></div>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-[#2A3048] dark:bg-[#101426] dark:text-[#A3ABC5]"><UserRound className="h-3.5 w-3.5" />{user.role}</span>
            </div>
            <p className="border-t border-slate-200 px-6 py-4 text-xs leading-5 text-slate-600 dark:border-[#1F253D] dark:text-[#747E9B]">Additional membership administration is not exposed on this screen. NextAura AI verifies the database membership role independently on every request.</p>
          </Surface>
        )}

        {activeTab === 'billing' && (
          <Surface padding="none">
            {billingLoading ? (
              <div className="flex items-center gap-3 px-6 py-10 text-sm text-slate-600 dark:text-[#A3ABC5]" aria-busy="true"><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#7568E8] dark:border-[#2A3048] dark:border-t-[#7568E8]" aria-hidden="true" />Loading billing details…</div>
            ) : billingError && !entitlements ? (
              <div className="px-6 py-8"><p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{billingError}</p><Button className="mt-4" variant="secondary" onClick={() => setBillingReload((value) => value + 1)}>Try again</Button></div>
            ) : isChildCompany && entitlements ? (
              <>
                <div className="flex flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-[#101426] dark:text-[#A499FA] border border-indigo-200/50 dark:border-[#7568E8]/30"><BadgeDollarSign className="h-5 w-5" aria-hidden="true" /></span><div className="max-w-xl"><h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FF]">Plans and billing</h2><p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-[#A3ABC5]">{planName(entitlements.plan)} · Managed by main company</p></div></div><div className="flex shrink-0 flex-wrap gap-2"><Button onClick={() => navigate('pricing')}>View pricing</Button><Button variant="secondary" disabled={billingBusy} onClick={manageBillingInMainCompany}>Manage billing in main company</Button></div></div>
                <div className="border-t border-slate-200 px-6 py-6 dark:border-[#1F253D]"><dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-4"><div><dt className="text-slate-500 dark:text-[#747E9B] text-xs uppercase font-semibold">Inherited plan</dt><dd className="mt-1 font-semibold dark:text-[#F4F6FF]">{planName(entitlements.plan)}</dd></div><div><dt className="text-slate-500 dark:text-[#747E9B] text-xs uppercase font-semibold">Managed by</dt><dd className="mt-1 font-semibold dark:text-[#F4F6FF]">Main company</dd></div><div><dt className="text-slate-500 dark:text-[#747E9B] text-xs uppercase font-semibold">Main company</dt><dd className="mt-1 font-semibold dark:text-[#F4F6FF]">{billingRootName}</dd></div><div><dt className="text-slate-500 dark:text-[#747E9B] text-xs uppercase font-semibold">Access status</dt><dd className="mt-1 font-semibold dark:text-[#F4F6FF] capitalize">{entitlements.organization_lifecycle_status}</dd></div></dl><p className="mt-6 text-sm leading-6 text-slate-600 dark:text-[#A3ABC5]">{childLifecycleMessage} Plan changes in Pricing apply to the whole company family.</p>{billingError && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{billingError}</p>}</div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-[#101426] dark:text-[#A499FA] border border-indigo-200/50 dark:border-[#7568E8]/30"><BadgeDollarSign className="h-5 w-5" aria-hidden="true" /></span><div className="max-w-xl"><h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FF]">Plans and billing</h2><p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-[#A3ABC5]">{subscription ? `${planName(subscription.plan)} · ${subscription.status} · ${subscription.seat_count} seats` : 'No billing plan is active yet.'}</p></div></div><div className="flex shrink-0 flex-wrap gap-2"><Button onClick={() => navigate('pricing')}>View pricing</Button>{subscription?.billing_provider === 'paddle' && subscription.provider_customer_id && <Button variant="secondary" disabled={billingBusy} onClick={openPortal}>Manage billing</Button>}</div></div>
                <div className="border-t border-slate-200 px-6 py-6 dark:border-[#1F253D]"><dl className="mb-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-4"><div><dt className="text-slate-500 dark:text-[#747E9B] text-xs uppercase font-semibold">Current plan</dt><dd className="mt-1 font-semibold dark:text-[#F4F6FF]">{planName(subscription?.plan)}</dd></div><div><dt className="text-slate-500 dark:text-[#747E9B] text-xs uppercase font-semibold">Billing cycle</dt><dd className="mt-1 font-semibold dark:text-[#F4F6FF] capitalize">{subscription?.billing_cycle || '—'}</dd></div><div><dt className="text-slate-500 dark:text-[#747E9B] text-xs uppercase font-semibold">Status</dt><dd className="mt-1 font-semibold dark:text-[#F4F6FF] capitalize">{subscription?.status || '—'}</dd></div><div><dt className="text-slate-500 dark:text-[#747E9B] text-xs uppercase font-semibold">Renewal date</dt><dd className="mt-1 font-semibold dark:text-[#F4F6FF]">{subscription?.next_billed_at ? formatDate(subscription.next_billed_at) : subscription?.current_period_end ? formatDate(subscription.current_period_end) : '—'}</dd></div></dl><label className="block max-w-xs text-sm font-semibold dark:text-[#F4F6FF]">Seat quantity<input type="number" min={1} max={10000} value={seatCount} onChange={(e) => setSeatCount(Math.max(1, Number(e.target.value) || 1))} className="mt-2 w-full rounded-xl border border-slate-300 dark:border-[#2A3048] dark:bg-[#101426] dark:text-[#F4F6FF] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]" /></label><Button className="mt-3" disabled={billingBusy || !subscription} onClick={updateSeats}>Save seat quantity</Button>{billingError && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{billingError}</p>}</div>
              </>
            )}
          </Surface>
        )}

        {activeTab === 'developer' && <DeveloperApiPage />}

        {activeTab === 'audit' && (
          <Surface padding="none" className="overflow-hidden">
            <div className="flex items-start gap-4 border-b border-slate-200 px-6 py-5 dark:border-[#1F253D]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200/50 dark:border-amber-500/30"><FileClock className="h-5 w-5" /></span>
              <div><h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FF]">Workspace activity</h2><p className="mt-1 text-sm text-slate-600 dark:text-[#A3ABC5]">Recorded audit events for this organization.</p></div>
            </div>
            {auditLogs.length > 0 ? (
              <ol className="divide-y divide-slate-100 dark:divide-[#1F253D]">
                {auditLogs.map((log) => (
                  <li key={log.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-sm font-medium text-slate-900 dark:text-[#F4F6FF]">{log.action}</p><p className="mt-1 text-xs text-slate-600 dark:text-[#A3ABC5]">{log.details}</p></div>
                    <div className="shrink-0 text-xs text-slate-600 dark:text-[#A3ABC5] sm:text-end"><p>{log.userName}</p><p className="mt-1">{formatDate(log.timestamp)}</p></div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="px-6 py-14 text-center"><FileClock className="mx-auto h-6 w-6 text-slate-400 dark:text-[#747E9B]" /><p className="mt-3 text-sm font-medium text-slate-900 dark:text-[#F4F6FF]">No activity recorded yet</p><p className="mt-1 text-xs text-slate-600 dark:text-[#A3ABC5]">Workspace audit events will appear here.</p></div>
            )}
          </Surface>
        )}
      </section>
    </div>
  );
};
