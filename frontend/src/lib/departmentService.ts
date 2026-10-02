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
    role: 'Super Admin',
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
    role: 'Super Admin',
    owner: 'Managing Director',
    logoType: 'globe',
    isMainOverview: false,
    description: 'Geotechnical borehole drilling, SPT lab tests, stratum logs & SBC reports',
    codePrefix: 'SOIL',
  },
  {
    id: 'MATERIAL_TESTING',
    name: 'Material testing',
    shortName: 'Material testing',
    role: 'Super Admin',
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
    role: 'Super Admin',
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
    role: 'Super Admin',
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
    role: 'Super Admin',
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
    role: 'Super Admin',
    owner: 'Soil Test',
    logoType: 'globe',
    isMainOverview: false,
    description: 'Architectural sculptures, monumental statues, murals & heritage artisan crafts',
    codePrefix: 'SCP',
  },
  {
    id: 'PRIVATE_CONSTRUCTION',
    name: 'Private Construction',
    shortName: 'Private Construction',
    role: 'Super Admin',
    owner: 'Managing Director',
    logoType: 'globe',
    isMainOverview: false,
    description: 'Residential villas, commercial complexes & private civil construction execution',
    codePrefix: 'PCN',
  },
  {
    id: 'GOVERNMENT_PROJECT',
    name: 'Government Projects',
    shortName: 'Government Projects',
    role: 'Super Admin',
    owner: 'Nivedhitha Arumugam',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Government tenders, PWD highways, public infrastructure & municipal works',
    codePrefix: 'GOV',
  },
  {
    id: 'COIMBATORE_SOIL',
    name: 'Coimbatore-Soil',
    shortName: 'Coimbatore-Soil',
    role: 'Super Admin',
    owner: 'Nivedhitha Arumugam',
    logoType: 'globe',
    isMainOverview: false,
    description: 'Coimbatore regional borehole drilling, soil testing & geotechnical reports',
    codePrefix: 'CBE-S',
  },
  {
    id: 'COIMBATORE_MATERIAL_TESTING',
    name: 'Coimbatore -Material Testing',
    shortName: 'Coimbatore -Material Testing',
    role: 'Super Admin',
    owner: 'Nivedhitha Arumugam',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Coimbatore branch material laboratory testing, quality certification & test reports',
    codePrefix: 'CBE-M',
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
  if (!raw) return 'PRIVATE_CONSTRUCTION';
  const clean = raw.trim().toUpperCase();

  // 1. Direct exact ID matches first
  if (clean === 'BOOSHNAM_ASSOCIATES') return 'booshnam_associates';
  if (clean === 'SOIL_INVESTIGATION') return 'SOIL_INVESTIGATION';
  if (clean === 'MATERIAL_TESTING') return 'MATERIAL_TESTING';
  if (clean === 'SURVEYING' || clean === 'SURVEY') return 'SURVEYING';
  if (clean === 'STRUCTURAL') return 'STRUCTURAL';
  if (clean === 'ARCHITECTURAL' || clean === 'ARCHITECTURE') return 'ARCHITECTURAL';
  if (clean === 'SCULPTURE' || clean === 'ART_SCULPTURE') return 'SCULPTURE';
  if (clean === 'PRIVATE_CONSTRUCTION' || clean === 'CONSTRUCTION') return 'PRIVATE_CONSTRUCTION';
  if (clean === 'GOVERNMENT_PROJECT' || clean === 'GOVERNMENT_PROJECTS' || clean === 'GOVERNMENT') return 'GOVERNMENT_PROJECT';
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
  if (clean.includes('GOV')) return 'GOVERNMENT_PROJECT';
  if (clean.includes('STRUCT')) return 'STRUCTURAL';
  if (clean.includes('SOIL')) return 'SOIL_INVESTIGATION';
  if (clean.includes('SCULPT') || clean.includes('ART')) return 'SCULPTURE';
  if (clean.includes('MATERIAL') || clean.includes('MTD')) return 'MATERIAL_TESTING';
  if (clean.includes('SURVEY')) return 'SURVEYING';
  if (clean.includes('ARCH')) return 'ARCHITECTURAL';
  if (clean.includes('PRIVATE') || clean.includes('CONST')) return 'PRIVATE_CONSTRUCTION';

  return 'PRIVATE_CONSTRUCTION';
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
