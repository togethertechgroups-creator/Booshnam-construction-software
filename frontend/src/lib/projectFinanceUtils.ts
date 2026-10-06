import { Project, ProjectTransaction, PaymentRequest } from '../types';

export interface ProjectCostCodeExpense {
  code: string;
  budget: number;
  expense: number;
  variance: number;
  isOverBudget: boolean;
}

export interface ProjectFinancialSummary {
  cashIn: number;
  cashOut: number;
  netCashPosition: number;
  totalExpense: number;
  totalSalesInvoice: number;
  estimatedBudget: number;
  boqValue: number;
  workDoneValue: number;
  estimatedMargin: number;
  payables: number;
  receivables: number;
  siteStaffExpense: number;
  labourContractorExpense: number;
  officeStaffExpense: number;
  costCodeBreakdown: ProjectCostCodeExpense[];
  overBudgetCount: number;
  underBudgetCount: number;
  transactionsCount: number;
  recentTransactions: ProjectTransaction[];
}

/**
 * Robustly load all transactions for a project strictly scoped to this project
 */
export function getProjectTransactions(project: { id?: string; code?: string; name?: string }): ProjectTransaction[] {
  const txMap = new Map<string, ProjectTransaction>();

  const pId = (project.id || '').trim();
  const pCode = (project.code || '').trim();
  const pName = (project.name || '').trim().toLowerCase();

  // 1. Only query storage keys that explicitly belong to this project
  const primaryKeys: string[] = [];
  if (pId) primaryKeys.push(`siteops_project_transactions_${pId}`);
  if (pCode && pCode !== pId) primaryKeys.push(`siteops_project_transactions_${pCode}`);
  
  // Only use default key if project has neither id nor code (e.g. temporary sandbox)
  if (!pId && !pCode) {
    primaryKeys.push('siteops_project_transactions_default');
  }

  for (const k of primaryKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const tx of parsed) {
            if (tx && tx.id && !txMap.has(tx.id)) {
              txMap.set(tx.id, tx);
            }
          }
        }
      }
    } catch (e) {}
  }

  // 2. Scan other localStorage keys with strict project matching (never bleed default into known projects)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('siteops_project_transactions_') && !primaryKeys.includes(k)) {
        // Skip default storage key if we are dealing with a real project that has id/code
        if (k === 'siteops_project_transactions_default' && (pId || pCode)) continue;
        
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const tx of parsed) {
              if (!tx || !tx.id || txMap.has(tx.id)) continue;
              
              const txProj = tx.project || (tx as any).projectId || (tx as any).project_id;
              const txProjCode = (tx as any).projectCode || (tx as any).project_code;
              const txProjName = (tx.projectName || (tx as any).project_name || '').trim().toLowerCase();

              const matchesId = pId && txProj && (txProj === pId || txProj === pCode);
              const matchesCode = pCode && (txProjCode === pCode || txProj === pCode);
              const matchesName = pName && txProjName && txProjName === pName;

              // Only include if positively matched to this project
              if (matchesId || matchesCode || (matchesName && (!txProj || txProj === pId || txProj === pCode))) {
                txMap.set(tx.id, tx);
              }
            }
          }
        }
      }
    }
  } catch (e) {}

  // 3. Scan booshnam_finance_transactions from Accounts & Finance sync with strict project match
  if (pName || pId || pCode) {
    try {
      const raw = localStorage.getItem('booshnam_finance_transactions');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const ft of parsed) {
            if (!ft) continue;
            const ftProjId = (ft.projectId || ft.project_id || '').trim();
            const ftProjCode = (ft.projectCode || ft.project_code || '').trim();
            const ftProjName = (ft.projectName || ft.project_name || '').trim().toLowerCase();

            const matchesId = pId && ftProjId && ftProjId === pId;
            const matchesCode = pCode && (ftProjCode === pCode || ftProjId === pCode);
            const matchesName = pName && ftProjName && ftProjName === pName && (!ftProjId || ftProjId === pId || ftProjId === pCode);

            if (matchesId || matchesCode || matchesName) {
              const mappedId = `ft-${ft.id}`;
              const origId = ft.id;
              if (!txMap.has(origId) && !txMap.has(mappedId)) {
                txMap.set(mappedId, {
                  id: mappedId,
                  transaction_number: ft.txnCode || ft.referenceNo || `#FT-${ft.id}`,
                  date: ft.date || new Date().toISOString().split('T')[0],
                  time: '12:00 PM',
                  type: ft.type === 'INCOME' ? 'IN' : 'OUT',
                  party_name: ft.partyName || ft.party || 'Party',
                  category: ft.category || 'Finance Sync',
                  transaction_sub_type: ft.transactionType || (ft.type === 'INCOME' ? 'Payment In' : 'Payment Out'),
                  amount: Number(ft.amount) || 0,
                  payment_mode: ft.mode || 'Cash',
                  reference_no: ft.referenceNo,
                  cost_code: ft.costCode,
                  status: 'APPROVED',
                  notes: ft.notes || '-'
                });
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  // Sort by date descending
  return Array.from(txMap.values()).sort((a, b) => {
    const tA = new Date(a.date).getTime() || 0;
    const tB = new Date(b.date).getTime() || 0;
    return tB - tA;
  });
}

/**
 * Robustly load all payment requests for a project
 */
export function getProjectPaymentRequests(project: { id?: string; code?: string; name?: string }): PaymentRequest[] {
  const prMap = new Map<string, PaymentRequest>();
  const pId = (project.id || '').trim();
  const pCode = (project.code || '').trim();

  const keysToTry: string[] = [];
  if (pId) keysToTry.push(`siteops_payment_requests_${pId}`);
  if (pCode && pCode !== pId) keysToTry.push(`siteops_payment_requests_${pCode}`);
  if (!pId && !pCode) keysToTry.push('siteops_payment_requests_default');

  for (const k of keysToTry) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const pr of parsed) {
            if (pr && pr.id && !prMap.has(pr.id)) {
              prMap.set(pr.id, pr);
            }
          }
        }
      }
    } catch (e) {}
  }
  return Array.from(prMap.values());
}

