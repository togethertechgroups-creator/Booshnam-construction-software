import { getTermsConditions } from './termsService';

export type MRStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PRStatus = 'DRAFT' | 'SUBMITTED_FOR_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'PO_CREATED';
export type POStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT_TO_VENDOR' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CLOSED' | 'CANCELLED';
export type GRNStatus = 'RECEIVED' | 'INSPECTED' | 'DEFECTS_NOTED' | 'STOCK_UPDATED';
export type InvoiceMatchStatus = 'PENDING' | 'MATCHED' | 'DISCREPANCY';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type PriorityLevel = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export interface MaterialRequestRecord {
  id: string;
  request_number: string;
  project_id: string;
  project_name: string;
  requested_by: string;
  material_category: string;
  material_name: string;
  material_specification: string;
  required_quantity: number;
  unit: string;
  required_date: string;
  priority: PriorityLevel;
  purpose: string;
  remarks: string;
  attachment_name?: string;
  request_date: string;
  status: MRStatus;
  available_stock_snapshot: number;
  shortage_quantity: number;
  linked_pr_number?: string;
}

export interface PurchaseRequestRecord {
  id: string;
  pr_number: string;
  project_id: string;
  project_name: string;
  mr_reference: string;
  mr_id?: string;
  material: string;
  specification: string;
  required_quantity: number;
  available_stock: number;
  purchase_quantity: number; // Shortage quantity
  unit: string;
  required_date: string;
  priority: PriorityLevel;
  requested_by: string;
  procurement_person: string;
  remarks: string;
  created_date: string;
  status: PRStatus;
  linked_rfq_number?: string;
  linked_po_number?: string;
}

export interface VendorQuotationItem {
  vendor_id: string;
  vendor_name: string;
  vendor_phone?: string;
  vendor_gst?: string;
  unit_rate: number;
  discount_percent: number;
  gst_percent: number;
  transport_charges: number;
  delivery_days: number;
  payment_terms: string;
  total_amount: number;
  is_selected?: boolean;
  notes?: string;
}

export interface RFQComparisonRecord {
  id: string;
  rfq_number: string;
  pr_number: string;
  pr_id?: string;
  project_name: string;
  material_name: string;
  quantity: number;
  unit: string;
  created_date: string;
  status: 'QUOTATIONS_RECEIVED' | 'VENDOR_SELECTED';
  selected_vendor_name?: string;
  quotations: VendorQuotationItem[];
}

export interface POItemLine {
  id: string;
  material_name: string;
  specification?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount_percent: number;
  gst_percent: number;
  transport_charges: number;
  total_amount: number;
  received_quantity: number;
}

export interface PurchaseOrderRecord {
  id: string;
  po_number: string;
  project_id: string;
  project_name: string;
  vendor_id: string;
  vendor_name: string;
  vendor_phone?: string;
  vendor_gst?: string;
  vendor_address?: string;
  pr_reference?: string;
  rfq_reference?: string;
  quotation_reference?: string;
  po_date: string;
  expected_delivery_date: string;
  delivery_location: string;
  payment_terms: string;
  items: POItemLine[];
  subtotal: number;
  tax_amount: number;
  transport_charges: number;
  total_amount: number;
  terms_conditions: string;
  notes: string;
  status: POStatus;
  created_by: string;
  approved_by?: string;
  grn_numbers: string[];
}

export interface GRNRecord {
  id: string;
  grn_number: string;
  po_number: string;
  po_id?: string;
  project_name: string;
  vendor_name: string;
  challan_number: string;
  vehicle_number: string;
  receipt_date: string;
  received_by: string;
  material_name: string;
  ordered_quantity: number;
  received_quantity: number;
  accepted_quantity: number; // Only accepted quantity increases inventory
  rejected_quantity: number;
  unit: string;
  status: GRNStatus;
  inspection_notes: string;
  is_stock_updated: boolean;
}

export interface PurchaseInvoiceRecord {
  id: string;
  invoice_number: string;
  vendor_invoice_ref: string;
  po_number: string;
  grn_number?: string;
  project_name: string;
  vendor_name: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  match_status: InvoiceMatchStatus;
  payment_status: PaymentStatus;
  match_notes?: string;
}

export interface SiteStockRecord {
  id: string;
  project_name: string;
  item_name: string;
  category: string;
  unit: string;
  current_quantity: number;
  minimum_threshold: number;
  is_low_stock: boolean;
  last_updated: string;
}

export interface ProcurementAuditLog {
  id: string;
  timestamp: string;
  role: string;
  user_name: string;
  action: string;
  details: string;
  document_ref?: string;
}

export interface ProcurementState {
  materialRequests: MaterialRequestRecord[];
  purchaseRequests: PurchaseRequestRecord[];
  rfqs: RFQComparisonRecord[];
  purchaseOrders: PurchaseOrderRecord[];
  grns: GRNRecord[];
  invoices: PurchaseInvoiceRecord[];
  stockItems: SiteStockRecord[];
  auditLogs: ProcurementAuditLog[];
}

const STORAGE_KEY = 'booshnam_procurement_state_v2';

// ── Realistic Initial Seed Data ──
const INITIAL_STOCK: SiteStockRecord[] = [
  {
    id: 'stk-1',
    project_name: 'Villa Complex Phase 1',
    item_name: '53 Grade OPC Cement',
    category: 'Cement',
    unit: 'Bags',
    current_quantity: 40,
    minimum_threshold: 100,
    is_low_stock: true,
    last_updated: '2026-09-28',
  },
  {
    id: 'stk-2',
    project_name: 'Villa Complex Phase 1',
    item_name: '12mm TMT Fe550D Rebar',
    category: 'Steel',
    unit: 'Tons',
    current_quantity: 3.5,
    minimum_threshold: 5.0,
    is_low_stock: true,
    last_updated: '2026-09-27',
  },
  {
    id: 'stk-3',
    project_name: 'Commercial Plaza Annexe',
    item_name: '20mm Blue Metal Aggregate',
    category: 'Aggregates',
    unit: 'Cu.m',
    current_quantity: 45,
    minimum_threshold: 20,
    is_low_stock: false,
    last_updated: '2026-09-28',
  },
  {
    id: 'stk-4',
    project_name: 'Commercial Plaza Annexe',
    item_name: 'Standard M-Sand',
    category: 'Aggregates',
    unit: 'Tons',
    current_quantity: 80,
    minimum_threshold: 25,
    is_low_stock: false,
    last_updated: '2026-09-25',
  },
  {
    id: 'stk-5',
    project_name: 'All Sites (Central Yard)',
    item_name: '9-inch Wirecut Clay Bricks',
    category: 'Bricks & Blocks',
    unit: 'Nos',
    current_quantity: 4500,
    minimum_threshold: 2000,
    is_low_stock: false,
    last_updated: '2026-09-26',
  },
];

