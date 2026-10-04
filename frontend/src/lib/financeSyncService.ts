import { Project, ProjectTransaction, PaymentRequest } from '../types';

export interface PartyRecord {
  id: string;
  name: string;
  avatarText?: string;
  avatarColor?: string;
  type: 'Client' | 'Staff' | 'Vendor' | 'Subcontractor' | 'Supplier' | 'Consultant';
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  partyId?: string;
  dateOfJoining?: string;
  aadhaarNumber?: string;
  aadhaarFile?: string;
  panNumber?: string;
  panFile?: string;
  gstin?: string;
  balanceDue: number;
  status: 'To Receive' | 'To Pay' | 'Settled' | 'Advance Paid' | 'Advance Received';
  activeStatus?: 'Active' | 'Inactive';
  totalBilled?: number;
  totalPaid?: number;
  activeProjects?: string[];
}

export interface FinanceTransaction {
  id: string;
  txnCode: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  partyName: string;
  projectName: string;
  category: string;
  amount: number;
  mode: 'NEFT/RTGS' | 'UPI' | 'CHEQUE' | 'CASH';
  referenceNo: string;
  status: 'Completed' | 'Pending' | 'Reconciled';
  transactionType?: string;
  costCode?: string;
  notes?: string;
}

export interface PartyLedgerTransaction {
  id: string;
  partyId: string;
  partyName: string;
  date: string;
  day: string;
  month: string;
  year: string;
  title: string;
  projectName?: string;
  category?: string;
  notes?: string;
  amount: number;
  type: 'SALES_INVOICE' | 'PAYMENT_IN' | 'EXPENSE' | 'PAYMENT_OUT';
}

export interface BankAccountRecord {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: 'Current' | 'Savings' | 'Escrow' | 'Petty Cash';
  balance: number;
  status: 'Active' | 'Inactive';
  tallyLedgerName: string;
  accountHolderName?: string;
  bankAddress?: string;
  ibanNumber?: string;
  upiNumber?: string;
  overdraftLimit?: number;
  isPrimary?: boolean;
  openingBalance?: number;
}

export interface AccountStatementTransaction {
  id: string;
  accountId: string;
  date: string;
  rawDate: string;
  partyName: string;
  voucherCode: string;
  paymentType: 'Payment In' | 'Payment Out';
  type: 'Credit' | 'Debit';
  amount: number;
  paymentMode: string;
  projectName: string;
  sourceAccountName: string;
  details?: string;
}

export interface ExpenseItem {
  id: string;
  expenseCode: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  projectName: string;
  partyOrVendorName: string;
  paidFromAccount: string;
  paymentMode: string;
  status: 'Paid' | 'Pending Approval' | 'Draft';
  referenceNo: string;
  invoiceUrl?: string;
  taxAmount?: number;
}

export interface PaymentRequestItem {
  id: string;
  requestCode: string;
  date: string;
  partyName: string;
  projectName: string;
  subProjectText: string;
  amount: number;
  status: 'Paid' | 'Approved' | 'Pending' | 'Rejected';
  category: string;
  paymentMode?: string;
  referenceNo?: string;
  paidDate?: string;
  notes?: string;
  invoiceFile?: string;
}

// LocalStorage Keys used across Accounts & Finance
export const FINANCE_STORAGE_KEYS = {
  PARTIES: 'booshnam_finance_parties',
  TRANSACTIONS: 'booshnam_finance_transactions',
  PARTY_TRANSACTIONS: 'booshnam_party_transactions_v2',
  PARTY_SUMMARIES: 'booshnam_party_summaries',
  BANK_ACCOUNTS: 'booshnam_finance_bank_accounts_v4',
  STATEMENTS: 'booshnam_statement_transactions_v1',
  EXPENSES: 'booshnam_finance_expenses_v1',
  PAYMENT_REQUESTS: 'booshnam_finance_payment_requests',
};

