export type Department = 
  | 'SOIL_INVESTIGATION'
  | 'MATERIAL_TESTING'
  | 'SURVEYING'
  | 'STRUCTURAL'
  | 'ARCHITECTURAL'
  | 'SCULPTURE'
  | 'PRIVATE_CONSTRUCTION'
  | 'GOVERNMENT_PROJECT'
  | 'COIMBATORE_SOIL'
  | 'COIMBATORE_MATERIAL_TESTING'
  | 'CBE_SOIL_INVESTIGATION'
  | 'ART_SCULPTURE'
  | 'CONSTRUCTION'
  | 'SURVEY'
  | 'ARCHITECTURE'
  | 'MARKETING' 
  | 'ACCOUNTS';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  currency: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  roleCode?: string;
}


export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  role_name?: string;
  role_code?: string;
  avatar_url?: string;
  active_role?: Role;
  organization?: Organization;
  is_org_admin: boolean;
  is_site_worker: boolean;
  permission_matrix?: Record<string, {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_approve: boolean;
    approval_limit: number;
  }>;
}

export interface ProjectTeamMember {
  id?: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  avatar?: string;
  opening_balance?: number;
  bank_account?: string;
  bank_ifsc?: string;
  bank_name?: string;
  address?: string;
  party_id?: string;
  date_of_joining?: string;
  aadhaar_number?: string;
  pan_number?: string;
  uan_number?: string;
  pf_number?: string;
  esi_number?: string;
  fathers_name?: string;
  assignment_date?: string;
  trade_scope?: string;
  is_subcontractor?: boolean;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client_name: string;
  project_type: string;
  location: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  start_date: string;
  expected_end_date: string;
  end_date?: string;
  estimated_budget?: number;
  actual_cost?: number;
  progress_percentage: number;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  description: string;
  tasks_count?: number;
  city?: string;
  address?: string;
  cash_in?: number;
  cash_out?: number;
  boq_value?: number;
  estimated_margin?: number;
  sales_invoice?: number;
  work_done?: number;
  payables?: number;
  receivables?: number;
  site_staff_expense?: number;
  labour_contractor_expense?: number;
  office_staff_expense?: number;
  todo_count?: number;
  material_pending_count?: number;
  approval_pending_count?: number;
  initials?: string;
  avatar_color?: string;
  is_pinned?: boolean;
  stage?: string;
  category?: string;
  department?: Department | string;
  department_name?: string;
  company_branch?: string;
  project_orientation?: string;
  project_dimension?: string;
  scope_of_work?: string;
  assigned_team?: ProjectTeamMember[];
  assigned_subcontractors?: Array<{
    id: string;
    name: string;
    trade_scope: string;
    assignment_date: string;
    phone?: string;
    email?: string;
  }>;
}


export interface WBSTask {
  id: string;
  project: string;
  project_id?: string;
  title: string;
  name?: string;
  description?: string;
  department?: Department;
  wbs_code: string;
  start_date: string;
  end_date: string;
  planned_start?: string;
  planned_end?: string;
  duration_days: number;
  progress_percentage: number;
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'NOT_STARTED';
  is_milestone?: boolean;
  is_subtask?: boolean;
  parent_id?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  est_quantity?: number;
  unit?: string;
  tag?: string;
  files?: Array<{ name: string; size?: string; url?: string }>;
  subtasks?: Array<{
    id: string;
    title: string;
    wbs_code: string;
    status: string;
    progress_percentage: number;
  }>;
  s_no?: number;
  created_by?: string;
  created_date?: string;
  actual_start?: string;
  actual_end?: string;
  forecast_end?: string;
  delay_status?: 'On Time' | '1d' | 'At Risk' | 'On Track' | 'Delayed';
  progress_label?: string;
  comments_count?: number;
  assigned_team?: Array<{ name: string; initials: string; avatar?: string }>;
  dependencies?: string[];
  completion_proof_url?: string;
  completion_proof_uploaded_at?: string;
  completion_remarks?: string;
  completed_by?: string;
  completed_at?: string;
}

