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
    id: 'CONSTRUCTION',
    name: 'Construction (All)',
    shortName: 'Construction (All)',
    role: 'Department',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Comprehensive civil construction execution, residential, commercial & infrastructure',
    codePrefix: 'CST',
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
  if (clean === 'CONSTRUCTION' || clean === 'CONSTRUCTION (ALL)' || clean === 'CONSTRUCTION(ALL)' || clean === 'PRIVATE_CONSTRUCTION') return 'CONSTRUCTION';
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
  if (clean.includes('CONST')) return 'CONSTRUCTION';
  if (clean.includes('SOIL')) return 'SOIL_INVESTIGATION';
  if (clean.includes('MATERIAL') || clean.includes('MTD')) return 'MATERIAL_TESTING';
  if (clean.includes('SURVEY')) return 'SURVEYING';
  if (clean.includes('STRUCT') || clean.includes('PRIVATE') || clean.includes('GOV')) return 'STRUCTURAL';
  if (clean.includes('ARCH')) return 'ARCHITECTURAL';
  if (clean.includes('SCULPT') || clean.includes('ART')) return 'SCULPTURE';

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
export const INITIAL_DEPARTMENT_PROJECTS: Project[] = [];

/**
 * Initialize / Seed projects in localStorage if empty, or ensure existing projects have valid department
 */
export const getOrInitializeProjects = (): Project[] => {
  try {
    const saved = localStorage.getItem('booshnam_projects_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any previous dummy/dump seed projects
        const clean = parsed.filter((p: any) => 
          !p.id?.startsWith('proj-') &&
          !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
        );

        // Ensure every remaining project has a department
        let modified = clean.length !== parsed.length;
        const normalized = clean.map((p: any) => {
          const deptId = normalizeDepartmentId(p.department || p.category || p.project_type);
          const deptObj = ORGANIZATION_DEPARTMENTS.find(d => d.id === deptId) || ORGANIZATION_DEPARTMENTS[1];
          if (p.department !== deptId || p.department_name !== deptObj.name) {
            modified = true;
          }
          return {
            ...p,
            department: deptId,
            department_name: deptObj.name,
          };
        });

        if (modified) {
          localStorage.setItem('booshnam_projects_v2', JSON.stringify(normalized));
        }
        return normalized;
      }
    }
  } catch (e) {}

  try {
    localStorage.setItem('booshnam_projects_v2', JSON.stringify([]));
  } catch (e) {}
  return [];
};
