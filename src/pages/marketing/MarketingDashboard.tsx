import React from 'react';
import { Mail, MessageSquare, ClipboardList, Share2, Send, ArrowRight, CalendarClock, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { SectionHeader, Surface } from '../../components/common/WorkspacePrimitives';
import { StatusBadge } from '../../components/common/StatusBadge';

export const MarketingDashboard: React.FC = () => {
  const { navigate, emailCampaigns, smsCampaigns, surveys, socialPosts, contacts } = useApp();
  const scheduledEmails = emailCampaigns.filter((item) => item.status === 'Scheduled');
  const scheduledSms = smsCampaigns.filter((item) => item.status === 'Scheduled');
  const scheduledSocial = socialPosts.filter((item) => item.status === 'Scheduled');
  const upcoming = [
    ...scheduledEmails.map((item) => ({ id: `email-${item.id}`, title: item.name, type: 'Email', detail: `${item.recipientCount || 0} recipients`, onClick: () => navigate('email') })),
    ...scheduledSms.map((item) => ({ id: `sms-${item.id}`, title: item.name, type: 'SMS', detail: `${item.recipientCount || 0} recipients`, onClick: () => navigate('sms') })),
    ...scheduledSocial.map((item) => ({ id: `social-${item.id}`, title: item.content || 'Scheduled social post', type: 'Social', detail: item.scheduledFor || 'Scheduled', onClick: () => navigate('social') })),
  ];

  const channels = [
    { title: 'Email campaigns', detail: `${emailCampaigns.length} campaign${emailCampaigns.length === 1 ? '' : 's'}`, icon: Mail, onClick: () => navigate('email') },
    { title: 'SMS broadcasts', detail: `${smsCampaigns.length} broadcast${smsCampaigns.length === 1 ? '' : 's'}`, icon: MessageSquare, onClick: () => navigate('sms') },
    { title: 'Surveys & feedback', detail: `${surveys.length} survey${surveys.length === 1 ? '' : 's'}`, icon: ClipboardList, onClick: () => navigate('surveys') },
    { title: 'Social calendar', detail: `${socialPosts.length} post${socialPosts.length === 1 ? '' : 's'}`, icon: Share2, onClick: () => navigate('social') },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 pb-12">
      <PageHeader
        category="Marketing"
        title="Campaign workspace"
        subtitle="Plan the next customer touchpoint with a guided workflow for email, SMS, surveys, and social content."
        actions={<Button icon={<Send className="h-4 w-4" />} onClick={() => navigate('email', 'new')}>New campaign</Button>}
      />

      <section className="space-y-4">
        <SectionHeader title="Choose a channel" description="Each workspace keeps creation, review, and results together." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map(({ title, detail, icon: Icon, onClick }) => (
            <button key={title} type="button" onClick={onClick} className="group flex min-h-[136px] flex-col rounded-2xl border border-slate-200/80 bg-white p-5 text-start transition-all hover:-translate-y-px hover:border-slate-300 hover:shadow-sm dark:border-[#1F253D] dark:bg-[#161B30] dark:hover:border-[#2D3555] cursor-pointer">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-[#101426] dark:text-[#A499FA] border border-indigo-200/50 dark:border-[#7568E8]/30"><Icon className="h-[18px] w-[18px]" /></span>
              <span className="mt-4 flex w-full items-center justify-between gap-2 text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">{title}<ArrowRight className="h-4 w-4 text-slate-300 dark:text-[#6B7694] transition-transform group-hover:translate-x-0.5 group-hover:text-[#7568E8]" /></span>
              <span className="mt-1 text-xs text-slate-500 dark:text-[#A3ABC5]">{detail}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.75fr)]">
        <section className="space-y-4">
          <SectionHeader title="Scheduled next" description="Upcoming customer communications across channels." icon={CalendarClock} />
          <Surface padding="none" className="overflow-hidden">
            {upcoming.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-[#1F253D]">
                {upcoming.slice(0, 7).map((item) => (
                  <button key={item.id} type="button" onClick={item.onClick} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start transition-colors hover:bg-slate-50 dark:hover:bg-[#1A2035] sm:px-6 cursor-pointer">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-[#F4F6FF]">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-[#A3ABC5]">{item.detail}</span>
                    </span>
                    <StatusBadge status={item.type} variant="neutral" size="sm" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <CalendarClock className="mx-auto h-6 w-6 text-slate-400 dark:text-[#747E9B]" />
                <p className="mt-3 text-sm font-medium text-slate-900 dark:text-[#F4F6FF]">Nothing scheduled yet</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-[#A3ABC5]">Create a campaign or schedule a social post to build your communication plan.</p>
                <Button className="mt-5" onClick={() => navigate('email', 'new')}>Create campaign</Button>
              </div>
            )}
          </Surface>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Audience" description="Real contacts available to your campaigns." icon={Users} />
          <Surface>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-[#F4F6FF] tabular-nums font-heading">{contacts.length.toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#A3ABC5]">contact{contacts.length === 1 ? '' : 's'} in this workspace</p>
            <div className="mt-6 border-t border-slate-100 dark:border-[#1F253D] pt-4">
              <button type="button" onClick={() => navigate('contacts')} className="flex items-center gap-1.5 text-xs font-semibold text-[#7568E8] dark:text-[#A499FA] hover:text-[#867AF0] cursor-pointer">Open contacts <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
          </Surface>
        </section>
      </div>
    </div>
  );
};