export interface CostPlanItem {
  id: string;
  item_code: string;
  category_name: string;
  category_type: string;
  description: string;
  unit: string;
  planned_quantity: number;
  planned_rate: number;
  planned_amount: number;
  actual_quantity: number;
  actual_amount: number;
  variance_amount: number;
  variance_percentage: number;
}

export interface ChangeOrder {
  id: string;
  order_number: string;
  title: string;
  description: string;
  reason: string;
  cost_impact: number;
  schedule_impact_days: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  requested_by_name?: string;
  approved_by_name?: string;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  contact_person: string;
  phone: string;
  email: string;
  tax_id: string;
  current_balance: number;
  rating: number;
}

export interface MaterialRequest {
  id: string;
  project?: string;
  project_id?: string;
  request_number: string;
  project_name: string;
  needed_by_date: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PO_CREATED' | 'REJECTED';
  priority: 'URGENT' | 'NORMAL' | 'LOW';
  total_estimated_cost: number;
  site_notes: string;
  items?: Array<{
    id: string;
    item_name: string;
    quantity: number;
    unit: string;
    estimated_rate: number;
  }>;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  project_name: string;
  vendor_name: string;
  order_date: string;
  expected_delivery_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  items?: Array<{
    id: string;
    item_name: string;
    ordered_quantity: number;
    unit_rate: number;
    total_amount: number;
    received_quantity: number;
    unit: string;
  }>;
}

export interface GoodsReceiptNote {
  id: string;
  grn_number: string;
  po_number: string;
  vendor_name: string;
  challan_number: string;
  vehicle_number: string;
  receipt_date: string;
  status: 'RECEIVED' | 'INSPECTED' | 'DEFECTS_NOTED';
  notes: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  vendor_invoice_ref: string;
  po_number: string;
  grn_number?: string;
  vendor_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  match_status: 'PENDING' | 'MATCHED' | 'DISCREPANCY';
  payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  match_notes?: string;
}

export interface StockItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  current_quantity: number;
  minimum_threshold: number;
  is_low_stock: boolean;
}

export interface Worker {
  id: string;
  employee_id: string;
  full_name: string;
  worker_type: string;
  trade_skill: string;
  daily_wage_rate?: number;
  hourly_overtime_rate?: number;
  assigned_project_name?: string;
  is_active: boolean;
}

export interface AttendanceRecord {
  id: string;
  worker_name: string;
  worker_code: string;
  worker_skill: string;
  date: string;
  clock_in_time: string;
  distance_from_site_meters: number;
  is_inside_geofence: boolean;
  status: 'PRESENT' | 'HALF_DAY' | 'OVERTIME' | 'ABSENT';
  regular_hours: number;
  overtime_hours: number;
  supervisor_override: boolean;
}

export interface DPR {
  id: string;
  report_number: string;
  date: string;
  weather: string;
  temperature_celsius: number;
  work_summary: string;
  work_performed?: string;
  labour_count?: number;
  delay_reasons: string;
  supervisor_name: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  approved_by_name?: string;
  manpower_records?: Array<{
    id: string;
    trade_name: string;
    headcount: number;
    total_hours: number;
  }>;
  material_consumed?: Array<{
    id: string;
    material_name: string;
    quantity: number;
    unit: string;
    activity: string;
  }>;
}