// Compute Avatar Initials and Badge Background Color
export function getPartyAvatarInfo(name: string, type?: string): { text: string; color: string } {
  const trimmed = (name || '').trim();
  let text = 'P';
  if (trimmed.startsWith('(')) {
    const inside = trimmed.replace(/[()]/g, '').trim();
    const parts = inside.split(/\s+/);
    if (parts.length > 1 && parts[1] === '&') {
      text = '(&';
    } else {
      text = inside.slice(0, 2);
    }
  } else if (/^\d+$/.test(trimmed)) {
    text = trimmed.charAt(0);
  } else {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3 && parts[1] === '&') {
      text = `${parts[0][0]}&`;
    } else if (parts.length > 1) {
      text = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    } else {
      text = trimmed.slice(0, 2).toUpperCase();
    }
  }

  let color = 'bg-[#1E40AF]'; // Client - blue
  if (type === 'Staff') color = 'bg-[#7C3AED]';
  else if (type === 'Vendor') color = 'bg-[#EA580C]';
  else if (type === 'Subcontractor') color = 'bg-[#4F46E5]';
  else if (type === 'Supplier') color = 'bg-[#0D9488]';
  else if (type === 'Consultant') color = 'bg-[#0284C7]';

  return { text, color };
}

// Robust date parser helper
export function parseDateParts(str?: string) {
  if (!str) {
    const now = new Date();
    return {
      day: String(now.getDate()).padStart(2, '0'),
      month: now.toLocaleString('en-GB', { month: 'short' }),
      year: String(now.getFullYear()),
      timestamp: now.getTime()
    };
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return {
        day: String(d.getDate()).padStart(2, '0'),
        month: d.toLocaleString('en-GB', { month: 'short' }),
        year: String(d.getFullYear()),
        timestamp: d.getTime()
      };
    }
  }
  const parts = str.trim().split(/[\s-]+/);
  if (parts.length >= 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1];
    let year = parts[2];
    if (year.length === 2) year = `20${year}`;
    const d = new Date(`${day} ${month} ${year}`);
    const ts = isNaN(d.getTime()) ? Date.now() : d.getTime();
    return { day, month, year, timestamp: ts };
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return {
      day: String(d.getDate()).padStart(2, '0'),
      month: d.toLocaleString('en-GB', { month: 'short' }),
      year: String(d.getFullYear()),
      timestamp: d.getTime()
    };
  }
  const now = new Date();
  return {
    day: String(now.getDate()).padStart(2, '0'),
    month: now.toLocaleString('en-GB', { month: 'short' }),
    year: String(now.getFullYear()),
    timestamp: now.getTime()
  };
}

// ----------------------------------------------------
// 1. Get All Parties from Accounts & Finance
// ----------------------------------------------------
export function getFinanceParties(): PartyRecord[] {
  try {
    const saved = localStorage.getItem(FINANCE_STORAGE_KEYS.PARTIES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => p && p.name && !/^pty-([0-9]{1,3})$/.test(p.id));
      }
    }
  } catch (e) {
    console.error('Failed to get finance parties:', e);
  }
  return [];
}

// Save Parties
export function saveFinanceParties(parties: PartyRecord[]): void {
  try {
    localStorage.setItem(FINANCE_STORAGE_KEYS.PARTIES, JSON.stringify(parties));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('booshnam_finance_updated'));
  } catch (e) {
    console.error('Failed to save finance parties:', e);
  }
}

