import { Project } from '../types';

export type DepartmentId = 
  | 'booshnam_associates'
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
  | 'ARCHITECTURE';

export interface DepartmentEntity {
  id: DepartmentId;
  name: string;
  shortName: string;
  role: string;
  owner: string;
  logoType: 'booshnam' | 'globe';
  isMainOverview: boolean;
  description: string;
  codePrefix: string;
}

export interface DepartmentStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  notStartedProjects: number;
  totalRevenue: number;
  totalExpenses: number;
  netMargin: number;
}

export const ORGANIZATION_DEPARTMENTS: DepartmentEntity[] = [
  {
    id: 'booshnam_associates',
    name: 'Booshnam Associates',
    shortName: 'Booshnam Associates',
    role: 'Super Admin Overview',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: true,
    description: 'Main Super Admin Overview • Consolidated Records across All Departments',
    codePrefix: 'BA',
  },
  {
    id: 'SOIL_INVESTIGATION',
    name: 'Soil Investigation',
    shortName: 'Soil Investigation',
    role: 'Department',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Geotechnical borehole drilling, SPT lab tests, stratum logs & SBC reports',
    codePrefix: 'SOIL',
  },
  {
    id: 'MATERIAL_TESTING',
    name: 'Material Testing',
    shortName: 'Material Testing',
    role: 'Department',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Concrete cube compression, rebar tensile, cement & aggregate lab testing',
    codePrefix: 'MTD',
  },
  {
    id: 'SURVEYING',
    name: 'Surveying',
    shortName: 'Surveying',
    role: 'Department',
    owner: 'Nivedhitha Arumugam',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Topographic contour, DGPS boundary demarcation, levelling & GIS mapping',
    codePrefix: 'SRV',
  },
  {
    id: 'STRUCTURAL',
    name: 'Structural',
    shortName: 'Structural',
    role: 'Department',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'RCC & steel structural design, load analysis, foundation calculations & vetting',
    codePrefix: 'STR',
  },
  {
    id: 'ARCHITECTURAL',
    name: 'Architectural',
    shortName: 'Architectural',
    role: 'Department',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Architectural drawings, floor plans, elevations, 3D renders & approvals',
    codePrefix: 'ARC',
  },
  {
    id: 'SCULPTURE',
    name: 'Sculpture',
    shortName: 'Sculpture',
    role: 'Department',
    owner: 'Soil Test',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Architectural sculptures, monumental statues, murals & heritage artisan crafts',
    codePrefix: 'SCP',
  },
  {
    id: 'PRIVATE_CONSTRUCTION',
    name: 'Private Construction',
    shortName: 'Private Construction',
    role: 'Department',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Residential, villa, commercial, industrial private construction execution & turnkey contracts',
    codePrefix: 'PRV',
  },
  {
    id: 'GOVERNMENT_PROJECT',
    name: 'Government Projects',
    shortName: 'Government Projects',
    role: 'Department',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'PWD, highway, public infrastructure, government civil tenders & departmental contracts',
    codePrefix: 'GOV',
  },
  {
    id: 'COIMBATORE_SOIL',
    name: 'Coimbatore – Soil Investigation',
    shortName: 'Coimbatore – Soil',
    role: 'Coimbatore Branch',
    owner: 'Nivedhitha Arumugam',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Coimbatore regional borehole drilling, soil testing & geotechnical reports',
    codePrefix: 'CBE-S',
  },
  {
    id: 'COIMBATORE_MATERIAL_TESTING',
    name: 'Coimbatore – Material Testing',
    shortName: 'Coimbatore – Material Testing',
    role: 'Coimbatore Branch',
    owner: 'Nivedhitha Arumugam',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Coimbatore branch material laboratory testing, quality certification & test reports',
    codePrefix: 'CBE-M',
  },
];

const ACTIVE_DEPT_STORAGE_KEY = 'booshnam_active_department';

/**
 * Returns current active department ID. If user session is tied to a specific department, returns that department.
 */