export interface Snag {
  id: string;
  snag_number: string;
  title: string;
  description: string;
  location_details: string;
  category: 'CIVIL' | 'FINISHING' | 'ELECTRICAL' | 'PLUMBING' | 'SAFETY';
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  raised_by_name?: string;
  assigned_to_name?: string;
  due_date?: string;
  resolution_notes?: string;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  project?: string;
  project_id?: string;
  title: string;
  module: string;
  object_type: string;
  amount: number;
  requester_name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approver_role_name?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  lead_number: string;
  client_name: string;
  contact_person: string;
  phone: string;
  email: string;
  project_title: string;
  estimated_value: number;
  stage: 'NEW' | 'CONTACTED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  probability: number;
  assigned_to_name?: string;
  assigned_department?: string;
  assigned_role?: string;
  source?: string;
  notes?: string;
  lead_type?: string;
  company_name?: string;
  address?: string;
  category?: string;
  priority?: 'High' | 'Medium' | 'Low' | string;
  creation_date?: string;
  last_updated?: string;
  next_followup_date?: string;
  status_label?: string;
  last_contacted_date?: string;
  followup_date?: string;
  expected_closure_date?: string;
  budget?: number;
  description?: string;
}

export interface QuotationItem {
  id: string;
  item_code?: string;
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  amount: number;
  category?: string;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  date: string;
  valid_until: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  client_address?: string;
  project_title: string;
  project_id?: string;
  department?: Department | string;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'IN_DISCUSSION' | 'ON_HOLD' | 'CLIENT_CONFIRMED' | string;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_amount?: number;
  total_amount: number;
  notes?: string;
  terms_conditions?: string;
  prepared_by?: string;
  items: QuotationItem[];
  created_at?: string;
  attachment_name?: string;
  attachment_url?: string;
  attachment_uploaded_at?: string;
}

export interface AssetAllocation {
  id: string;
  assigned_to: string;
  target_type: 'staff' | 'project';
  staff_name?: string;
  staff_role?: string;
  quantity: number;
  assigned_date: string;
  return_date?: string;
  serial_numbers?: string[];
  remarks?: string;
}

export interface Asset {
  id: string;
  asset_code: string;
  serial_no?: string;
  name: string;
  category: string;
  asset_type?: string;
  price?: number;
  total_qty?: number;
  available_qty?: number;
  ownership: string;
  rental_vendor_name?: string;
  hourly_cost_rate: number;
  current_project_name?: string;
  assigned_to?: string;
  status: string;
  meter_hours: number;
  description?: string;
  created_at?: string;
  allocations?: AssetAllocation[];
}

export interface DesignDrawing {
  id: string;
  number: string;
  title: string;
  discipline: 'ARCHITECTURAL' | 'STRUCTURAL' | 'MEP' | 'INTERIOR' | 'LANDSCAPE';
  version: string;
  status: 'AFC Approved' | 'Under Review' | 'Tender Stage' | 'Superseded';
  date: string;
  file_size?: string;
  url?: string;
  author?: string;
  folder?: string;
  approved_version?: string;
}

export interface Party {
  id: string;
  name: string;
  category: 'CLIENT' | 'SUBCONTRACTOR' | 'SUPPLIER' | 'CONSULTANT';
  contact_person: string;
  phone: string;
  email: string;
  gstin?: string;
  balance_type: 'PAYABLE' | 'RECEIVABLE';
  current_balance: number;
  pan?: string;
  city?: string;
  notes?: string;
}

export interface ProjectTransaction {
  id: string;
  transaction_number: string;
  date: string;
  time?: string;
  type: 'IN' | 'OUT';
  party_name: string;
  party_category?: string;
  category: string;
  amount: number;
  payment_mode: 'NEFT/RTGS' | 'UPI' | 'Cheque' | 'Cash' | string;
  reference_no?: string;
  cost_code?: string;
  status: 'CLEARED' | 'PENDING' | 'RECONCILED' | 'APPROVED';
  notes?: string;
  entry_by?: string;
  paid_to?: string;
  media_url?: string;
  transaction_sub_type?: string;
  bank_name?: string;
  bank_account?: string;
}

export interface PaymentRequest {
  id: string;
  request_number: string;
  payment_date: string;
  party_name: string;
  request_type: string;
  amount: number;
  currency: string;
  due_date: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  media_url?: string;
  media_name?: string;
  created_at?: string;
}

