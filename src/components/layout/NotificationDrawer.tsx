import React from 'react';
import { X, Bell, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NotificationDrawer: React.FC = () => {
  const {
    isNotificationDrawerOpen,
    setNotificationDrawerOpen,
    notifications,
    markNotificationsRead,
    navigate,
  } = useApp();

  if (!isNotificationDrawerOpen) return null;

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
                  onClick={() => markNotificationsRead()}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300"
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

            <div className="space-y-3 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    navigate(item.linkApp as any);
                    setNotificationDrawerOpen(false);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
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
                    Open {item.linkApp}
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
