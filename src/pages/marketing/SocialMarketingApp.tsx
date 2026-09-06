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
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Compose Social Post
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <span className="font-medium text-slate-500">Social workspace</span>
        <span><span className="text-slate-500">Connected channels</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{socialAccounts.length}</strong></span>
        <span><span className="text-slate-500">Scheduled posts</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{scheduledPosts}</strong></span>
        <span><span className="text-slate-500">Recorded followers</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{totalFollowers.toLocaleString()}</strong></span>
      </div>

      {/* Connected Accounts */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">Connected Social Media Accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {socialAccounts.map((acc) => (
            <div key={acc.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{acc.platform}</div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">{acc.handle || acc.accountName}</div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                {(acc.followersCount || 0).toLocaleString()} followers
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Posts Calendar Feed */}
      <div className="space-y-3.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">Scheduled Social Content Feed</h3>

        <div className="space-y-3.5">
          {socialPosts.map((post) => (
            <div key={post.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  {post.platforms.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 text-[10px] font-semibold">
                      {p}
                    </span>
                  ))}
                  <span className="text-xs text-slate-400">• Scheduled for {post.scheduledFor || 'Upcoming'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
                  {post.status}
                </span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{post.content}</p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-500" /> {post.engagement.likes} Likes</span>
                <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-blue-500" /> {post.engagement.comments} Comments</span>
                <span className="flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5 text-indigo-500" /> {post.engagement.shares} Reposts</span>
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
          <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Post Copy & Hashtags</label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Schedule Date & Time</label>
              <input
                type="text"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs transition-colors"
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
