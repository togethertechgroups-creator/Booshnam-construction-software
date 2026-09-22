import React, { useState } from 'react';
import { 
  CheckSquare, Check, X, Shield, Clock, 
  AlertCircle, DollarSign, FileText, CheckCircle2
} from 'lucide-react';
import { ApprovalRequest, Role } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';

interface ApprovalsViewProps {
  approvals: ApprovalRequest[];
  activeRole: Role;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({ 
  approvals: initialApprovals, 
  activeRole,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [approvalList, setApprovalList] = useState<ApprovalRequest[]>(initialApprovals);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [comment, setComment] = useState('');

  const handleAction = (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setApprovalList(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    setSelectedRequest(null);
    setComment('');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Edge-to-edge Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand text-white text-[10px] font-bold rounded">
                GOVERNANCE
              </span>
              <h1 className="text-xl font-bold text-slate-900">Approvals Central & Threshold Routing</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Value-based multi-tiered approval engine across Procurement, Budgets, and Change Orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-medium">
            <Shield className="w-4 h-4 text-brand" />
            <span>Active Role: <strong>{activeRole.name}</strong></span>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <UserProfileDropdown showBell={true} />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Threshold Policies Card */}
        <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Configured Approval Threshold Matrix
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-slate-400 text-[10px] uppercase font-bold">Tier 1: Site Supervisor</div>
            <div className="font-bold text-slate-800 text-sm mt-0.5">Up to ₹25,000</div>
            <div className="text-[11px] text-slate-500 mt-1">Minor site materials & daily emergency petty cash</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-slate-400 text-[10px] uppercase font-bold">Tier 2: Project Manager (PM)</div>
            <div className="font-bold text-slate-800 text-sm mt-0.5">Up to ₹5,00,000</div>
            <div className="text-[11px] text-slate-500 mt-1">Routine material purchase orders & subcontracts</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-slate-400 text-[10px] uppercase font-bold">Tier 3: Owner / Director</div>
            <div className="font-bold text-brand text-sm mt-0.5">&gt; ₹5,00,000 to ₹5 Cr</div>
            <div className="text-[11px] text-slate-500 mt-1">Bulk steel, concrete orders, and budget variation orders</div>
          </div>
        </div>
      </div>

      {/* Pending Approvals Queue */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm">Action Items Queue</h3>
          <span className="text-xs text-slate-500">{approvalList.filter(a => a.status === 'PENDING').length} Pending Requests</span>
        </div>

        <div className="divide-y divide-slate-100">
          {approvalList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No pending approval requests requiring authorization.
            </div>
          ) : (
            approvalList.map((req) => (
              <div key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {req.module}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900">{req.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 font-medium pt-1">
                    <span>Requested by: <strong className="text-slate-700">{req.requester_name}</strong></span>
                    <span>•</span>
                    <span>Date: <strong className="text-slate-700">{req.created_at}</strong></span>
                    <span>•</span>
                    <span>Tier Required: <strong className="text-brand">{req.approver_role_name || 'Approver'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Order Amount</div>
                    <div className="text-base font-bold font-mono text-slate-900">
                      ₹{req.amount.toLocaleString()}
                    </div>
                  </div>

                  {req.status === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => handleAction(req.id, 'APPROVED')}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleAction(req.id, 'REJECTED')}
                        className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Decision Logged
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
