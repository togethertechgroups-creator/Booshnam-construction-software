import { SubconWorkOrder, SubconWorkOrderItem, SubconBill, SubconMilestone, SubconMaterialIssue, ProjectExpenseRecord, ProjectTransaction } from '../types';
import { addProjectExpense } from './invoiceService';
import { syncProjectTransactionToFinance } from './financeSyncService';

export const DEFAULT_SUBCON_WORK_ORDERS: SubconWorkOrder[] = [
  {
    id: 'wo-seed-62',
    wo_number: '#WO--62',
    subcon_name: 'PRASATH',
    trade_scope: 'Drilling & Machine Operation',
    work_order_title: '--',
    work_order_date: '2026-10-12',
    tax_type: 'ITEM_LEVEL',
    contract_amount: 1900,
    work_completed_percent: 0,
    billed_amount: 5500,
    retention_percent: 5,
    retention_amount: 0,
    paid_amount: 0,
    balance_payable: 1900,
    approval_status: 'Approved',
    status: 'ACTIVE',
    start_date: '2026-10-12',
    end_date: '2026-11-12',
    media_urls: [],
    items: [
      {
        id: 'wo-item-1',
        item_name: 'Drilling Charges',
        dimensions: '-',
        unit_rate: 400,
        unit: 'RMT',
        quantity: 1,
        billed_quantity: 1,
        unbilled_quantity: 0,
        amount: 400,
        gst_percent: 0
      },
      {
        id: 'wo-item-2',
        item_name: 'Operator Transportation',
        dimensions: '-',
        unit_rate: 1500,
        unit: 'nos',
        quantity: 1,
        billed_quantity: 1,
        unbilled_quantity: 0,
        amount: 1500,
        gst_percent: 0
      }
    ],
    milestones: [
      {
        id: 'ms-1',
        title: 'Initial Mobilization & Rig Setup',
        target_date: '2026-10-15',
        weightage_percent: 30,
        amount: 570,
        status: 'COMPLETED'
      },
      {
        id: 'ms-2',
        title: 'Borehole Drilling to 10m',
        target_date: '2026-10-25',
        weightage_percent: 70,
        amount: 1330,
        status: 'PENDING'
      }
    ],
    bills: [
      {
        id: 'bill-seed-65',
        bill_number: '#65',
        voucher_no: '#65',
        work_order_id: 'wo-seed-62',
        work_order_number: '#WO--62',
        vendor_name: 'PRASATH',
        invoice_date: '2026-10-12',
        items: [
          {
            item_id: 'wo-item-1',
            item_name: 'Drilling Charges',
            unit_rate: 400,
            unit: 'RMT',
            billed_qty: 1,
            unbilled_qty: 0,
            invoice_qty: 1,
            amount: 400
          },
          {
            item_id: 'wo-item-2',
            item_name: 'Operator Transportation',
            unit_rate: 1500,
            unit: 'nos',
            billed_qty: 1,
            unbilled_qty: 0,
            invoice_qty: 1,
            amount: 1500
          }
        ],
        item_level_tax: true,
        tax_percent: 0,
        tax_amount: 0,
        subtotal: 1900,
        discount: 0,
        additional_charges: 0,
        total_amount: 5500,
        deduction: 0,
        retention_percent: 5,
        retention_amount: 275,
        net_amount: 5225,
        round_off: false,
        status: 'APPROVED',
        notes: 'RA Bill #65 for drilling machine operator',
        created_at: '2026-10-12T10:00:00.000Z'
      }
    ],
    materials: [
      {
        id: 'mat-1',
        material_name: 'Drilling Mud / Bentonite',
        unit: 'Bags',
        issued_qty: 10,
        consumed_qty: 8,
        returned_qty: 2,
        issue_date: '2026-10-12',
        challan_no: 'CH-4091'
      }
    ],
    bank_details: {
      account_holder_name: 'NA',
      account_number: 'NA',
      ifsc_code: 'NA',
      bank_name: 'NA',
      notes: ''
    },
    additional_discount: 0,
    additional_charges: 0,
    gst_amount: 0
  }
];

