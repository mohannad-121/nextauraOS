import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { entitlementService, type PlanEntitlements } from '../../services/entitlementService';
import { organizationService } from '../../services/organizationService';

function creationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to create the company.';
  if (message.includes('active Custom plan')) return 'An active Custom plan is required to add companies.';
  if (message.includes('Only the billing root Owner')) return 'Only the billing root Owner can add companies.';
  if (message.includes('billing root is locked or archived')) return 'The billing root is not active, so a company cannot be added.';
  if (message.includes('child organization cannot authorize')) return 'Choose the billing root company to add another company.';
  return message;
}

export const CompanyCreationDialog: React.FC = () => {
  const {
    currentOrg, organizations, navigate, refreshOrganizations, switchOrg,
    isCompanyCreationOpen, setCompanyCreationOpen,
  } = useApp();
  const [name, setName] = useState('');
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isCompanyCreationOpen) return;
    let cancelled = false;
    setName(''); setError(''); setNotice(''); setEntitlements(null); setLoadingEligibility(true);
    entitlementService.getPlanEntitlements(currentOrg.id)
      .then((result) => { if (!cancelled) setEntitlements(result); })
      .catch(() => { if (!cancelled) setError('We could not confirm whether this workspace can add companies. Please try again.'); })
      .finally(() => { if (!cancelled) setLoadingEligibility(false); });
    return () => { cancelled = true; };
  }, [currentOrg.id, isCompanyCreationOpen]);

  const billingRoot = useMemo(
    () => organizations.find((organization) => organization.id === entitlements?.billing_root_organization_id) || null,
    [entitlements?.billing_root_organization_id, organizations],
  );
  const canCreate = Boolean(
    entitlements?.access_active && entitlements.plan === 'custom'
    && billingRoot?.membershipRole === 'Owner' && billingRoot.lifecycleStatus === 'active',
  );

  const close = () => { if (!submitting) setCompanyCreationOpen(false); };
  const goToPricing = () => { setCompanyCreationOpen(false); navigate('pricing'); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreate || !billingRoot || submitting) return;
    setSubmitting(true); setError(''); setNotice('');
    try {
      const created = await organizationService.createChildOrganization(name, billingRoot.id);
      await refreshOrganizations();
      try {
        await switchOrg(created.id);
        setCompanyCreationOpen(false);
        navigate('launchpad');
      } catch {
        setNotice(`${created.name} was created, but we could not switch to it automatically. Select it from the company switcher.`);
      }
    } catch (creationError) {
      setError(creationErrorMessage(creationError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isCompanyCreationOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4" role="presentation" onMouseDown={close}>
      <section role="dialog" aria-modal="true" aria-labelledby="create-company-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><Building2 className="h-5 w-5" aria-hidden="true" /></span><div><h2 id="create-company-title" className="text-sm font-semibold text-slate-900 dark:text-white">Add company</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Create a company under your Custom billing root.</p></div></div>
          <button type="button" onClick={close} disabled={submitting} aria-label="Close add company dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"><X className="h-4 w-4" /></button>
        </div>

        {loadingEligibility ? <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Checking company permissions…</div> : canCreate ? (
          <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
            <div><label htmlFor="company-name" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">Company name</label><input id="company-name" autoFocus required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. NextAura Jordan" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900" /></div>
            {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
            {notice && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">{notice}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={close} disabled={submitting} className="h-10 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button type="submit" disabled={submitting || !name.trim()} className="flex h-10 items-center gap-2 rounded-xl bg-blue-700 px-3.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Create company</button></div>
          </form>
        ) : (
          <div className="mt-5 space-y-4"><p className="text-sm text-slate-600 dark:text-slate-300">{error || (entitlements?.plan !== 'custom' ? 'Adding companies is available on the Custom plan.' : 'Only the active billing root Owner can add companies.')}</p>{entitlements?.plan !== 'custom' && <button type="button" onClick={goToPricing} className="h-10 rounded-xl bg-blue-700 px-3.5 text-xs font-semibold text-white hover:bg-blue-800">View Custom plan</button>}</div>
        )}
      </section>
    </div>
  );
};
