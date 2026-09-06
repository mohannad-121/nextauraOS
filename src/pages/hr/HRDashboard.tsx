import React from 'react';
import { Users, Clock, UserPlus, Calendar, Award, Wallet, Car, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { SectionHeader, Surface } from '../../components/common/WorkspacePrimitives';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency } from '../../utils/formatters';

export const HRDashboard: React.FC = () => {
  const { navigate, employees, attendanceRecords, candidates, timeOffRequests, payrollRuns, vehicles, appraisals } = useApp();
  const activeEmployees = employees.filter((item) => item.status === 'Active');
  const workingNow = attendanceRecords.filter((item) => item.status === 'Working' || item.status === 'Remote');
  const pendingLeave = timeOffRequests.filter((item) => item.status === 'Pending');
  const currentPayroll = payrollRuns[0];

  const tools = [
    { title: 'People directory', detail: `${activeEmployees.length} active employee${activeEmployees.length === 1 ? '' : 's'}`, icon: Users, onClick: () => navigate('employees') },
    { title: 'Attendance', detail: `${workingNow.length} currently working`, icon: Clock, onClick: () => navigate('attendance') },
    { title: 'Recruitment', detail: `${candidates.length} candidate${candidates.length === 1 ? '' : 's'} in progress`, icon: UserPlus, onClick: () => navigate('recruitment') },
    { title: 'Time off', detail: `${pendingLeave.length} request${pendingLeave.length === 1 ? '' : 's'} to review`, icon: Calendar, onClick: () => navigate('time-off') },
    { title: 'Appraisals', detail: `${appraisals.length} review${appraisals.length === 1 ? '' : 's'} on file`, icon: Award, onClick: () => navigate('appraisals') },
    { title: 'Fleet', detail: `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} registered`, icon: Car, onClick: () => navigate('fleet') },
    { title: 'Payroll', detail: currentPayroll ? `${formatCurrency(currentPayroll.netPayTotal, 'USD')} latest net pay` : 'No payroll runs yet', icon: Wallet, onClick: () => navigate('payroll') },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 pb-12">
      <PageHeader
        category="People"
        title="Human Resources"
        subtitle="A focused workspace for your team, from hiring and daily attendance through performance and payroll."
        actions={<Button icon={<UserPlus className="h-4 w-4" />} onClick={() => navigate('employees')}>Add employee</Button>}
      />

      <section className="space-y-4">
        <SectionHeader title="People operations" description="Choose an area to continue working." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map(({ title, detail, icon: Icon, onClick }) => (
            <button key={title} type="button" onClick={onClick} className="group flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 text-start transition-all hover:-translate-y-px hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><Icon className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{detail}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
        <section className="space-y-4">
          <SectionHeader title="Team today" description="Live attendance across your active team." action={<button type="button" onClick={() => navigate('attendance')} className="text-xs font-semibold text-blue-700 dark:text-blue-300">Open attendance</button>} />
          <Surface padding="none" className="overflow-hidden">
            {workingNow.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {workingNow.slice(0, 6).map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{record.employeeName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{record.department} · checked in {record.checkIn}</p>
                    </div>
                    <StatusBadge status={record.status} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <Clock className="mx-auto h-5 w-5 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">No one is checked in yet</p>
                <p className="mt-1 text-xs text-slate-500">Live attendance will appear here as the team starts work.</p>
              </div>
            )}
          </Surface>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Needs review" description="People tasks waiting for a decision." />
          <Surface>
            {pendingLeave.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingLeave.slice(0, 5).map((request) => (
                  <button key={request.id} type="button" onClick={() => navigate('time-off', 'requests')} className="flex w-full items-center justify-between gap-3 py-3.5 text-start first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{request.employeeName}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{request.leaveType} · {request.startDate}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-7 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">All caught up</p>
                <p className="mt-1 text-xs text-slate-500">There are no leave requests waiting for review.</p>
              </div>
            )}
          </Surface>
        </section>
      </div>
    </div>
  );
};