const INITIAL_MATERIAL_REQUESTS: MaterialRequestRecord[] = [
  {
    id: 'mr-1',
    request_number: 'MR-2026-001',
    project_id: 'p-1',
    project_name: 'Villa Complex Phase 1',
    requested_by: 'Karthik (Site Engineer)',
    material_category: 'Cement',
    material_name: '53 Grade OPC Cement',
    material_specification: 'IS:12269 certified, 50kg HDPE moisture-proof bags',
    required_quantity: 200,
    unit: 'Bags',
    required_date: '2026-10-02',
    priority: 'URGENT',
    purpose: '1st Floor Slab casting and column staging for Block A',
    remarks: 'Concrete pump truck scheduled for Thursday morning.',
    attachment_name: 'slab_casting_schedule.pdf',
    request_date: '2026-09-27',
    status: 'APPROVED',
    available_stock_snapshot: 40,
    shortage_quantity: 160,
    linked_pr_number: 'PR-2026-001',
  },
  {
    id: 'mr-2',
    request_number: 'MR-2026-002',
    project_id: 'p-1',
    project_name: 'Villa Complex Phase 1',
    requested_by: 'Suresh (Site Supervisor)',
    material_category: 'Steel',
    material_name: '12mm TMT Fe550D Rebar',
    material_specification: 'High ductility earthquake resistant, Fe550D grade with test certificate',
    required_quantity: 8.0,
    unit: 'Tons',
    required_date: '2026-10-05',
    priority: 'HIGH',
    purpose: 'Raft foundation reinforcement beam mesh tying',
    remarks: 'Fabrication crew arriving Monday.',
    attachment_name: 'beam_detail_bar_bending.pdf',
    request_date: '2026-09-28',
    status: 'SUBMITTED',
    available_stock_snapshot: 3.5,
    shortage_quantity: 4.5,
  },
  {
    id: 'mr-3',
    request_number: 'MR-2026-003',
    project_id: 'p-2',
    project_name: 'Commercial Plaza Annexe',
    requested_by: 'Anand (Site Engineer)',
    material_category: 'Aggregates',
    material_name: '20mm Blue Metal Aggregate',
    material_specification: 'Clean crushed angular granite stone, free from dust & organic matter',
    required_quantity: 30,
    unit: 'Cu.m',
    required_date: '2026-10-08',
    priority: 'NORMAL',
    purpose: 'Basement retaining wall backfill and grade slab concrete',
    remarks: 'Site access gate 2 open between 8 PM and 6 AM for dumper trucks.',
    request_date: '2026-09-28',
    status: 'UNDER_REVIEW',
    available_stock_snapshot: 45,
    shortage_quantity: 0,
  }
];

const INITIAL_PURCHASE_REQUESTS: PurchaseRequestRecord[] = [
  {
    id: 'pr-1',
    pr_number: 'PR-2026-001',
    project_id: 'p-1',
    project_name: 'Villa Complex Phase 1',
    mr_reference: 'MR-2026-001',
    mr_id: 'mr-1',
    material: '53 Grade OPC Cement',
    specification: 'IS:12269 certified, 50kg HDPE moisture-proof bags',
    required_quantity: 200,
    available_stock: 40,
    purchase_quantity: 160, // Shortage calculated!
    unit: 'Bags',
    required_date: '2026-10-02',
    priority: 'URGENT',
    requested_by: 'Karthik (Site Engineer)',
    procurement_person: 'Vijay (Procurement Officer)',
    remarks: 'Stock verified in yard (40 bags). Exact shortage 160 bags to be ordered.',
    created_date: '2026-09-27',
    status: 'APPROVED',
    linked_rfq_number: 'RFQ-2026-001',
    linked_po_number: 'PO-2026-001',
  }
];

const INITIAL_RFQS: RFQComparisonRecord[] = [
  {
    id: 'rfq-1',
    rfq_number: 'RFQ-2026-001',
    pr_number: 'PR-2026-001',
    pr_id: 'pr-1',
    project_name: 'Villa Complex Phase 1',
    material_name: '53 Grade OPC Cement',
    quantity: 160,
    unit: 'Bags',
    created_date: '2026-09-27',
    status: 'VENDOR_SELECTED',
    selected_vendor_name: 'UltraTech Cement Distributors',
    quotations: [
      {
        vendor_id: 'v-1',
        vendor_name: 'UltraTech Cement Distributors',
        vendor_phone: '+91 98401 22334',
        vendor_gst: '33AAACU1234F1Z1',
        unit_rate: 410,
        discount_percent: 2,
        gst_percent: 18,
        transport_charges: 1800,
        delivery_days: 2,
        payment_terms: '30 Days Net',
        total_amount: 77720,
        is_selected: true,
        notes: 'Includes direct site unloading with mechanical crane.',
      },
      {
        vendor_id: 'v-2',
        vendor_name: 'Dalmia Bharat Cement Depot',
        vendor_phone: '+91 98409 88776',
        vendor_gst: '33AAACD9876D1Z2',
        unit_rate: 420,
        discount_percent: 0,
        gst_percent: 18,
        transport_charges: 2500,
        delivery_days: 3,
        payment_terms: '50% Advance, 50% on Delivery',
        total_amount: 81824,
        is_selected: false,
        notes: 'Unloading charges extra at ₹10 per bag.',
      },
      {
        vendor_id: 'v-3',
        vendor_name: 'Coromandel King Cement Agency',
        vendor_phone: '+91 94441 55667',
        vendor_gst: '33AAACC3344C1Z9',
        unit_rate: 415,
        discount_percent: 1,
        gst_percent: 18,
        transport_charges: 2200,
        delivery_days: 4,
        payment_terms: 'Immediate on Inspection',
        total_amount: 79777,
        is_selected: false,
      },
    ],
  },
];

