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
    name: 'Soil Investigation (Chennai)',
    shortName: 'Soil Investigation (Chennai)',
    role: 'Chennai Branch',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Geotechnical borehole drilling, SPT lab tests, stratum logs & SBC reports (Chennai Head Office)',
    codePrefix: 'SOIL',
  },
  {
    id: 'MATERIAL_TESTING',
    name: 'Material Testing (Chennai)',
    shortName: 'Material Testing (Chennai)',
    role: 'Chennai Branch',
    owner: 'Managing Director',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Concrete cube compression, rebar tensile, cement & aggregate lab testing (Chennai Head Office)',
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
    name: 'Soil Investigation (Coimbatore)',
    shortName: 'Soil Investigation (Coimbatore)',
    role: 'Coimbatore Branch',
    owner: 'Nivedhitha Arumugam',
    logoType: 'booshnam',
    isMainOverview: false,
    description: 'Coimbatore regional borehole drilling, soil testing & geotechnical reports',
    codePrefix: 'CBE-S',
  },
  {
    id: 'COIMBATORE_MATERIAL_TESTING',
    name: 'Material Testing (Coimbatore)',
    shortName: 'Material Testing (Coimbatore)',
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
 * Check if the account has company-wide super admin access (Executive Management or all departments)
 */
export const isUserCompanyWideSuperAdmin = (account?: { role_code?: string; department?: string; departments?: string[] } | null): boolean => {
  let targetAcc = account;
  if (!targetAcc && typeof window !== 'undefined') {
    try {
      const rawSession = localStorage.getItem('booshnam_active_session_v2');
      if (rawSession) {
        targetAcc = JSON.parse(rawSession);
      }
    } catch (e) {}
  }
  if (!targetAcc) return false;
  const isSuper = targetAcc.role_code === 'SUPER_ADMIN';
  const dept = (targetAcc.department || '').trim();
  const isAllDepts = !dept || 
    dept === 'Executive Management' || 
    dept === 'Booshnam Associates' || 
    dept.toLowerCase().includes('all') ||
    dept.toLowerCase().includes('director');
  return isSuper && isAllDepts;
};

/**
 * Returns allowed DepartmentId(s) for the user.
 * If company-wide superadmin: returns all departments including 'booshnam_associates'.
 * Otherwise: returns strictly the normalized IDs of the departments assigned to the user.
 */
export const getUserAllowedDepartmentIds = (account?: { role_code?: string; department?: string; departments?: string[] } | null): DepartmentId[] => {
  let targetAcc = account;
  if (!targetAcc && typeof window !== 'undefined') {
    try {
      const rawSession = localStorage.getItem('booshnam_active_session_v2');
      if (rawSession) {
        targetAcc = JSON.parse(rawSession);
      }
    } catch (e) {}
  }

  if (targetAcc && isUserCompanyWideSuperAdmin(targetAcc)) {
    return ORGANIZATION_DEPARTMENTS.map(d => d.id);
  }

  const rawList: string[] = [];
  if (targetAcc) {
    if (Array.isArray(targetAcc.departments) && targetAcc.departments.length > 0) {
      rawList.push(...targetAcc.departments);
    }
    if (targetAcc.department) {
      rawList.push(targetAcc.department);
    }
  }

  if (rawList.length === 0) {
    return ['SOIL_INVESTIGATION'];
  }

  const normalizedSet = new Set<DepartmentId>();
  rawList.forEach(raw => {
    if (!raw) return;
    const norm = normalizeDepartmentId(raw);
    if (norm !== 'booshnam_associates') {
      normalizedSet.add(norm);
    }
  });

  const result = Array.from(normalizedSet);
  return result.length > 0 ? result : ['SOIL_INVESTIGATION'];
};

/**
 * Returns allowed DepartmentEntity list for the user.
 */
export const getUserAllowedDepartmentEntities = (account?: { role_code?: string; department?: string; departments?: string[] } | null): DepartmentEntity[] => {
  if (isUserCompanyWideSuperAdmin(account)) {
    return ORGANIZATION_DEPARTMENTS;
  }
  const allowedIds = new Set(getUserAllowedDepartmentIds(account));
  return ORGANIZATION_DEPARTMENTS.filter(d => !d.isMainOverview && allowedIds.has(d.id));
};

/**
 * Returns current active department ID. If user session is tied to specific department(s), enforces allowed access.
 */
export const getActiveDepartmentId = (): DepartmentId => {
  try {
    const rawSession = localStorage.getItem('booshnam_active_session_v2');
    if (rawSession) {
      const acc = JSON.parse(rawSession);
      if (isUserCompanyWideSuperAdmin(acc)) {
        const saved = localStorage.getItem(ACTIVE_DEPT_STORAGE_KEY);
        if (saved && ORGANIZATION_DEPARTMENTS.some(d => d.id === saved)) {
          return saved as DepartmentId;
        }
        return 'booshnam_associates';
      }

      // User has specific assigned department(s)
      const allowed = getUserAllowedDepartmentIds(acc);
      const saved = localStorage.getItem(ACTIVE_DEPT_STORAGE_KEY) as DepartmentId | null;
      if (saved && allowed.includes(saved)) {
        return saved;
      }
      if (allowed.length > 0) {
        localStorage.setItem(ACTIVE_DEPT_STORAGE_KEY, allowed[0]);
        return allowed[0];
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
  return 'SOIL_INVESTIGATION';
};

/**
 * Sets active department ID and broadcasts change event to entire application.
 * If user session is locked to specific department(s), ensures user can only switch within their allowed departments.
 */
export const setActiveDepartmentId = (deptId: DepartmentId): void => {
  try {
    const rawSession = localStorage.getItem('booshnam_active_session_v2');
    if (rawSession) {
      const acc = JSON.parse(rawSession);
      if (!isUserCompanyWideSuperAdmin(acc)) {
        const allowed = getUserAllowedDepartmentIds(acc);
        if (!allowed.includes(deptId)) {
          const fallback = allowed[0] || 'SOIL_INVESTIGATION';
          localStorage.setItem(ACTIVE_DEPT_STORAGE_KEY, fallback);
          window.dispatchEvent(new CustomEvent('booshnam_active_dept_changed', { detail: fallback }));
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
  if (clean === 'BOOSHNAM_ASSOCIATES' || clean === 'BOOSHNAM ASSOCIATES' || clean === 'ALL' || clean === 'ALL DEPARTMENTS' || clean === 'ALL_DEPARTMENTS' || clean.includes('ALL DEPT')) return 'booshnam_associates';
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

export const INITIAL_DEPARTMENT_PROJECTS: Project[] = [];


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
        projs = parsed
          .filter((p: any) => 
            !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
          )
          .map((p: any) => {
            if (p && p.name && p.client_name) {
              const escapedClient = p.client_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const stripped = p.name.replace(new RegExp(`\\s*\\(${escapedClient}\\)\\s*$`, 'i'), '').trim();
              if (stripped && stripped !== p.name) {
                return { ...p, name: stripped };
              }
            }
            return p;
          });
      }
    }

    if (!saved) {
      localStorage.setItem('booshnam_projects_v2', JSON.stringify(projs));
    }
    return projs;
  } catch (e) {
    return [];
  }
};
