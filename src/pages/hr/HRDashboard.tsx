import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Users,
  Clock,
  UserPlus,
  Calendar,
  AlertTriangle,
  Award,
  Wallet,
  Car,
  Sparkles,
  Building2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';

export const HRDashboard: React.FC = () => {
  const { navigate, employees, attendanceRecords, candidates, timeOffRequests, payrollRuns, vehicles, appraisals } = useApp();

  const activeEmployees = employees.filter((e) => e.status === 'Active');
  const checkedInCount = attendanceRecords.filter((r) => r.status === 'Working' || r.status === 'Remote').length;
  const attendanceRate = attendanceRecords.length > 0
    ? `${((checkedInCount / attendanceRecords.length) * 100).toFixed(1)}%`
    : '0%';

  const activeCandidatesCount = candidates.length;
  const pendingLeaveCount = timeOffRequests.filter((r) => r.status === 'Pending').length;
  const currentPayroll = payrollRuns[0];

  const headcountData = useMemo(() => {
    if (employees.length === 0) return [];
    return [
      { month: 'Current', employees: employees.length },
    ];
  }, [employees]);

  const deptBreakdown = useMemo(() => {
    if (employees.length === 0) return [];
    const map: Record<string, number> = {};
    employees.forEach((e) => {
      const dept = e.department || 'General';
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map).map(([dept, count]) => ({ dept, count }));
  }, [employees]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="NextAura Human Resources"
        subtitle="Manage your workforce from hiring and onboarding to attendance, performance, fleet & payroll."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => navigate('employees', 'overview')}
              variant="secondary"
              size="sm"
            >
              Employee Directory
            </Button>
            <Button
              onClick={() => navigate('recruitment', 'overview')}
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
            >
              Open Recruitment ATS
            </Button>
          </div>
        }
      />

      {/* Top HR Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Workforce"
          value={activeEmployees.length}
          change={0}
          comparisonText="active workforce"
          icon={Users}
          accentColor="amber"
          onClick={() => navigate('employees', 'overview')}
        />
        <StatCard
          title="Live Attendance Rate"
          value={attendanceRate}
          change={0}
          comparisonText={`${checkedInCount} checked in today`}
          icon={Clock}
          accentColor="azure"
          onClick={() => navigate('attendance', 'overview')}
        />
        <StatCard
          title="Active Candidates (ATS)"
          value={activeCandidatesCount}
          comparisonText={`${candidates.length} candidates in funnel`}
          icon={UserPlus}
          accentColor="teal"
          onClick={() => navigate('recruitment', 'overview')}
        />
        <StatCard
          title="Monthly Payroll Run"
          value={currentPayroll ? currentPayroll.netPayTotal : 0}
          isCurrency
          comparisonText={payrollRuns.length > 0 ? `${payrollRuns.length} runs on file` : 'No payroll runs yet'}
          icon={Wallet}
          accentColor="emerald"
          onClick={() => navigate('payroll', 'overview')}
        />
      </div>

      {/* Row 2: Headcount Growth Chart + HR Actionable Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Headcount Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Headcount Growth & Hiring Rate</h3>
              <p className="text-xs text-slate-500">Total active employees over time</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {headcountData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={headcountData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Area type="monotone" dataKey="employees" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorHeadcount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="font-medium text-slate-600 dark:text-slate-400">No workforce headcount data available yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">Add employees to generate workforce growth charts.</p>
              </div>
            )}
          </div>
        </div>

        {/* HR Actionable Alerts */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              HR Action Center Alerts
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">Pending HR Tasks</h3>

            <div className="mt-4 space-y-2.5">
              {pendingLeaveCount > 0 && (
                <div
                  onClick={() => navigate('time-off', 'overview')}
                  className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors flex items-start gap-3"
                >
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shrink-0 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{pendingLeaveCount} Time-Off Requests</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Time-off requests awaiting manager review.</p>
                  </div>
                </div>
              )}

              {appraisals.length > 0 && (
                <div
                  onClick={() => navigate('appraisals', 'overview')}
                  className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer transition-colors flex items-start gap-3"
                >
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 shrink-0 mt-0.5">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{appraisals.length} Appraisal Reviews</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Performance reviews active in cycle.</p>
                  </div>
                </div>
              )}

              {vehicles.length > 0 && (
                <div
                  onClick={() => navigate('fleet', 'overview')}
                  className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-slate-400 cursor-pointer transition-colors flex items-start gap-3"
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{vehicles.length} Active Vehicles</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Corporate fleet vehicles logged.</p>
                  </div>
                </div>
              )}

              {pendingLeaveCount === 0 && appraisals.length === 0 && vehicles.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  No pending HR alerts
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={() => navigate('payroll', 'overview')}
            variant="secondary"
            size="sm"
            className="w-full"
            icon={<Wallet className="w-4 h-4" />}
          >
            Review Payroll Run
          </Button>
        </div>
      </div>

      {/* Row 3: Department Breakdown & Vehicles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Department Staff Breakdown</h3>
          <div className="h-60 w-full pt-4">
            {deptBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dept" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="font-medium text-slate-600 dark:text-slate-400">No department data available yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Active Corporate Fleet Vehicles</h3>
            </div>
            <button
              onClick={() => navigate('fleet', 'overview')}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              View Fleet ({vehicles.length})
            </button>
          </div>

          <div className="space-y-3">
            {vehicles.length > 0 ? (
              vehicles.map((v) => (
                <div key={v.id} className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{v.name}</div>
                    <div className="text-[11px] text-slate-500">{v.make} {v.model} • License: {v.licensePlate}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{v.assignedEmployeeName || 'Unassigned'}</div>
                    <StatusBadge status={v.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                No corporate vehicles registered
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