export function getProjectSubconOrders(projectId: string): SubconWorkOrder[] {
  const key = `booshnam_subcon_workorders_v2_${projectId || 'default'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out legacy dummy seeds so new projects start clean
        const clean = parsed.filter(wo => !(
          wo.id === 'wo-seed-62' ||
          wo.id?.startsWith('wo-seed-') ||
          (wo.wo_number === '#WO--62' && wo.subcon_name === 'PRASATH')
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

export function saveProjectSubconOrders(projectId: string, orders: SubconWorkOrder[]): void {
  const key = `booshnam_subcon_workorders_v2_${projectId || 'default'}`;
  try {
    localStorage.setItem(key, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('booshnam_subcon_updated', { detail: { projectId, orders } }));
  } catch (e) {}
}

export function addSubconWorkOrder(projectId: string, newOrder: SubconWorkOrder): SubconWorkOrder[] {
  const current = getProjectSubconOrders(projectId);
  const updated = [newOrder, ...current];
  saveProjectSubconOrders(projectId, updated);
  return updated;
}

export function updateSubconWorkOrder(projectId: string, updatedOrder: SubconWorkOrder): SubconWorkOrder[] {
  const current = getProjectSubconOrders(projectId);
  const updated = current.map(wo => wo.id === updatedOrder.id ? updatedOrder : wo);
  saveProjectSubconOrders(projectId, updated);
  return updated;
}

export function deleteSubconWorkOrder(projectId: string, orderId: string): SubconWorkOrder[] {
  const current = getProjectSubconOrders(projectId);
  const updated = current.filter(wo => wo.id !== orderId);
  saveProjectSubconOrders(projectId, updated);
  return updated;
}

/**
 * Add a Subcontractor Expense (RA Bill) to a Work Order and sync to Finance/Transactions
 */
export function addSubconBillToWorkOrder(
  projectId: string,
  projectName: string,
  workOrderId: string,
  bill: SubconBill
): SubconWorkOrder[] {
  const current = getProjectSubconOrders(projectId);
  const targetWO = current.find(wo => wo.id === workOrderId);
  if (!targetWO) return current;

  // Add bill
  const updatedBills = [bill, ...(targetWO.bills || [])];
  
  // Recalculate billed amount on Work Order
  const totalBilled = updatedBills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  
  // Update billed_quantity on items
  const updatedItems = (targetWO.items || []).map(item => {
    const billItem = bill.items.find(bi => bi.item_id === item.id);
    if (billItem) {
      const newBilled = (item.billed_quantity || 0) + (billItem.invoice_qty || 0);
      return {
        ...item,
        billed_quantity: newBilled,
        unbilled_quantity: item.quantity - newBilled
      };
    }
    return item;
  });

  const updatedWO: SubconWorkOrder = {
    ...targetWO,
    bills: updatedBills,
    items: updatedItems,
    billed_amount: totalBilled
  };

  const updatedOrders = current.map(wo => wo.id === workOrderId ? updatedWO : wo);
  saveProjectSubconOrders(projectId, updatedOrders);

  // Sync to Project Expenses in invoiceService so TransactionsTab sees it
  try {
    const expenseRecord: ProjectExpenseRecord = {
      id: `exp-${bill.id}`,
      project_id: projectId,
      voucher_no: bill.bill_number,
      date: bill.invoice_date,
      party_name: bill.vendor_name,
      item_name: bill.items.map(i => i.item_name).join(', ') || 'Subcontractor RA Bill',
      quantity: 1,
      unit_rate: bill.total_amount,
      enable_gst: bill.tax_amount > 0,
      gst_percent: bill.tax_percent || 0,
      subtotal: bill.subtotal,
      tax_amount: bill.tax_amount,
      total_amount: bill.total_amount,
      settled_amount: 0,
      balance_due: bill.total_amount,
      status: 'PENDING',
      notes: `RA Bill ${bill.bill_number} for Work Order ${bill.work_order_number}`
    };
    addProjectExpense(projectId, expenseRecord);
  } catch (e) {
    console.error('Failed to sync expense to invoiceService:', e);
  }

  // Sync to Central Finance as an Expense
  try {
    const tx: ProjectTransaction = {
      id: `tx-subcon-${bill.id}`,
      project_id: projectId,
      transaction_number: bill.bill_number.startsWith('#') ? bill.bill_number : `#${bill.bill_number}`,
      date: bill.invoice_date,
      time: '10:00 AM',
      party_name: bill.vendor_name,
      party_category: 'SUBCONTRACTOR',
      transaction_sub_type: 'Sub Con Expense',
      type: 'OUT',
      category: 'SUBCONTRACTOR_EXPENSE',
      payment_mode: bill.status === 'APPROVED' ? 'Approved Bill' : 'Pending',
      amount: bill.total_amount,
      status: 'APPROVED',
      notes: `RA Bill ${bill.bill_number} for Work Order ${targetWO.wo_number}`,
      project_name: projectName,
      cost_code: bill.cost_code || 'CC-SUBCON-01'
    };
    syncProjectTransactionToFinance({ id: projectId, name: projectName }, tx);

    // Save directly to Project Transactions for Transaction Tab
    const targetKey = `siteops_project_transactions_${projectId || 'default'}`;
    try {
      const raw = localStorage.getItem(targetKey);
      const list: ProjectTransaction[] = raw ? JSON.parse(raw) : [];
      if (!list.some(t => t.id === tx.id || t.transaction_number === tx.transaction_number)) {
        list.unshift(tx);
        localStorage.setItem(targetKey, JSON.stringify(list));
      }
    } catch (err) {}

    window.dispatchEvent(new CustomEvent('siteops_project_transactions_updated', { detail: { projectId } }));
    window.dispatchEvent(new CustomEvent('booshnam_subcon_updated', { detail: { projectId, orders: updatedOrders } }));
  } catch (e) {
    console.error('Failed to sync transaction to finance:', e);
  }

  return updatedOrders;
}
