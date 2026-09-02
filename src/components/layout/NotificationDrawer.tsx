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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={() => setNotificationDrawerOpen(false)} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-slate-100 font-heading">Notifications & Feed</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => markNotificationsRead()}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  Mark all read
                </button>
                <button
                  onClick={() => setNotificationDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
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
                      ? 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                      : 'bg-slate-950 border-cyan-500/30 text-slate-200 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-100">{item.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{item.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.message}</p>
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-cyan-400">
                    Open {item.linkApp}
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
