import React, { useState } from 'react';
import { Plus, Heart, MessageCircle, Repeat } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';

export const SocialMarketingApp: React.FC = () => {
  const { activeSubView, socialAccounts, socialPosts, createSocialPost } = useApp();
  const [isModalOpen, setModalOpen] = useState(false);

  React.useEffect(() => {
    if (activeSubView === 'new') {
      setModalOpen(true);
    }
  }, [activeSubView]);

  const [content, setContent] = useState('Supercharged to announce NextAura! Built for fast-growing enterprises managing Finance, HR & Marketing in one system. Check it out: https://nextaura.ai');
  const [scheduledFor, setScheduledFor] = useState('2026-09-10 14:00');
  const scheduledPosts = socialPosts.filter((item) => item.status === 'Scheduled').length;
  const totalFollowers = socialAccounts.reduce((total, item) => total + (item.followersCount || 0), 0);

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
    <div className="space-y-6">
      <PageHeader
        category="Marketing"
        title="Social content"
        subtitle="Compose and schedule posts across your connected channels."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Compose Social Post
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white dark:bg-[#161B30] dark:border-[#1F253D] px-5 py-4 text-xs shadow-sm sm:px-6">
        <span className="font-semibold text-slate-700 dark:text-[#A3ABC5]">Social workspace</span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Connected channels</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{socialAccounts.length}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Scheduled posts</span> <strong className="ms-1 font-semibold text-[#178CFF] dark:text-[#178CFF]">{scheduledPosts}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Recorded followers</span> <strong className="ms-1 font-semibold text-emerald-600 dark:text-[#23C99C]">{totalFollowers.toLocaleString()}</strong></span>
      </div>

      {/* Connected Accounts */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6FF] font-heading">Connected Social Media Accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {socialAccounts.map((acc) => (
            <div key={acc.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/60 dark:border-[#1F253D] flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{acc.platform}</div>
                <div className="text-[11px] text-[#7568E8] dark:text-[#867AF0] font-mono">{acc.handle || acc.accountName}</div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#161B30] border border-slate-200 dark:border-[#2A3048] text-slate-700 dark:text-[#A3ABC5] text-[10px] font-semibold">
                {(acc.followersCount || 0).toLocaleString()} followers
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Posts Calendar Feed */}
      <div className="space-y-3.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6FF] font-heading">Scheduled Social Content Feed</h3>

        <div className="space-y-3.5">
          {socialPosts.map((post) => (
            <div key={post.id} className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-[#2A3048] transition-all">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-[#1F253D] pb-3">
                <div className="flex items-center gap-2">
                  {post.platforms.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded-full bg-[#7568E8]/10 text-[#7568E8] dark:text-[#867AF0] border border-[#7568E8]/20 text-[10px] font-semibold">
                      {p}
                    </span>
                  ))}
                  <span className="text-xs text-slate-400 dark:text-slate-500">• Scheduled for {post.scheduledFor || 'Upcoming'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-700 dark:text-[#A3ABC5] text-[10px] font-semibold uppercase tracking-wider">
                  {post.status}
                </span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{post.content}</p>

              <div className="pt-2 border-t border-slate-100 dark:border-[#1F253D] flex items-center gap-6 text-xs text-slate-500 dark:text-[#A3ABC5]">
                <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-500" /> {post.engagement.likes} Likes</span>
                <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-[#178CFF]" /> {post.engagement.comments} Comments</span>
                <span className="flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5 text-[#7568E8]" /> {post.engagement.shares} Reposts</span>
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
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Post Copy & Hashtags</label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Schedule Date & Time</label>
              <input
                type="text"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-[#1F253D]">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] hover:bg-slate-200 dark:hover:bg-[#1A2035] text-slate-700 dark:text-[#A3ABC5] text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] transition-all"
              >
                Schedule Post
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