export const getActiveDepartmentId = (): DepartmentId => {
  try {
    const rawSession = localStorage.getItem('booshnam_active_session_v2');
    if (rawSession) {
      const acc = JSON.parse(rawSession);
      const isSuper = acc.role_code === 'SUPER_ADMIN';
      const isAllDepts = !acc.department || 
        acc.department === 'Executive Management' || 
        acc.department === 'Booshnam Associates' || 
        acc.department.toLowerCase().includes('all');
      
      // If user is restricted to a specific department, enforce it
      if (!isSuper || !isAllDepts) {
        if (acc.department) {
          return normalizeDepartmentId(acc.department);
        }
      }
    }
    const saved = localStorage.getItem(ACTIVE_DEPT_STORAGE_KEY);
    if (saved === 'CONSTRUCTION') {
      localStorage.setItem(ACTIVE_DEPT_STORAGE_KEY, 'booshnam_associates');
      return 'booshnam_associates';
    }
    if (saved && ORGANIZATION_DEPARTMENTS.some(d => d.id === saved)) {
      return saved as DepartmentId;
    }
  } catch (e) {}
  return 'booshnam_associates';
};

/**
 * Sets active department ID and broadcasts change event to entire application.
 * If user session is locked to a specific department, protects against unauthorized switching.
 */
export const setActiveDepartmentId = (deptId: DepartmentId): void => {
  try {
    const rawSession = localStorage.getItem('booshnam_active_session_v2');
    if (rawSession) {
      const acc = JSON.parse(rawSession);
      const isSuper = acc.role_code === 'SUPER_ADMIN';
      const isAllDepts = !acc.department || 
        acc.department === 'Executive Management' || 
        acc.department === 'Booshnam Associates' || 
        acc.department.toLowerCase().includes('all');
      
      if (!isSuper || !isAllDepts) {
        if (acc.department) {
          const lockedId = normalizeDepartmentId(acc.department);
          localStorage.setItem(ACTIVE_DEPT_STORAGE_KEY, lockedId);
          window.dispatchEvent(new CustomEvent('booshnam_active_dept_changed', { detail: lockedId }));
          return;
        }
      }
    }
    localStorage.setItem(ACTIVE_DEPT_STORAGE_KEY, deptId);
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('booshnam_active_dept_changed', { detail: deptId }));
};

/**
 * Returns active department entity details
 */
export const getActiveDepartment = (): DepartmentEntity => {
  const activeId = getActiveDepartmentId();
  return ORGANIZATION_DEPARTMENTS.find(d => d.id === activeId) || ORGANIZATION_DEPARTMENTS[0];
};

/**
 * Get all individual departments (excluding main overview)
 */
export const getIndividualDepartments = (): DepartmentEntity[] => {
  return ORGANIZATION_DEPARTMENTS.filter(d => !d.isMainOverview);
};

/**
 * Normalize department identifier from string or project
 */
export const normalizeDepartmentId = (raw?: string | null): DepartmentId => {
  if (!raw) return 'SOIL_INVESTIGATION';
  const clean = raw.trim().toUpperCase();

  // 1. Direct exact ID matches first
  if (clean === 'BOOSHNAM_ASSOCIATES') return 'booshnam_associates';
  if (clean === 'SOIL_INVESTIGATION') return 'SOIL_INVESTIGATION';
  if (clean === 'MATERIAL_TESTING') return 'MATERIAL_TESTING';
  if (clean === 'SURVEYING' || clean === 'SURVEY') return 'SURVEYING';
  if (clean === 'STRUCTURAL') return 'STRUCTURAL';
  if (clean === 'ARCHITECTURAL' || clean === 'ARCHITECTURE') return 'ARCHITECTURAL';
  if (clean === 'SCULPTURE' || clean === 'ART_SCULPTURE') return 'SCULPTURE';
  if (clean === 'PRIVATE_CONSTRUCTION' || clean === 'PRIVATE' || clean === 'PRV' || clean === 'PC') return 'PRIVATE_CONSTRUCTION';
  if (clean === 'GOVERNMENT_PROJECT' || clean === 'GOVERNMENT_PROJECTS' || clean === 'GOVERNMENT' || clean === 'GOV' || clean === 'GP') return 'GOVERNMENT_PROJECT';
  if (clean === 'COIMBATORE_SOIL' || clean === 'CBE_SOIL_INVESTIGATION') return 'COIMBATORE_SOIL';
  if (clean === 'COIMBATORE_MATERIAL_TESTING') return 'COIMBATORE_MATERIAL_TESTING';

  // 2. Coimbatore branch matches
  if (clean.includes('COIMBATORE') || clean.includes('CBE')) {
    if (clean.includes('MATERIAL') || clean.includes('TEST') || clean.includes('MTD')) {
      return 'COIMBATORE_MATERIAL_TESTING';
    }
    return 'COIMBATORE_SOIL';
  }

  // 3. Keyword / partial matches
  if (clean.includes('PRIVATE') || clean.includes('PRV')) return 'PRIVATE_CONSTRUCTION';
  if (clean.includes('GOV') || clean.includes('PUBLIC')) return 'GOVERNMENT_PROJECT';
  if (clean.includes('SOIL')) return 'SOIL_INVESTIGATION';
  if (clean.includes('MATERIAL') || clean.includes('MTD')) return 'MATERIAL_TESTING';
  if (clean.includes('SURVEY')) return 'SURVEYING';
  if (clean.includes('STRUCT')) return 'STRUCTURAL';
  if (clean.includes('ARCH')) return 'ARCHITECTURAL';
  if (clean.includes('SCULPT') || clean.includes('ART')) return 'SCULPTURE';
  if (clean.includes('CONST')) return 'PRIVATE_CONSTRUCTION';

  return 'SOIL_INVESTIGATION';
};