const INITIAL_PURCHASE_ORDERS: PurchaseOrderRecord[] = [
  {
    id: 'po-1',
    po_number: 'PO-2026-001',
    project_id: 'p-1',
    project_name: 'Villa Complex Phase 1',
    vendor_id: 'v-1',
    vendor_name: 'UltraTech Cement Distributors',
    vendor_phone: '+91 98401 22334',
    vendor_gst: '33AAACU1234F1Z1',
    vendor_address: 'No. 45, SIDCO Industrial Estate, Guindy, Chennai - 600032',
    pr_reference: 'PR-2026-001',
    rfq_reference: 'RFQ-2026-001',
    quotation_reference: 'QT-UTC-9821',
    po_date: '2026-09-27',
    expected_delivery_date: '2026-09-29',
    delivery_location: 'Site Yard, Villa Complex Phase 1, Mogappair, Chennai',
    payment_terms: '30 Days Net from GRN Certification',
    items: [
      {
        id: 'poi-1',
        material_name: '53 Grade OPC Cement',
        specification: 'IS:12269 certified, 50kg HDPE moisture-proof bags',
        quantity: 160,
        unit: 'Bags',
        rate: 410,
        discount_percent: 2,
        gst_percent: 18,
        transport_charges: 1800,
        total_amount: 77720,
        received_quantity: 160,
      }
    ],
    subtotal: 64288,
    tax_amount: 11632,
    transport_charges: 1800,
    total_amount: 77720,
    terms_conditions:
      '1. Material must strictly conform to specified IS codes and approved brand standards.\n2. Delivery must be accompanied by original Tax Invoice, Delivery Challan, and Manufacturer Test Certificates.\n3. Goods are subject to site physical inspection and laboratory testing prior to final acceptance.\n4. Damaged, non-conforming, or rejected materials will be returned at vendor expense.\n5. Payment will be released as per agreed credit terms following verification and GRN certification.',
    notes: 'Urgent delivery required by 8:00 AM at Gate 1.',
    status: 'FULLY_RECEIVED',
    created_by: 'Vijay (Procurement Officer)',
    approved_by: 'R. Booshnam (Project Manager)',
    grn_numbers: ['GRN-2026-001'],
  },
  {
    id: 'po-2',
    po_number: 'PO-2026-002',
    project_id: 'p-1',
    project_name: 'Villa Complex Phase 1',
    vendor_id: 'v-4',
    vendor_name: 'Tata Tiscon Steel Hub',
    vendor_phone: '+91 98410 77665',
    vendor_gst: '33AAACT5566A1Z0',
    vendor_address: 'Steel Yard Complex, Ambattur Industrial Estate, Chennai',
    pr_reference: 'PR-2026-002',
    rfq_reference: 'RFQ-2026-002',
    quotation_reference: 'TTS-CHE-4410',
    po_date: '2026-09-28',
    expected_delivery_date: '2026-10-04',
    delivery_location: 'Site Yard, Villa Complex Phase 1, Mogappair, Chennai',
    payment_terms: '15 Days Net from Inspection',
    items: [
      {
        id: 'poi-2',
        material_name: '12mm TMT Fe550D Rebar',
        specification: 'High ductility earthquake resistant, Fe550D grade with test certificate',
        quantity: 5.0,
        unit: 'Tons',
        rate: 62000,
        discount_percent: 1,
        gst_percent: 18,
        transport_charges: 4500,
        total_amount: 366670,
        received_quantity: 0,
      }
    ],
    subtotal: 306900,
    tax_amount: 55270,
    transport_charges: 4500,
    total_amount: 366670,
    terms_conditions:
      '1. Material must strictly conform to specified IS codes and approved brand standards.\n2. Delivery must be accompanied by original Tax Invoice, Delivery Challan, and Manufacturer Test Certificates.',
    notes: 'Trailer delivery; ensure off-loading road clearance.',
    status: 'APPROVED',
    created_by: 'Vijay (Procurement Officer)',
    approved_by: 'R. Booshnam (Project Manager)',
    grn_numbers: [],
  }
];

const INITIAL_GRNS: GRNRecord[] = [
  {
    id: 'grn-1',
    grn_number: 'GRN-2026-001',
    po_number: 'PO-2026-001',
    po_id: 'po-1',
    project_name: 'Villa Complex Phase 1',
    vendor_name: 'UltraTech Cement Distributors',
    challan_number: 'DC-99201',
    vehicle_number: 'TN-05-AB-4312',
    receipt_date: '2026-09-29',
    received_by: 'Murugan (Storekeeper)',
    material_name: '53 Grade OPC Cement',
    ordered_quantity: 160,
    received_quantity: 160,
    accepted_quantity: 160, // Exactly 160 accepted and added to site inventory
    rejected_quantity: 0,
    unit: 'Bags',
    status: 'STOCK_UPDATED',
    inspection_notes: 'Manufacturer test certificate checked. Batch #09/2026. Bags dry and intact. Moisture check verified OK.',
    is_stock_updated: true,
  }
];

const INITIAL_INVOICES: PurchaseInvoiceRecord[] = [
  {
    id: 'inv-1',
    invoice_number: 'PINV-2026-001',
    vendor_invoice_ref: 'UTC-INV-8890',
    po_number: 'PO-2026-001',
    grn_number: 'GRN-2026-001',
    project_name: 'Villa Complex Phase 1',
    vendor_name: 'UltraTech Cement Distributors',
    invoice_date: '2026-09-29',
    due_date: '2026-10-29',
    subtotal: 64288,
    tax_amount: 11632,
    total_amount: 77720,
    paid_amount: 0,
    match_status: 'MATCHED',
    payment_status: 'UNPAID',
    match_notes: 'PO quantity (160), GRN accepted quantity (160), and Invoice quantity (160) match 100%. Rates verified.',
  }
];

