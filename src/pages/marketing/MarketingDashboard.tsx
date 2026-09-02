import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Mail,
  MessageSquare,
  ClipboardList,
  Share2,
  Users,
  Send,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';

const campaignPerfData = [
  { week: 'Week 1', opens: 14200, clicks: 4800, conversions: 980 },
  { week: 'Week 2', opens: 18500, clicks: 6200, conversions: 1240 },
  { week: 'Week 3', opens: 22100, clicks: 7900, conversions: 1650 },
  { week: 'Week 4', opens: 26400, clicks: 9400, conversions: 2100 },
];

export const MarketingDashboard: React.FC = () => {
  const { navigate, emailCampaigns, smsCampaigns, surveys, socialPosts } = useApp();

  return (
    <div className="space-y-8">
      <PageHeader
        title="NextAura Marketing"
        subtitle="Manage customer acquisition campaigns across Email, SMS, CSAT Surveys & Social Media."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('email', 'new')}
              className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              New Email Campaign
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Audience Reach"
          value="78.4K"
          change={12.4}
          comparisonText="active contacts"
          icon={Users}
          accentColor="rose"
          onClick={() => navigate('email', 'overview')}
        />
        <StatCard
          title="Email Open Rate"
          value="41.8%"
          change={3.2}
          comparisonText="industry avg 21%"
          icon={Mail}
          accentColor="cyan"
          onClick={() => navigate('email', 'overview')}
        />
        <StatCard
          title="SMS Delivery Rate"
          value="96.4%"
          change={0.8}
          comparisonText="high conversion"
          icon={MessageSquare}
          accentColor="indigo"
          onClick={() => navigate('sms', 'overview')}
        />
        <StatCard
          title="CSAT Survey Rating"
          value="4.8 / 5"
          comparisonText="840 responses"
          icon={ClipboardList}
          accentColor="amber"
          onClick={() => navigate('surveys', 'overview')}
        />
      </div>

      {/* Campaign Performance Chart + Quick Launchers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 font-heading">Marketing Campaign Performance</h3>
              <p className="text-xs text-slate-400">Weekly email opens, link clicks & customer conversions</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={campaignPerfData}>
                <defs>
                  <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="opens" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorOpens)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Campaign Launchers */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Marketing Suite Quick Access
            </div>
            <h3 className="text-base font-bold text-slate-100 font-heading mt-1">Channel Operations</h3>

            <div className="mt-4 space-y-3">
              <div
                onClick={() => navigate('email', 'overview')}
                className="p-3.5 rounded-2xl bg-slate-950 border border-rose-500/20 hover:border-rose-500/40 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-rose-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-200">Email Marketing</div>
                    <div className="text-[10px] text-slate-400">{emailCampaigns.length} Active Campaigns</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500" />
              </div>

              <div
                onClick={() => navigate('sms', 'overview')}
                className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/20 hover:border-indigo-500/40 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-200">SMS Marketing</div>
                    <div className="text-[10px] text-slate-400">{smsCampaigns.length} Broadcasts Sent</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500" />
              </div>

              <div
                onClick={() => navigate('surveys', 'overview')}
                className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/20 hover:border-amber-500/40 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-200">Surveys & Forms</div>
                    <div className="text-[10px] text-slate-400">{surveys.length} Active Surveys</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500" />
              </div>

              <div
                onClick={() => navigate('social', 'overview')}
                className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/20 hover:border-cyan-500/40 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-200">Social Marketing</div>
                    <div className="text-[10px] text-slate-400">{socialPosts.length} Scheduled Posts</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
