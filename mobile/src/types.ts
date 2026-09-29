export interface UserPermissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  approval_limit?: number;
}

export type SystemModuleId =
  | 'dashboard'
  | 'projects'
  | 'tasks'
  | 'attendance'
  | 'materials'
  | 'equipment'
  | 'mom'
  | 'files'
  | 'finance'
  | 'dpr'
  | 'users_admin';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  role_code: string;
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
  allowedPages: SystemModuleId[];
  permissions: UserPermissions;
  avatar?: string;
  password?: string;
  is_org_admin?: boolean;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  shortName: string;
  client_name: string;
  site_location: string;
  status: 'Ongoing' | 'Completed' | 'Planning';
  progress: number;
  value: number;
  startDate: string;
  endDate: string;
  actualStartDate: string;
  actualEndDate: string;
  scheduledTasks: number;
  completedTasks: number;
  keyPersonnel: string[];
}

export interface TaskItem {
  id: string;
  code: string;
  title: string;
  department: string;
  priority: 'HIGH' | 'URGENT' | 'MEDIUM';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
  assignedTo?: string;
  dueDate?: string;
}

export interface WorkerAttendance {
  id: string;
  name: string;
  role: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'half-day';
}

export interface MOMItem {
  id: string;
  title: string;
  date: string;
  attendees: string;
  decisions: string;
}

export interface MaterialItem {
  id: string;
  itemName: string;
  category: string;
  quantityRequested: number;
  quantityReceived: number;
  unit: string;
  status: 'PENDING' | 'APPROVED' | 'RECEIVED';
}

export interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  operator: string;
  hoursWorked: number;
  status: 'OPERATIONAL' | 'STANDBY' | 'MAINTENANCE';
}