const INITIAL_AUDIT_LOGS: ProcurementAuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-09-27 09:15',
    role: 'Site Engineer',
    user_name: 'Karthik',
    action: 'Created Material Request',
    details: 'Submitted MR-2026-001 for 200 Bags 53 Grade OPC Cement. Site stock check: 40 Bags available, shortage 160 Bags.',
    document_ref: 'MR-2026-001',
  },
  {
    id: 'log-2',
    timestamp: '2026-09-27 10:30',
    role: 'Procurement Officer',
    user_name: 'Vijay',
    action: 'Created Purchase Request',
    details: 'Generated PR-2026-001 from MR-2026-001 for calculated shortage of 160 Bags.',
    document_ref: 'PR-2026-001',
  },
  {
    id: 'log-3',
    timestamp: '2026-09-27 11:45',
    role: 'Project Manager',
    user_name: 'R. Booshnam',
    action: 'Approved Purchase Request',
    details: 'PR-2026-001 approved. Authorized RFQ dispatch to vendors.',
    document_ref: 'PR-2026-001',
  },
  {
    id: 'log-4',
    timestamp: '2026-09-27 15:20',
    role: 'Procurement Officer',
    user_name: 'Vijay',
    action: 'Vendor Quotation Comparison',
    details: 'Evaluated 3 vendors for RFQ-2026-001. Selected UltraTech Cement (L1 rate ₹410/bag, 2 days delivery).',
    document_ref: 'RFQ-2026-001',
  },
  {
    id: 'log-5',
    timestamp: '2026-09-27 16:10',
    role: 'Procurement Officer',
    user_name: 'Vijay',
    action: 'Generated Purchase Order',
    details: 'PO-2026-001 issued to UltraTech Cement Distributors for ₹77,720 (including GST & Freight).',
    document_ref: 'PO-2026-001',
  },
  {
    id: 'log-6',
    timestamp: '2026-09-29 08:45',
    role: 'Storekeeper',
    user_name: 'Murugan',
    action: 'Goods Receipt Note (GRN)',
    details: 'GRN-2026-001 inspected. 160 bags accepted. Site Yard inventory automatically incremented by 160 bags.',
    document_ref: 'GRN-2026-001',
  },
  {
    id: 'log-7',
    timestamp: '2026-09-29 10:15',
    role: 'Accounts',
    user_name: 'Sundar',
    action: '3-Way Match Verification',
    details: 'Recorded PINV-2026-001. 3-Way Match confirmed: PO-2026-001 == GRN-2026-001 == PINV-2026-001. Payout approved for 30-day net.',
    document_ref: 'PINV-2026-001',
  },
];

export function getProcurementState(): ProcurementState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        materialRequests: parsed.materialRequests || INITIAL_MATERIAL_REQUESTS,
        purchaseRequests: parsed.purchaseRequests || INITIAL_PURCHASE_REQUESTS,
        rfqs: parsed.rfqs || INITIAL_RFQS,
        purchaseOrders: parsed.purchaseOrders || INITIAL_PURCHASE_ORDERS,
        grns: parsed.grns || INITIAL_GRNS,
        invoices: parsed.invoices || INITIAL_INVOICES,
        stockItems: parsed.stockItems || INITIAL_STOCK,
        auditLogs: parsed.auditLogs || INITIAL_AUDIT_LOGS,
      };
    }
  } catch (e) {
    console.error('Error loading procurement state:', e);
  }

  // First time initialization
  const defaultState: ProcurementState = {
    materialRequests: INITIAL_MATERIAL_REQUESTS,
    purchaseRequests: INITIAL_PURCHASE_REQUESTS,
    rfqs: INITIAL_RFQS,
    purchaseOrders: INITIAL_PURCHASE_ORDERS,
    grns: INITIAL_GRNS,
    invoices: INITIAL_INVOICES,
    stockItems: INITIAL_STOCK,
    auditLogs: INITIAL_AUDIT_LOGS,
  };
  saveProcurementState(defaultState);
  return defaultState;
}

export function saveProcurementState(state: ProcurementState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('booshnam_procurement_updated', { detail: state }));
  } catch (e) {
    console.error('Error saving procurement state:', e);
  }
}

/**
 * Checks available stock for a specific material in the site yard / warehouse
 */
export function checkStockAvailability(materialName: string, projectName?: string): {
  availableStock: number;
  unit: string;
  category: string;
  isLowStock: boolean;
} {
  const state = getProcurementState();
  const cleanMat = (materialName || '').toLowerCase().trim();

  // Find exact or fuzzy match in stock
  const match = state.stockItems.find(
    s => s.item_name.toLowerCase().includes(cleanMat) || cleanMat.includes(s.item_name.toLowerCase())
  );

  if (match) {
    return {
      availableStock: match.current_quantity,
      unit: match.unit,
      category: match.category,
      isLowStock: match.is_low_stock,
    };
  }

  return {
    availableStock: 0,
    unit: 'Units',
    category: 'General',
    isLowStock: true,
  };
}

/**
 * Creates a new Material Request (Site Engineer / Supervisor)
 */
export function createMaterialRequest(data: Omit<MaterialRequestRecord, 'id' | 'request_number' | 'request_date' | 'shortage_quantity' | 'available_stock_snapshot'>): MaterialRequestRecord {
  const state = getProcurementState();
  const stockCheck = checkStockAvailability(data.material_name, data.project_name);
  const shortage = Math.max(0, Number(data.required_quantity) - stockCheck.availableStock);

  const reqNum = `MR-2026-${String(state.materialRequests.length + 1).padStart(3, '0')}`;
  const newMR: MaterialRequestRecord = {
    ...data,
    id: `mr-${Date.now()}`,
    request_number: reqNum,
    request_date: new Date().toISOString().split('T')[0],
    available_stock_snapshot: stockCheck.availableStock,
    shortage_quantity: shortage,
    unit: data.unit || stockCheck.unit,
  };

  const updatedMRs = [newMR, ...state.materialRequests];

  // Audit log
  const audit: ProcurementAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    role: 'Site Engineer / Supervisor',
    user_name: data.requested_by,
    action: `Created Material Request (${reqNum})`,
    details: `Required: ${data.required_quantity} ${newMR.unit} of ${data.material_name}. Stock: ${stockCheck.availableStock}, Shortage: ${shortage}. Priority: ${data.priority}.`,
    document_ref: reqNum,
  };

  saveProcurementState({
    ...state,
    materialRequests: updatedMRs,
    auditLogs: [audit, ...state.auditLogs],
  });

  return newMR;
}

