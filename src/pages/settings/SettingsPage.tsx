import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
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
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'company', label: 'Company Profile' },
          { id: 'team', label: 'Team & RBAC Roles' },
          { id: 'integrations', label: 'Integrations Hub' },
          { id: 'audit', label: 'Enterprise Audit Log' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'company' && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <h3 className="text-base font-bold text-slate-100 font-heading">Workspace Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Organization Name</label>
              <input type="text" defaultValue={currentOrg.name} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Legal Name</label>
              <input type="text" defaultValue={currentOrg.legalName} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Tax ID / VAT</label>
              <input type="text" defaultValue={currentOrg.taxId} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Base Currency</label>
              <input type="text" defaultValue={currentOrg.baseCurrency} readOnly className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 font-bold" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <h3 className="text-base font-bold text-slate-100 font-heading">Team Members & Permissions</h3>
          <div className="divide-y divide-slate-800 text-xs">
            {initialTeam.map((member) => (
              <div key={member.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={member.avatar} alt="" className="w-8 h-8 rounded-xl object-cover" />
                  <div>
                    <div className="font-bold text-slate-100">{member.name}</div>
                    <div className="text-[10px] text-slate-400">{member.email}</div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {integrations.map((item) => (
            <div key={item.name} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="font-bold text-slate-100 text-xs">{item.name}</div>
                  <div className="text-[10px] text-slate-400">{item.category}</div>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                item.status === 'Connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-100">
            Enterprise Audit Trail Log
          </div>
          <div className="divide-y divide-slate-800 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between font-mono">
                <div>
                  <div className="font-bold text-cyan-400">{log.action}</div>
                  <div className="text-[10px] text-slate-400 font-sans">{log.details}</div>
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