// ----------------------------------------------------
// 2. Ensure Party Exists (Find or Create Party)
// ----------------------------------------------------
export function ensurePartyExists(
  partyName: string,
  projectName?: string,
  defaultType?: PartyRecord['type']
): PartyRecord {
  const parties = getFinanceParties();
  const trimmed = (partyName || '').trim();
  const lower = trimmed.toLowerCase();

  const found = parties.find(p => p.name.trim().toLowerCase() === lower);
  if (found) {
    let changed = false;
    if (projectName && (!found.activeProjects || !found.activeProjects.includes(projectName))) {
      found.activeProjects = [...(found.activeProjects || []), projectName];
      changed = true;
    }
    if (changed) {
      saveFinanceParties(parties);
    }
    return found;
  }

  const { text, color } = getPartyAvatarInfo(trimmed, defaultType);
  const newParty: PartyRecord = {
    id: `pty-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: trimmed,
    avatarText: text,
    avatarColor: color,
    type: defaultType || 'Client',
    contactPerson: trimmed,
    balanceDue: 0,
    status: defaultType === 'Client' ? 'To Receive' : 'To Pay',
    activeStatus: 'Active',
    totalBilled: 0,
    totalPaid: 0,
    activeProjects: projectName ? [projectName] : []
  };

  const updated = [newParty, ...parties];
  saveFinanceParties(updated);
  return newParty;
}

// ----------------------------------------------------
// 3. Sync Project Transaction to Accounts & Finance
// ----------------------------------------------------
export function syncProjectTransactionToFinance(
  project: { id?: string; code?: string; name: string; client_name?: string },
  tx: ProjectTransaction
): void {
  const partyName = (tx.party_name || '').trim();
  if (!partyName) return;

  const subType = (tx.transaction_sub_type || '').toLowerCase();
  let defaultType: PartyRecord['type'] = 'Client';
  if (tx.type === 'IN' || subType.includes('sales') || subType.includes('client')) {
    defaultType = 'Client';
  } else if (subType.includes('sub con') || subType.includes('subcontractor')) {
    defaultType = 'Subcontractor';
  } else if (subType.includes('material') || subType.includes('supplier')) {
    defaultType = 'Supplier';
  } else if (subType.includes('labour') || subType.includes('staff') || subType.includes('i paid')) {
    defaultType = 'Staff';
  } else {
    defaultType = 'Vendor';
  }

  // 1. Ensure or find Party
  const parties = getFinanceParties();
  let party = parties.find(p => p.name.trim().toLowerCase() === partyName.toLowerCase());
  if (!party) {
    party = ensurePartyExists(partyName, project.name, defaultType);
  } else {
    if (project.name && (!party.activeProjects || !party.activeProjects.includes(project.name))) {
      party.activeProjects = [...(party.activeProjects || []), project.name];
    }
  }

  const amt = Number(tx.amount) || 0;

  // Update Party Balances
  if (party.type === 'Client') {
    if (subType.includes('sales')) {
      party.totalBilled = (party.totalBilled || 0) + amt;
      party.balanceDue = Math.max(0, party.totalBilled - (party.totalPaid || 0));
      party.status = party.balanceDue > 0 ? 'To Receive' : 'Settled';
    } else if (tx.type === 'IN') {
      party.totalPaid = (party.totalPaid || 0) + amt;
      party.balanceDue = Math.max(0, (party.totalBilled || 0) - party.totalPaid);
      party.status = party.balanceDue > 0 ? 'To Receive' : (party.totalPaid > (party.totalBilled || 0) ? 'Advance Received' : 'Settled');
    }
  } else {
    // Vendor, Subcontractor, Supplier, Staff
    if (tx.type === 'OUT' && (subType.includes('payment out') || subType.includes('i paid'))) {
      party.totalPaid = (party.totalPaid || 0) + amt;
      party.balanceDue = Math.max(0, (party.totalBilled || 0) - party.totalPaid);
      party.status = party.balanceDue > 0 ? 'To Pay' : (party.totalPaid > (party.totalBilled || 0) ? 'Advance Paid' : 'Settled');
    } else if (tx.type === 'OUT') {
      party.totalBilled = (party.totalBilled || 0) + amt;
      party.balanceDue = Math.max(0, party.totalBilled - (party.totalPaid || 0));
      party.status = party.balanceDue > 0 ? 'To Pay' : 'Settled';
    }
  }

  // Save updated parties
  const partyList = getFinanceParties().map(p => p.id === party!.id ? party! : p);
  if (!partyList.some(p => p.id === party!.id)) {
    partyList.unshift(party);
  }
  saveFinanceParties(partyList);

  const dParts = parseDateParts(tx.date);
  const formattedDate = `${dParts.day} ${dParts.month} ${dParts.year.slice(-2)}`;

  // 2. Add to Cashbook Transactions (booshnam_finance_transactions)
  try {
    const rawTxns = localStorage.getItem(FINANCE_STORAGE_KEYS.TRANSACTIONS);
    const existingTxns: FinanceTransaction[] = rawTxns ? JSON.parse(rawTxns) : [];
    
    // Check if duplicate already exists
    const duplicate = existingTxns.find(
      t => t.id === tx.id || t.txnCode === tx.transaction_number
    );

    if (!duplicate) {
      const modeMapping: FinanceTransaction['mode'] = 
        tx.payment_mode === 'Bank Transfer' ? 'NEFT/RTGS' :
        tx.payment_mode === 'Cheque' ? 'CHEQUE' :
        tx.payment_mode === 'UPI' ? 'UPI' : 'CASH';

      const finTx: FinanceTransaction = {
        id: tx.id,
        txnCode: tx.transaction_number,
        date: formattedDate,
        type: tx.type === 'IN' ? 'INCOME' : 'EXPENSE',
        partyName: party.name,
        projectName: project.name,
        category: tx.transaction_sub_type || tx.category || (tx.type === 'IN' ? 'Client Billing' : 'Site Expense'),
        amount: amt,
        mode: modeMapping,
        referenceNo: tx.reference_no || tx.transaction_number,
        status: 'Completed',
        transactionType: tx.transaction_sub_type || (tx.type === 'IN' ? 'Payment In' : 'Payment Out'),
        costCode: tx.category || undefined,
        notes: tx.notes && tx.notes !== '-' ? tx.notes : undefined
      };

      existingTxns.unshift(finTx);
      localStorage.setItem(FINANCE_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(existingTxns));
    }
  } catch (e) {
    console.error('Failed to sync to finance transactions:', e);
  }

  // 3. Add to Party Ledger (booshnam_party_transactions_v2)
  try {
    const rawLedgers = localStorage.getItem(FINANCE_STORAGE_KEYS.PARTY_TRANSACTIONS);
    const partyLedgers: Record<string, PartyLedgerTransaction[]> = rawLedgers ? JSON.parse(rawLedgers) : {};
    
    const existingForParty = partyLedgers[party.id] || [];
    const duplicateLedger = existingForParty.find(
      l => l.id === `ptx-${tx.id}` || l.title.includes(tx.transaction_number)
    );

    if (!duplicateLedger) {
      let ledgerType: PartyLedgerTransaction['type'] = 'PAYMENT_IN';
      if (subType.includes('sales')) {
        ledgerType = 'SALES_INVOICE';
      } else if (tx.type === 'IN') {
        ledgerType = 'PAYMENT_IN';
      } else if (subType.includes('payment out') || subType.includes('i paid')) {
        ledgerType = 'PAYMENT_OUT';
      } else {
        ledgerType = 'EXPENSE';
      }

      const ptx: PartyLedgerTransaction = {
        id: `ptx-${tx.id}`,
        partyId: party.id,
        partyName: party.name,
        date: `${dParts.day} ${dParts.month} ${dParts.year}`,
        day: dParts.day,
        month: dParts.month,
        year: dParts.year,
        title: `${tx.transaction_sub_type || (tx.type === 'IN' ? 'Payment In' : 'Payment Out')} (${tx.payment_mode || 'Cash'})`,
        projectName: project.name,
        category: tx.transaction_sub_type || tx.category,
        notes: `Project: ${project.name} • Ref: ${tx.reference_no || tx.transaction_number}${tx.notes && tx.notes !== '-' ? ` • ${tx.notes}` : ''}`,
        amount: amt,
        type: ledgerType
      };

      partyLedgers[party.id] = [ptx, ...existingForParty];
      localStorage.setItem(FINANCE_STORAGE_KEYS.PARTY_TRANSACTIONS, JSON.stringify(partyLedgers));
    }
  } catch (e) {
    console.error('Failed to sync party ledger:', e);
  }

  // 4. Update Party Summaries (booshnam_party_summaries)
  try {
    const rawSummaries = localStorage.getItem(FINANCE_STORAGE_KEYS.PARTY_SUMMARIES);
    const summaries: Record<string, { opening: number; partyPaid: number; salesInvoice: number }> = 
      rawSummaries ? JSON.parse(rawSummaries) : {};
    
    const current = summaries[party.id] || {
      opening: 0,
      partyPaid: 0,
      salesInvoice: party.balanceDue || 0
    };

    if (subType.includes('sales')) {
      current.salesInvoice += amt;
    } else if (tx.type === 'IN' || subType.includes('payment out') || subType.includes('i paid')) {
      current.partyPaid += amt;
    }

    summaries[party.id] = current;
    localStorage.setItem(FINANCE_STORAGE_KEYS.PARTY_SUMMARIES, JSON.stringify(summaries));
  } catch (e) {
    console.error('Failed to sync party summaries:', e);
  }

  // 5. Update Bank Account & Account Statements
  try {
    const isBank = tx.payment_mode === 'Bank Transfer' || tx.payment_mode === 'Cheque';
    if (isBank) {
      const rawBanks = localStorage.getItem(FINANCE_STORAGE_KEYS.BANK_ACCOUNTS);
      let banks: BankAccountRecord[] = rawBanks ? JSON.parse(rawBanks) : [];
      let targetBank = banks.find(b => tx.bank_name && b.bankName.toLowerCase().includes(tx.bank_name.toLowerCase())) 
        || banks.find(b => b.isPrimary) 
        || banks[0];

      if (targetBank) {
        targetBank.balance = (targetBank.balance || 0) + (tx.type === 'IN' ? amt : -amt);
        banks = banks.map(b => b.id === targetBank!.id ? targetBank! : b);
        localStorage.setItem(FINANCE_STORAGE_KEYS.BANK_ACCOUNTS, JSON.stringify(banks));

        // Add statement
        const rawStatements = localStorage.getItem(FINANCE_STORAGE_KEYS.STATEMENTS);
        const statements: AccountStatementTransaction[] = rawStatements ? JSON.parse(rawStatements) : [];
        const stmtTx: AccountStatementTransaction = {
          id: `st-${tx.id}`,
          accountId: targetBank.id,
          date: formattedDate,
          rawDate: tx.date,
          partyName: party.name,
          voucherCode: tx.transaction_number,
          paymentType: tx.type === 'IN' ? 'Payment In' : 'Payment Out',
          type: tx.type === 'IN' ? 'Credit' : 'Debit',
          amount: amt,
          paymentMode: tx.payment_mode,
          projectName: project.name,
          sourceAccountName: targetBank.accountName,
          details: `${tx.transaction_sub_type || 'Project Txn'} - ${tx.notes || ''}`
        };
        statements.unshift(stmtTx);
        localStorage.setItem(FINANCE_STORAGE_KEYS.STATEMENTS, JSON.stringify(statements));
      }
    } else if (tx.payment_mode === 'Cash') {
      const rawStatements = localStorage.getItem(FINANCE_STORAGE_KEYS.STATEMENTS);
      const statements: AccountStatementTransaction[] = rawStatements ? JSON.parse(rawStatements) : [];
      const stmtTx: AccountStatementTransaction = {
        id: `st-c-${tx.id}`,
        accountId: 'cash',
        date: formattedDate,
        rawDate: tx.date,
        partyName: party.name,
        voucherCode: tx.transaction_number,
        paymentType: tx.type === 'IN' ? 'Payment In' : 'Payment Out',
        type: tx.type === 'IN' ? 'Credit' : 'Debit',
        amount: amt,
        paymentMode: 'Cash',
        projectName: project.name,
        sourceAccountName: 'Site Petty Cash',
        details: `${tx.transaction_sub_type || 'Project Cash Txn'} - ${tx.notes || ''}`
      };
      statements.unshift(stmtTx);
      localStorage.setItem(FINANCE_STORAGE_KEYS.STATEMENTS, JSON.stringify(statements));
    }
  } catch (e) {
    console.error('Failed to sync bank accounts & statements:', e);
  }

  // 6. If Expense (OUT), sync to Accounts Expenses
  if (tx.type === 'OUT' && (subType.includes('expense') || subType.includes('purchase') || subType.includes('bill'))) {
    try {
      const rawExps = localStorage.getItem(FINANCE_STORAGE_KEYS.EXPENSES);
      const expenses: ExpenseItem[] = rawExps ? JSON.parse(rawExps) : [];
      if (!expenses.some(e => e.id === `exp-${tx.id}` || e.expenseCode === tx.transaction_number)) {
        const expItem: ExpenseItem = {
          id: `exp-${tx.id}`,
          expenseCode: tx.transaction_number,
          date: formattedDate,
          title: `${tx.transaction_sub_type || 'Expense'}: ${party.name}`,
          category: subType.includes('equipment') ? 'Machinery & Equipment' : subType.includes('labour') ? 'Labour & Daily Wages' : 'Materials',
          amount: amt,
          projectName: project.name,
          partyOrVendorName: party.name,
          paidFromAccount: tx.bank_name || 'Cash',
          paymentMode: tx.payment_mode,
          status: 'Paid',
          referenceNo: tx.reference_no || tx.transaction_number,
          invoiceUrl: tx.media_url
        };
        expenses.unshift(expItem);
        localStorage.setItem(FINANCE_STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
      }
    } catch (e) {
      console.error('Failed to sync expenses:', e);
    }
  }

  // 7. Dispatch global sync events
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('booshnam_finance_updated', {
    detail: { partyName: party.name, projectName: project.name, amount: amt }
  }));
}

// ----------------------------------------------------
// 4. Sync Project Payment Request to Accounts & Finance
// ----------------------------------------------------
export function syncProjectPaymentRequestToFinance(
  project: { id?: string; code?: string; name: string; client_name?: string },
  pr: PaymentRequest
): void {
  const partyName = (pr.party_name || '').trim();
  if (!partyName) return;

  // Ensure Party exists
  ensurePartyExists(partyName, project.name, 'Vendor');

  try {
    const rawPRs = localStorage.getItem(FINANCE_STORAGE_KEYS.PAYMENT_REQUESTS);
    const prList: PaymentRequestItem[] = rawPRs ? JSON.parse(rawPRs) : [];

    const dParts = parseDateParts(pr.payment_date);
    const formattedDate = `${dParts.day} ${dParts.month} ${dParts.year.slice(-2)}`;

    const prItem: PaymentRequestItem = {
      id: pr.id,
      requestCode: pr.request_number,
      date: formattedDate,
      partyName,
      projectName: project.name,
      subProjectText: pr.request_type,
      amount: Number(pr.amount) || 0,
      status: pr.status === 'APPROVED' ? 'Approved' : pr.status === 'PAID' ? 'Paid' : pr.status === 'REJECTED' ? 'Rejected' : 'Pending',
      category: pr.request_type,
      notes: pr.notes,
      invoiceFile: pr.media_url
    };

    const duplicateIndex = prList.findIndex(p => p.id === pr.id || p.requestCode === pr.request_number);
    if (duplicateIndex >= 0) {
      prList[duplicateIndex] = prItem;
    } else {
      prList.unshift(prItem);
    }

    localStorage.setItem(FINANCE_STORAGE_KEYS.PAYMENT_REQUESTS, JSON.stringify(prList));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('booshnam_finance_updated', {
      detail: { partyName, projectName: project.name, amount: pr.amount }
    }));
  } catch (e) {
    console.error('Failed to sync payment request:', e);
  }
}