/**
 * Updates status of a Material Request
 */
export function updateMaterialRequestStatus(mrId: string, newStatus: MRStatus, userName: string, userRole: string): void {
  const state = getProcurementState();
  const mr = state.materialRequests.find(m => m.id === mrId);
  if (!mr) return;

  const updatedMRs = state.materialRequests.map(m => m.id === mrId ? { ...m, status: newStatus } : m);

  const audit: ProcurementAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    role: userRole,
    user_name: userName,
    action: `Updated Material Request (${mr.request_number})`,
    details: `Status changed from ${mr.status} to ${newStatus}.`,
    document_ref: mr.request_number,
  };

  saveProcurementState({
    ...state,
    materialRequests: updatedMRs,
    auditLogs: [audit, ...state.auditLogs],
  });
}

/**
 * Creates a Purchase Request (PR) from an approved or submitted Material Request
 */
export function createPurchaseRequestFromMR(
  mrId: string,
  procurementPerson: string,
  userRole: string = 'Procurement Officer'
): PurchaseRequestRecord {
  const state = getProcurementState();
  const mr = state.materialRequests.find(m => m.id === mrId);
  if (!mr) throw new Error('Material Request not found');

  // Check live stock
  const stockCheck = checkStockAvailability(mr.material_name, mr.project_name);
  const shortage = Math.max(0, mr.required_quantity - stockCheck.availableStock);

  const prNum = `PR-2026-${String(state.purchaseRequests.length + 1).padStart(3, '0')}`;

  const newPR: PurchaseRequestRecord = {
    id: `pr-${Date.now()}`,
    pr_number: prNum,
    project_id: mr.project_id,
    project_name: mr.project_name,
    mr_reference: mr.request_number,
    mr_id: mr.id,
    material: mr.material_name,
    specification: mr.material_specification,
    required_quantity: mr.required_quantity,
    available_stock: stockCheck.availableStock,
    purchase_quantity: shortage > 0 ? shortage : mr.required_quantity, // Fallback to full qty if shortage is 0
    unit: mr.unit,
    required_date: mr.required_date,
    priority: mr.priority,
    requested_by: mr.requested_by,
    procurement_person: procurementPerson,
    remarks: `Calculated from ${mr.request_number}. Stock on site: ${stockCheck.availableStock} ${mr.unit}. Shortage purchase order: ${shortage} ${mr.unit}.`,
    created_date: new Date().toISOString().split('T')[0],
    status: 'SUBMITTED_FOR_APPROVAL',
  };

  // Mark MR with linked PR
  const updatedMRs = state.materialRequests.map(m =>
    m.id === mr.id ? { ...m, status: 'APPROVED' as MRStatus, linked_pr_number: prNum } : m
  );

  const audit: ProcurementAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    role: userRole,
    user_name: procurementPerson,
    action: `Created Purchase Request (${prNum})`,
    details: `Generated from ${mr.request_number}. Purchase Quantity: ${newPR.purchase_quantity} ${newPR.unit} (Shortage calculated).`,
    document_ref: prNum,
  };

  saveProcurementState({
    ...state,
    materialRequests: updatedMRs,
    purchaseRequests: [newPR, ...state.purchaseRequests],
    auditLogs: [audit, ...state.auditLogs],
  });

  return newPR;
}

/**
 * Updates status of a Purchase Request (PR)
 */
export function updatePurchaseRequestStatus(prId: string, newStatus: PRStatus, userName: string, userRole: string): void {
  const state = getProcurementState();
  const pr = state.purchaseRequests.find(p => p.id === prId);
  if (!pr) return;

  const updatedPRs = state.purchaseRequests.map(p => p.id === prId ? { ...p, status: newStatus } : p);

  const audit: ProcurementAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    role: userRole,
    user_name: userName,
    action: `Updated PR Status (${pr.pr_number})`,
    details: `Status changed to ${newStatus}.`,
    document_ref: pr.pr_number,
  };

  saveProcurementState({
    ...state,
    purchaseRequests: updatedPRs,
    auditLogs: [audit, ...state.auditLogs],
  });
}

/**
 * Generates an RFQ Comparison from an approved PR with vendor quote options
 */
