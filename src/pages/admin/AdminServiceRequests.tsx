import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Check,
  X,
  Mail,
  User,
  Calendar,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NEXTAURA_SERVICES } from '../../data/appRegistry';
import { entitlementService } from '../../services/entitlementService';
import type { ServiceRequest } from '../../services/entitlementService';
import { emailService } from '../../services/emailService';

export const AdminServiceRequests: React.FC = () => {
  const { user, addAuditLog, refreshServices } = useApp();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partially_approved' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [rejectionModalItemKey, setRejectionModalItemKey] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadAllRequests = async () => {
    try {
      const data = await entitlementService.getAllServiceRequests();
      setRequests(data);
      if (data.length > 0 && !selectedRequest) {
        setSelectedRequest(data[0]);
      }
    } catch (err) {
      console.error('Error fetching admin requests:', err);
    }
  };

  useEffect(() => {
    loadAllRequests();
  }, []);

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.userEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved' || r.status === 'partially_approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;
  const totalCount = requests.length;

  const handleApproveServiceItem = async (req: ServiceRequest, serviceKey: string) => {
    try {
      await entitlementService.updateServiceItemStatus(
        req.id,
        req.organizationId,
        serviceKey,
        'approved',
        user.id
      );

      const serviceDef = NEXTAURA_SERVICES.find((s) => s.key === serviceKey);
      addAuditLog(
        'APPROVE_SERVICE',
        'Entitlements',
        `Approved ${serviceDef?.name || serviceKey} for organization ${req.companyName}`
      );

      // Send approval notification email
      await emailService.notifyCustomerApproval({
        customerEmail: req.userEmail,
        customerName: req.userName,
        companyName: req.companyName,
        approvedServices: [serviceDef?.name || serviceKey],
      });

      if (refreshServices) refreshServices();
      await loadAllRequests();
    } catch (err) {
      console.error('Error approving service:', err);
    }
  };

  const handleRejectServiceItem = async (req: ServiceRequest, serviceKey: string) => {
    try {
      await entitlementService.updateServiceItemStatus(
        req.id,
        req.organizationId,
        serviceKey,
        'rejected',
        user.id,
        rejectionReason || 'Contact sales for module activation requirements.'
      );

      const serviceDef = NEXTAURA_SERVICES.find((s) => s.key === serviceKey);
      addAuditLog(
        'REJECT_SERVICE',
        'Entitlements',
        `Rejected ${serviceDef?.name || serviceKey} for organization ${req.companyName}`
      );

      // Send rejection notification email
      await emailService.notifyCustomerRejection({
        customerEmail: req.userEmail,
        customerName: req.userName,
        companyName: req.companyName,
        rejectedServices: [serviceDef?.name || serviceKey],
        reason: rejectionReason || 'Contact sales for module activation requirements.',
      });

      setRejectionModalItemKey(null);
      setRejectionReason('');
      await loadAllRequests();
    } catch (err) {
      console.error('Error rejecting service:', err);
    }
  };

  const handleApproveAll = async (req: ServiceRequest) => {
    for (const item of req.items) {
      if (item.status === 'pending') {
        await handleApproveServiceItem(req, item.serviceKey);
      }
    }
  };

  const handleRejectAll = async (req: ServiceRequest) => {
    for (const item of req.items) {
      if (item.status === 'pending') {
        await entitlementService.updateServiceItemStatus(
          req.id,
          req.organizationId,
          item.serviceKey,
          'rejected',
          user.id,
          'Application request declined by NextAura Administrator.'
        );
      }
    }
    await loadAllRequests();
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            NextAura Platform Administration
          </div>
          <h1 className="text-2xl font-black text-slate-100 font-heading mt-1">Service Access Requests</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review customer organization application requests, grant entitlements, and enforce tenant access rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllRequests}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            title="Refresh Requests"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Pending Review', count: pendingCount, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { title: 'Approved', count: approvedCount, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { title: 'Rejected', count: rejectedCount, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { title: 'Total Requests', count: totalCount, icon: Layers, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase">{stat.title}</div>
                <div className="text-2xl font-black text-slate-100 font-heading mt-1">{stat.count}</div>
              </div>
              <div className={`w-11 h-11 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, user name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'pending', label: 'Pending' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === f.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TWO-COLUMN SPLIT PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* REQUESTS TABLE LIST (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-500">
                  <th className="pb-3 text-start font-bold">Company / User</th>
                  <th className="pb-3 text-start font-bold">Services Requested</th>
                  <th className="pb-3 text-start font-bold">Date</th>
                  <th className="pb-3 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRequests.map((req) => {
                  const isSelected = selectedRequest?.id === req.id;
                  return (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-cyan-500/10' : 'hover:bg-slate-950/40'
                      }`}
                    >
                      <td className="py-3.5 pr-3">
                        <div className="font-bold text-slate-100">{req.companyName}</div>
                        <div className="text-[11px] text-slate-400">{req.userName} ({req.userEmail})</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {req.items.slice(0, 3).map((itm) => (
                            <span key={itm.id} className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-cyan-300 font-mono">
                              {itm.serviceKey}
                            </span>
                          ))}
                          {req.items.length > 3 && (
                            <span className="text-[10px] text-slate-500 font-mono">+{req.items.length - 3} more</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 pl-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase font-mono ${
                            req.status === 'approved' || req.status === 'partially_approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : req.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* REQUEST DETAIL INSPECTOR PANEL (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 space-y-6 flex flex-col justify-between">
          {selectedRequest ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Request Inspector</div>
                  <h3 className="text-lg font-bold text-slate-100 font-heading mt-0.5">{selectedRequest.companyName}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveAll(selectedRequest)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-all"
                  >
                    Approve All
                  </button>
                  <button
                    onClick={() => handleRejectAll(selectedRequest)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/30 transition-all"
                  >
                    Reject All
                  </button>
                </div>
              </div>

              {/* Company & User Details */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-slate-500" /> Requested By:</span>
                  <span className="font-bold text-slate-100">{selectedRequest.userName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-500" /> User Email:</span>
                  <span className="text-cyan-400">{selectedRequest.userEmail}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-500" /> Submitted Date:</span>
                  <span className="font-mono">{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Individual Requested Services List */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300">Requested Applications ({selectedRequest.items.length})</div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {selectedRequest.items.map((item) => {
                    const serviceDef = NEXTAURA_SERVICES.find((s) => s.key === item.serviceKey);
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-100">{serviceDef?.name || item.serviceKey}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{serviceDef?.description}</div>
                        </div>

                        {/* Action buttons per service */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.status === 'approved' ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                              ✓ Approved
                            </span>
                          ) : item.status === 'rejected' ? (
                            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono font-bold">
                              ✕ Rejected
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApproveServiceItem(selectedRequest, item.serviceKey)}
                                className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors"
                                title="Approve Service"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRejectionModalItemKey(item.serviceKey)}
                                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-colors"
                                title="Reject Service"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">Select a request to view details</div>
          )}
        </div>
      </div>

      {/* REJECTION REASON MODAL */}
      {rejectionModalItemKey && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 font-heading">Reject Service Access</h3>
            <p className="text-xs text-slate-400">
              Provide a polite reason for declining access to <strong>{rejectionModalItemKey}</strong> for {selectedRequest.companyName}.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Please contact sales for Enterprise Payroll activation."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectionModalItemKey(null)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRejectServiceItem(selectedRequest, rejectionModalItemKey)}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-extrabold text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
