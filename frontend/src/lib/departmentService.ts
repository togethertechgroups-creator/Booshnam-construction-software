import { Project } from '../types';

export type DepartmentId = 
  | 'booshnam_associates'
  | 'GOVERNMENT_PROJECT'
  | 'STRUCTURAL'
  | 'CBE_SOIL_INVESTIGATION'
  | 'ART_SCULPTURE'
  | 'MATERIAL_TESTING'
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
    role: 'Super Admin',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: true,
    description: 'Main Super Admin Overview • Consolidated Records across All Departments',
    codePrefix: 'BA',
  },
  {
    id: 'GOVERNMENT_PROJECT',
    name: 'GOVERNMENT PROJECT',
    shortName: 'Government Projects',
    role: 'Super Admin',
    owner: 'Nivedhitha Arumugam',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Government tenders, PWD highways, public infrastructure & municipal works',
    codePrefix: 'GOV',
  },
  {
    id: 'STRUCTURAL',
    name: 'Structural Department',
    shortName: 'Structural',
    role: 'Super Admin',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'RCC & steel structural design, load analysis, foundation calculations & vetting',
    codePrefix: 'STR',
  },
  {
    id: 'CBE_SOIL_INVESTIGATION',
    name: 'CBE-Soil Investigation',
    shortName: 'Soil Investigation',
    role: 'Super Admin',
    owner: 'Nivedhitha Arumugam',
    logoType: 'globe',
    isMainOverview: false,
    description: 'Geotechnical borehole drilling, SPT lab tests, stratum logs & SBC reports',
    codePrefix: 'SOIL',
  },
  {
    id: 'ART_SCULPTURE',
    name: 'Art & Sculpture',
    shortName: 'Art & Sculpture',
    role: 'Super Admin',
    owner: 'Soil Test',
    logoType: 'globe',
    isMainOverview: false,
    description: 'Architectural sculptures, monumental statues, murals & heritage artisan crafts',
    codePrefix: 'ART',
  },
  {
    id: 'MATERIAL_TESTING',
    name: 'Material Testing Department',
    shortName: 'Material Testing',
    role: 'Super Admin',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Concrete cube compression, rebar tensile, cement & aggregate lab testing',
    codePrefix: 'MTD',
  },
  {
    id: 'CONSTRUCTION',
    name: 'Construction Department',
    shortName: 'Construction',
    role: 'Super Admin',
    owner: 'Managing Director',
    logoType: 'globe',
    isMainOverview: false,
    description: 'Civil construction execution, DPR site logs, equipment & contractor works',
    codePrefix: 'CNS',
  },
  {
    id: 'SURVEY',
    name: 'SURVEY DEPARTMENT',
    shortName: 'Survey',
    role: 'Super Admin',
    owner: 'Nivedhitha Arumugam',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Topographic contour, DGPS boundary demarcation, levelling & GIS mapping',
    codePrefix: 'SRV',
  },
  {
    id: 'ARCHITECTURE',
    name: 'Architectural Department',
    shortName: 'Architecture',
    role: 'Super Admin',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Architectural drawings, floor plans, elevations, 3D renders & approvals',
    codePrefix: 'ARC',
  },
];

const ACTIVE_DEPT_STORAGE_KEY = 'booshnam_active_department';

/**
 * Returns current active department ID. Defaults to 'booshnam_associates' (Super Admin Overview)
 */
export const getActiveDepartmentId = (): DepartmentId => {
  try {
    const saved = localStorage.getItem(ACTIVE_DEPT_STORAGE_KEY);
    if (saved && ORGANIZATION_DEPARTMENTS.some(d => d.id === saved)) {
      return saved as DepartmentId;
    }
  } catch (e) {}
  return 'booshnam_associates';
};

/**
 * Sets active department ID and broadcasts change event to entire application
 */
