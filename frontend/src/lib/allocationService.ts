import { TransactionAllocation, FinancialAuditLog, ProjectTransaction, BOQRecord, BOQItem } from '../types';
import { syncProjectFinancialsToStorage } from './projectFinanceUtils';
import { getFinanceParties, saveFinanceParties } from './financeSyncService';

const ALLOCATIONS_STORAGE_KEY = 'siteops_transaction_allocations_v1';
const AUDIT_LOGS_STORAGE_KEY = 'siteops_financial_audit_logs_v1';

/**
 * Retrieve all allocations, optionally filtered by project ID
 */
export function getAllocations(projectId?: string): TransactionAllocation[] {
  try {
    const raw = localStorage.getItem(ALLOCATIONS_STORAGE_KEY);
    if (raw) {
      const list: TransactionAllocation[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        if (!projectId) return list;
        return list.filter(a => a.project_id === projectId);
      }
    }
  } catch (e) {
    console.error('Error loading allocations:', e);
  }
  return [];
}

/**
 * Persist allocations to storage
 */
export function saveAllocationsToStorage(allocations: TransactionAllocation[]) {
  try {
    localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations));
  } catch (e) {
    console.error('Error saving allocations:', e);
  }
}

/**
 * Retrieve audit logs, optionally filtered by project ID
 */
export function getFinancialAuditLogs(projectId?: string): FinancialAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (raw) {
      const list: FinancialAuditLog[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        if (!projectId) return list;
        return list.filter(l => !l.project_id || l.project_id === projectId);
      }
    }
  } catch (e) {
    console.error('Error loading audit logs:', e);
  }
  return [];
}

/**
 * Record an audit log entry
 */
export function recordFinancialAudit(entry: Omit<FinancialAuditLog, 'id' | 'timestamp'>) {
  try {
    const logs = getFinancialAuditLogs();
    const newLog: FinancialAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    const updated = [newLog, ...logs];
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updated));
    return newLog;
  } catch (e) {
    console.error('Error recording financial audit:', e);
    return null;
  }
}

/**
 * Helper to get project BOQs
 */