export interface ToDoComment {
  id: string;
  author: string;
  text: string;
  created_at: string;
  image_url?: string;
}

export interface ToDoRepeatSettings {
  frequency: 'WEEK_DAYS' | 'EVERYDAY' | 'MONTH_DAYS';
  weekDays?: string[];
  endType: '6_MONTHS' | 'CUSTOM_DATE';
  endDate?: string;
}

export interface ProjectToDo {
  id: string;
  title: string;
  description?: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'Procurement' | 'Site Execution' | 'Quality' | 'Safety' | 'Client' | 'Billing';
  todo_type?: string;
  assignee_name: string;
  due_date: string;
  project_name?: string;
  task_name?: string;
  url?: string;
  repeat_settings?: ToDoRepeatSettings;
  media_files?: Array<{ name: string; url?: string; size?: string }>;
  comments?: ToDoComment[];
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
}

export interface SubconWorkOrder {
  id: string;
  wo_number: string;
  subcon_name: string;
  trade_scope: string;
  contract_amount: number;
  work_completed_percent: number;
  billed_amount: number;
  retention_percent: number;
  retention_amount: number;
  paid_amount: number;
  balance_payable: number;
  status: 'ACTIVE' | 'DRAFT' | 'COMPLETED' | 'ON_HOLD';
  start_date: string;
  end_date: string;
}

export interface MOMActionItem {
  id: string;
  task: string;
  owner: string;
  due_date: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
}

export interface MOMRecord {
  id: string;
  mom_number?: string;
  meeting_name?: string;
  title: string;
  date: string;
  project_name?: string;
  attendees: string[];
  agenda?: string;
  resolution?: string;
  notes?: string;
  time?: string;
  location?: string;
  chairperson?: string;
  summary?: string;
  action_items?: MOMActionItem[];
  next_meeting_date?: string;
  created_at?: string;
}

export interface BOQItem {
  id: string;
  s_no: number;
  type?: 'item' | 'section';
  parent_id?: string;
  item_code?: string;
  description: string;
  dimensions?: string; // N x L x W x H
  cost_price?: number;
  mark_up_percent?: number;
  gst_percent?: number;
  unit_rate: number;
  quantity: number;
  unit: string;
  progress_percentage?: number;
  linked_task_id?: string;
  linked_task_name?: string;
  billed_quantity: number;
  sales_price: number;
}

export interface BOQRecord {
  id: string;
  project_id: string;
  boq_number: string; // e.g. "#BOQ1870"
  date: string; // e.g. "2026-09-17" or "16 Sep, 2026"
  client_name: string; // e.g. "Shanthi Sathya"
  title: string; // e.g. "SOIL"
  tax_type: 'ITEM_LEVEL' | 'BILL_LEVEL';
  milestone_completed?: number;
  milestone_total?: number;
  physical_progress: number;
  boq_value: number;
  billed_value: number;
  media_files?: Array<{ name: string; size?: string; url?: string }>;
  items: BOQItem[];
  created_at?: string;
}

// ----------------------------------------------------
// 11 Automatic Predefined Default Tasks (Section 2)
// ----------------------------------------------------
export interface PredefinedTaskTemplate {
  id: number;
  code: string;
  title: string;
  department: Department;
  default_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  description: string;
}

// ----------------------------------------------------
// Soil Investigation Department Models (Section 4.1)
// ----------------------------------------------------
export interface SoilSample {
  id: string;
  project_id: string;
  sample_code: string;
  borehole_no: string;
  depth_meters: number;
  sample_type: 'Disturbed' | 'Undisturbed' | 'Core';
  collection_date: string;
  collected_by: string;
  visual_classification: string;
  status: 'COLLECTED' | 'TESTING' | 'COMPLETED';
}

export interface SoilLabTest {
  id: string;
  project_id: string;
  test_code: string;
  test_name: string;
  sample_id: string;
  tested_by: string;
  test_date: string;
  results_summary: string;
  bearing_capacity_kn_m2?: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED';
  report_file?: string;
}