export const setActiveDepartmentId = (deptId: DepartmentId): void => {
  try {
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
  if (!raw) return 'CONSTRUCTION';
  const clean = raw.trim().toUpperCase();
  if (clean.includes('GOV')) return 'GOVERNMENT_PROJECT';
  if (clean.includes('STRUCT')) return 'STRUCTURAL';
  if (clean.includes('SOIL')) return 'CBE_SOIL_INVESTIGATION';
  if (clean.includes('ART') || clean.includes('SCULPT')) return 'ART_SCULPTURE';
  if (clean.includes('MATERIAL') || clean.includes('MTD')) return 'MATERIAL_TESTING';
  if (clean.includes('SURVEY')) return 'SURVEY';
  if (clean.includes('ARCH')) return 'ARCHITECTURE';
  if (clean.includes('CONST')) return 'CONSTRUCTION';
  return 'CONSTRUCTION';
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
 * Initial Curated Seed Projects covering all 8 departments
 */
export const INITIAL_DEPARTMENT_PROJECTS: Project[] = [
  // 1. GOVERNMENT PROJECT
  {
    id: 'proj-gov-01',
    code: 'RG33-GOV-1001',
    name: 'NHAI Highway Underpass & Flyover Expansion',
    client_name: 'National Highways Authority (NHAI)',
    department: 'GOVERNMENT_PROJECT',
    department_name: 'GOVERNMENT PROJECT',
    project_type: 'Government Infrastructure',
    location: 'Salem - Coimbatore Highway Section, TN',
    address: 'NH-544 Bypass, Salem Tollway',
    city: 'Salem',
    latitude: 11.6643,
    longitude: 78.146,
    geofence_radius_meters: 500,
    start_date: '2025-06-15',
    expected_end_date: '2026-12-30',
    estimated_budget: 45000000,
    actual_cost: 16500000,
    cash_in: 21000000,
    cash_out: 16500000,
    progress_percentage: 48,
    status: 'ACTIVE',
    stage: 'Structural Pier Erection',
    category: 'Infrastructure',
    description: 'Government PWD & NHAI Grade Separator with 4-lane elevated viaduct and drainage.',
    tasks_count: 24,
    todo_count: 6,
    material_pending_count: 2,
    approval_pending_count: 1,
    initials: 'NH',
    avatar_color: 'bg-red-600',
    is_pinned: true,
  },
  {
    id: 'proj-gov-02',
    code: 'RG33-GOV-1002',
    name: 'District Collectorate Multi-Level Smart Parking',
    client_name: 'Tamil Nadu PWD Buildings Wing',
    department: 'GOVERNMENT_PROJECT',
    department_name: 'GOVERNMENT PROJECT',
    project_type: 'Public Commercial',
    location: 'Collectorate Complex, Tirupur, TN',
    address: 'Court Road, Municipal Enclave',
    city: 'Tirupur',
    latitude: 11.1085,
    longitude: 77.3411,
    geofence_radius_meters: 300,
    start_date: '2025-01-10',
    expected_end_date: '2026-03-15',
    estimated_budget: 28000000,
    actual_cost: 24200000,
    cash_in: 28000000,
    cash_out: 24200000,
    progress_percentage: 100,
    status: 'COMPLETED',
    stage: 'Handover & Commissioning',
    category: 'Commercial',
    description: 'Completed 600-vehicle capacity smart automated multi-level parking facility.',
    tasks_count: 18,
    todo_count: 0,
    material_pending_count: 0,
    approval_pending_count: 0,
    initials: 'DC',
    avatar_color: 'bg-emerald-600',
  },

  // 2. Structural Department
  {
    id: 'proj-str-01',
    code: 'RG33-STR-2001',
    name: 'Apex Commercial 14-Storey RCC Structural Vetting',
    client_name: 'Apex Realty Developers',
    department: 'STRUCTURAL',
    department_name: 'Structural Department',
    project_type: 'Structural Engineering',
    location: 'Avinashi Road Commercial Corridor',
    address: 'Plot 44, Avinashi Road',
    city: 'Coimbatore',
    latitude: 11.0168,
    longitude: 76.9558,
    geofence_radius_meters: 200,
    start_date: '2025-08-01',
    expected_end_date: '2026-10-15',
    estimated_budget: 8500000,
    actual_cost: 3200000,
    cash_in: 5500000,
    cash_out: 3200000,
    progress_percentage: 65,
    status: 'ACTIVE',
    stage: 'Superstructure Shear Wall Design',
    category: 'Commercial',
    description: 'High-rise earthquake zone 3 seismic design, finite element modeling & proof-checking.',
    tasks_count: 14,
    todo_count: 3,
    material_pending_count: 0,
    approval_pending_count: 1,
    initials: 'AC',
    avatar_color: 'bg-blue-600',
    is_pinned: true,
  },
  {
    id: 'proj-str-02',
    code: 'RG33-STR-2002',
    name: 'Precision Foundry Pre-Engineered Steel Shed',
    client_name: 'Precision Castings Ltd',
    department: 'STRUCTURAL',
    department_name: 'Structural Department',
    project_type: 'Industrial Structural',
    location: 'SIDCO Industrial Estate, Malumichampatti',
    address: 'Shed 12, SIDCO Estate',
    city: 'Coimbatore',
    latitude: 10.8931,
    longitude: 76.9912,
    geofence_radius_meters: 250,
    start_date: '2025-03-01',
    expected_end_date: '2025-11-20',
    estimated_budget: 4500000,
    actual_cost: 3000000,
    cash_in: 4500000,
    cash_out: 3000000,
    progress_percentage: 100,
    status: 'COMPLETED',
    stage: 'Design Vetted & Stamped',
    category: 'Infrastructure',
    description: 'Heavy gantry crane 25T load structural calculations and fabrication drawings.',
    tasks_count: 11,
    todo_count: 0,
    material_pending_count: 0,
    approval_pending_count: 0,
    initials: 'PF',
    avatar_color: 'bg-slate-700',
  },

  // 3. CBE-Soil Investigation
  {
    id: 'proj-soil-01',
    code: 'RG33-SOIL-3001',
    name: 'Coimbatore Tech Park Deep Borehole & SBC Investigation',
    client_name: 'Coimbatore Infotech Park Ltd',
    department: 'CBE_SOIL_INVESTIGATION',
    department_name: 'CBE-Soil Investigation',
    project_type: 'Geotechnical Soil Testing',
    location: 'Saravanampatti IT Corridor',
    address: 'Survey 412/1A, IT SEZ Highway',
    city: 'Coimbatore',
    latitude: 11.0827,
    longitude: 76.9958,
    geofence_radius_meters: 350,
    start_date: '2025-09-10',
    expected_end_date: '2026-06-30',
    estimated_budget: 3500000,
    actual_cost: 1850000,
    cash_in: 2800000,
    cash_out: 1850000,
    progress_percentage: 80,
    status: 'ACTIVE',
    stage: 'Lab Shear Testing & SBC Calculation',
    category: 'Testing',
    description: '12 rotary drilling boreholes to 30m depth, SPT analysis, water table log and safe bearing capacity.',
    tasks_count: 16,
    todo_count: 2,
    material_pending_count: 1,
    approval_pending_count: 0,
    initials: 'CT',
    avatar_color: 'bg-emerald-600',
    is_pinned: true,
  },
  {
    id: 'proj-soil-02',
    code: 'RG33-SOIL-3002',
    name: 'Avinashi Elevated Expressway Subsoil Core Analysis',
    client_name: 'Larsen & Urban Infrastructure',
    department: 'CBE_SOIL_INVESTIGATION',
    department_name: 'CBE-Soil Investigation',
    project_type: 'Geotechnical Soil Testing',
    location: 'Avinashi Flyover Alignment',
    address: 'Chainage 12+400 to 18+600',
    city: 'Coimbatore',
    latitude: 11.025,
    longitude: 77.01,
    geofence_radius_meters: 400,
    start_date: '2025-02-15',
    expected_end_date: '2025-08-30',
    estimated_budget: 2200000,
    actual_cost: 1400000,
    cash_in: 2200000,
    cash_out: 1400000,
    progress_percentage: 100,
    status: 'COMPLETED',
    stage: 'Final Bound Geotech Dossier Submitted',
    category: 'Testing',
    description: 'Stratigraphic core recovery, rock quality designation (RQD) and laboratory chemical tests.',
    tasks_count: 12,
    todo_count: 0,
    material_pending_count: 0,
    approval_pending_count: 0,
    initials: 'AE',
    avatar_color: 'bg-emerald-700',
  },

  // 4. Art & Sculpture
  {
    id: 'proj-art-01',
    code: 'RG33-ART-4001',
    name: 'Grand Chola Resort Granite Fountain & Monumental Mural',
    client_name: 'Grand Chola Hospitality Ltd',
    department: 'ART_SCULPTURE',
    department_name: 'Art & Sculpture',
    project_type: 'Architectural Art & Landscaping',
    location: 'Siruvani Foothills Eco Resort',
    address: 'Perur - Siruvani Road',
    city: 'Coimbatore',
    latitude: 10.965,
    longitude: 76.885,
    geofence_radius_meters: 200,
    start_date: '2025-07-20',
    expected_end_date: '2026-08-15',
    estimated_budget: 6000000,
    actual_cost: 2600000,
    cash_in: 4000000,
    cash_out: 2600000,
    progress_percentage: 60,
    status: 'ACTIVE',
    stage: 'Stone Carving & On-site Assembly',
    category: 'Commercial',
    description: 'Hand-carved monolithic black granite fountain with traditional relief murals and LED fountain hydro-jets.',
    tasks_count: 15,
    todo_count: 4,
    material_pending_count: 1,
    approval_pending_count: 1,
    initials: 'GC',
    avatar_color: 'bg-purple-600',
  },
  {
    id: 'proj-art-02',
    code: 'RG33-ART-4002',
    name: 'Smart City Public Square Bronze Memorial Statue',
    client_name: 'Coimbatore Smart City Mission',
    department: 'ART_SCULPTURE',
    department_name: 'Art & Sculpture',
    project_type: 'Civic Monument',
    location: 'RS Puram Civic Plaza',
    address: 'DB Road Junction',
    city: 'Coimbatore',
    latitude: 11.008,
    longitude: 76.948,
    geofence_radius_meters: 150,
    start_date: '2025-01-05',
    expected_end_date: '2025-10-10',
    estimated_budget: 4000000,
    actual_cost: 3100000,
    cash_in: 4000000,
    cash_out: 3100000,
    progress_percentage: 100,
    status: 'COMPLETED',
    stage: 'Unveiled & Dedicated',
    category: 'Infrastructure',
    description: '18-foot lost-wax cast bronze monumental sculpture installed on reinforced black granite pedestal.',
    tasks_count: 10,
    todo_count: 0,
    material_pending_count: 0,
    approval_pending_count: 0,
    initials: 'SC',
    avatar_color: 'bg-amber-600',
  },

  // 5. Material Testing Department
  {
    id: 'proj-mtd-01',
    code: 'RG33-MTD-5001',
    name: 'Prestige Boulevard M40 Concrete & Rebar Quality Audit',
    client_name: 'Prestige City Developers',
    department: 'MATERIAL_TESTING',
    department_name: 'Material Testing Department',
    project_type: 'Material Quality Testing',
    location: 'Race Course Road Mega Project',
    address: 'Race Course Road',
    city: 'Coimbatore',
    latitude: 11.002,
    longitude: 76.974,
    geofence_radius_meters: 180,
    start_date: '2025-10-01',
    expected_end_date: '2026-11-30',
    estimated_budget: 1800000,
    actual_cost: 850000,
    cash_in: 1400000,
    cash_out: 850000,
    progress_percentage: 75,
    status: 'ACTIVE',
    stage: '28-Day Compressive Strength Tests',
    category: 'Testing',
    description: '7-day & 28-day concrete cube crushing, UTM tensile testing of Fe550D rebar, aggregate sieve analysis.',
    tasks_count: 18,
    todo_count: 3,
    material_pending_count: 0,
    approval_pending_count: 0,
    initials: 'PB',
    avatar_color: 'bg-red-500',
  },
  {
    id: 'proj-mtd-02',
    code: 'RG33-MTD-5002',
    name: 'State Highway Bitumen & Aggregate Durability Test Batch',
    client_name: 'State Road Transport Infrastructure',
    department: 'MATERIAL_TESTING',
    department_name: 'Material Testing Department',
    project_type: 'Asphalt & Bitumen Testing',
    location: 'State Highway 174 Lab Cell',
    address: 'Highways Testing Division, Sivananda Colony',
    city: 'Coimbatore',
    latitude: 11.028,
    longitude: 76.963,
    geofence_radius_meters: 200,
    start_date: '2025-04-10',
    expected_end_date: '2025-09-25',
    estimated_budget: 1200000,
    actual_cost: 720000,
    cash_in: 1200000,
    cash_out: 720000,
    progress_percentage: 100,
    status: 'COMPLETED',
    stage: 'Certified Test Certificates Issued',
    category: 'Testing',
    description: 'Marshall stability, penetration grade, ductility, and aggregate impact value compliance validation.',
    tasks_count: 9,
    todo_count: 0,
    material_pending_count: 0,
    approval_pending_count: 0,
    initials: 'SH',
    avatar_color: 'bg-slate-600',
  },

  // 6. Construction Department
  {
    id: 'proj-cns-01',
    code: 'RG33-CNS-6001',
    name: 'Royal Palm Luxury Gated Community Phase 2',
    client_name: 'Nivedhitha Arumugam',
    department: 'CONSTRUCTION',
    department_name: 'Construction Department',
    project_type: 'Turnkey Civil Construction',
    location: 'Kovaipudur Luxury Enclave',
    address: 'Palm Avenue, Kovaipudur',
    city: 'Coimbatore',
    latitude: 10.938,
    longitude: 76.942,
    geofence_radius_meters: 450,
    start_date: '2025-05-10',
    expected_end_date: '2026-12-15',
    estimated_budget: 32000000,
    actual_cost: 14500000,
    cash_in: 18000000,
    cash_out: 14500000,
    progress_percentage: 55,
    status: 'ACTIVE',
    stage: 'First Floor Slab Concrete Pouring',
    category: 'Residential',
    description: 'Turnkey execution of 18 premium duplex villas with underground drainage and clubhouse.',
    tasks_count: 22,
    todo_count: 5,
    material_pending_count: 3,
    approval_pending_count: 1,
    initials: 'RP',
    avatar_color: 'bg-emerald-600',
    is_pinned: true,
  },
  {
    id: 'proj-cns-02',
    code: 'RG33-CNS-6002',
    name: 'Green Valley Commercial Complex Construction',
    client_name: 'Managing Director',
    department: 'CONSTRUCTION',
    department_name: 'Construction Department',
    project_type: 'Commercial Construction',
    location: 'Vadavalli Commercial Hub',
    address: 'Thondamuthur Road, Vadavalli',
    city: 'Coimbatore',
    latitude: 11.018,
    longitude: 76.899,
    geofence_radius_meters: 300,
    start_date: '2024-11-01',
    expected_end_date: '2026-02-28',
    estimated_budget: 19000000,
    actual_cost: 16800000,
    cash_in: 19000000,
    cash_out: 16800000,
    progress_percentage: 100,
    status: 'COMPLETED',
    stage: 'Civil Handover & Occupancy Certificate',
    category: 'Commercial',
    description: 'Ground + 3 floors commercial retail center with solar roof grid and basement parking.',
    tasks_count: 19,
    todo_count: 0,
    material_pending_count: 0,
    approval_pending_count: 0,
    initials: 'GV',
    avatar_color: 'bg-teal-600',
  },

  // 7. SURVEY DEPARTMENT
  {
    id: 'proj-srv-01',
    code: 'RG33-SRV-7001',
    name: 'Sunrise Industrial Estate 120-Acre DGPS Boundary Survey',
    client_name: 'Sunrise Agro-Industrial Corp',
    department: 'SURVEY',
    department_name: 'SURVEY DEPARTMENT',
    project_type: 'Topographic & DGPS Survey',
    location: 'Kinathukadavu Industrial Zone',
    address: 'Survey Blocks 18-35, Pollachi Road',
    city: 'Coimbatore',
    latitude: 10.822,
    longitude: 77.019,
    geofence_radius_meters: 800,
    start_date: '2025-08-15',
    expected_end_date: '2026-07-20',
    estimated_budget: 2800000,
    actual_cost: 1300000,
    cash_in: 2200000,
    cash_out: 1300000,
    progress_percentage: 70,
    status: 'ACTIVE',
    stage: 'Contour Digital Elevation Modeling',
    category: 'Infrastructure',
    description: 'Dual-frequency RTK DGPS topographic survey, 0.5m contour map generation and Cadastral superimposition.',
    tasks_count: 13,
    todo_count: 2,
    material_pending_count: 0,
    approval_pending_count: 0,
    initials: 'SI',
    avatar_color: 'bg-indigo-600',
  },
  {
    id: 'proj-srv-02',
    code: 'RG33-SRV-7002',
    name: 'Urban Metro Corridor Route Alignment Topo Survey',
    client_name: 'Urban Rail Transit Authority',
    department: 'SURVEY',
    department_name: 'SURVEY DEPARTMENT',
    project_type: 'Corridor Alignment Survey',
    location: 'Ukkadam to Airport Corridor (18 km)',
    address: 'Trunk Route 18, Trichy Road',
    city: 'Coimbatore',
    latitude: 10.995,
    longitude: 77.032,
    geofence_radius_meters: 600,
    start_date: '2025-01-20',
    expected_end_date: '2025-09-15',
    estimated_budget: 3800000,
    actual_cost: 2500000,
    cash_in: 3800000,
    cash_out: 2500000,
    progress_percentage: 100,
    status: 'COMPLETED',
    stage: 'GIS Alignment Data Delivered',
    category: 'Infrastructure',
    description: 'High-precision Total Station & LiDAR mobile mapping for right-of-way corridor acquisition.',
    tasks_count: 15,
    todo_count: 0,
    material_pending_count: 0,
    approval_pending_count: 0,
    initials: 'UM',
    avatar_color: 'bg-sky-700',
  },

  // 8. Architectural Department
  {
    id: 'proj-arc-01',
    code: 'RG33-ARC-8001',
    name: 'Skyline Contemporary High-End Apartments 3D Architectural Set',
    client_name: 'Skyline Urban Developers',
    department: 'ARCHITECTURE',
    department_name: 'Architectural Department',
    project_type: 'Architectural Design & Planning',
    location: 'Pappanaickenpalayam Prime Site',
    address: 'Old Post Office Road',
    city: 'Coimbatore',
    latitude: 11.011,
    longitude: 76.979,
    geofence_radius_meters: 220,
    start_date: '2025-09-01',
    expected_end_date: '2026-08-30',
    estimated_budget: 7500000,
    actual_cost: 3400000,
    cash_in: 5200000,
    cash_out: 3400000,
    progress_percentage: 70,
    status: 'ACTIVE',
    stage: 'Municipal Approval Working Drawings',
    category: 'Residential',
    description: 'Floor layouts, MEP coordination, photorealistic Lumion 3D walkthroughs and DTCP sanction package.',
    tasks_count: 17,
    todo_count: 3,
    material_pending_count: 0,
    approval_pending_count: 1,
    initials: 'SK',
    avatar_color: 'bg-rose-600',
    is_pinned: true,
  },
  {
    id: 'proj-arc-02',
    code: 'RG33-ARC-8002',
    name: 'Heritage Courtyard Villa Restoration Architecture',
    client_name: 'Heritage Living Pvt Ltd',
    department: 'ARCHITECTURE',
    department_name: 'Architectural Department',
    project_type: 'Heritage Architectural Design',
    location: 'Perur Heritage Enclave',
    address: 'Temple Car Street',
    city: 'Coimbatore',
    latitude: 10.972,
    longitude: 76.914,
    geofence_radius_meters: 150,
    start_date: '2025-02-01',
    expected_end_date: '2025-10-30',
    estimated_budget: 3500000,
    actual_cost: 2100000,
    cash_in: 3500000,
    cash_out: 2100000,
    progress_percentage: 100,
    status: 'COMPLETED',
    stage: 'Restoration Blueprint Dossier Handover',
    category: 'Residential',
    description: 'Traditional Chettinad courtyard conservation drawings with modern climatically responsive design.',
    tasks_count: 11,
    todo_count: 0,
    material_pending_count: 0,
    approval_pending_count: 0,
    initials: 'HV',
    avatar_color: 'bg-emerald-700',
  },
];

/**
 * Initialize / Seed projects in localStorage if empty, or ensure existing projects have valid department
 */
export const getOrInitializeProjects = (): Project[] => {
  try {
    const saved = localStorage.getItem('booshnam_projects_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure every project has a department
        let modified = false;
        const normalized = parsed.map((p, idx) => {
          if (!p.department) {
            modified = true;
            // Assign based on category or round-robin
            const deptId = normalizeDepartmentId(p.category || p.project_type);
            const deptObj = ORGANIZATION_DEPARTMENTS.find(d => d.id === deptId) || ORGANIZATION_DEPARTMENTS[1];
            return {
              ...p,
              department: deptId,
              department_name: deptObj.name,
            };
          }
          return p;
        });

        if (modified) {
          localStorage.setItem('booshnam_projects_v2', JSON.stringify(normalized));
        }
        return normalized;
      }
    }
  } catch (e) {}

  // If empty, store seed projects
  try {
    localStorage.setItem('booshnam_projects_v2', JSON.stringify(INITIAL_DEPARTMENT_PROJECTS));
  } catch (e) {}
  return INITIAL_DEPARTMENT_PROJECTS;
};