export function createRFQFromPR(prId: string, userName: string): RFQComparisonRecord {
  const state = getProcurementState();
  const pr = state.purchaseRequests.find(p => p.id === prId);
  if (!pr) throw new Error('Purchase Request not found');

  const rfqNum = `RFQ-2026-${String(state.rfqs.length + 1).padStart(3, '0')}`;

  // Pre-seed 3 competitive vendors with realistic pricing
  const baseRate = pr.material.toLowerCase().includes('steel') ? 62000 : pr.material.toLowerCase().includes('cement') ? 415 : 1200;

  const quotations: VendorQuotationItem[] = [
    {
      vendor_id: 'v-1',
      vendor_name: 'UltraTech / Primary Distributor',
      vendor_phone: '+91 98401 22334',
      vendor_gst: '33AAACU1234F1Z1',
      unit_rate: baseRate,
      discount_percent: 2,
      gst_percent: 18,
      transport_charges: 1800,
      delivery_days: 2,
      payment_terms: '30 Days Net',
      total_amount: Math.round((pr.purchase_quantity * baseRate * 0.98 * 1.18) + 1800),
      is_selected: false,
    },
    {
      vendor_id: 'v-2',
      vendor_name: 'Dalmia / National Depot',
      vendor_phone: '+91 98409 88776',
      vendor_gst: '33AAACD9876D1Z2',
      unit_rate: Math.round(baseRate * 1.02),
      discount_percent: 0,
      gst_percent: 18,
      transport_charges: 2500,
      delivery_days: 3,
      payment_terms: '50% Advance & 50% on Delivery',
      total_amount: Math.round((pr.purchase_quantity * baseRate * 1.02 * 1.18) + 2500),
      is_selected: false,
    },
    {
      vendor_id: 'v-3',
      vendor_name: 'Coromandel / Regional Hub',
      vendor_phone: '+91 94441 55667',
      vendor_gst: '33AAACC3344C1Z9',
      unit_rate: Math.round(baseRate * 1.01),
      discount_percent: 1,
      gst_percent: 18,
      transport_charges: 2200,
      delivery_days: 4,
      payment_terms: 'Immediate on Inspection',
      total_amount: Math.round((pr.purchase_quantity * baseRate * 1.01 * 0.99 * 1.18) + 2200),
      is_selected: false,
    }
  ];

  const newRFQ: RFQComparisonRecord = {
    id: `rfq-${Date.now()}`,
    rfq_number: rfqNum,
    pr_number: pr.pr_number,
    pr_id: pr.id,
    project_name: pr.project_name,
    material_name: pr.material,
    quantity: pr.purchase_quantity,
    unit: pr.unit,
    created_date: new Date().toISOString().split('T')[0],
    status: 'QUOTATIONS_RECEIVED',
    quotations,
  };

  const updatedPRs = state.purchaseRequests.map(p =>
    p.id === pr.id ? { ...p, linked_rfq_number: rfqNum } : p
  );

  const audit: ProcurementAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    role: 'Procurement Officer',
    user_name: userName,
    action: `Created RFQ (${rfqNum})`,
    details: `Dispatched RFQ for ${pr.purchase_quantity} ${pr.unit} of ${pr.material} to 3 vendors.`,
    document_ref: rfqNum,
  };

  saveProcurementState({
    ...state,
    rfqs: [newRFQ, ...state.rfqs],
    purchaseRequests: updatedPRs,
    auditLogs: [audit, ...state.auditLogs],
  });

  return newRFQ;
}

/**
 * Selects a vendor quotation and generates a Purchase Order (PO)
 */
export function selectVendorAndCreatePO(
  rfqId: string,
  selectedVendorId: string,
  userName: string,
  deliveryLocation?: string,
  expectedDeliveryDate?: string
): PurchaseOrderRecord {
  const state = getProcurementState();
  const rfq = state.rfqs.find(r => r.id === rfqId);
  if (!rfq) throw new Error('RFQ not found');

  const selectedQuote = rfq.quotations.find(q => q.vendor_id === selectedVendorId) || rfq.quotations[0];

  const poNum = `PO-2026-${String(state.purchaseOrders.length + 1).padStart(3, '0')}`;
  const poDate = new Date().toISOString().split('T')[0];
  const deliveryDate = expectedDeliveryDate || new Date(Date.now() + (selectedQuote.delivery_days || 3) * 86400000).toISOString().split('T')[0];

  const pr = state.purchaseRequests.find(p => p.pr_number === rfq.pr_number);

  const baseVal = rfq.quantity * selectedQuote.unit_rate;
  const discAmount = (baseVal * selectedQuote.discount_percent) / 100;
  const subtotal = Math.round(baseVal - discAmount);
  const taxAmount = Math.round((subtotal * selectedQuote.gst_percent) / 100);
  const totalAmount = selectedQuote.total_amount || (subtotal + taxAmount + selectedQuote.transport_charges);

  const poItem: POItemLine = {
    id: `poi-${Date.now()}`,
    material_name: rfq.material_name,
    specification: pr?.specification || 'Standard specification as per RFQ',
    quantity: rfq.quantity,
    unit: rfq.unit,
    rate: selectedQuote.unit_rate,
    discount_percent: selectedQuote.discount_percent,
    gst_percent: selectedQuote.gst_percent,
    transport_charges: selectedQuote.transport_charges,
    total_amount: totalAmount,
    received_quantity: 0,
  };

  const newPO: PurchaseOrderRecord = {
    id: `po-${Date.now()}`,
    po_number: poNum,
    project_id: pr?.project_id || 'p-1',
    project_name: rfq.project_name,
    vendor_id: selectedQuote.vendor_id,
    vendor_name: selectedQuote.vendor_name,
    vendor_phone: selectedQuote.vendor_phone,
    vendor_gst: selectedQuote.vendor_gst,
    vendor_address: 'Authorized Vendor Yard, Industrial Estate, Chennai',
    pr_reference: rfq.pr_number,
    rfq_reference: rfq.rfq_number,
    quotation_reference: `QT-${selectedQuote.vendor_name.slice(0, 3).toUpperCase()}-901`,
    po_date: poDate,
    expected_delivery_date: deliveryDate,
    delivery_location: deliveryLocation || `Site Yard, ${rfq.project_name}, Chennai`,
    payment_terms: selectedQuote.payment_terms || '30 Days Net from GRN Certification',
    items: [poItem],
    subtotal,
    tax_amount: taxAmount,
    transport_charges: selectedQuote.transport_charges,
    total_amount: totalAmount,
    terms_conditions: getTermsConditions().purchaseOrderTerms || '1. Material must strictly conform to specified IS codes.',
    notes: 'Urgent site delivery. Off-loading clearance arranged.',
    status: 'APPROVED',
    created_by: userName,
    approved_by: 'Project Manager / Admin',
    grn_numbers: [],
  };

  // Update RFQ status and mark selected vendor
  const updatedRFQs = state.rfqs.map(r => {
    if (r.id === rfqId) {
      return {
        ...r,
        status: 'VENDOR_SELECTED' as const,
        selected_vendor_name: selectedQuote.vendor_name,
        quotations: r.quotations.map(q => ({
          ...q,
          is_selected: q.vendor_id === selectedVendorId,
        })),
      };
    }
    return r;
  });

  // Update PR with PO link
  const updatedPRs = state.purchaseRequests.map(p =>
    p.pr_number === rfq.pr_number ? { ...p, status: 'PO_CREATED' as PRStatus, linked_po_number: poNum } : p
  );

  const audit: ProcurementAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    role: 'Procurement Officer',
    user_name: userName,
    action: `Created Purchase Order (${poNum})`,
    details: `PO generated from RFQ ${rfq.rfq_number} for vendor ${selectedQuote.vendor_name}. Total: ₹${totalAmount.toLocaleString('en-IN')}.`,
    document_ref: poNum,
  };

  saveProcurementState({
    ...state,
    rfqs: updatedRFQs,
    purchaseRequests: updatedPRs,
    purchaseOrders: [newPO, ...state.purchaseOrders],
    auditLogs: [audit, ...state.auditLogs],
  });

  return newPO;
}