/**
 * Compute KPI stats for a specific department or consolidated overview
 */
export const calculateDepartmentStats = (
  deptId: DepartmentId,
  allProjects: Project[]
): DepartmentStats => {
  const isOverview = deptId === 'booshnam_associates';
  const targetProjects = isOverview
    ? allProjects
    : allProjects.filter(p => normalizeDepartmentId(p.department as string) === deptId);

  let activeProjects = 0;
  let completedProjects = 0;
  let onHoldProjects = 0;
  let notStartedProjects = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;

  targetProjects.forEach(p => {
    const status = (p.status || 'ACTIVE').toUpperCase();
    if (status === 'COMPLETED') completedProjects++;
    else if (status === 'ON_HOLD' || status === 'ONHOLD') onHoldProjects++;
    else if (status === 'PLANNING' || status === 'NOT_STARTED') notStartedProjects++;
    else activeProjects++;

    const cashIn = Number(p.cash_in || 0);
    const estBudget = Number(p.estimated_budget || 0);
    totalRevenue += cashIn > 0 ? cashIn : estBudget;

    const cashOut = Number(p.cash_out || 0);
    const actCost = Number(p.actual_cost || 0);
    totalExpenses += cashOut > 0 ? cashOut : actCost;
  });

  return {
    totalProjects: targetProjects.length,
    activeProjects,
    completedProjects,
    onHoldProjects,
    notStartedProjects,
    totalRevenue,
    totalExpenses,
    netMargin: totalRevenue - totalExpenses,
  };
};

/**
 * Curated Seed Projects covering all 10 departments (1 project per department)
 */
