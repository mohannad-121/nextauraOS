import React, { useMemo } from 'react';
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
  Users,
  Send,
  Sparkles,
  ArrowUpRight,
  Building2,
  Mail,
  MessageSquare,
  ClipboardList,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { getServiceCustomIcon } from '../../utils/serviceIconMapper';

export const MarketingDashboard: React.FC = () => {
  const { navigate, emailCampaigns, smsCampaigns, surveys, socialPosts, contacts } = useApp();

  const totalReach = contacts.length > 0 ? contacts.length : emailCampaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0);

  const avgEmailOpenRate = useMemo(() => {
    if (emailCampaigns.length === 0) return '0%';
    const totalRate = emailCampaigns.reduce((sum, c) => sum + (c.openRate || 0), 0);
    return `${(totalRate / emailCampaigns.length).toFixed(1)}%`;
  }, [emailCampaigns]);

  const avgSMSDeliveryRate = useMemo(() => {
    if (smsCampaigns.length === 0) return '0%';
    const totalRate = smsCampaigns.reduce((sum, c) => sum + (c.deliveryRate || 0), 0);
    return `${(totalRate / smsCampaigns.length).toFixed(1)}%`;
  }, [smsCampaigns]);

  const csatRating = useMemo(() => {
    if (surveys.length === 0) return '0 / 5';
    return `${surveys[0].avgScore ? (surveys[0].avgScore / 20).toFixed(1) : '0'} / 5`;
  }, [surveys]);

  const campaignPerfData = useMemo(() => {
    if (emailCampaigns.length === 0) return [];
    return emailCampaigns.map((c, i) => ({
      week: `Campaign ${i + 1}`,
      opens: c.sentCount ? Math.round(c.sentCount * ((c.openRate || 0) / 100)) : 0,
      clicks: c.sentCount ? Math.round(c.sentCount * ((c.clickRate || 0) / 100)) : 0,
    }));
  }, [emailCampaigns]);

  // Custom PNG icons
  const emailIcon = getServiceCustomIcon('email');
  const smsIcon = getServiceCustomIcon('sms');
  const surveyIcon = getServiceCustomIcon('surveys');
  const socialIcon = getServiceCustomIcon('social');

  return (
    <div className="space-y-6">
      <PageHeader
        category="Marketing"
        title="NextAura Marketing"
        subtitle="Manage customer acquisition campaigns across Email, SMS, CSAT Surveys & Social Media."
        actions={
          <button
            onClick={() => navigate('email', 'new')}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            New Email Campaign
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Audience Reach"
          value={totalReach.toLocaleString()}
          comparisonText="active contacts"
          icon={Users}
          accentColor="rose"
          onClick={() => navigate('email', 'overview')}
        />
        <StatCard
          title="Email Open Rate"
          value={avgEmailOpenRate}
          comparisonText="campaign average"
          icon={Mail}
          accentColor="indigo"
          onClick={() => navigate('email', 'overview')}
        />
        <StatCard
          title="SMS Delivery Rate"
          value={avgSMSDeliveryRate}
          comparisonText="successful delivery"
          icon={MessageSquare}
          accentColor="emerald"
          onClick={() => navigate('sms', 'overview')}
        />
        <StatCard
          title="CSAT Survey Rating"
          value={csatRating}
          comparisonText={`${surveys.length} active surveys`}
          icon={ClipboardList}
          accentColor="amber"
          onClick={() => navigate('surveys', 'overview')}
        />
      </div>

      {/* Campaign Performance Chart + Quick Launchers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">Marketing Campaign Performance</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Weekly email opens, link clicks & customer conversions</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {campaignPerfData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={campaignPerfData}>
                  <defs>
                    <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="opens" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorOpens)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Building2 className="w-8 h-8 text-slate-400 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No marketing campaign activity yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Create an email or SMS campaign to visualize engagement performance.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Campaign Launchers */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Marketing Suite Quick Access
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading mt-1">Channel Operations</h3>

            <div className="mt-4 space-y-2.5">
              <div
                onClick={() => navigate('email', 'overview')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {emailIcon ? (
                    <img src={emailIcon} alt="Email icon" className="w-5 h-5 object-contain" />
                  ) : (
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Email Marketing</div>
                    <div className="text-[10px] text-slate-400">{emailCampaigns.length} Active Campaigns</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>

              <div
                onClick={() => navigate('sms', 'overview')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {smsIcon ? (
                    <img src={smsIcon} alt="SMS icon" className="w-5 h-5 object-contain" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">SMS Marketing</div>
                    <div className="text-[10px] text-slate-400">{smsCampaigns.length} Broadcasts Sent</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>

              <div
                onClick={() => navigate('surveys', 'overview')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {surveyIcon ? (
                    <img src={surveyIcon} alt="Surveys icon" className="w-5 h-5 object-contain" />
                  ) : (
                    <ClipboardList className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Surveys & Forms</div>
                    <div className="text-[10px] text-slate-400">{surveys.length} Active Surveys</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>

              <div
                onClick={() => navigate('social', 'overview')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {socialIcon ? (
                    <img src={socialIcon} alt="Social icon" className="w-5 h-5 object-contain" />
                  ) : (
                    <Share2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Social Marketing</div>
                    <div className="text-[10px] text-slate-400">{socialPosts.length} Scheduled Posts</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


