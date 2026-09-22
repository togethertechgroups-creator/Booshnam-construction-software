import { 
  MOCK_USER, MOCK_ROLES, MOCK_PROJECTS, MOCK_TASKS, MOCK_BOQ, 
  MOCK_CHANGE_ORDERS, MOCK_MATERIAL_REQUESTS, MOCK_PURCHASE_ORDERS, 
  MOCK_GRN, MOCK_INVOICES, MOCK_STOCK, MOCK_WORKERS, MOCK_ATTENDANCE, 
  MOCK_DPR, MOCK_SNAGS, MOCK_APPROVALS, MOCK_LEADS, MOCK_ASSETS 
} from './mockData';
import { Project, User, Role } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private token: string | null = null;
  private currentRole: Role = MOCK_ROLES[1]; // Default: Owner / Director

  constructor() {
    this.token = localStorage.getItem('siteops_token');
    const savedRole = localStorage.getItem('siteops_active_role');
    if (savedRole) {
      try {
        this.currentRole = JSON.parse(savedRole);
      } catch (e) {
        // fallback to default
      }
    }
  }

  public getActiveRole(): Role {
    return this.currentRole;
  }

  public setActiveRole(role: Role) {
    this.currentRole = role;
    localStorage.setItem('siteops_active_role', JSON.stringify(role));
  }

  public canViewCost(): boolean {
    const restricted = ['LABOR', 'SUBCONTRACTOR', 'CLIENT'];
    return !restricted.includes(this.currentRole.code);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      'X-Role-Code': this.currentRole.code,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string>) },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      // Graceful fallback to mock data for instant offline/standalone preview
      console.warn(`API call to ${endpoint} failed, utilizing local reactive dataset:`, err);
      return this.getMockFallback<T>(endpoint, options);
    }
  }

  private getMockFallback<T>(endpoint: string, options: RequestInit): T {
    if (endpoint.includes('/auth/me/')) {
      return { ...MOCK_USER, active_role: this.currentRole, role_name: this.currentRole.name, role_code: this.currentRole.code } as T;
    }
    if (endpoint.includes('/projects/')) {
      return MOCK_PROJECTS as T;
    }
    if (endpoint.includes('/tasks/')) {
      return MOCK_TASKS as T;
    }
    if (endpoint.includes('/budget/cost-plan/')) {
      return MOCK_BOQ as T;
    }
    if (endpoint.includes('/budget/change-orders/')) {
      return MOCK_CHANGE_ORDERS as T;
    }
    if (endpoint.includes('/procurement/material-requests/')) {
      return MOCK_MATERIAL_REQUESTS as T;
    }
    if (endpoint.includes('/procurement/purchase-orders/')) {
      return MOCK_PURCHASE_ORDERS as T;
    }
    if (endpoint.includes('/procurement/grn/')) {
      return MOCK_GRN as T;
    }
    if (endpoint.includes('/procurement/invoices/')) {
      return MOCK_INVOICES as T;
    }
    if (endpoint.includes('/procurement/stock/')) {
      return MOCK_STOCK as T;
    }
    if (endpoint.includes('/workforce/workers/')) {
      return MOCK_WORKERS as T;
    }
    if (endpoint.includes('/workforce/attendance/')) {
      return MOCK_ATTENDANCE as T;
    }
    if (endpoint.includes('/site/dpr/')) {
      return MOCK_DPR as T;
    }
    if (endpoint.includes('/site/snags/')) {
      return MOCK_SNAGS as T;
    }
    if (endpoint.includes('/approvals/requests/')) {
      return MOCK_APPROVALS as T;
    }
    if (endpoint.includes('/crm/leads/')) {
      return MOCK_LEADS as T;
    }
    if (endpoint.includes('/equipment/assets/')) {
      return MOCK_ASSETS as T;
    }
    return [] as T;
  }

  // Public methods
  async getCurrentUser() {
    return this.request<User>('/auth/me/');
  }

  async getProjects() {
    return this.request<Project[]>('/projects/');
  }

  async getTasks(projectId?: string) {
    return this.request<any>(projectId ? `/tasks/?project=${projectId}` : '/tasks/');
  }

  async getBOQ(projectId?: string) {
    return this.request<any>(projectId ? `/budget/cost-plan/?project=${projectId}` : '/budget/cost-plan/');
  }

  async getChangeOrders(projectId?: string) {
    return this.request<any>(projectId ? `/budget/change-orders/?project=${projectId}` : '/budget/change-orders/');
  }

  async getMaterialRequests(projectId?: string) {
    return this.request<any>(projectId ? `/procurement/material-requests/?project=${projectId}` : '/procurement/material-requests/');
  }

  async getPurchaseOrders(projectId?: string) {
    return this.request<any>(projectId ? `/procurement/purchase-orders/?project=${projectId}` : '/procurement/purchase-orders/');
  }

  async getGRNs(projectId?: string) {
    return this.request<any>(projectId ? `/procurement/grn/?project=${projectId}` : '/procurement/grn/');
  }

  async getInvoices(projectId?: string) {
    return this.request<any>(projectId ? `/procurement/invoices/?project=${projectId}` : '/procurement/invoices/');
  }

  async getStock(projectId?: string) {
    return this.request<any>(projectId ? `/procurement/stock/?project=${projectId}` : '/procurement/stock/');
  }

  async getWorkers(projectId?: string) {
    return this.request<any>(projectId ? `/workforce/workers/?project=${projectId}` : '/workforce/workers/');
  }

  async getAttendance(projectId?: string, date?: string) {
    return this.request<any>(`/workforce/attendance/?${projectId ? `project=${projectId}&` : ''}${date ? `date=${date}` : ''}`);
  }

  async getDPRs(projectId?: string) {
    return this.request<any>(projectId ? `/site/dpr/?project=${projectId}` : '/site/dpr/');
  }

  async getSnags(projectId?: string) {
    return this.request<any>(projectId ? `/site/snags/?project=${projectId}` : '/site/snags/');
  }

  async getApprovals() {
    return this.request<any>('/approvals/requests/');
  }

  async getLeads() {
    return this.request<any>('/crm/leads/');
  }

  async getAssets(projectId?: string) {
    return this.request<any>(projectId ? `/equipment/assets/?project=${projectId}` : '/equipment/assets/');
  }
}

export const api = new ApiClient();
