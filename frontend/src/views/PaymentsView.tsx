import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, CheckCircle2, Clock, AlertCircle, Plus, 
  Search, Filter, Download, ArrowUpRight, ArrowDownRight, 
  Receipt, Building2, User, FileText, Check, X, ShieldCheck,
  CreditCard, Wallet, Landmark, TrendingUp,
  Maximize2, Minimize2
} from 'lucide-react';
import { ProjectPaymentRequest, ProjectTransactionRecord, Project } from '../types';
import { MOCK_PAYMENT_REQUESTS, MOCK_PROJECT_TRANSACTIONS, MOCK_PROJECTS } from '../lib/mockData';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';
import { CustomSelect } from '../components/CustomSelect';
import { addNotification } from '../lib/notificationService';
import { CreatePaymentRequestDrawerFlow, PaymentRequestSubmitData } from '../components/finance/CreatePaymentRequestDrawerFlow';

interface PaymentsViewProps {
  projects?: Project[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onShowToast?: (msg: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  projects = MOCK_PROJECTS,
  isSidebarOpen,
  onToggleSidebar,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'ledger'>('requests');
  const [paymentRequests, setPaymentRequests] = useState<ProjectPaymentRequest[]>(MOCK_PAYMENT_REQUESTS);
  const [transactions, setTransactions] = useState<ProjectTransactionRecord[]>(MOCK_PROJECT_TRANSACTIONS);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [projectFilter, setProjectFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isRecordTxnModalOpen, setIsRecordTxnModalOpen] = useState(false);

  // New Request Form State
  const [reqAmount, setReqAmount] = useState('');
  const [reqVendor, setReqVendor] = useState('');
  const [reqCategory, setReqCategory] = useState<'MATERIAL' | 'LABOUR' | 'MACHINERY' | 'SUBCONTRACTOR' | 'SITE_EXPENSE'>('MATERIAL');
  const [reqPurpose, setReqPurpose] = useState('');

  // New Transaction Form State
  const [txnType, setTxnType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnCategory, setTxnCategory] = useState('Material Purchase');
  const [txnParty, setTxnParty] = useState('');
  const [txnMode, setTxnMode] = useState<'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'UPI'>('BANK_TRANSFER');
  const [txnNotes, setTxnNotes] = useState('');

  // Fullscreen State & Toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsub = addFullscreenChangeListener((fs) => { setIsFullscreen(fs); });
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => { unsub(); window.removeEventListener('keydown', handleKeyDown); };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    setIsFullscreen(prev => !prev);
    try { await toggleBrowserFullscreen(); } catch (e) {}
  };

  // Filtered Payment Requests
  const filteredRequests = useMemo(() => {
    return paymentRequests.filter(r => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (projectFilter !== 'All' && r.project_id !== projectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = (r.request_code || '').toLowerCase().includes(q);
        const matchesVendor = (r.vendor_name || '').toLowerCase().includes(q);
        const matchesDesc = (r.purpose_description || r.description || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesVendor && !matchesDesc) return false;
      }
      return true;
    });
  }, [paymentRequests, statusFilter, projectFilter, searchQuery]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (projectFilter !== 'All' && t.project_id !== projectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesParty = (t.party_name || t.paid_by_or_to || '').toLowerCase().includes(q);
        const matchesCat = (t.category || '').toLowerCase().includes(q);
        const matchesCode = (t.transaction_code || t.reference_no || '').toLowerCase().includes(q);
        if (!matchesParty && !matchesCat && !matchesCode) return false;
      }
      return true;
    });
  }, [transactions, projectFilter, searchQuery]);

  // Financial Calculations
  const totalIncome = transactions.filter(t => t.transaction_type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.transaction_type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netCashBalance = totalIncome - totalExpense;
  const pendingRequestsAmount = paymentRequests.filter(r => r.status !== 'PAID').reduce((s, r) => s + r.amount, 0);

  // Approval Pipeline Handlers
  const handleSupervisorVerify = (reqId: string) => {
    setPaymentRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: 'SUPERVISOR_VERIFIED',
          verified_by_supervisor: 'Ravi Kumar (Site Supervisor)',
          verification_date: new Date().toISOString().split('T')[0]
        };
      }
      return r;
    }));
    onShowToast?.('Payment request verified by supervisor! Forwarded to Accounts.');
  };

  const handleAccountsPay = (reqId: string) => {
    const txnRef = `NEFT-${Math.floor(100000 + Math.random() * 900000)}`;
    setPaymentRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: 'PAID',
          approved_by_accounts: 'Accounts',
          approval_date: new Date().toISOString().split('T')[0],
          payment_reference: txnRef
        };
      }
      return r;
    }));

    // Auto record in ledger
    const targetReq = paymentRequests.find(r => r.id === reqId);
    if (targetReq) {
      const newLedgerEntry: ProjectTransactionRecord = {
        id: `txn-${Date.now()}`,
        project_id: targetReq.project_id,
        type: 'EXPENSE',
        transaction_type: 'EXPENSE',
        transaction_code: `TXN-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().split('T')[0],
        transaction_date: new Date().toISOString().split('T')[0],
        category: (targetReq.category || 'Materials').replace('_', ' '),
        amount: targetReq.amount,
        payment_mode: 'BANK_TRANSFER',
        reference_no: txnRef,
        reference_number: txnRef,
        paid_by_or_to: targetReq.vendor_name || targetReq.requested_by_name || 'Vendor',
        party_name: targetReq.vendor_name || targetReq.requested_by_name || 'Vendor',
        notes: `Disbursed for ${targetReq.purpose_description || targetReq.description || ''}`
      };
      setTransactions(prev => [newLedgerEntry, ...prev]);
    }

    onShowToast?.(`Payment disbursed via ${txnRef} and recorded in Accounts Ledger!`);
  };

  // Submit New Request
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(reqAmount);
    if (!amountVal || !reqVendor.trim()) return;

    const newReq: ProjectPaymentRequest = {
      id: `pay-${Date.now()}`,
      project_id: projectFilter !== 'All' ? projectFilter : projects[0]?.id || '',
      request_code: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      requested_by: 'Site Engineer',
      requested_by_name: 'Site Engineer',
      requested_by_role: 'Site Engineer',
      request_date: new Date().toISOString().split('T')[0],
      date: new Date().toISOString().split('T')[0],
      amount: amountVal,
      category: reqCategory,
      vendor_name: reqVendor,
      purpose_description: reqPurpose || `Field procurement of ${reqCategory.toLowerCase()}`,
      description: reqPurpose || `Field procurement of ${reqCategory.toLowerCase()}`,
      status: 'PENDING_SUPERVISOR'
    };

    setPaymentRequests(prev => [newReq, ...prev]);

    // Notify Admin
    addNotification({
      title: `Payment Request: ${newReq.request_code}`,
      message: `${newReq.requested_by_name || 'Site Staff'} requested ₹${amountVal.toLocaleString('en-IN')} for "${newReq.vendor_name}" (${newReq.category}).`,
      type: 'PAYMENT_REQUEST',
      recipient: 'ADMIN',
      sender: newReq.requested_by_name || 'Site Staff',
      amount: amountVal,
      requestCode: newReq.request_code
    });

    setIsNewRequestModalOpen(false);
    setReqAmount('');
    setReqVendor('');
    setReqPurpose('');
    onShowToast?.(`Payment request ${newReq.request_code} submitted for supervisory audit!`);
  };

  // 2-Step Payment Request Flow handler
  const handleSavePaymentRequestFromFlow = (reqData: PaymentRequestSubmitData) => {
    const matchedProj = projects.find(p => p.name === reqData.projectName);
    const newReq: ProjectPaymentRequest = {
      id: `pay-${Date.now()}`,
      project_id: matchedProj?.id || (projects[0]?.id || ''),
      request_code: reqData.requestCode,
      requested_by: 'Site Engineer',
      requested_by_name: 'Site Engineer',
      requested_by_role: 'Site Engineer',
      request_date: reqData.date || new Date().toISOString().split('T')[0],
      date: reqData.date || new Date().toISOString().split('T')[0],
      amount: reqData.amount,
      category: 'MATERIAL',
      vendor_name: reqData.partyName,
      purpose_description: reqData.notes || `${reqData.category} - ${reqData.partyName}`,
      description: reqData.notes || `${reqData.category} - ${reqData.partyName}`,
      status: 'PENDING_SUPERVISOR'
    };

    setPaymentRequests(prev => [newReq, ...prev]);
    setIsNewRequestModalOpen(false);

    onShowToast?.(`Payment Request ${reqData.requestCode} submitted for supervisory audit!`);
  };

  // Submit Record Transaction
  const handleRecordTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(txnAmount);
    if (!amountVal || !txnParty.trim()) return;

    const newTxn: ProjectTransactionRecord = {
      id: `txn-${Date.now()}`,
      project_id: projectFilter !== 'All' ? projectFilter : projects[0]?.id || '',
      type: txnType,
      transaction_type: txnType,
      transaction_code: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      transaction_date: new Date().toISOString().split('T')[0],
      category: txnCategory,
      amount: amountVal,
      payment_mode: txnMode,
      reference_no: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      reference_number: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      paid_by_or_to: txnParty,
      party_name: txnParty,
      notes: txnNotes
    };

    setTransactions(prev => [newTxn, ...prev]);
    setIsRecordTxnModalOpen(false);
    setTxnAmount('');
    setTxnParty('');
    setTxnNotes('');
    onShowToast?.(`Transaction of ₹ ${amountVal.toLocaleString()} logged in ledger!`);
  };

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-white transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-white ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
    }`}>
      {/* Edge-to-edge Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[26px] font-bold text-[#262626] font-heading tracking-tight">
              Payments & Accounts Hub
            </h1>
          </div>
        </div>

        {/* Action Buttons & Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsNewRequestModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Payment Request</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRecordTxnModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Record Transaction</span>
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isFullscreen ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-red-600" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <UserProfileDropdown showBell={true} onShowToast={onShowToast} />
        </div>
      </div>

      {/* Financial KPIs Banner */}
      <div className="bg-slate-50/70 border-b border-slate-200 p-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600">
            <span>Total Inflow (Receipts)</span>
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            ₹ {totalIncome.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Client stage billing receipts</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-rose-600">
            <span>Total Outflow (Expenses)</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            ₹ {totalExpense.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Materials, labor, subcon</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-blue-600">
            <span>Net Operating Balance</span>
            <Wallet className="w-4 h-4" />
          </div>
          <div className={`text-xl font-bold tracking-tight mt-0.5 ${netCashBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            ₹ {netCashBalance.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Liquid cash flow status</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-amber-600">
            <span>Pending Site Requests</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-amber-700 tracking-tight mt-0.5">
            ₹ {pendingRequestsAmount.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{paymentRequests.filter(r => r.status !== 'PAID').length} awaiting approvals</div>
        </div>
      </div>

      {/* Tabs Bar & Filters */}
      <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 border-b-2 font-medium text-xs rounded-t-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'requests' 
                ? 'border-red-600 text-red-600 font-bold bg-white' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment Requests Pipeline ({paymentRequests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 border-b-2 font-medium text-xs rounded-t-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'ledger' 
                ? 'border-red-600 text-red-600 font-bold bg-white' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Financial Transactions Ledger ({transactions.length})</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 pb-2 text-xs">
          {activeTab === 'requests' && (
            <div className="w-52">
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { label: 'All Request Statuses', value: 'All' },
                  { label: 'Pending Supervisor', value: 'PENDING_SUPERVISOR', dotColor: 'bg-amber-500' },
                  { label: 'Supervisor Verified', value: 'SUPERVISOR_VERIFIED', dotColor: 'bg-blue-500' },
                  { label: 'Paid', value: 'PAID', dotColor: 'bg-emerald-500' },
                ]}
                size="sm"
                variant="brand"
              />
            </div>
          )}

          <div className="relative min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor, ref code..."
              className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 flex-1 bg-white overflow-x-auto">
        
        {/* TAB 1: PAYMENT REQUESTS APPROVAL PIPELINE */}
        {activeTab === 'requests' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4 w-28">Request Code</th>
                  <th className="py-3 px-4">Site Engineer</th>
                  <th className="py-3 px-4">Vendor & Category</th>
                  <th className="py-3 px-4">Purpose / Justification</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Approval Stage</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No payment requests found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 tracking-tight font-bold text-indigo-900">{r.request_code}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{r.requested_by || r.requested_by_name || 'Site Engineer'}</div>
                        <div className="text-[10px] text-slate-400">{r.request_date || r.date}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{r.vendor_name || 'Vendor'}</div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {r.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">{r.purpose_description || r.description}</td>
                      <td className="py-3.5 px-4 text-right tracking-tight font-bold text-slate-900">
                        ₹ {r.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          r.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                          r.status === 'SUPERVISOR_VERIFIED' ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {r.status.replace('_', ' ')}
                        </span>
                        {r.verified_by_supervisor && (
                          <div className="text-[9px] text-slate-400 mt-0.5">Verified by Supervisor</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {r.status === 'PENDING_SUPERVISOR' && (
                          <button
                            type="button"
                            onClick={() => handleSupervisorVerify(r.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                          >
                            Verify (Supervisor)
                          </button>
                        )}
                        {r.status === 'SUPERVISOR_VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => handleAccountsPay(r.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                          >
                            Disburse & Pay
                          </button>
                        )}
                        {r.status === 'PAID' && (
                          <div className="text-right">
                            <span className="text-[11px] text-emerald-600 font-bold tracking-tight">
                              Paid
                            </span>
                            <div className="text-[10px] text-slate-400 tracking-tight">{r.payment_reference || r.transaction_ref}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: FINANCIAL TRANSACTIONS LEDGER */}
        {activeTab === 'ledger' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4 w-28">Txn Code</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Party / Vendor</th>
                  <th className="py-3 px-4">Payment Mode & Ref</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map(t => {
                  const txnCode = t.transaction_code || t.reference_no || `TXN-${t.id.slice(-4)}`;
                  const txnDate = t.transaction_date || t.date || '';
                  const type = t.transaction_type || t.type || 'EXPENSE';
                  const party = t.party_name || t.paid_by_or_to || '';
                  const ref = t.reference_number || t.reference_no || 'N/A';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 tracking-tight font-bold text-slate-700">{txnCode}</td>
                      <td className="py-3 px-4 text-slate-500">{txnDate}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          type === 'INCOME' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium">{t.category}</td>
                      <td className="py-3 px-4 text-slate-700">{party}</td>
                      <td className="py-3 px-4 text-slate-500 tracking-tight text-[11px]">
                        {t.payment_mode} • {ref}
                      </td>
                      <td className={`py-3 px-4 text-right tracking-tight font-bold text-sm ${
                        type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {type === 'INCOME' ? '+' : '-'} ₹ {t.amount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ─── CREATE PAYMENT REQUEST 2-STEP FLOW (Images 1 & 2 Reference, Red & White Theme) ─── */}
      <CreatePaymentRequestDrawerFlow
        isOpen={isNewRequestModalOpen}
        onClose={() => setIsNewRequestModalOpen(false)}
        projects={projects}
        existingRequestsCount={paymentRequests.length}
        onSaveSuccess={handleSavePaymentRequestFromFlow}
      />

      {/* MODAL 2: Record Financial Transaction (Accounts) */}
      {isRecordTxnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Record Ledger Transaction</span>
              </h3>
              <button 
                onClick={() => setIsRecordTxnModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Transaction Type</label>
                  <CustomSelect
                    value={txnType}
                    onChange={(val) => setTxnType(val as any)}
                    options={[
                      { label: 'Income (Receipt)', value: 'INCOME', dotColor: 'bg-emerald-500' },
                      { label: 'Expense (Payout)', value: 'EXPENSE', dotColor: 'bg-rose-500' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    value={txnAmount}
                    onChange={(e) => setTxnAmount(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Party / Client / Vendor *</label>
                <input
                  type="text"
                  value={txnParty}
                  onChange={(e) => setTxnParty(e.target.value)}
                  placeholder="e.g. Client Name or Supplier"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={txnCategory}
                    onChange={(e) => setTxnCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Payment Mode</label>
                  <CustomSelect
                    value={txnMode}
                    onChange={(val) => setTxnMode(val as any)}
                    options={[
                      { label: 'Bank Transfer (NEFT/RTGS)', value: 'BANK_TRANSFER' },
                      { label: 'Cheque', value: 'CHEQUE' },
                      { label: 'UPI', value: 'UPI' },
                      { label: 'Cash Voucher', value: 'CASH' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordTxnModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaymentsView;
