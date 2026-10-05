import { 
  Project, WBSTask, CostPlanItem, ChangeOrder, MaterialRequest, 
  PurchaseOrder, GoodsReceiptNote, Invoice, StockItem, Worker, 
  AttendanceRecord, DPR, Snag, ApprovalRequest, Lead, Asset, User, Role,
  PredefinedTaskTemplate, SoilSample, SoilLabTest, SoilInvestigationReport,
  ArchitecturalDrawing, ProjectPaymentRequest, ProjectTransactionRecord
} from '../types';

export const MOCK_ROLES: Role[] = [
  { id: '1', name: 'Super Admin', code: 'SUPER_ADMIN', description: 'Complete access to entire company system & settings' },
  { id: '2', name: 'Admin', code: 'ADMIN', description: 'Full operational access, project & staff management' },
  { id: '3', name: 'Project Manager', code: 'PROJECT_MANAGER', description: 'Overall project leadership, team delegation, budget & schedule execution' },
  { id: '4', name: 'Supervisor', code: 'SUPERVISOR', description: 'Assigned project supervision, daily progress, & site operations' },
  { id: '5', name: 'Site Engineer', code: 'SITE_ENGINEER', description: 'Assigned project execution, daily DPR updates, & payment requests' },
  { id: '6', name: 'Architect', code: 'ARCHITECT', description: 'Drawings, 3D models, version management, & client revisions' },
  { id: '7', name: 'Client', code: 'CLIENT', description: 'Dedicated Client Portal: view project, approve designs, & payment milestones' },
  { id: '8', name: 'Accounts', code: 'ACCOUNTS', description: 'Financial ledger, payment processing, invoices, BOQ, & payroll' },
  { id: '9', name: 'Other Staff / Employee', code: 'EMPLOYEE', description: 'Field task execution, attendance, & daily work logs' },
];

export const MOCK_USER: User = {
  id: 'u-1',
  username: 'priya',
  email: 'priya@siteops.io',
  phone: '9047549682',
  first_name: 'Priya',
  last_name: '',
  role_name: 'Super Admin',
  role_code: 'SUPER_ADMIN',
  active_role: MOCK_ROLES[0],
  is_org_admin: true,
  is_site_worker: false,
  organization: {
    id: 'org-1',
    name: 'Apex Builders & Infrastructure Ltd.',
    slug: 'apex-builders',
    currency: 'INR',
    phone: '+91 80 4123 9800',
    address: 'Level 6, Tech Park Towers, Whitefield, Bengaluru - 560066',
  }
};

/**
 * Formats a project's display title to: Project Name (Client Name)
 * E.g. "home (qwertyuiop)" or "Insta Ebinesar"
 */
export const formatProjectTitle = (p?: Partial<Project> | null): string => {
  if (!p) return 'Project';
  const rawName = (p.name || p.client_name || 'Project').trim();

  // Check if it's a compound code string like "RG33-BAGJ-2486-(2026-2027)-home-wertyuiop-qwertyuiop"
  const compoundMatch = rawName.match(/^[A-Z0-9_-]+-\(\d{4}-\d{4}\)-([^-]+)/i);
  if (compoundMatch) {
    const base = compoundMatch[1].trim();
    const client = (p.client_name || '').trim();
    return client && client.toLowerCase() !== base.toLowerCase() ? `${base} (${client})` : base;
  }

  // If already formatted like "home (qwertyuiop)"
  if (rawName.includes('(') && rawName.includes(')')) {
    return rawName;
  }

  const client = (p.client_name || '').trim();
  if (client && client.toLowerCase() !== rawName.toLowerCase()) {
    return `${rawName} (${client})`;
  }

  return rawName;
};

