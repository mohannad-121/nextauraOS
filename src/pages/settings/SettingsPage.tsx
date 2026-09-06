import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { initialTeam } from '../../data/mockData';

export const SettingsPage: React.FC = () => {
  const { currentOrg, auditLogs } = useApp();
  const [activeTab, setActiveTab] = useState<'company' | 'team' | 'integrations' | 'audit'>('company');

  const integrations = [
    { name: 'Stripe Merchant Gateway', category: 'Payments', status: 'Connected', icon: '💳' },
    { name: 'Silicon Valley Bank Sync', category: 'Banking', status: 'Connected', icon: '🏦' },
    { name: 'QuickBooks Sync', category: 'Accounting', status: 'Available', icon: '📊' },
    { name: 'Slack Notifications', category: 'Communication', status: 'Connected', icon: '💬' },
    { name: 'AWS Cloud Emissions API', category: 'ESG', status: 'Connected', icon: '☁️' },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="NextAura Settings & Governance"
        subtitle="Manage NextAura workspace settings, team RBAC roles, integrations, and enterprise audit logs."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-800 pb-3 overflow-x-auto">
        {[
          { id: 'company', label: 'Company Profile' },
          { id: 'team', label: 'Team & RBAC Roles' },
          { id: 'integrations', label: 'Integrations Hub' },
          { id: 'audit', label: 'Enterprise Audit Log' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'company' && (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Workspace Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Organization Name</label>
              <input type="text" defaultValue={currentOrg.name} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Legal Name</label>
              <input type="text" defaultValue={currentOrg.legalName} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Tax ID / VAT</label>
              <input type="text" defaultValue={currentOrg.taxId} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Base Currency</label>
              <input type="text" defaultValue={currentOrg.baseCurrency} readOnly className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-bold" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Team Members & Permissions</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {initialTeam.map((member) => (
              <div key={member.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={member.avatar} name={member.name} className="w-8 h-8 rounded-xl text-xs" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{member.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{member.email}</div>
                  </div>
                </div>
                <StatusBadge status={member.role} variant="info" />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {integrations.map((item) => (
            <div key={item.name} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{item.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.category}</div>
                </div>
              </div>
              <StatusBadge
                status={item.status}
                variant={item.status === 'Connected' ? 'success' : 'neutral'}
              />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-semibold text-xs text-slate-900 dark:text-slate-100">
            Enterprise Audit Trail Log
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between font-mono">
                <div>
                  <div className="font-semibold text-indigo-600 dark:text-indigo-400">{log.action}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">{log.details}</div>
                </div>
                <div className="text-end text-[10px] text-slate-500">
                  <div>{log.userName}</div>
                  <div>{log.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
