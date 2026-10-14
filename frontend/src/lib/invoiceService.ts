import { SalesInvoice, ProjectExpenseRecord } from '../types';

export const DEFAULT_COMPANY_BANKS = [
  {
    id: 'bank-indian',
    bank_name: 'Indian Bank',
    account_number: '50291048201',
    ifsc_code: 'IDIB000M021',
    branch: 'Chennai Main Branch',
    account_type: 'Current Account'
  },
  {
    id: 'bank-axis',
    bank_name: 'Axis Bank',
    account_number: '918020048192847',
    ifsc_code: 'UTIB0000124',
    branch: 'Coimbatore Branch',
    account_type: 'Current Account'
  }
];

export function getCompanyBanks() {
  try {
    const raw = localStorage.getItem('siteops_company_banks_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_COMPANY_BANKS;
}

export function saveCompanyBanks(banks: any[]) {
  try {
    localStorage.setItem('siteops_company_banks_v2', JSON.stringify(banks));
  } catch (e) {}
}

export function getProjectInvoices(projectId: string, _clientName?: string): SalesInvoice[] {
  const key = `siteops_project_invoices_${projectId || 'default'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any legacy dummy auto-seeded invoices so new projects start clean
        const clean = parsed.filter(inv => !(
          inv.id?.startsWith('inv-seed-67') ||
          (inv.invoice_number === 'INV-67' && inv.boq_number === 'Sales-62')
        ));
        if (clean.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(clean));
        }
        return clean;
      }
    }
  } catch (e) {}

  return [];
}

export function saveProjectInvoices(projectId: string, invoices: SalesInvoice[]) {
  const key = `siteops_project_invoices_${projectId || 'default'}`;
  try {
    localStorage.setItem(key, JSON.stringify(invoices));
    window.dispatchEvent(new CustomEvent('siteops_invoices_updated', { detail: { projectId, invoices } }));
  } catch (e) {}
}

export function addSalesInvoice(projectId: string, invoice: SalesInvoice): SalesInvoice[] {
  const current = getProjectInvoices(projectId, invoice.client_name);
  const updated = [invoice, ...current];
  saveProjectInvoices(projectId, updated);
  return updated;
}

export function deleteSalesInvoice(projectId: string, invoiceId: string): SalesInvoice[] {
  const current = getProjectInvoices(projectId);
  const updated = current.filter(inv => inv.id !== invoiceId);
  saveProjectInvoices(projectId, updated);
  return updated;
}

export function updateSalesInvoice(projectId: string, updatedInvoice: SalesInvoice): SalesInvoice[] {
  const current = getProjectInvoices(projectId);
  const updated = current.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv);
  saveProjectInvoices(projectId, updated);
  return updated;
}

export function getProjectExpenses(projectId: string): ProjectExpenseRecord[] {
  const key = `siteops_project_expenses_${projectId || 'default'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveProjectExpenses(projectId: string, expenses: ProjectExpenseRecord[]) {
  const key = `siteops_project_expenses_${projectId || 'default'}`;
  try {
    localStorage.setItem(key, JSON.stringify(expenses));
    window.dispatchEvent(new CustomEvent('siteops_expenses_updated', { detail: { projectId, expenses } }));
  } catch (e) {}
}

export function addProjectExpense(projectId: string, expense: ProjectExpenseRecord): ProjectExpenseRecord[] {
  const current = getProjectExpenses(projectId);
  const updated = [expense, ...current];
  saveProjectExpenses(projectId, updated);
  return updated;
}

/**
 * Allocate payment against invoices
 */
export function settleInvoicesWithPayment(
  projectId: string,
  partyName: string,
  amount: number,
  targetInvoiceIds?: string[]
): { updatedInvoices: SalesInvoice[]; allocatedTotal: number } {
  const invoices = getProjectInvoices(projectId);
  let remainingPayment = Math.max(0, Number(amount) || 0);
  let allocatedTotal = 0;

  const hasTargetIds = Array.isArray(targetInvoiceIds) && targetInvoiceIds.length > 0;

  const updatedInvoices = invoices.map(inv => {
    // If specific invoices were targeted by user checkbox, match by invoice ID!
    // Otherwise, match by party name
    const shouldSettle = hasTargetIds
      ? targetInvoiceIds.includes(inv.id)
      : (!partyName || !inv.client_name || inv.client_name.toLowerCase().trim() === partyName.toLowerCase().trim());

    const currentDue = inv.balance_due !== undefined ? inv.balance_due : (inv.total_amount - (inv.settled_amount || 0));

    if (shouldSettle && currentDue > 0 && remainingPayment > 0) {
      const allocateForThis = Math.min(currentDue, remainingPayment);
      remainingPayment -= allocateForThis;
      allocatedTotal += allocateForThis;

      const newSettled = (inv.settled_amount || 0) + allocateForThis;
      const newBalance = Math.max(0, currentDue - allocateForThis);

      return {
        ...inv,
        settled_amount: newSettled,
        balance_due: newBalance,
        status: newBalance <= 0 ? ('SETTLED' as const) : ('PARTIALLY_SETTLED' as const)
      };
    }
    return inv;
  });

  saveProjectInvoices(projectId, updatedInvoices);
  return { updatedInvoices, allocatedTotal };
}

/**
 * Allocate payment against expenses
 */
export function settleExpensesWithPayment(
  projectId: string,
  partyName: string,
  amount: number,
  targetExpenseIds?: string[]
): { updatedExpenses: ProjectExpenseRecord[]; allocatedTotal: number } {
  const expenses = getProjectExpenses(projectId);
  let remainingPayment = Math.max(0, Number(amount) || 0);
  let allocatedTotal = 0;

  const hasTargetIds = Array.isArray(targetExpenseIds) && targetExpenseIds.length > 0;

  const updatedExpenses = expenses.map(exp => {
    const shouldSettle = hasTargetIds
      ? targetExpenseIds.includes(exp.id)
      : (!partyName || !exp.party_name || exp.party_name.toLowerCase().trim() === partyName.toLowerCase().trim());

    const currentDue = exp.balance_due !== undefined ? exp.balance_due : (exp.total_amount - (exp.settled_amount || 0));

    if (shouldSettle && currentDue > 0 && remainingPayment > 0) {
      const allocateForThis = Math.min(currentDue, remainingPayment);
      remainingPayment -= allocateForThis;
      allocatedTotal += allocateForThis;

      const newSettled = (exp.settled_amount || 0) + allocateForThis;
      const newBalance = Math.max(0, currentDue - allocateForThis);

      return {
        ...exp,
        settled_amount: newSettled,
        balance_due: newBalance,
        status: newBalance <= 0 ? ('SETTLED' as const) : ('PARTIALLY_SETTLED' as const)
      };
    }
    return exp;
  });

  saveProjectExpenses(projectId, updatedExpenses);
  return { updatedExpenses, allocatedTotal };
}