// All mock operational data cleared as requested
export const MOCK_PROJECTS: Project[] = [];
export const MOCK_TASKS: WBSTask[] = [];
export const MOCK_BOQ: CostPlanItem[] = [];
export const MOCK_CHANGE_ORDERS: ChangeOrder[] = [];
export const MOCK_MATERIAL_REQUESTS: MaterialRequest[] = [];
export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [];
export const MOCK_GRN: GoodsReceiptNote[] = [];
export const MOCK_INVOICES: Invoice[] = [];
export const MOCK_STOCK: StockItem[] = [];
export const MOCK_WORKERS: Worker[] = [];
export const MOCK_ATTENDANCE: AttendanceRecord[] = [];
export const MOCK_DPR: DPR[] = [];
export const MOCK_SNAGS: Snag[] = [];
export const MOCK_APPROVALS: ApprovalRequest[] = [];
export const MOCK_LEADS: Lead[] = [];
export const MOCK_ASSETS: Asset[] = [];
export const MOCK_SOIL_SAMPLES: SoilSample[] = [];
export const MOCK_SOIL_LAB_TESTS: SoilLabTest[] = [];
export const MOCK_SOIL_REPORTS: SoilInvestigationReport[] = [];
export const MOCK_ARCHITECTURAL_DRAWINGS: ArchitecturalDrawing[] = [];
export const MOCK_PAYMENT_REQUESTS: ProjectPaymentRequest[] = [];
export const MOCK_PROJECT_TRANSACTIONS: ProjectTransactionRecord[] = [];

// ----------------------------------------------------
// Predefined Default Tasks Template covering all company departments
// ----------------------------------------------------
export const PREDEFINED_TASKS_TEMPLATE: PredefinedTaskTemplate[] = [
  { id: 1, code: 'TSK-01', title: 'Quotation & Scope Verification', department: 'MARKETING', default_priority: 'HIGH', description: 'Prepare commercial cost estimation and send quote to prospective client.' },
  { id: 2, code: 'TSK-02', title: 'Boundary & Topographical Survey', department: 'SURVEY', default_priority: 'HIGH', description: 'Field team site reconnaissance, DGPS boundary demarcation, and contour survey.' },
  { id: 3, code: 'TSK-03', title: 'Soil Investigation & Borehole Drilling', department: 'SOIL_INVESTIGATION', default_priority: 'URGENT', description: 'Geotechnical borehole drilling, visual stratum inspection, and GPS log.' },
  { id: 4, code: 'TSK-04', title: 'Soil Core Sample Collection & Lab Testing', department: 'SOIL_INVESTIGATION', default_priority: 'HIGH', description: 'Extract soil core samples and perform California Bearing Ratio (CBR), SPT, and moisture tests.' },
  { id: 5, code: 'TSK-05', title: 'Material Testing (Concrete Cube & Rebar Tensile)', department: 'MATERIAL_TESTING', default_priority: 'URGENT', description: 'Concrete cube compression tests, steel rebar tensile & bend tests, aggregate durability.' },
  { id: 6, code: 'TSK-06', title: 'Bitumen & Aggregate Durability Lab Test', department: 'MATERIAL_TESTING', default_priority: 'HIGH', description: 'Laboratory quality audit for bitumen mix, aggregate gradation, and impact value.' },
  { id: 7, code: 'TSK-07', title: 'Structural Analysis & Load Calculation', department: 'STRUCTURAL', default_priority: 'HIGH', description: 'RCC & steel structural design, dead/live load analysis, foundation sizing & stability checks.' },
  { id: 8, code: 'TSK-08', title: 'Structural Foundation Vetting & Proof Checking', department: 'STRUCTURAL', default_priority: 'URGENT', description: 'Vetting of foundation drawings, structural safety compliance, and peer review sign-off.' },
  { id: 9, code: 'TSK-09', title: 'Architectural Working Drawings & 3D Render', department: 'ARCHITECTURE', default_priority: 'MEDIUM', description: 'Detailed floor plans, cross-sections, elevation layouts, and client approved 3D renders.' },
  { id: 10, code: 'TSK-10', title: 'Civil Construction & Earthwork Execution', department: 'CONSTRUCTION', default_priority: 'HIGH', description: 'Site mobilization, excavation, PCC, footing reinforcement, and column casting.' },
  { id: 11, code: 'TSK-11', title: 'Site Inspection Logs & Photo/Video Upload', department: 'CONSTRUCTION', default_priority: 'MEDIUM', description: 'Upload geofenced live site photos, 360 inspection videos, and QA/QC checklist.' },
  { id: 12, code: 'TSK-12', title: 'Soil & Structural Investigation Report Dossier', department: 'SOIL_INVESTIGATION', default_priority: 'HIGH', description: 'Draft comprehensive engineering investigation report with safe bearing capacity (SBC) recommendations.' },
  { id: 13, code: 'TSK-13', title: 'Billing, Invoicing & Sign-off Dossier', department: 'ACCOUNTS', default_priority: 'HIGH', description: 'Digital signatures from licensed engineers, milestone invoice generation, and client hand-off.' },
];

