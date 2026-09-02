import React, { useState } from 'react';
import { Plus, Heart, MessageCircle, Repeat } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';

export const SocialMarketingApp: React.FC = () => {
  const { socialAccounts, socialPosts, createSocialPost } = useApp();
  const [isModalOpen, setModalOpen] = useState(false);

  const [content, setContent] = useState('Supercharged to announce NextAura! Built for fast-growing enterprises managing Finance, HR & Marketing in one system. Check it out: https://nextaura.ai');
  const [scheduledFor, setScheduledFor] = useState('2026-09-10 14:00');

  const handleCreate = () => {
    if (!content) return;
    createSocialPost({
      content,
      platforms: ['LinkedIn', 'Twitter'],
      scheduledFor,
      engagement: { likes: 0, comments: 0, shares: 0, clicks: 0 },
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Social Media Marketing & Content Scheduler"
        subtitle="Schedule posts across LinkedIn, Twitter/X, Instagram & Facebook from a unified content calendar."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Compose Social Post
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Connected Channels" value={socialAccounts.length} comparisonText="LinkedIn, Twitter, IG" accentColor="cyan" />
        <StatCard title="Posts Scheduled" value={socialPosts.length} change={12.0} accentColor="indigo" />
        <StatCard title="Total Social Reach" value="48.2K" comparisonText="followers across channels" accentColor="emerald" />
        <StatCard title="Avg Engagement Rate" value="6.4%" change={1.1} accentColor="amber" />
      </div>

      {/* Connected Accounts */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 font-heading">Connected Social Media Accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {socialAccounts.map((acc) => (
            <div key={acc.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-100">{acc.platform}</div>
                <div className="text-[10px] text-cyan-400 font-mono">{acc.handle || acc.accountName}</div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                {(acc.followersCount || 10000).toLocaleString()} Fans
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Posts Calendar Feed */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-100 font-heading">Scheduled Social Content Feed</h3>

        <div className="space-y-4">
          {socialPosts.map((post) => (
            <div key={post.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  {post.platforms.map((p) => (
                    <span key={p} className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold">
                      {p}
                    </span>
                  ))}
                  <span className="text-xs text-slate-400">• Scheduled for {post.scheduledFor || 'Upcoming'}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                  {post.status}
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-sans">{post.content}</p>

              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-400" /> {post.engagement.likes} Likes</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 text-cyan-400" /> {post.engagement.comments} Comments</span>
                <span className="flex items-center gap-1"><Repeat className="w-3.5 h-3.5 text-indigo-400" /> {post.engagement.shares} Reposts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          title="Compose Multi-Channel Social Post"
          subtitle="Publish content across connected social channels simultaneously."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 mb-1">Post Copy & Hashtags</label>
              <textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Schedule Date & Time</label>
              <input type="text" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20">Schedule Post</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