function getProjectBOQs(projectId: string): BOQRecord[] {
  try {
    const raw = localStorage.getItem(`siteops_boq_records_v2_${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Helper to save project BOQs
 */
function saveProjectBOQs(projectId: string, boqs: BOQRecord[]) {
  try {
    localStorage.setItem(`siteops_boq_records_v2_${projectId}`, JSON.stringify(boqs));
  } catch {}
}

/**
 * Helper to get project transactions
 */
function getRawProjectTransactions(projectId: string): ProjectTransaction[] {
  try {
    const raw = localStorage.getItem(`siteops_project_transactions_${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Helper to save project transactions
 */
function saveRawProjectTransactions(projectId: string, txs: ProjectTransaction[]) {
  try {
    localStorage.setItem(`siteops_project_transactions_${projectId}`, JSON.stringify(txs));
  } catch {}
}

/**
 * Calculate available unallocated advance balance for a transaction
 */
export function getTransactionAdvanceBalance(tx: ProjectTransaction): {
  totalAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
} {
  const total = Number(tx.amount) || 0;
  if (tx.status === 'REVERSED' || tx.is_reversed) {
    return { totalAmount: total, allocatedAmount: 0, unallocatedAmount: 0 };
  }
  const allAllocations = getAllocations(tx.project_id);
  const activeForTx = allAllocations.filter(
    a => a.source_transaction_id === tx.id && a.status === 'ACTIVE'
  );
  const allocated = activeForTx.reduce((sum, a) => sum + (Number(a.allocated_amount) || 0), 0);
  const unallocated = Math.max(0, total - allocated);
  return {
    totalAmount: total,
    allocatedAmount: allocated,
    unallocatedAmount: unallocated
  };
}

/**
 * Allocate Advance to a BOQ Work Item or Milestone
 *
 * Rules:
 * - Allow partial allocation
 * - Prevent allocation above available advance balance
 * - Prevent allocation above work item/milestone outstanding amount
 * - Do NOT create a second cash transaction (financial cash in/out does not increase)
 * - Reduce unallocated advance balance
 * - Update work item / milestone settled amount
 * - Maintain audit trail
 */
export function createAdvanceAllocation(params: {
  sourceTransaction: ProjectTransaction;
  projectId: string;
  projectName: string;
  boqId: string;
  boqNumber: string;
  boqItemId?: string;
  boqItemName?: string;
  milestoneId?: string;
  milestoneName?: string;
  amount: number;
  notes?: string;
  createdBy?: string;
}): { success: boolean; allocation?: TransactionAllocation; error?: string } {
  const {
    sourceTransaction,
    projectId,
    projectName,
    boqId,
    boqNumber,
    boqItemId,
    boqItemName,
    milestoneId,
    milestoneName,
    amount,
    notes,
    createdBy = 'Current User'
  } = params;

  if (amount <= 0) {
    return { success: false, error: 'Allocation amount must be greater than zero.' };
  }

  // 1. Verify advance availability
  const advanceBal = getTransactionAdvanceBalance(sourceTransaction);
  if (amount > advanceBal.unallocatedAmount) {
    return {
      success: false,
      error: `Cannot allocate ₹${amount.toLocaleString('en-IN')}. Available unallocated advance is only ₹${advanceBal.unallocatedAmount.toLocaleString('en-IN')}.`
    };
  }

  // 2. Verify target BOQ and work item / milestone
  const boqs = getProjectBOQs(projectId);
  const targetBOQ = boqs.find(b => b.id === boqId);
  if (!targetBOQ) {
    return { success: false, error: 'Target BOQ not found in project.' };
  }

  let finalTargetTitle = boqItemName || milestoneName || 'Work Item';
  let targetFound = false;

  if (boqItemId) {
    const item = targetBOQ.items.find(i => i.id === boqItemId);
    if (!item) {
      return { success: false, error: 'Target BOQ item not found.' };
    }
    targetFound = true;
    finalTargetTitle = item.description || item.item_name || finalTargetTitle;
    const itemTotal = Number(item.sales_price || item.total_amount || 0);
    const itemSettled = Number(item.settled_amount || 0);
    const itemOutstanding = Math.max(0, itemTotal - itemSettled);

    if (itemOutstanding > 0 && amount > itemOutstanding) {
      return {
        success: false,
        error: `Cannot allocate ₹${amount.toLocaleString('en-IN')}. Work item outstanding balance is ₹${itemOutstanding.toLocaleString('en-IN')}.`
      };
    }

    // Update item settled amount
    item.settled_amount = (item.settled_amount || 0) + amount;
    item.outstanding_amount = Math.max(0, itemTotal - item.settled_amount);
  } else if (milestoneId && targetBOQ.milestones) {
    const ms = targetBOQ.milestones.find(m => m.id === milestoneId);
    if (ms) {
      targetFound = true;
      finalTargetTitle = ms.name || finalTargetTitle;
      const msTotal = Number(ms.amount || 0);
      const msSettled = Number(ms.settled_amount || 0);
      const msOutstanding = Math.max(0, msTotal - msSettled);

      if (msOutstanding > 0 && amount > msOutstanding) {
        return {
          success: false,
          error: `Cannot allocate ₹${amount.toLocaleString('en-IN')}. Milestone outstanding balance is ₹${msOutstanding.toLocaleString('en-IN')}.`
        };
      }

      ms.settled_amount = (ms.settled_amount || 0) + amount;
      if (ms.settled_amount >= msTotal) {
        ms.status = 'SETTLED';
      }
    }
  }

  // 3. Create allocation entity
  const newAllocation: TransactionAllocation = {
    id: `alloc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source_transaction_id: sourceTransaction.id,
    source_transaction_number: sourceTransaction.transaction_number,
    project_id: projectId,
    project_name: projectName,
    party_name: sourceTransaction.party_name,
    boq_id: boqId,
    boq_number: boqNumber,
    boq_item_id: boqItemId,
    boq_item_name: finalTargetTitle,
    milestone_id: milestoneId,
    milestone_name: milestoneName,
    allocated_amount: amount,
    allocation_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    notes: notes || `Allocated from advance ${sourceTransaction.transaction_number}`,
    created_by: createdBy,
    created_at: new Date().toISOString()
  };

  // 4. Update source transaction allocation trackers
  const txs = getRawProjectTransactions(projectId);
  const matchedTx = txs.find(t => t.id === sourceTransaction.id);
  if (matchedTx) {
    matchedTx.allocated_amount = (matchedTx.allocated_amount || 0) + amount;
    matchedTx.unallocated_amount = Math.max(0, Number(matchedTx.amount) - matchedTx.allocated_amount);
    saveRawProjectTransactions(projectId, txs);
  }

  // 5. Persist target BOQ changes
  saveProjectBOQs(projectId, boqs);

  // 6. Persist allocation
  const currentAllocations = getAllocations();
  saveAllocationsToStorage([newAllocation, ...currentAllocations]);

  // 7. Record Audit Log
  recordFinancialAudit({
    project_id: projectId,
    entity_type: 'ALLOCATION',
    entity_id: newAllocation.id,
    action: 'ALLOCATE',
    amount: amount,
    performed_by: createdBy,
    details: `Allocated ₹${amount.toLocaleString('en-IN')} from advance ${sourceTransaction.transaction_number} to "${finalTargetTitle}" in BOQ ${boqNumber}`
  });

  // 8. Trigger real-time refresh
  syncProjectFinancialsToStorage(projectId, '', projectName);
  window.dispatchEvent(new CustomEvent('booshnam_finance_updated', { detail: { projectId } }));
  window.dispatchEvent(new CustomEvent('siteops_allocation_created', { detail: { allocation: newAllocation } }));

  return { success: true, allocation: newAllocation };
}

/**
 * Reverse an existing allocation
 * Restores unallocated advance and target work item outstanding amount without deleting history.
 */
export function reverseAllocation(
  allocationId: string,
  reason: string,
  reversedBy: string = 'Current User'
): { success: boolean; error?: string } {
  if (!reason.trim()) {
    return { success: false, error: 'Reversal reason is required.' };
  }

  const allAllocations = getAllocations();
  const allocation = allAllocations.find(a => a.id === allocationId);
  if (!allocation) {
    return { success: false, error: 'Allocation record not found.' };
  }
  if (allocation.status === 'REVERSED') {
    return { success: false, error: 'This allocation has already been reversed.' };
  }

  const now = new Date().toISOString();
  allocation.status = 'REVERSED';
  allocation.reversed_at = now;
  allocation.reversed_by = reversedBy;
  allocation.reversal_reason = reason.trim();

  // 1. Restore source transaction unallocated advance
  const txs = getRawProjectTransactions(allocation.project_id);
  const matchedTx = txs.find(t => t.id === allocation.source_transaction_id);
  if (matchedTx) {
    matchedTx.allocated_amount = Math.max(0, (matchedTx.allocated_amount || 0) - allocation.allocated_amount);
    matchedTx.unallocated_amount = Math.max(0, Number(matchedTx.amount) - (matchedTx.allocated_amount || 0));
    saveRawProjectTransactions(allocation.project_id, txs);
  }

  // 2. Restore BOQ item settled/outstanding amounts
  const boqs = getProjectBOQs(allocation.project_id);
  const targetBOQ = boqs.find(b => b.id === allocation.boq_id);
  if (targetBOQ) {
    if (allocation.boq_item_id) {
      const item = targetBOQ.items.find(i => i.id === allocation.boq_item_id);
      if (item) {
        item.settled_amount = Math.max(0, (item.settled_amount || 0) - allocation.allocated_amount);
        const itemTotal = Number(item.sales_price || item.total_amount || 0);
        item.outstanding_amount = Math.max(0, itemTotal - item.settled_amount);
      }
    } else if (allocation.milestone_id && targetBOQ.milestones) {
      const ms = targetBOQ.milestones.find(m => m.id === allocation.milestone_id);
      if (ms) {
        ms.settled_amount = Math.max(0, (ms.settled_amount || 0) - allocation.allocated_amount);
        if (ms.status === 'SETTLED') {
          ms.status = 'PENDING';
        }
      }
    }
    saveProjectBOQs(allocation.project_id, boqs);
  }

  // 3. Save allocations
  saveAllocationsToStorage(allAllocations);

  // 4. Audit Log
  recordFinancialAudit({
    project_id: allocation.project_id,
    entity_type: 'ALLOCATION',
    entity_id: allocation.id,
    action: 'REVERSE',
    amount: allocation.allocated_amount,
    performed_by: reversedBy,
    details: `Reversed allocation of ₹${allocation.allocated_amount.toLocaleString('en-IN')} on ${allocation.boq_item_name || 'work'}. Reason: ${reason.trim()}`
  });

  // 5. Trigger real-time refresh
  syncProjectFinancialsToStorage(allocation.project_id, '', allocation.project_name);
  window.dispatchEvent(new CustomEvent('booshnam_finance_updated', { detail: { projectId: allocation.project_id } }));

  return { success: true };
}

/**
 * Reverse a financial transaction
 * - Marks status = 'REVERSED', is_reversed = true
 * - Reverses any active advance allocations associated with this transaction
 * - Recalculates party balance and project financials
 * - Keeps full audit history
 */
export function reverseProjectTransaction(
  projectId: string,
  transactionId: string,
  reason: string,
  reversedBy: string = 'Current User'
): { success: boolean; error?: string } {
  if (!reason.trim()) {
    return { success: false, error: 'Reversal reason is required.' };
  }

  const txs = getRawProjectTransactions(projectId);
  const tx = txs.find(t => t.id === transactionId);
  if (!tx) {
    return { success: false, error: 'Transaction not found in project.' };
  }
  if (tx.status === 'REVERSED' || tx.is_reversed) {
    return { success: false, error: 'This transaction is already reversed.' };
  }

  const now = new Date().toISOString();
  tx.status = 'REVERSED';
  tx.is_reversed = true;
  tx.reversed_at = now;
  tx.reversed_by = reversedBy;
  tx.reversal_reason = reason.trim();

  // 1. Reverse any active allocations linked to this transaction
  const allAllocations = getAllocations(projectId);
  const linkedActive = allAllocations.filter(
    a => a.source_transaction_id === transactionId && a.status === 'ACTIVE'
  );
  for (const alloc of linkedActive) {
    reverseAllocation(alloc.id, `Automatic reversal due to transaction ${tx.transaction_number} reversal: ${reason.trim()}`, reversedBy);
  }

  saveRawProjectTransactions(projectId, txs);

  // 2. Also update in global finance transactions if present
  try {
    const raw = localStorage.getItem('booshnam_finance_transactions');
    if (raw) {
      const ftxs = JSON.parse(raw);
      if (Array.isArray(ftxs)) {
        const found = ftxs.find((f: any) => f.id === transactionId || f.id === tx.id || f.txnCode === tx.transaction_number);
        if (found) {
          found.status = 'REVERSED';
          found.is_reversed = true;
          found.reversal_reason = reason.trim();
          localStorage.setItem('booshnam_finance_transactions', JSON.stringify(ftxs));
        }
      }
    }
  } catch {}

  // 3. Adjust party balance in Accounts & Finance
  try {
    const parties = getFinanceParties();
    const matchedParty = parties.find(p => p.name.trim().toLowerCase() === tx.party_name.trim().toLowerCase());
    if (matchedParty) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'IN') {
        // Payment in reversal increases balance due back to party
        matchedParty.balanceDue = (matchedParty.balanceDue || 0) + amt;
        matchedParty.totalPaid = Math.max(0, (matchedParty.totalPaid || 0) - amt);
      } else {
        matchedParty.balanceDue = Math.max(0, (matchedParty.balanceDue || 0) - amt);
      }
      saveFinanceParties(parties);
    }
  } catch {}

  // 4. Audit Log
  recordFinancialAudit({
    project_id: projectId,
    entity_type: 'TRANSACTION',
    entity_id: tx.id,
    action: 'REVERSE',
    amount: tx.amount,
    performed_by: reversedBy,
    details: `Reversed transaction ${tx.transaction_number} (₹${tx.amount.toLocaleString('en-IN')}). Reason: ${reason.trim()}`
  });

  // 5. Trigger real-time refresh
  syncProjectFinancialsToStorage(projectId, '', tx.project_name || '');
  window.dispatchEvent(new CustomEvent('booshnam_finance_updated', { detail: { projectId } }));
  window.dispatchEvent(new CustomEvent('siteops_transactions_updated', { detail: { projectId } }));

  return { success: true };
}