/**
 * Updates status of a Purchase Order
 */
export function updatePurchaseOrderStatus(poId: string, newStatus: POStatus, userName: string, userRole: string): void {
  const state = getProcurementState();
  const po = state.purchaseOrders.find(p => p.id === poId);
  if (!po) return;

  const updatedPOs = state.purchaseOrders.map(p =>
    p.id === poId
      ? { ...p, status: newStatus, approved_by: newStatus === 'APPROVED' ? userName : p.approved_by }
      : p
  );

  const audit: ProcurementAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    role: userRole,
    user_name: userName,
    action: `Updated PO Status (${po.po_number})`,
    details: `Status changed to ${newStatus}.`,
    document_ref: po.po_number,
  };

  saveProcurementState({
    ...state,
    purchaseOrders: updatedPOs,
    auditLogs: [audit, ...state.auditLogs],
  });
}

/**
 * Creates a Goods Receipt Note (GRN) from an approved PO and updates Site Yard Stock!
 * RULE: Only the accepted quantity increases inventory!
 */
export function createGRNReceipt(data: {
  po_number: string;
  challan_number: string;
  vehicle_number: string;
  received_by: string;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  inspection_notes: string;
}): GRNRecord {
  const state = getProcurementState();
  const po = state.purchaseOrders.find(p => p.po_number === data.po_number);
  if (!po) throw new Error('Purchase Order not found');

  const primaryItem = po.items[0] || {
    material_name: 'Material',
    quantity: data.received_quantity,
    unit: 'Units',
  };

  const grnNum = `GRN-2026-${String(state.grns.length + 1).padStart(3, '0')}`;
  const receiptDate = new Date().toISOString().split('T')[0];

  const newGRN: GRNRecord = {
    id: `grn-${Date.now()}`,
    grn_number: grnNum,
    po_number: po.po_number,
    po_id: po.id,
    project_name: po.project_name,
    vendor_name: po.vendor_name,
    challan_number: data.challan_number,
    vehicle_number: data.vehicle_number,
    receipt_date: receiptDate,
    received_by: data.received_by,
    material_name: primaryItem.material_name,
    ordered_quantity: primaryItem.quantity,
    received_quantity: Number(data.received_quantity),
    accepted_quantity: Number(data.accepted_quantity),
    rejected_quantity: Number(data.rejected_quantity),
    unit: primaryItem.unit,
    status: data.rejected_quantity > 0 ? 'DEFECTS_NOTED' : 'STOCK_UPDATED',
    inspection_notes: data.inspection_notes,
    is_stock_updated: true,
  };

  // RULE: Update Site Yard Stock with ACCEPTED quantity ONLY!
  const acceptedQty = Number(data.accepted_quantity);
  const updatedStock = [...state.stockItems];
  const stockIndex = updatedStock.findIndex(
    s => s.item_name.toLowerCase().includes(primaryItem.material_name.toLowerCase()) ||
         primaryItem.material_name.toLowerCase().includes(s.item_name.toLowerCase())
  );

  if (stockIndex >= 0) {
    const prevQty = updatedStock[stockIndex].current_quantity;
    const newQty = prevQty + acceptedQty;
    updatedStock[stockIndex] = {
      ...updatedStock[stockIndex],
      current_quantity: newQty,
      is_low_stock: newQty < updatedStock[stockIndex].minimum_threshold,
      last_updated: receiptDate,
    };
  } else {
    // Add new stock entry
    updatedStock.push({
      id: `stk-${Date.now()}`,
      project_name: po.project_name,
      item_name: primaryItem.material_name,
      category: 'General Supplies',
      unit: primaryItem.unit,
      current_quantity: acceptedQty,
      minimum_threshold: Math.round(acceptedQty * 0.3),
      is_low_stock: false,
      last_updated: receiptDate,
    });
  }

  // Update PO received quantity & status
  const updatedPOs = state.purchaseOrders.map(p => {
    if (p.po_number === po.po_number) {
      const isFull = acceptedQty >= primaryItem.quantity;
      return {
        ...p,
        status: isFull ? ('FULLY_RECEIVED' as POStatus) : ('PARTIALLY_RECEIVED' as POStatus),
        grn_numbers: Array.from(new Set([...p.grn_numbers, grnNum])),
        items: p.items.map(item => ({
          ...item,
          received_quantity: (item.received_quantity || 0) + acceptedQty,
        })),
      };
    }
    return p;
  });

  // Create linked Vendor Invoice automatically for 3-Way Match ready
  const invNum = `PINV-2026-${String(state.invoices.length + 1).padStart(3, '0')}`;
  const newInvoice: PurchaseInvoiceRecord = {
    id: `inv-${Date.now()}`,
    invoice_number: invNum,
    vendor_invoice_ref: `INV-${data.challan_number || 'CHAL-01'}`,
    po_number: po.po_number,
    grn_number: grnNum,
    project_name: po.project_name,
    vendor_name: po.vendor_name,
    invoice_date: receiptDate,
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    subtotal: po.subtotal,
    tax_amount: po.tax_amount,
    total_amount: po.total_amount,
    paid_amount: 0,
    match_status: data.rejected_quantity === 0 ? 'MATCHED' : 'DISCREPANCY',
    payment_status: 'UNPAID',
    match_notes: data.rejected_quantity === 0
      ? `3-Way Match Verified 100%: PO (${po.po_number}), GRN (${grnNum} - ${acceptedQty} ${primaryItem.unit}), and Invoice align.`
      : `Discrepancy: ${data.rejected_quantity} ${primaryItem.unit} rejected during site inspection. Adjusted credit note required.`,
  };

  const audit: ProcurementAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    role: 'Storekeeper',
    user_name: data.received_by,
    action: `Created GRN (${grnNum}) & Stock Updated`,
    details: `Received: ${data.received_quantity}, Accepted: ${acceptedQty}, Rejected: ${data.rejected_quantity} ${primaryItem.unit}. Site Yard stock updated by +${acceptedQty}.`,
    document_ref: grnNum,
  };

  saveProcurementState({
    ...state,
    grns: [newGRN, ...state.grns],
    purchaseOrders: updatedPOs,
    stockItems: updatedStock,
    invoices: [newInvoice, ...state.invoices],
    auditLogs: [audit, ...state.auditLogs],
  });

  return newGRN;
}

