import React, { useMemo } from 'react';
import {
  Sparkles,
  ArrowRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  CreditCard,
  Users,
  Calendar,
  Wallet,
  Mail,
  Building2,
  Clock,
  FolderKanban,
  BarChart3,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getServiceCustomIcon } from '../utils/serviceIconMapper';
import { formatDate, formatCurrency } from '../utils/formatters';

export const HomeDashboard: React.FC = () => {
  const {
    navigate,
    user,
    currentOrg,
    activeServices,
    invoices,
    expenses,
    signDocuments,
    employees,
    timeOffRequests,
    auditLogs,
  } = useApp();

  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Needs Attention Items (Filtered strictly from real tenant state)
  const pendingTimeOff = useMemo(() => timeOffRequests.filter((r) => r.status === 'Pending'), [timeOffRequests]);
  const pendingExpenses = useMemo(() => expenses.filter((e) => e.status === 'Submitted'), [expenses]);
  const pendingSignatures = useMemo(() => signDocuments.filter((d) => d.status === 'Sent' || d.status === 'Partially Signed'), [signDocuments]);
  const overdueInvoices = useMemo(() => invoices.filter((i) => i.status === 'Overdue'), [invoices]);

  const totalNeedsAttentionCount =
    pendingTimeOff.length + pendingExpenses.length + pendingSignatures.length + overdueInvoices.length;

  // Active Applications definition
  const allAppTiles = [
    { key: 'invoicing', app: 'invoicing', category: 'finance', title: 'Invoicing', desc: 'Create and track client invoices and payments', icon: CreditCard },
    { key: 'accounting', app: 'accounting', category: 'finance', title: 'Accounting', desc: 'General ledger, journal entries & reports', icon: Building2 },
    { key: 'expenses', app: 'expenses', category: 'finance', title: 'Expenses & Cards', desc: 'Employee expense claims & corporate cards', icon: CreditCard },
    { key: 'sign', app: 'sign', category: 'finance', title: 'Sign', desc: 'E-signature document preparation & signing', icon: FileSignature },
    { key: 'equity', app: 'equity', category: 'finance', title: 'Equity & Cap Table', desc: 'Shareholders, stock options & valuation', icon: BarChart3 },
    { key: 'esg', app: 'esg', category: 'finance', title: 'ESG & Carbon', desc: 'Sustainability metrics & carbon tracking', icon: BarChart3 },
    { key: 'employees', app: 'employees', category: 'hr', title: 'Employees', desc: 'Employee directory & organization chart', icon: Users },
    { key: 'attendance', app: 'attendance', category: 'hr', title: 'Attendance', desc: 'Time tracking & presence board', icon: Clock },
    { key: 'recruitment', app: 'recruitment', category: 'hr', title: 'Recruitment (ATS)', desc: 'Job openings & candidate pipeline', icon: Users },
    { key: 'time_off', app: 'time-off', category: 'hr', title: 'Time Off & Leave', desc: 'Leave requests & calendar tracking', icon: Calendar },
    { key: 'payroll', app: 'payroll', category: 'hr', title: 'Payroll Processing', desc: 'Compensation runs & payslip generation', icon: Wallet },
    { key: 'email_marketing', app: 'email', category: 'marketing', title: 'Email Marketing', desc: 'Broadband email campaigns & templates', icon: Mail },
    { key: 'contacts', app: 'contacts', category: 'platform', title: 'Contacts CRM', desc: 'Client, vendor & partner directory', icon: Users },
    { key: 'documents', app: 'documents', category: 'platform', title: 'Document Vault', desc: 'Enterprise file storage & category search', icon: FolderKanban },
    { key: 'analytics', app: 'analytics', category: 'platform', title: 'Analytics Center', desc: 'Executive intelligence & operational metrics', icon: BarChart3 },
  ];

  const activeAppTiles = allAppTiles.filter((tile) => activeServices.includes(tile.key));

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* A. Workspace Greeting & Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentOrg.name} Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 font-heading tracking-tight">
            {greetingTime}, {user.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {totalNeedsAttentionCount > 0
              ? `You have ${totalNeedsAttentionCount} task${totalNeedsAttentionCount > 1 ? 's' : ''} requiring attention today.`
              : 'Everything is up to date across your active applications.'}
          </p>
        </div>

        {/* B. Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0">
          <button
            onClick={() => navigate('invoicing', 'new-invoice')}
            className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>

          {activeServices.includes('employees') && (
            <button
              onClick={() => navigate('employees', 'overview')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Add Employee</span>
            </button>
          )}

          {activeServices.includes('payroll') && (
            <button
              onClick={() => navigate('payroll', 'overview')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Create Payroll Run</span>
            </button>
          )}

          {activeServices.includes('email_marketing') && (
            <button
              onClick={() => navigate('email', 'new')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>New Campaign</span>
            </button>
          )}
        </div>
      </div>

      {/* C. Your Active Applications Launchpad Tiles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">Your Active Applications</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Direct workspace access to enabled product modules</p>
          </div>
          <button
            onClick={() => navigate('settings', 'services')}
            className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Manage Services</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeAppTiles.map((tile) => {
            const Icon = tile.icon;
            const customIcon = getServiceCustomIcon(tile.category, tile.title, tile.key);

            return (
              <div
                key={tile.key}
                onClick={() => navigate(tile.app as any, 'overview')}
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:bg-blue-50 dark:group-hover:bg-slate-700 transition-colors">
                      {customIcon ? (
                        <img src={customIcon} alt={`${tile.title} icon`} className="w-5 h-5 object-contain" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                        {tile.title}
                      </h3>
                      <span className="text-[10px] font-medium text-slate-400 capitalize">{tile.category}</span>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {tile.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* D. Needs Attention & Operational Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Needs Attention Queue (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">Needs Attention</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Action items requiring review or approval</p>
            </div>
            {totalNeedsAttentionCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                {totalNeedsAttentionCount} Pending
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {totalNeedsAttentionCount > 0 ? (
              <>
                {/* Pending Leave Requests */}
                {pendingTimeOff.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Leave Request: {req.employeeName}</div>
                        <div className="text-[11px] text-slate-500">{req.leaveType} • {req.startDate} to {req.endDate}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('time-off', 'requests')}
                      className="px-3 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-medium transition-colors"
                    >
                      Review
                    </button>
                  </div>
                ))}

                {/* Pending Expenses */}
                {pendingExpenses.map((exp) => (
                  <div key={exp.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Expense Claim: {exp.title}</div>
                        <div className="text-[11px] text-slate-500">{exp.employeeName} • {formatCurrency(exp.amount, exp.currency)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('expenses', 'approvals')}
                      className="px-3 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-medium transition-colors"
                    >
                      Review
                    </button>
                  </div>
                ))}

                {/* Pending Signatures */}
                {pendingSignatures.map((doc) => (
                  <div key={doc.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        <FileSignature className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Signature Document: {doc.title}</div>
                        <div className="text-[11px] text-slate-500">{doc.recipients.length} Recipient(s)</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('sign', 'overview')}
                      className="px-3 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-medium transition-colors"
                    >
                      Track
                    </button>
                  </div>
                ))}

                {/* Overdue Invoices */}
                {overdueInvoices.map((inv) => (
                  <div key={inv.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Overdue Invoice: #{inv.number}</div>
                        <div className="text-[11px] text-slate-500">{inv.customerName} • {formatCurrency(inv.amountDue, inv.currency)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('invoicing', 'overview')}
                      className="px-3 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-medium transition-colors"
                    >
                      View
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No pending action items</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  All approvals, leave requests, and document signatures are processed.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* E. Recent Activity Stream (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">Recent Activity</h3>
              <span className="text-xs text-slate-400 font-mono">Live Audit</span>
            </div>

            <div className="mt-4 space-y-3">
              {auditLogs.length > 0 ? (
                auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{log.action}</div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{log.userName}</span>
                      <span>{formatDate(log.timestamp)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                  No tenant activity recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Compact Tenant Overview Stats */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="text-xs text-slate-500">Active Personnel</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5 font-heading">
                {employees.length}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="text-xs text-slate-500">Total Invoices</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5 font-heading">
                {invoices.length}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
