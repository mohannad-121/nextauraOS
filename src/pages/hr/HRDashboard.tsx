import React from 'react';
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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';

const headcountData = [
  { month: 'Jan', employees: 54, hires: 4, departures: 1 },
  { month: 'Feb', employees: 58, hires: 5, departures: 1 },
  { month: 'Mar', employees: 64, hires: 7, departures: 1 },
  { month: 'Apr', employees: 69, hires: 6, departures: 1 },
  { month: 'May', employees: 74, hires: 6, departures: 1 },
  { month: 'Jun', employees: 78, hires: 5, departures: 1 },
  { month: 'Jul', employees: 81, hires: 4, departures: 1 },
  { month: 'Aug', employees: 84, hires: 4, departures: 1 },
];

export const HRDashboard: React.FC = () => {
  const { navigate, employees, attendanceRecords, candidates, timeOffRequests, payrollRuns, vehicles } = useApp();

  const activeEmployees = employees.filter((e) => e.status === 'Active');
  const checkedInCount = attendanceRecords.filter((r) => r.status === 'Working' || r.status === 'Remote').length;
  const activeCandidatesCount = candidates.length;
  const pendingLeaveCount = timeOffRequests.filter((r) => r.status === 'Pending').length;
  const currentPayroll = payrollRuns[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="NextAura Human Resources"
        subtitle="Manage your workforce from hiring and onboarding to attendance, performance, fleet & payroll."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('employees', 'overview')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Employee Directory
            </button>
            <button
              onClick={() => navigate('recruitment', 'overview')}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-orange-500/20 flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4 stroke-[3]" />
              Open Recruitment ATS
            </button>
          </div>
        }
      />

      {/* Top HR Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Workforce"
          value={activeEmployees.length}
          change={8.4}
          comparisonText="vs last quarter"
          icon={Users}
          accentColor="amber"
          onClick={() => navigate('employees', 'overview')}
        />
        <StatCard
          title="Live Attendance Rate"
          value="94.6%"
          change={2.1}
          comparisonText={`${checkedInCount} checked in today`}
          icon={Clock}
          accentColor="cyan"
          onClick={() => navigate('attendance', 'overview')}
        />
        <StatCard
          title="Active Candidates (ATS)"
          value={activeCandidatesCount}
          comparisonText="7 open positions"
          icon={UserPlus}
          accentColor="teal"
          onClick={() => navigate('recruitment', 'overview')}
        />
        <StatCard
          title="Monthly Payroll Run"
          value={currentPayroll ? currentPayroll.netPayTotal : 0}
          isCurrency
          comparisonText="Next disbursement Sep 28"
          icon={Wallet}
          accentColor="emerald"
          onClick={() => navigate('payroll', 'overview')}
        />
      </div>

      {/* Row 2: Headcount Growth Chart + HR Actionable Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Headcount Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 font-heading">Headcount Growth & Hiring Rate</h3>
              <p className="text-xs text-slate-400">Total active employees over time</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={headcountData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="employees" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorHeadcount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HR Actionable Alerts */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              HR Action Center Alerts
            </div>
            <h3 className="text-base font-bold text-slate-100 font-heading mt-1">Pending HR Tasks</h3>

            <div className="mt-4 space-y-3">
              <div
                onClick={() => navigate('time-off', 'overview')}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/20 hover:border-purple-500/40 cursor-pointer transition-colors flex items-start gap-3"
              >
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">{pendingLeaveCount} Time-Off Requests</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Alex Rivera requested 5 days Annual Leave.</p>
                </div>
              </div>

              <div
                onClick={() => navigate('appraisals', 'overview')}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-yellow-500/20 hover:border-yellow-500/40 cursor-pointer transition-colors flex items-start gap-3"
              >
                <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 shrink-0 mt-0.5">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Q3 Appraisal Reviews Due</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Sarah Chen evaluation awaiting manager review.</p>
                </div>
              </div>

              <div
                onClick={() => navigate('fleet', 'overview')}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/20 hover:border-amber-500/40 cursor-pointer transition-colors flex items-start gap-3"
              >
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Fleet Service Reminder</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tesla Model S tire service due in 12 days.</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('payroll', 'overview')}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            Review September Payroll Run
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Row 3: Department Breakdown & Vehicles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 font-heading">Department Staff Breakdown</h3>
          <div className="h-60 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { dept: 'Engineering', count: 28 },
                { dept: 'Sales', count: 18 },
                { dept: 'Marketing', count: 12 },
                { dept: 'Operations', count: 10 },
                { dept: 'Finance', count: 8 },
                { dept: 'HR', count: 6 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="dept" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-slate-100 font-heading">Active Corporate Fleet Vehicles</h3>
            </div>
            <button
              onClick={() => navigate('fleet', 'overview')}
              className="text-xs text-blue-400 font-bold hover:underline"
            >
              View Fleet ({vehicles.length})
            </button>
          </div>

          <div className="space-y-3">
            {vehicles.map((v) => (
              <div key={v.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-100">{v.name}</div>
                  <div className="text-[10px] text-slate-400">{v.make} {v.model} • License: {v.licensePlate}</div>
                </div>
                <div className="text-end">
                  <div className="font-bold text-slate-200">{v.assignedEmployeeName || 'Unassigned'}</div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {v.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