export const INITIAL_DEPARTMENT_PROJECTS: Project[] = [
  // 1. Soil Investigation
  {
    id: 'bn-soil-001',
    code: 'SOIL-2026-001',
    name: 'Kalyan Grand Commercial Enclave – Stratum Borehole & SBC Testing',
    client_name: 'Kalyan Developers & Retail Infra',
    project_type: 'Soil Investigation',
    category: 'Commercial Geotechnical',
    department: 'SOIL_INVESTIGATION',
    department_name: 'Soil Investigation',
    location: 'Anna Nagar 2nd Avenue, Chennai',
    city: 'Chennai',
    address: 'Plot 42, Anna Nagar 2nd Avenue, Chennai - 600040',
    latitude: 13.0850,
    longitude: 80.2101,
    geofence_radius_meters: 500,
    start_date: '2026-01-10',
    expected_end_date: '2026-04-30',
    estimated_budget: 1250000,
    actual_cost: 780000,
    cash_in: 950000,
    cash_out: 620000,
    progress_percentage: 65,
    status: 'ACTIVE',
    stage: 'Testing & Laboratory',
    tasks_count: 12,
    todo_count: 2,
    approval_pending_count: 1,
    initials: 'KG',
    avatar_color: 'bg-emerald-600',
    description: 'Continuous core drilling up to 30m depth, SPT N-values, undisturbed soil sampling, triaxial shear testing & Safe Bearing Capacity (SBC) recommendations for 14-storey commercial foundation.',
    scope_of_work: '4 Boreholes to 30m, SPT at 1.5m intervals, laboratory grain size analysis, Atterberg limits, direct shear tests and geotechnical engineering report preparation.',
    assigned_team: [
      { id: 'team-soil-pm', name: 'Managing Director', role: 'Project Director', phone: '+91 98401 23456', email: 'director@booshnam.com' },
      { id: 'team-soil-eng', name: 'K. Saravanan', role: 'Geotechnical Engineer', phone: '+91 98402 34567', email: 'saravanan@booshnam.com' },
      { id: 'team-soil-sup', name: 'M. Murugan', role: 'Site Drilling Rig Supervisor', phone: '+91 98403 45678', email: 'murugan@booshnam.com' }
    ]
  },

  // 2. Material Testing
  {
    id: 'bn-mat-001',
    code: 'MTD-2026-001',
    name: 'L&T Metro Viaduct Package – Concrete Cube & Rebar Tensile Testing',
    client_name: 'L&T Infrastructure Engineering',
    project_type: 'Material Testing',
    category: 'Infrastructure Quality Lab',
    department: 'MATERIAL_TESTING',
    department_name: 'Material Testing',
    location: 'Ambattur Industrial Estate, Chennai',
    city: 'Chennai',
    address: 'Phase III, Ambattur Industrial Estate, Chennai - 600058',
    latitude: 13.1143,
    longitude: 80.1548,
    geofence_radius_meters: 500,
    start_date: '2026-02-01',
    expected_end_date: '2026-06-15',
    estimated_budget: 850000,
    actual_cost: 420000,
    cash_in: 650000,
    cash_out: 350000,
    progress_percentage: 50,
    status: 'ACTIVE',
    stage: 'Lab Quality Testing',
    tasks_count: 10,
    todo_count: 1,
    approval_pending_count: 0,
    initials: 'LT',
    avatar_color: 'bg-blue-600',
    description: '7-day and 28-day concrete cube compressive strength tests, Fe 550D TMT bar 0.2% proof stress & elongation verification, aggregate flakiness index & slump checks.',
    scope_of_work: 'Testing 450 concrete cube specimens, 120 steel tensile specimens, coarse & fine aggregate sieve analysis, and official ISO/NABL quality certification.',
    assigned_team: [
      { id: 'team-mat-pm', name: 'Managing Director', role: 'Quality Head', phone: '+91 98401 23456', email: 'director@booshnam.com' },
      { id: 'team-mat-eng', name: 'R. Vignesh', role: 'Materials Lab Incharge', phone: '+91 98404 56789', email: 'vignesh@booshnam.com' },
      { id: 'team-mat-sup', name: 'S. Prakash', role: 'Lab Testing Technician', phone: '+91 98405 67890', email: 'prakash@booshnam.com' }
    ]
  },

  // 3. Surveying
  {
    id: 'bn-srv-001',
    code: 'SRV-2026-001',
    name: 'VGP Bayview Smart City – DGPS Boundary & Topographical Survey',
    client_name: 'VGP Housing & Agro Farms Pvt Ltd',
    project_type: 'Surveying',
    category: 'Land & Cadastral Survey',
    department: 'SURVEYING',
    department_name: 'Surveying',
    location: 'OMR IT Corridor, Kelambakkam',
    city: 'Chennai',
    address: 'Survey Nos. 142-148, OMR Main Road, Kelambakkam - 603103',
    latitude: 12.7876,
    longitude: 80.2185,
    geofence_radius_meters: 500,
    start_date: '2026-01-20',
    expected_end_date: '2026-05-10',
    estimated_budget: 950000,
    actual_cost: 580000,
    cash_in: 750000,
    cash_out: 480000,
    progress_percentage: 60,
    status: 'ACTIVE',
    stage: 'Field Survey & Mapping',
    tasks_count: 14,
    todo_count: 3,
    approval_pending_count: 1,
    initials: 'VB',
    avatar_color: 'bg-amber-600',
    description: 'Total station grid contouring, RTK DGPS boundary demarcation, GL levels, road alignment cross-sections and AutoCAD GIS layer generation for 45-acre gated layout.',
    scope_of_work: 'Boundary pillar geo-referencing using dual-frequency GNSS receivers, 0.5m interval contour mapping, tree & utility marking, and DTCP approved layout drawings.',
    assigned_team: [
      { id: 'team-srv-pm', name: 'Nivedhitha Arumugam', role: 'Survey Operations Lead', phone: '+91 98406 78901', email: 'nivedhitha@booshnam.com' },
      { id: 'team-srv-eng', name: 'K. Balaji', role: 'Senior Land Surveyor', phone: '+91 98407 89012', email: 'balaji@booshnam.com' },
      { id: 'team-srv-sup', name: 'P. Sivakumar', role: 'DGPS Field Assistant', phone: '+91 98408 90123', email: 'sivakumar@booshnam.com' }
    ]
  },

  // 4. Structural
  {
    id: 'bn-str-001',
    code: 'STR-2026-001',
    name: 'SRM Infotech Tech Park (B+G+12) – RCC Structural Design & Vetting',
    client_name: 'SRM Tech Infrastructure Group',
    project_type: 'Structural',
    category: 'Commercial Structural Engineering',
    department: 'STRUCTURAL',
    department_name: 'Structural',
    location: 'SIDCO Guindy Industrial Area, Chennai',
    city: 'Chennai',
    address: 'Block B, Guindy Industrial Estate, Chennai - 600032',
    latitude: 13.0102,
    longitude: 80.2120,
    geofence_radius_meters: 500,
    start_date: '2026-02-15',
    expected_end_date: '2026-08-30',
    estimated_budget: 2400000,
    actual_cost: 1150000,
    cash_in: 1800000,
    cash_out: 920000,
    progress_percentage: 45,
    status: 'ACTIVE',
    stage: 'Structural Vetting & AFC',
    tasks_count: 16,
    todo_count: 2,
    approval_pending_count: 2,
    initials: 'SI',
    avatar_color: 'bg-indigo-600',
    description: 'ETABS 3D dynamic seismic analysis (Zone III), wind load modeling, raft foundation detailing, shear wall design and AFC structural drawing proof-checking.',
    scope_of_work: 'Complete RCC design according to IS 456 & IS 1893:2016, PT slab vetting for basement parking, column interaction charts, bar bending schedules and peer-review report.',
    assigned_team: [
      { id: 'team-str-pm', name: 'Managing Director', role: 'Chief Structural Consultant', phone: '+91 98401 23456', email: 'director@booshnam.com' },
      { id: 'team-str-eng', name: 'Dr. C. Ramanathan', role: 'Senior Structural Engineer', phone: '+91 98409 01234', email: 'ramanathan@booshnam.com' },
      { id: 'team-str-sup', name: 'D. Karthik', role: 'CAD Structural Detailer', phone: '+91 98410 12345', email: 'karthik@booshnam.com' }
    ]
  },

  // 5. Architectural
  {
    id: 'bn-arch-001',
    code: 'ARC-2026-001',
    name: 'Aravind Signature Luxury Villa – Architectural Plans & 3D Renders',
    client_name: 'Dr. Aravind Krishnan',
    project_type: 'Architectural',
    category: 'Luxury Residential Architecture',
    department: 'ARCHITECTURAL',
    department_name: 'Architectural',
    location: 'East Coast Road (ECR), Neelangarai',
    city: 'Chennai',
    address: 'Sea Cliff Conclave, 4th Seaward Road, Neelangarai, Chennai - 600115',
    latitude: 12.9492,
    longitude: 80.2589,
    geofence_radius_meters: 500,
    start_date: '2026-01-05',
    expected_end_date: '2026-05-30',
    estimated_budget: 1650000,
    actual_cost: 820000,
    cash_in: 1200000,
    cash_out: 680000,
    progress_percentage: 55,
    status: 'ACTIVE',
    stage: 'Concept Design & 3D',
    tasks_count: 12,
    todo_count: 1,
    approval_pending_count: 0,
    initials: 'AS',
    avatar_color: 'bg-purple-600',
    description: 'Contemporary tropical villa master plan, vastu-compliant room orientations, sustainable skylights, landscaping layouts and high-fidelity Lumion 3D walkthrough animations.',
    scope_of_work: 'Architectural schematic design, municipal building permit sanction sets, interior space planning, lighting layouts, MEP coordination and 4K photorealistic 3D renders.',
    assigned_team: [
      { id: 'team-arch-pm', name: 'Managing Director', role: 'Principal Architect', phone: '+91 98401 23456', email: 'director@booshnam.com' },
      { id: 'team-arch-eng', name: 'Ar. Sneha Menon', role: 'Lead Architect', phone: '+91 98411 23456', email: 'sneha@booshnam.com' },
      { id: 'team-arch-sup', name: 'G. Arun Kumar', role: '3D Visualizer & Draughtsman', phone: '+91 98412 34567', email: 'arun@booshnam.com' }
    ]
  },

  // 6. Sculpture
  {
    id: 'bn-sculp-001',
    code: 'SCP-2026-001',
    name: 'Sri Meenakshi Amman Temple Gopuram – Granite Sculptures & Murals',
    client_name: 'Arulmigu Meenakshi Temple Trust',
    project_type: 'Sculpture',
    category: 'Temple Architecture & Heritage Art',
    department: 'SCULPTURE',
    department_name: 'Sculpture',
    location: 'Mahabalipuram Craft Studio / Madurai',
    city: 'Madurai',
    address: 'Sculptors Enclave, East Coast Highway, Mahabalipuram - 603104',
    latitude: 9.9195,
    longitude: 78.1193,
    geofence_radius_meters: 500,
    start_date: '2026-01-15',
    expected_end_date: '2026-10-15',
    estimated_budget: 3200000,
    actual_cost: 1450000,
    cash_in: 2200000,
    cash_out: 1150000,
    progress_percentage: 40,
    status: 'ACTIVE',
    stage: 'Artisan Stone Carving',
    tasks_count: 15,
    todo_count: 2,
    approval_pending_count: 1,
    initials: 'SM',
    avatar_color: 'bg-rose-600',
    description: 'Traditional black granite deity statues, temple pillar ornamental carvings, mythological baseline reliefs and Panchaloha brass architectural elements according to Shilpa Shastras.',
    scope_of_work: 'Carving 18 monolithic granite dvarapalaka figures, intricate floral friezes, stone lintel inscriptions and temple sanctum wall stone mural restoration.',
    assigned_team: [
      { id: 'team-sculp-pm', name: 'Soil Test', role: 'Heritage Art Director', phone: '+91 98401 23456', email: 'art@booshnam.com' },
      { id: 'team-sculp-eng', name: 'Sthapati K. Devanathan', role: 'Master Temple Sculptor', phone: '+91 98413 45678', email: 'devanathan@booshnam.com' },
      { id: 'team-sculp-sup', name: 'R. Senthil', role: 'Artisan Workshop Foreman', phone: '+91 98414 56789', email: 'senthil@booshnam.com' }
    ]
  },

  // 7. Private Construction
  {
    id: 'bn-prv-001',
    code: 'PRV-2026-001',
    name: 'Crown Residency Deluxe Apartments (G+4) – Turnkey Construction',
    client_name: 'Crown Promoters & Builders',
    project_type: 'Private Construction',
    category: 'Turnkey Residential Building',
    department: 'PRIVATE_CONSTRUCTION',
    department_name: 'Private Construction',
    location: '100 Feet Bypass Road, Velachery',
    city: 'Chennai',
    address: 'Survey 220/3, Bypass Road, Velachery, Chennai - 600042',
    latitude: 12.9815,
    longitude: 80.2180,
    geofence_radius_meters: 500,
    start_date: '2026-01-01',
    expected_end_date: '2026-12-31',
    estimated_budget: 14500000,
    actual_cost: 6200000,
    cash_in: 8500000,
    cash_out: 5100000,
    progress_percentage: 48,
    status: 'ACTIVE',
    stage: 'Brickwork & Plastering',
    tasks_count: 24,
    todo_count: 4,
    approval_pending_count: 2,
    initials: 'CR',
    avatar_color: 'bg-red-600',
    description: 'Complete civil execution of 16-unit residential block: RCC column casting, AAC block masonry, electrical conduit roughing, internal/external plastering and lift installation.',
    scope_of_work: 'Substructure piling, M25 grade RCC framing, fly-ash lightweight blockwork, water-proofing, vitrified tile flooring, CP fittings, teack wood joinery and painting.',
    assigned_team: [
      { id: 'team-prv-pm', name: 'Managing Director', role: 'General Project Manager', phone: '+91 98401 23456', email: 'director@booshnam.com' },
      { id: 'team-prv-eng', name: 'Er. T. Muthukumar', role: 'Site Project Engineer', phone: '+91 98415 67890', email: 'muthu@booshnam.com' },
      { id: 'team-prv-sup', name: 'V. Jayaraj', role: 'General Site Supervisor', phone: '+91 98416 78901', email: 'jayaraj@booshnam.com' }
    ]
  },

  // 8. Government Projects
  {
    id: 'bn-gov-001',
    code: 'GOV-2026-001',
    name: 'Tamil Nadu Highways Dept – Chengalpattu Bypass Box Culvert & Drain',
    client_name: 'Highways Department, Govt of Tamil Nadu',
    project_type: 'Government Projects',
    category: 'Public Infrastructure Tenders',
    department: 'GOVERNMENT_PROJECT',
    department_name: 'Government Projects',
    location: 'State Highway 58, Chengalpattu Division',
    city: 'Chengalpattu',
    address: 'Km 14/2 - 18/6, SH-58 Highway Corridor, Chengalpattu - 603001',
    latitude: 12.6821,
    longitude: 79.9836,
    geofence_radius_meters: 500,
    start_date: '2026-01-10',
    expected_end_date: '2026-07-20',
    estimated_budget: 8800000,
    actual_cost: 4100000,
    cash_in: 5500000,
    cash_out: 3400000,
    progress_percentage: 52,
    status: 'ACTIVE',
    stage: 'Civil Concrete Work',
    tasks_count: 18,
    todo_count: 3,
    approval_pending_count: 1,
    initials: 'TH',
    avatar_color: 'bg-emerald-700',
    description: 'Tender Package #TN-HW-884: 2x2m twin box culvert casting, roadside stormwater drain construction with precast RCC cover slabs, sub-base compaction and bituminous tack coat.',
    scope_of_work: 'Earth excavation, PCC bedding, M30 grade RCC box culvert raft and barrel walls, 2.4 km retaining drain, wing walls, gabion stone pitching and traffic diversions.',
    assigned_team: [
      { id: 'team-gov-pm', name: 'Managing Director', role: 'Govt Contracts Lead', phone: '+91 98401 23456', email: 'director@booshnam.com' },
      { id: 'team-gov-eng', name: 'Er. N. Sundaram', role: 'Highway Site Engineer', phone: '+91 98417 89012', email: 'sundaram@booshnam.com' },
      { id: 'team-gov-sup', name: 'K. Gunasekaran', role: 'PWD Works Inspector', phone: '+91 98418 90123', email: 'guna@booshnam.com' }
    ]
  },

  // 9. Coimbatore – Soil Investigation
  {
    id: 'bn-cbe-soil-001',
    code: 'CBE-S-2026-001',
    name: 'Tidel Park Tech Zone – Geotechnical Core Drilling & Plate Load Tests',
    client_name: 'Tidel Park Coimbatore Ltd',
    project_type: 'Coimbatore – Soil Investigation',
    category: 'Regional Geotechnical Investigation',
    department: 'COIMBATORE_SOIL',
    department_name: 'Coimbatore – Soil Investigation',
    location: 'Avinashi Road, Peelamedu, Coimbatore',
    city: 'Coimbatore',
    address: 'ELCOSEZ Campus, Avinashi Road, Peelamedu, Coimbatore - 641014',
    latitude: 11.0285,
    longitude: 77.0142,
    geofence_radius_meters: 500,
    start_date: '2026-02-10',
    expected_end_date: '2026-05-25',
    estimated_budget: 1400000,
    actual_cost: 650000,
    cash_in: 900000,
    cash_out: 520000,
    progress_percentage: 50,
    status: 'ACTIVE',
    stage: 'Core Drilling & Analysis',
    tasks_count: 11,
    todo_count: 2,
    approval_pending_count: 0,
    initials: 'TP',
    avatar_color: 'bg-teal-600',
    description: 'NX diamond rotary core drilling up to hard rock stratum (25m), RQD index computation, field permeability tests and seismic microzonation report for commercial IT block.',
    scope_of_work: '6 Rotary diamond core boreholes, standard cyclic plate load tests, laboratory rock compressive strength (UCS) tests, and foundation recommendation report for high-rise structure.',
    assigned_team: [
      { id: 'team-cbe-soil-pm', name: 'Nivedhitha Arumugam', role: 'Coimbatore Branch Manager', phone: '+91 98406 78901', email: 'nivedhitha@booshnam.com' },
      { id: 'team-cbe-soil-eng', name: 'Er. S. Manikandan', role: 'CBE Geotechnical Engineer', phone: '+91 98419 01234', email: 'manikandan@booshnam.com' },
      { id: 'team-cbe-soil-sup', name: 'R. Velumani', role: 'Core Rig Supervisor', phone: '+91 98420 12345', email: 'velu@booshnam.com' }
    ]
  },

  // 10. Coimbatore – Material Testing
  {
    id: 'bn-cbe-mat-001',
    code: 'CBE-M-2026-001',
    name: 'PSG Foundry Machine Complex – Aggregate Crushing & Slag Quality Tests',
    client_name: 'PSG Industrial Institute',
    project_type: 'Coimbatore – Material Testing',
    category: 'Industrial Material Quality Lab',
    department: 'COIMBATORE_MATERIAL_TESTING',
    department_name: 'Coimbatore – Material Testing',
    location: 'SIDCO Industrial Estate, Kurichi, Coimbatore',
    city: 'Coimbatore',
    address: 'Plot 88, SIDCO Industrial Complex, Kurichi, Coimbatore - 641021',
    latitude: 10.9412,
    longitude: 76.9634,
    geofence_radius_meters: 500,
    start_date: '2026-01-25',
    expected_end_date: '2026-04-30',
    estimated_budget: 720000,
    actual_cost: 310000,
    cash_in: 500000,
    cash_out: 250000,
    progress_percentage: 60,
    status: 'ACTIVE',
    stage: 'Batch Sampling & Lab Vetting',
    tasks_count: 9,
    todo_count: 1,
    approval_pending_count: 0,
    initials: 'PF',
    avatar_color: 'bg-cyan-600',
    description: 'Aggregate crushing value (ACV), 10% fines value, chemical analysis of blast furnace slag, binder fineness by Blaine air permeability and sound test reports.',
    scope_of_work: 'Testing 28 foundry foundation core samples, aggregate abrasion & impact value verification, chemical composition spectrometry, and industrial compliance test certificates.',
    assigned_team: [
      { id: 'team-cbe-mat-pm', name: 'Nivedhitha Arumugam', role: 'Coimbatore Branch Manager', phone: '+91 98406 78901', email: 'nivedhitha@booshnam.com' },
      { id: 'team-cbe-mat-eng', name: 'K. Balachandran', role: 'CBE Materials Quality Incharge', phone: '+91 98421 23456', email: 'balachandran@booshnam.com' },
      { id: 'team-cbe-mat-sup', name: 'M. Dharmaraj', role: 'Mechanical Test Technician', phone: '+91 98422 34567', email: 'dharmaraj@booshnam.com' }
    ]
  }
];

/**
 * Initialize / Seed projects in localStorage ensuring EVERY department has at least 1 project.
 */
export const getOrInitializeProjects = (): Project[] => {
  try {
    const saved = localStorage.getItem('booshnam_projects_v2');
    let projs: Project[] = [];
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        projs = parsed.filter((p: any) => 
          !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
        );
      }
    }

    // Ensure EVERY individual department has at least 1 project
    const individualDepts = getIndividualDepartments();
    let hasChanges = false;
    
    individualDepts.forEach(dept => {
      const exists = projs.some(p => normalizeDepartmentId(p.department as string) === dept.id);
      if (!exists) {
        const seedForDept = INITIAL_DEPARTMENT_PROJECTS.find(p => normalizeDepartmentId(p.department as string) === dept.id);
        if (seedForDept) {
          projs.push(seedForDept);
          hasChanges = true;
        }
      }
    });

    if (projs.length === 0) {
      projs = [...INITIAL_DEPARTMENT_PROJECTS];
      hasChanges = true;
    }

    if (hasChanges || !saved) {
      localStorage.setItem('booshnam_projects_v2', JSON.stringify(projs));
    }
    return projs;
  } catch (e) {
    return [...INITIAL_DEPARTMENT_PROJECTS];
  }
};