/**
 * Processes payment for a Purchase Invoice
 */
export function processInvoicePayment(invoiceId: string, amount: number, userName: string): void {
  const state = getProcurementState();
  const inv = state.invoices.find(i => i.id === invoiceId);
  if (!inv) return;

  const newPaid = (inv.paid_amount || 0) + amount;
  const isFullyPaid = newPaid >= inv.total_amount;

  const updatedInvoices = state.invoices.map(i =>
    i.id === invoiceId
      ? {
          ...i,
          paid_amount: newPaid,
          payment_status: isFullyPaid ? ('PAID' as PaymentStatus) : ('PARTIALLY_PAID' as PaymentStatus),
        }
      : i
  );

  const audit: ProcurementAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    role: 'Accounts',
    user_name: userName,
    action: `Processed Payment for Invoice (${inv.invoice_number})`,
    details: `Paid ₹${amount.toLocaleString('en-IN')} to ${inv.vendor_name}. Total paid: ₹${newPaid.toLocaleString('en-IN')} / ₹${inv.total_amount.toLocaleString('en-IN')}. Status: ${isFullyPaid ? 'PAID' : 'PARTIALLY_PAID'}.`,
    document_ref: inv.invoice_number,
  };

  saveProcurementState({
    ...state,
    invoices: updatedInvoices,
    auditLogs: [audit, ...state.auditLogs],
  });
}

/**
 * Edits details of a Purchase Request (PR)
 */
export function editPurchaseRequest(
  prId: string,
  updates: Partial<PurchaseRequestRecord>,
  userName: string,
  userRole: string = 'Procurement Officer'
): void {
  const state = getProcurementState();
  const pr = state.purchaseRequests.find(p => p.id === prId);
  if (!pr) return;

  const updatedPRs = state.purchaseRequests.map(p => {
    if (p.id === prId) {
      const updated = { ...p, ...updates };
      // Recalculate shortage / purchase quantity if quantities changed
      if (updates.required_quantity !== undefined || updates.available_stock !== undefined) {
        const req = updates.required_quantity !== undefined ? Number(updates.required_quantity) : p.required_quantity;
        const avail = updates.available_stock !== undefined ? Number(updates.available_stock) : p.available_stock;
        updated.purchase_quantity = Math.max(0, req - avail);
      }
      return updated;
    }
    return p;
  });

  const audit: ProcurementAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    role: userRole,
    user_name: userName,
    action: `Edited Purchase Request (${pr.pr_number})`,
    details: `Updated fields: ${Object.keys(updates).join(', ')}.`,
    document_ref: pr.pr_number,
  };

  saveProcurementState({
    ...state,
    purchaseRequests: updatedPRs,
    auditLogs: [audit, ...state.auditLogs],
  });
}

/**
 * Deletes a Material Request (e.g. if in Draft or Cancelled)
 */
export function deleteMaterialRequest(mrId: string, userName: string, userRole: string): void {
  const state = getProcurementState();
  const mr = state.materialRequests.find(m => m.id === mrId);
  if (!mr) return;

  const updatedMRs = state.materialRequests.filter(m => m.id !== mrId);

  const audit: ProcurementAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    role: userRole,
    user_name: userName,
    action: `Deleted Material Request (${mr.request_number})`,
    details: `Removed request for ${mr.material_name}.`,
    document_ref: mr.request_number,
  };

  saveProcurementState({
    ...state,
    materialRequests: updatedMRs,
    auditLogs: [audit, ...state.auditLogs],
  });
}

/**
 * Calculates dashboard statistics and notification metrics for procurement
 */
export function getProcurementMetrics(state: ProcurementState, selectedProjectName?: string) {
  const filterByProject = <T extends { project_name?: string }>(items: T[]): T[] => {
    if (!selectedProjectName || selectedProjectName === 'All Sites') return items;
    return items.filter(i => (i.project_name || '').toLowerCase() === selectedProjectName.toLowerCase());
  };

  const mrs = filterByProject(state.materialRequests);
  const prs = filterByProject(state.purchaseRequests);
  const pos = filterByProject(state.purchaseOrders);
  const grns = filterByProject(state.grns);
  const invoices = filterByProject(state.invoices);
  const stock = filterByProject(state.stockItems);

  const pendingMRApprovals = mrs.filter(m => m.status === 'SUBMITTED' || m.status === 'UNDER_REVIEW').length;
  const pendingPRApprovals = prs.filter(p => p.status === 'SUBMITTED_FOR_APPROVAL').length;
  const approvedPOs = pos.filter(p => p.status === 'APPROVED' || p.status === 'SENT_TO_VENDOR').length;
  const deliveriesExpected = pos.filter(p => p.status === 'SENT_TO_VENDOR' || p.status === 'PARTIALLY_RECEIVED').length;
  const pendingGRNReceipts = pos.filter(p => p.status === 'APPROVED' || p.status === 'SENT_TO_VENDOR').length;
  
  const totalPurchaseCost = pos.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const totalInvoiceAmount = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalPaidAmount = invoices.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
  const outstandingPayables = totalInvoiceAmount - totalPaidAmount;
  const lowStockCount = stock.filter(s => s.is_low_stock).length;

  return {
    pendingMRApprovals,
    pendingPRApprovals,
    approvedPOs,
    deliveriesExpected,
    pendingGRNReceipts,
    totalPurchaseCost,
    totalInvoiceAmount,
    totalPaidAmount,
    outstandingPayables,
    lowStockCount,
    mrsCount: mrs.length,
    prsCount: prs.length,
    posCount: pos.length,
    grnsCount: grns.length,
    invoicesCount: invoices.length,
    stockCount: stock.length,
  };
}
