import React, { useState, useMemo } from 'react';
import { X, Check, ArrowRight, DollarSign, AlertCircle, Info, Sparkles, Layers } from 'lucide-react';
import { Project, ProjectTransaction, BOQRecord, BOQItem, BOQMilestone } from '../../types';
import { getTransactionAdvanceBalance, createAdvanceAllocation } from '../../lib/allocationService';

interface AllocateAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTransaction: ProjectTransaction;
  project: Project;
  onSuccess?: (msg: string) => void;
}

export const AllocateAdvanceModal: React.FC<AllocateAdvanceModalProps> = ({
  isOpen,
  onClose,
  sourceTransaction,
  project,
  onSuccess
}) => {
  if (!isOpen) return null;

  // Retrieve project BOQs
  const boqs = useMemo<BOQRecord[]>(() => {
    try {
      const raw = localStorage.getItem(`siteops_boq_records_v2_${project.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }, [project.id]);

  const [selectedBOQId, setSelectedBOQId] = useState<string>(() => boqs[0]?.id || '');
  const [targetType, setTargetType] = useState<'item' | 'milestone'>('item');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const [allocationAmount, setAllocationAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected BOQ object
  const activeBOQ = useMemo(() => {
    return boqs.find(b => b.id === selectedBOQId) || boqs[0] || null;
  }, [boqs, selectedBOQId]);

  // Advance Balance calculations
  const advanceBal = useMemo(() => {
    return getTransactionAdvanceBalance(sourceTransaction);
  }, [sourceTransaction]);

  // Selected target work item
  const selectedItem = useMemo<BOQItem | null>(() => {
    if (!activeBOQ || targetType !== 'item') return null;
    return activeBOQ.items.find(i => i.id === selectedItemId) || null;
  }, [activeBOQ, targetType, selectedItemId]);

  // Selected target milestone
  const selectedMilestone = useMemo<BOQMilestone | null>(() => {
    if (!activeBOQ || targetType !== 'milestone' || !activeBOQ.milestones) return null;
    return activeBOQ.milestones.find(m => m.id === selectedMilestoneId) || null;
  }, [activeBOQ, targetType, selectedMilestoneId]);

  // Target outstanding amount
  const targetOutstanding = useMemo(() => {
    if (selectedItem) {
      const total = Number(selectedItem.sales_price || selectedItem.total_amount || 0);
      const settled = Number(selectedItem.settled_amount || 0);
      return Math.max(0, total - settled);
    }
    if (selectedMilestone) {
      const total = Number(selectedMilestone.amount || 0);
      const settled = Number(selectedMilestone.settled_amount || 0);
      return Math.max(0, total - settled);
    }
    return 0;
  }, [selectedItem, selectedMilestone]);

  // Quick fill helper
  const handleQuickFill = (pct?: number) => {
    if (pct) {
      const maxAllocatable = Math.min(advanceBal.unallocatedAmount, targetOutstanding || advanceBal.unallocatedAmount);
      const amt = Math.round((maxAllocatable * pct) / 100);
      setAllocationAmount(amt);
    } else {
      const maxAllocatable = targetOutstanding > 0 
        ? Math.min(advanceBal.unallocatedAmount, targetOutstanding) 
        : advanceBal.unallocatedAmount;
      setAllocationAmount(maxAllocatable);
    }
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const amt = Number(allocationAmount);
    if (!amt || amt <= 0) {
      setErrorMessage('Please enter a valid allocation amount greater than zero.');
      return;
    }
    if (amt > advanceBal.unallocatedAmount) {
      setErrorMessage(`Cannot allocate ₹${amt.toLocaleString('en-IN')}. Available unallocated advance is only ₹${advanceBal.unallocatedAmount.toLocaleString('en-IN')}.`);
      return;
    }
    if (targetOutstanding > 0 && amt > targetOutstanding) {
      setErrorMessage(`Cannot allocate ₹${amt.toLocaleString('en-IN')}. Target work item outstanding balance is ₹${targetOutstanding.toLocaleString('en-IN')}.`);
      return;
    }
    if (!activeBOQ) {
      setErrorMessage('Please select a valid target BOQ.');
      return;
    }
    if (targetType === 'item' && !selectedItemId) {
      setErrorMessage('Please select a BOQ work item to allocate advance to.');
      return;
    }
    if (targetType === 'milestone' && !selectedMilestoneId) {
      setErrorMessage('Please select a BOQ milestone to allocate advance to.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = createAdvanceAllocation({
      sourceTransaction,
      projectId: project.id,
      projectName: project.name,
      boqId: activeBOQ.id,
      boqNumber: activeBOQ.boq_number,
      boqItemId: targetType === 'item' ? selectedItemId : undefined,
      boqItemName: selectedItem?.description || selectedItem?.item_name,
      milestoneId: targetType === 'milestone' ? selectedMilestoneId : undefined,
      milestoneName: selectedMilestone?.name,
      amount: amt,
      notes: notes.trim(),
      createdBy: 'SiteOps Finance'
    });

    setIsSubmitting(false);

    if (res.success) {
      onSuccess?.(`Successfully allocated ₹${amt.toLocaleString('en-IN')} to "${selectedItem?.description || selectedMilestone?.name || 'work item'}"`);
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to allocate advance.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Allocate Advance to Work
              </h3>
              <p className="text-[11px] text-slate-500">
                Source: {sourceTransaction.transaction_number} • {sourceTransaction.party_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Advance Balance Card */}
        <div className="p-6 pb-2 space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Advance Received
              </span>
              <div className="text-lg font-extrabold mt-0.5">
                ₹ {advanceBal.totalAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Already Allocated: ₹ {advanceBal.allocatedAmount.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Available to Allocate
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">
                ₹ {advanceBal.unallocatedAmount.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-300">
                {advanceBal.totalAmount > 0 ? Math.round((advanceBal.unallocatedAmount / advanceBal.totalAmount) * 100) : 0}% unallocated
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 flex-1 overflow-y-auto">
          {/* 1. Target BOQ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
              1. Select Target BOQ
            </label>
            {boqs.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
                No BOQs found for this project. Please create a BOQ first.
              </div>
            ) : (
              <select
                value={selectedBOQId}
                onChange={(e) => {
                  setSelectedBOQId(e.target.value);
                  setSelectedItemId('');
                  setSelectedMilestoneId('');
                  setErrorMessage(null);
                }}
                className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white cursor-pointer"
              >
                {boqs.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.boq_number} — {b.title} (Value: ₹{Number(b.boq_value).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Target Type: Work Item vs Milestone */}
          {activeBOQ && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase">
                  2. Select Work Item or Milestone
                </label>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('item');
                      setErrorMessage(null);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      targetType === 'item' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500'
                    }`}
                  >
                    BOQ Line Items ({activeBOQ.items?.filter(i => i.type !== 'section').length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('milestone');
                      setErrorMessage(null);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      targetType === 'milestone' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500'
                    }`}
                  >
                    Milestones ({activeBOQ.milestones?.length || 0})
                  </button>
                </div>
              </div>

              {targetType === 'item' ? (
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white cursor-pointer"
                >
                  <option value="">-- Choose BOQ Item to Settle --</option>
                  {activeBOQ.items
                    .filter(i => i.type !== 'section')
                    .map(item => {
                      const total = Number(item.sales_price || item.total_amount || 0);
                      const settled = Number(item.settled_amount || 0);
                      const outstanding = Math.max(0, total - settled);
                      return (
                        <option key={item.id} value={item.id}>
                          #{item.s_no} {item.description.slice(0, 45)}... [Total: ₹{total.toLocaleString('en-IN')}, Remaining: ₹{outstanding.toLocaleString('en-IN')}]
                        </option>
                      );
                    })}
                </select>
              ) : (
                <select
                  value={selectedMilestoneId}
                  onChange={(e) => {
                    setSelectedMilestoneId(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white cursor-pointer"
                >
                  <option value="">-- Choose Milestone to Settle --</option>
                  {(activeBOQ.milestones || []).map(ms => {
                    const total = Number(ms.amount || 0);
                    const settled = Number(ms.settled_amount || 0);
                    const outstanding = Math.max(0, total - settled);
                    return (
                      <option key={ms.id} value={ms.id}>
                        {ms.name} ({ms.percentage}%) [Total: ₹{total.toLocaleString('en-IN')}, Remaining: ₹{outstanding.toLocaleString('en-IN')}]
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          {/* Target Work Item Summary Pill */}
          {(selectedItem || selectedMilestone) && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">
                  {selectedItem?.description || selectedMilestone?.name}
                </span>
                <span className="text-[10px] text-slate-500">
                  Target Work Total: ₹{((selectedItem ? (selectedItem.sales_price || selectedItem.total_amount) : selectedMilestone?.amount) || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Outstanding</span>
                <span className="font-black text-rose-600">
                  ₹ {targetOutstanding.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* 3. Allocation Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">
                3. Allocation Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickFill(50)}
                  className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill()}
                  className="px-2 py-0.5 text-[10px] font-bold bg-red-50 hover:bg-red-100 text-red-700 rounded-md cursor-pointer"
                >
                  Max Settle
                </button>
              </div>
            </div>
            <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 bg-white">
              <input
                type="number"
                required
                min="1"
                max={advanceBal.unallocatedAmount}
                placeholder="Enter amount to allocate (e.g. 4000)"
                value={allocationAmount}
                onChange={(e) => {
                  setAllocationAmount(e.target.value ? Number(e.target.value) : '');
                  setErrorMessage(null);
                }}
                className="w-full text-sm font-bold text-slate-900 bg-transparent focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Note: This allocation does not generate a new cash transaction. It binds advance money to this specific work item.
            </p>
          </div>

          {/* 4. Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Allocation Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Allocated towards Mobilization work completion"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 resize-none bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || advanceBal.unallocatedAmount <= 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                advanceBal.unallocatedAmount > 0
                  ? 'bg-red-600 hover:bg-red-700 text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Confirm Allocation</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