export interface SoilInvestigationReport {
  id: string;
  project_id: string;
  report_no: string;
  title: string;
  investigation_date: string;
  geotechnical_engineer: string;
  safe_bearing_capacity: string;
  safe_bearing_capacity_kn_m2?: number | string;
  recommended_foundation_depth_m?: number | string;
  water_table_depth: string;
  binding_status: 'PREPARING' | 'BOUND' | 'DIGITALLY_SIGNED' | 'DELIVERED' | 'SIGNED_AND_STAMPED';
  signed_by?: string;
  signed_date?: string;
  pdf_url?: string;
}

// ----------------------------------------------------
// Architecture Department Models (Section 4.2 & 10)
// ----------------------------------------------------
export interface DrawingVersionItem {
  version: 'V1' | 'V2' | 'V3' | string;
  file_name: string;
  uploaded_by: string;
  upload_date: string;
  change_notes: string;
  file_size?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ADMIN_APPROVED' | 'CLIENT_APPROVED' | 'REVISION_REQUESTED' | 'PENDING_REVIEW' | 'SUPERVISOR_APPROVED' | 'PENDING_CLIENT';
  feedback_notes?: string;
}

export interface ArchitecturalDrawing {
  id: string;
  project_id: string;
  drawing_no: string;
  title: string;
  category: 'FLOOR_PLAN' | 'ELEVATION' | 'STRUCTURAL' | 'SECTION' | '3D_MODEL' | 'MEP';
  current_version: string;
  versions: DrawingVersionItem[];
  model_3d_url?: string;
  architect_name: string;
  approval_status: 'PENDING_INTERNAL' | 'PENDING_CLIENT' | 'APPROVED' | 'REVISION_REQUESTED' | 'PENDING_REVIEW' | 'SUPERVISOR_APPROVED';
  client_feedback?: string;
  updated_at: string;
}

// ----------------------------------------------------
// Payment Request Workflow Models (Section 9 & 13)
// ----------------------------------------------------
export interface ProjectPaymentRequest {
  id: string;
  project_id: string;
  request_code: string;
  requested_by_name?: string;
  requested_by_role?: string;
  requested_by?: string;
  request_date?: string;
  vendor_name?: string;
  purpose_description?: string;
  category: 'MATERIALS' | 'LABOUR' | 'TRANSPORTATION' | 'SITE_EXPENSES' | 'EQUIPMENT_FUEL' | 'CONTRACTOR' | 'MATERIAL' | 'MACHINERY' | 'SUBCONTRACTOR' | 'SITE_EXPENSE' | string;
  amount: number;
  description?: string;
  date?: string;
  bill_invoice_file?: string;
  status: 'PENDING_SUPERVISOR' | 'SUPERVISOR_VERIFIED' | 'PENDING_ACCOUNTS' | 'APPROVED' | 'PAID' | 'REJECTED';
  verified_by_supervisor?: string;
  verification_date?: string;
  approved_by_accounts?: string;
  approval_date?: string;
  supervisor_comments?: string;
  accounts_comments?: string;
  payment_mode?: 'NEFT/RTGS' | 'UPI' | 'CHEQUE' | 'CASH' | string;
  payment_reference?: string;
  paid_date?: string;
  transaction_ref?: string;
}

// ----------------------------------------------------
// Project Transactions Models (Section 12)
// ----------------------------------------------------
export interface ProjectTransactionRecord {
  id: string;
  project_id: string;
  type?: 'INCOME' | 'EXPENSE';
  transaction_type?: 'INCOME' | 'EXPENSE';
  transaction_code?: string;
  transaction_date?: string;
  party_name?: string;
  reference_number?: string;
  category: string;
  amount: number;
  date?: string;
  payment_mode: string;
  reference_no?: string;
  paid_by_or_to?: string;
  notes?: string;
  invoice_ref?: string;
}