/**
 * Compute comprehensive financial totals & breakdown for a project
 */
export function calculateProjectFinancialSummary(
  project: Project,
  preloadedTransactions?: ProjectTransaction[]
): ProjectFinancialSummary {
  const transactions = preloadedTransactions || getProjectTransactions(project);
  const paymentRequests = getProjectPaymentRequests(project);

  // 1. Cash In & Cash Out
  const cashIn = transactions
    .filter(t => t.type === 'IN')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const cashOut = transactions
    .filter(t => t.type === 'OUT')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netCashPosition = cashIn - cashOut;
  const totalExpense = cashOut;

  // 2. Sales Invoicing
  // Explicit sales invoices recorded for this project
  const explicitSales = transactions
    .filter(t => 
      t.transaction_sub_type === 'Sales Invoice' || 
      t.transaction_sub_type === 'Material Sales' ||
      (t.category && t.category.toLowerCase().includes('sales'))
    )
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // If explicit sales invoices exist, use them. Only fall back to project.sales_invoice if positive, otherwise 0
  const totalSalesInvoice = explicitSales > 0 ? explicitSales : Number(project.sales_invoice || 0);

  // 3. Estimated Budget & BOQ Value
  let estimatedBudget = Number(project.estimated_budget || (project as any).project_value || 0);
  let boqValue = Number(project.boq_value || 0);

  // If budget or BOQ are 0, check if this project originated from or has a matching quotation in booshnam_quotations_v2
  if (estimatedBudget === 0 || boqValue === 0) {
    try {
      const rawQuotes = localStorage.getItem('booshnam_quotations_v2');
      if (rawQuotes) {
        const quotes = JSON.parse(rawQuotes);
        if (Array.isArray(quotes)) {
          const pName = project.name ? project.name.trim().toLowerCase() : '';
          const cName = project.client_name ? project.client_name.trim().toLowerCase() : '';
          const matched = quotes.find((q: any) => 
            (q.project_id && (q.project_id === project.id || q.project_id === project.code)) ||
            (q.project_title && pName && q.project_title.trim().toLowerCase() === pName) ||
            (q.client_name && cName && q.client_name.trim().toLowerCase() === cName)
          );
          if (matched && Number(matched.total_amount || matched.subtotal) > 0) {
            const quoteRate = Number(matched.total_amount || matched.subtotal);
            if (estimatedBudget === 0) estimatedBudget = quoteRate;
            if (boqValue === 0) boqValue = quoteRate;
          }
        }
      }
    } catch (e) {}
  }

  // Align BOQ and Budget if one was set and the other is 0
  if (boqValue === 0 && estimatedBudget > 0) {
    boqValue = estimatedBudget;
  }
  if (estimatedBudget === 0 && boqValue > 0) {
    estimatedBudget = boqValue;
  }

  // 4. Work Done Value
  // Work done represents the value of work completed so far, based on task completion % or explicit work_done
  let progressPct = Number(project.progress_percentage || 0);
  if (project.id) {
    try {
      const rawTasks = localStorage.getItem(`booshnam_wbs_tasks_v2_${project.id}`);
      if (rawTasks) {
        const parsed = JSON.parse(rawTasks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const done = parsed.filter((t: any) => t.status === 'COMPLETED').length;
          progressPct = Math.round((done / parsed.length) * 100);
        }
      }
    } catch (e) {}
  }

  const workDoneValue = Number(project.work_done || 0) > 0
    ? Number(project.work_done)
    : Math.round((progressPct / 100) * boqValue);

  // 5. Estimated Margin
  const estimatedMargin = project.estimated_margin !== undefined && project.estimated_margin > 0
    ? project.estimated_margin
    : Math.max(0, boqValue - (estimatedBudget || cashOut));

  // 6. Receivables & Payables
  // Receivables = billed amount not yet collected (totalSalesInvoice - cashIn)
  let receivables = project.receivables !== undefined && project.receivables > 0
    ? project.receivables
    : Math.max(0, totalSalesInvoice - cashIn);

  // Payables = pending payment requests + subcontractor balance
  let subconBalance = 0;
  try {
    const rawSubcons = localStorage.getItem(`booshnam_subcontractors_v1_${project.id}`);
    if (rawSubcons) {
      const parsed = JSON.parse(rawSubcons);
      if (Array.isArray(parsed)) {
        subconBalance = parsed.reduce((sum: number, s: any) => sum + (Number(s.balance_payable) || 0), 0);
      }
    }
  } catch (e) {}

  const pendingPrTotal = paymentRequests
    .filter(pr => pr.status === 'PENDING' || pr.status === 'APPROVED')
    .reduce((sum, pr) => sum + (Number(pr.amount) || 0), 0);

  let payables = project.payables !== undefined && project.payables > 0
    ? project.payables
    : (pendingPrTotal + subconBalance);

  // 7. Salary Expense Breakdown
  let siteStaffExpense = Number(project.site_staff_expense || 0);
  let labourContractorExpense = Number(project.labour_contractor_expense || 0);
  let officeStaffExpense = Number(project.office_staff_expense || 0);

  transactions
    .filter(t => t.type === 'OUT')
    .forEach(t => {
      const sub = (t.transaction_sub_type || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const code = (t.cost_code || '').toLowerCase();
      const party = (t.party_name || '').toLowerCase();
      const notes = (t.notes || '').toLowerCase();
      const combined = `${sub} ${cat} ${code} ${party} ${notes}`;

      const amt = Number(t.amount) || 0;

      if (combined.includes('labour') || combined.includes('labor') || combined.includes('subcon') || combined.includes('wages') || sub.includes('sub con bill')) {
        labourContractorExpense += amt;
      } else if (combined.includes('office') || combined.includes('admin') || combined.includes('management') || combined.includes('director')) {
        officeStaffExpense += amt;
      } else if (combined.includes('staff') || combined.includes('engineer') || combined.includes('supervisor') || combined.includes('salary')) {
        siteStaffExpense += amt;
      }
    });

  // 8. Cost Code & Category Breakdown (only if transactions exist)
  const costCodeMap = new Map<string, number>();
  transactions
    .filter(t => t.type === 'OUT')
    .forEach(t => {
      const code = t.cost_code || t.category || t.transaction_sub_type || 'General Expense';
      costCodeMap.set(code, (costCodeMap.get(code) || 0) + (Number(t.amount) || 0));
    });

  const costCodeBreakdown: ProjectCostCodeExpense[] = [];
  costCodeMap.forEach((expense, code) => {
    const benchmarkBudget = estimatedBudget > 0 ? Math.round(estimatedBudget / Math.max(1, costCodeMap.size)) : expense;
    const variance = benchmarkBudget > 0 ? Math.round(((expense - benchmarkBudget) / benchmarkBudget) * 100) : 0;
    const isOverBudget = expense > benchmarkBudget && benchmarkBudget > 0;

    costCodeBreakdown.push({
      code,
      budget: benchmarkBudget,
      expense,
      variance,
      isOverBudget
    });
  });

  const overBudgetCount = costCodeBreakdown.filter(c => c.isOverBudget).length;
  const underBudgetCount = costCodeBreakdown.filter(c => !c.isOverBudget).length;

  return {
    cashIn,
    cashOut,
    netCashPosition,
    totalExpense,
    totalSalesInvoice,
    estimatedBudget,
    boqValue,
    workDoneValue,
    estimatedMargin,
    payables,
    receivables,
    siteStaffExpense,
    labourContractorExpense,
    officeStaffExpense,
    costCodeBreakdown,
    overBudgetCount,
    underBudgetCount,
    transactionsCount: transactions.length,
    recentTransactions: transactions.slice(0, 10)
  };
}

/**
 * Recalculate and update the project's financial fields in `booshnam_projects_v2` localStorage,
 * and dispatch global change events so all views update automatically!
 */
export function syncProjectFinancialsToStorage(
  projectId: string,
  projectCode?: string,
  projectName?: string
): ProjectFinancialSummary | null {
  try {
    const rawProjects = localStorage.getItem('booshnam_projects_v2');
    if (!rawProjects) return null;

    const projects: Project[] = JSON.parse(rawProjects);
    if (!Array.isArray(projects)) return null;

    const targetIndex = projects.findIndex(p => 
      (p.id && p.id === projectId) ||
      (projectCode && p.code === projectCode) ||
      (projectName && p.name && p.name.trim().toLowerCase() === projectName.trim().toLowerCase())
    );

    if (targetIndex === -1) return null;

    const targetProject = projects[targetIndex];
    const summary = calculateProjectFinancialSummary(targetProject);

    // Update financial fields directly on target project
    targetProject.cash_in = summary.cashIn;
    targetProject.cash_out = summary.cashOut;
    targetProject.actual_cost = summary.totalExpense;
    targetProject.sales_invoice = summary.totalSalesInvoice;
    targetProject.receivables = summary.receivables;
    targetProject.payables = summary.payables;
    targetProject.work_done = summary.workDoneValue;
    targetProject.site_staff_expense = summary.siteStaffExpense;
    targetProject.labour_contractor_expense = summary.labourContractorExpense;
    targetProject.office_staff_expense = summary.officeStaffExpense;

    if (!targetProject.estimated_budget || targetProject.estimated_budget === 0) {
      if (summary.estimatedBudget > 0) targetProject.estimated_budget = summary.estimatedBudget;
    }
    if (!targetProject.boq_value || targetProject.boq_value === 0) {
      if (summary.boqValue > 0) targetProject.boq_value = summary.boqValue;
    }

    projects[targetIndex] = targetProject;
    localStorage.setItem('booshnam_projects_v2', JSON.stringify(projects));

    // Dispatch global events
    window.dispatchEvent(new CustomEvent('booshnam_projects_updated', { detail: projects }));
    window.dispatchEvent(new CustomEvent('siteops_project_transactions_updated', {
      detail: {
        projectId: targetProject.id,
        projectCode: targetProject.code,
        summary
      }
    }));

    return summary;
  } catch (e) {
    console.error('Failed to sync project financials to storage:', e);
    return null;
  }
}

/**
 * Scan all projects in `booshnam_projects_v2` and ensure their cash_in, cash_out,
 * and actual_cost are synchronized with any existing transactions in localStorage.
 */
export function syncAllProjectsFinancials(): Project[] {
  try {
    const rawProjects = localStorage.getItem('booshnam_projects_v2');
    if (!rawProjects) return [];

    const projects: Project[] = JSON.parse(rawProjects);
    if (!Array.isArray(projects)) return [];

    let hasChanges = false;
    const updated = projects.map(p => {
      const summary = calculateProjectFinancialSummary(p);
      const prevIn = p.cash_in || 0;
      const prevOut = p.cash_out || 0;
      const prevActual = p.actual_cost || 0;
      const prevSales = p.sales_invoice || 0;
      const prevWorkDone = p.work_done || 0;

      if (
        summary.cashIn !== prevIn || 
        summary.cashOut !== prevOut || 
        summary.totalExpense !== prevActual ||
        summary.totalSalesInvoice !== prevSales ||
        summary.workDoneValue !== prevWorkDone
      ) {
        hasChanges = true;
        return {
          ...p,
          cash_in: summary.cashIn,
          cash_out: summary.cashOut,
          actual_cost: summary.totalExpense,
          sales_invoice: summary.totalSalesInvoice,
          receivables: summary.receivables,
          payables: summary.payables,
          work_done: summary.workDoneValue,
          site_staff_expense: summary.siteStaffExpense,
          labour_contractor_expense: summary.labourContractorExpense,
          office_staff_expense: summary.officeStaffExpense,
          estimated_budget: p.estimated_budget || summary.estimatedBudget,
          boq_value: p.boq_value || summary.boqValue
        };
      }
      return p;
    });

    if (hasChanges) {
      localStorage.setItem('booshnam_projects_v2', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('booshnam_projects_updated', { detail: updated }));
    }

    return updated;
  } catch (e) {
    console.error('Failed to sync all projects financials:', e);
    return [];
  }
}
