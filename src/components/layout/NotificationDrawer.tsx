import React from 'react';
import { X, Bell, ExternalLink, LoaderCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NotificationDrawer: React.FC = () => {
  const {
    isNotificationDrawerOpen,
    setNotificationDrawerOpen,
    notifications,
    notificationsLoading,
    notificationsError,
    refreshNotifications,
    markNotificationRead,
    markNotificationsRead,
    navigate,
  } = useApp();

  if (!isNotificationDrawerOpen) return null;

  const handleNotificationClick = async (id: string, linkApp: string, isRead: boolean) => {
    if (!isRead) {
      try {
        await markNotificationRead(id);
      } catch {
        return;
      }
    }
    navigate(linkApp as any);
    setNotificationDrawerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/25 backdrop-blur-[2px] dark:bg-slate-950/60">
      <div className="absolute inset-0" onClick={() => setNotificationDrawerOpen(false)} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <aside aria-label="Notifications" className="w-screen max-w-md bg-white dark:bg-slate-900 border-s border-slate-200 dark:border-slate-800 shadow-[0_0_50px_rgba(26,35,30,.15)] flex flex-col justify-between p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">Notifications</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { void markNotificationsRead(); }}
                  disabled={notificationsLoading || !notifications.some((item) => !item.read)}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-300"
                >
                  Mark all read
                </button>
                <button
                  onClick={() => setNotificationDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close notifications"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-160px)] overflow-y-auto pr-1" aria-busy={notificationsLoading}>
              {notificationsLoading && (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading notifications…
                </div>
              )}
              {!notificationsLoading && notificationsError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" role="alert">
                  <p>{notificationsError}</p>
                  <button onClick={() => { void refreshNotifications(); }} className="mt-2 font-semibold underline underline-offset-2">
                    Retry
                  </button>
                </div>
              )}
              {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No notifications yet
                </div>
              )}
              {!notificationsLoading && notifications.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => { void handleNotificationClick(item.id, item.linkApp, item.read); }}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    item.read
                      ? 'bg-slate-50/60 border-slate-200/70 text-slate-500 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-slate-400'
                      : 'bg-white border-blue-200 text-slate-700 shadow-sm dark:bg-slate-950 dark:border-blue-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{item.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{item.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.message}</p>
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                    {item.type === 'automation' ? 'Automation' : `Open ${item.linkApp}`}
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
