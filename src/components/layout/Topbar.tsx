import React, { useEffect, useRef, useState } from 'react';
import { Avatar } from '../common/Avatar';
import {
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  PanelLeftClose,
  LogOut,
  Settings,
  ChevronDown,
  Building2,
  Check,
  Lock,
  Loader2,
  LayoutGrid,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';
import { useCompanyCreationAccess } from './useCompanyCreationAccess';

export const Topbar: React.FC = () => {
  const {
    navigate,
    theme,
    toggleTheme,
    language,
    toggleLanguage,
    user,
    notificationUnreadCount,
    setCommandPaletteOpen,
    setNotificationDrawerOpen,
    isSidebarCollapsed,
    setSidebarCollapsed,
    organizations,
    currentOrg,
    switchOrg,
    setCompanyCreationOpen,
  } = useApp();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const companyMenuRef = useRef<HTMLDivElement>(null);
  const unreadCount = notificationUnreadCount;
  const companyCreationAccess = useCompanyCreationAccess();

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
      if (companyMenuRef.current && !companyMenuRef.current.contains(event.target as Node)) setCompanyMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setCompanyMenuOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  const selectCompany = async (organizationId: string) => {
    if (organizationId === currentOrg.id || switchingOrgId) return;
    setSwitchingOrgId(organizationId);
    try { await switchOrg(organizationId); setCompanyMenuOpen(false); }
    catch (error: any) { console.error('Could not switch company.', error); }
    finally { setSwitchingOrgId(null); }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#1F243D] bg-[#090B1A]/95 px-3 backdrop-blur-xl sm:px-5 lg:px-6">
      {/* Left: Sidebar toggle + Search */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#A3ABC5] transition-colors hover:bg-[#161B30] hover:text-[#F4F6FF]"
          aria-label={isSidebarCollapsed ? 'Open navigation' : 'Close navigation'}
          aria-expanded={!isSidebarCollapsed}
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>

        {/* Global Search Input matching reference */}
        <div
          onClick={() => setCommandPaletteOpen(true)}
          className="relative hidden sm:flex items-center w-60 lg:w-72 h-9 px-3 rounded-lg bg-[#101426] border border-[#1F253D] text-xs text-[#6B7694] cursor-pointer hover:border-[#2D3555] transition-all group"
        >
          <Search className="h-3.5 w-3.5 text-[#6B7694] group-hover:text-[#A3ABC5] me-2 shrink-0 transition-colors" />
          <span className="truncate">Search...</span>
          <kbd className="ms-auto rounded bg-[#161B30] px-1.5 py-0.5 text-[10px] font-mono text-[#6B7694] border border-[#1F253D]">⌘K</kbd>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Company Switcher */}
        <div className="relative hidden md:block" ref={companyMenuRef}>
          <button
            type="button"
            onClick={() => setCompanyMenuOpen((open) => !open)}
            aria-label={`Switch company, currently ${currentOrg.name}`}
            aria-expanded={companyMenuOpen}
            className="flex h-9 max-w-52 items-center gap-2 rounded-lg border border-[#1F253D] bg-[#121628] px-2.5 text-xs font-medium text-[#F4F6FF] shadow-xs transition-colors hover:border-[#2D3555] hover:bg-[#161B30]"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#262356] text-[#7568E8]">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="truncate text-xs">{currentOrg.name}</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-[#6B7694]" aria-hidden="true" />
          </button>
          {companyMenuOpen && (
            <div className="absolute end-0 top-full z-[60] mt-2 w-72 rounded-xl border border-[#1F253D] bg-[#161B30] p-2 shadow-2xl">
              <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B7694]">Companies</p>
              {organizations.map((org) => {
                const unavailable = org.lifecycleStatus && org.lifecycleStatus !== 'active';
                const active = currentOrg.id === org.id;
                return (
                  <button
                    key={org.id}
                    type="button"
                    disabled={Boolean(unavailable || switchingOrgId)}
                    onClick={() => void selectCompany(org.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start text-xs ${
                      unavailable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#1E243E]'
                    } ${active ? 'bg-[#262356] text-[#7568E8] font-semibold' : 'text-[#A3ABC5]'}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{org.name}</span>
                    </span>
                    {switchingOrgId === org.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : unavailable ? (
                      <span className="flex items-center gap-1 text-[10px]"><Lock className="h-3 w-3" />Locked</span>
                    ) : active ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : null}
                  </button>
                );
              })}
              {companyCreationAccess !== 'none' && (
                <div className="mt-1 border-t border-[#1F253D] pt-1">
                  <button
                    type="button"
                    disabled={companyCreationAccess === 'loading'}
                    onClick={() => {
                      if (companyCreationAccess === 'upgrade') navigate('pricing');
                      else setCompanyCreationOpen(true);
                      setCompanyMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#7568E8] hover:bg-[#262356]/50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {companyCreationAccess === 'upgrade' ? 'Upgrade for more companies' : 'Add company'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Launchpad Icon */}
        <button
          type="button"
          onClick={() => navigate('launchpad')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#A3ABC5] hover:bg-[#161B30] hover:text-[#F4F6FF] transition-colors"
          aria-label="Apps Launchpad"
          title="Apps Launchpad"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => setNotificationDrawerOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#A3ABC5] hover:bg-[#161B30] hover:text-[#F4F6FF] transition-colors"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#F59E0B] ring-2 ring-[#090B1A]" />
          )}
        </button>

        {/* Language / Region Selector matching reference flag */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[#A3ABC5] hover:bg-[#161B30] hover:text-[#F4F6FF] transition-colors"
          aria-label="Change language"
          title={`Language: ${language.toUpperCase()}`}
        >
          <span className="text-sm select-none" role="img" aria-label="Region">🇺🇸</span>
          <span className="text-[11px] font-semibold text-[#A3ABC5] uppercase hidden sm:inline">{language}</span>
        </button>

        {/* Theme Toggle Pill matching the reference screenshot's purple toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
          className={`relative flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
            theme === 'dark' ? 'bg-[#7568E8]' : 'bg-[#333C5E]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 flex items-center justify-center ${
              theme === 'dark' ? 'translate-x-5 text-[#7568E8]' : 'translate-x-0.5 text-[#333C5E]'
            }`}
          >
            {theme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
          </span>
        </button>

        {/* User Profile Avatar with Dropdown */}
        <div className="relative ms-1" ref={menuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((open) => !open)}
            className="flex h-9 items-center gap-2 rounded-lg p-0.5 transition-colors hover:ring-2 hover:ring-[#7568E8]/40"
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
          >
            <Avatar src={user.avatar} name={user.name} className="h-8 w-8 rounded-full border border-[#2D3555]" />
          </button>

          {userMenuOpen && (
            <div className="absolute end-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-[#1F253D] bg-[#161B30] p-2 shadow-2xl z-50">
              <div className="border-b border-[#1F253D] px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-[#F4F6FF]">{user.name}</p>
                <p className="truncate text-xs text-[#6B7694]">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigate('settings');
                  setUserMenuOpen(false);
                }}
                className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-xs font-medium text-[#A3ABC5] hover:bg-[#1E243E] hover:text-[#F4F6FF]"
              >
                <Settings className="h-4 w-4 text-[#7568E8]" />
                Settings & Profile
              </button>
              <button
                type="button"
                onClick={async () => {
                  await authService.signOut();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-xs font-medium text-rose-400 hover:bg-rose-950/30"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
