import React from 'react';
import {
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';

export const Topbar: React.FC = () => {
  const {
    activeApp,
    activeSubView,
    navigate,
    theme,
    toggleTheme,
    language,
    toggleLanguage,
    user,
    notifications,
    setCommandPaletteOpen,
    setNotificationDrawerOpen,
    isSidebarCollapsed,
    setSidebarCollapsed,
  } = useApp();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const appBreadcrumbs: Record<string, string> = {
    launchpad: 'Finance Launchpad',
    home: 'Executive Overview',
    invoicing: 'Invoicing',
    accounting: 'Accounting & Ledger',
    expenses: 'Expenses & Cards',
    sign: 'Sign (E-Signature)',
    equity: 'Equity & Cap Table',
    esg: 'ESG & Carbon',
    contacts: 'Contacts Directory',
    documents: 'Document Vault',
    analytics: 'Analytics Center',
    settings: 'Settings',
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between">
      {/* Left Breadcrumb & Sidebar Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
          title="Toggle Sidebar"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span
            onClick={() => navigate('launchpad')}
            className="hover:text-slate-200 cursor-pointer transition-colors"
          >
            NextAura
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-100 font-bold font-heading uppercase tracking-wide">
            {appBreadcrumbs[activeApp] || activeApp}
          </span>
          {activeSubView !== 'overview' && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-400 capitalize">{activeSubView.replace('-', ' ')}</span>
            </>
          )}
        </div>
      </div>

      {/* Center Search Bar Trigger (Cmd+K) */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="hidden md:flex items-center justify-between w-80 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/90 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all text-xs shadow-inner"
      >
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span>Search invoices, expenses, shareholders...</span>
        </div>
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
          ⌘K
        </kbd>
      </button>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Create Dropdown / Trigger */}
        <button
          onClick={() => navigate('invoicing', 'new-invoice')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Invoice</span>
        </button>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors text-xs font-bold flex items-center gap-1"
          title="Toggle Language / RTL"
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="uppercase">{language}</span>
        </button>

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Dark or Light Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setNotificationDrawerOpen(true)}
          className="relative p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-4 ring-slate-950 animate-pulse" />
          )}
        </button>

        {/* User Profile Avatar */}
        <div
          onClick={() => navigate('settings')}
          className="flex items-center gap-2.5 ps-2 border-s border-slate-800 cursor-pointer group"
        >
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-xl object-cover ring-2 ring-cyan-500/30 group-hover:ring-cyan-400 transition-all"
          />
          <div className="hidden lg:block text-start">
            <div className="text-xs font-bold text-slate-200 group-hover:text-slate-100 transition-colors">
              {user.name}
            </div>
            <div className="text-[10px] text-slate-400">{user.role}</div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={async () => {
            await authService.signOut();
          }}
          className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors flex items-center gap-1.5 text-xs font-bold"
          title="Sign Out of NextAura"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </header>
  );
};
