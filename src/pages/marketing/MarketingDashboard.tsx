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
          value={totalReach.toLocaleString()}
          change={0}
          comparisonText="active contacts"
          icon={Users}
          accentColor="rose"
          onClick={() => navigate('email', 'overview')}
        />
        <StatCard
          title="Email Open Rate"
          value={avgEmailOpenRate}
          change={0}
          comparisonText="campaign average"
          icon={Mail}
          accentColor="cyan"
          onClick={() => navigate('email', 'overview')}
        />
        <StatCard
          title="SMS Delivery Rate"
          value={avgSMSDeliveryRate}
          change={0}
          comparisonText="successful delivery"
          icon={MessageSquare}
          accentColor="indigo"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 font-heading">Marketing Campaign Performance</h3>
              <p className="text-xs text-slate-400">Weekly email opens, link clicks & customer conversions</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {campaignPerfData.length > 0 ? (
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
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Building2 className="w-8 h-8 text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300">No marketing campaign activity yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">Create an email or SMS campaign to visualize engagement performance.</p>
              </div>
            )}
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
                  {emailIcon ? (
                    <img src={emailIcon} alt="Email icon" className="w-5 h-5 object-contain" />
                  ) : (
                    <Mail className="w-4 h-4 text-rose-400" />
                  )}
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
                  {smsIcon ? (
                    <img src={smsIcon} alt="SMS icon" className="w-5 h-5 object-contain" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                  )}
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
                  {surveyIcon ? (
                    <img src={surveyIcon} alt="Surveys icon" className="w-5 h-5 object-contain" />
                  ) : (
                    <ClipboardList className="w-4 h-4 text-amber-400" />
                  )}
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
                  {socialIcon ? (
                    <img src={socialIcon} alt="Social icon" className="w-5 h-5 object-contain" />
                  ) : (
                    <Share2 className="w-4 h-4 text-cyan-400" />
                  )}
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

