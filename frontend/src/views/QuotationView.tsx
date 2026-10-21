import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calculator, Plus, Search, Filter, Download, Printer, Eye, 
  Trash2, CheckCircle2, Clock, AlertCircle, X, ChevronRight, 
  ArrowRight, ArrowLeft, Briefcase, Building2, Phone, Mail, FileText, 
  Sparkles, ShieldCheck, MapPin, Calendar, Check,
  ChevronDown, RotateCcw, Award, Layers, MoreVertical, Edit2,
  Gift, HelpCircle, Info, Bell, BellRing, Globe,
  Maximize2, Minimize2, Paperclip, Upload, Users, Hash
} from 'lucide-react';
import { Project, Department, Lead, Quotation, QuotationItem, Role } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { CustomSelect } from '../components/CustomSelect';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { formatUploadTimestamp, getCurrentUploadTimestamp } from '../lib/timestampUtils';
import { confirmAction } from '../lib/dialogService';
import { getFollowUpStatus, getViewedRemindersMap, markRemindersAsViewed, isReminderViewed } from '../lib/leadsNotificationService';
import { exportQuotationToPDF, exportQuotationToWord, numberToIndianWords } from '../lib/quotationExportService';
import { getTermsConditions } from '../lib/termsService';
import { MOCK_ROLES } from '../lib/mockData';
import { getStaffMembers, StaffMember } from '../lib/staffService';
import { getFinanceParties } from '../lib/financeSyncService';
import { addNotification } from '../lib/notificationService';
import { sendLeadAssignedPush } from '../lib/pushNotificationService';
import { getCurrentUserAccount, getUserAccounts } from '../lib/authService';

interface QuotationViewProps {
  projects?: Project[];
  onConvertSuccess?: (projectName: string, projectData?: Partial<Project>) => void;
  onShowToast?: (msg: string) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  activeRole?: string;
  onNavigate?: (view: string) => void;
}

// Initial Sample Leads
const INITIAL_CRM_LEADS: Lead[] = [];

// Initial Sample Quotations
const INITIAL_CRM_QUOTATIONS: Quotation[] = [];

// Reusable, Sleek, Red & White Filter Dropdown Component
interface FilterDropdownOption {
  label: string;
  value: string;
  dotColor?: string;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterDropdownOption[];
  minWidth?: string;
  icon?: React.ReactNode;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  minWidth = 'min-w-[130px]',
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);
  const isFiltered = value !== 'ALL' && value !== '';

  return (
    <div ref={containerRef} className={`relative shrink-0 ${isOpen ? 'z-50' : 'z-10'}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-3 bg-white border rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs select-none ${
          isFiltered
            ? 'border-red-500 bg-red-50/50 text-red-700 font-semibold ring-2 ring-red-500/15'
            : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/70'
        } ${isOpen ? 'border-red-500 ring-2 ring-red-500/15 bg-slate-50/40' : ''}`}
      >
        <div className="flex items-center gap-1.5 truncate max-w-[155px]">
          {icon ? (
            <span className="shrink-0">{icon}</span>
          ) : (
            selectedOption?.dotColor && (
              <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotColor}`} />
            )
          )}
          <span className="truncate">
            {isFiltered ? selectedOption?.label || value : label}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-red-600' : 'text-slate-400'
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1.5 z-[100] ${minWidth} max-w-xs bg-white border border-slate-200 rounded-xl shadow-2xl py-1 text-xs text-slate-800 select-none`}
        >
          <div className="max-h-60 overflow-y-auto py-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-red-50 text-red-700 font-bold'
                      : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.dotColor && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface FloatingSelectOption {
  label: string;
  value: string;
  dotColor?: string;
}

interface FloatingSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: (string | FloatingSelectOption)[];
  placeholder?: string;
  align?: 'left' | 'right';
  className?: string;
}

const FloatingSelect: React.FC<FloatingSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  align = 'left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const normalizedOptions: FloatingSelectOption[] = useMemo(() => {
    return options.map((opt) =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt
    );
  }, [options]);

  const selectedOpt = normalizedOptions.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`relative border rounded-xl h-11 px-3.5 flex items-center justify-between cursor-pointer transition-colors bg-white select-none ${
          isOpen
            ? 'border-red-600 ring-2 ring-red-100'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10 pointer-events-none">
          {label}
        </label>
        <div className="flex items-center gap-2 truncate pr-2 flex-1 min-w-0">
          {selectedOpt?.dotColor && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOpt.dotColor}`} />
          )}
          <span className={`text-xs truncate ${value ? 'font-medium text-slate-800' : 'text-slate-400 font-normal'}`}>
            {selectedOpt?.label || value || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-red-600' : ''
          }`}
        />
      </div>

      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          } z-50 w-full min-w-[200px] bg-white rounded-xl border border-slate-200 shadow-2xl py-1 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100 select-none`}
        >
          <div className="max-h-60 overflow-y-auto py-0.5">
            {normalizedOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-red-50 text-red-700 font-bold'
                      : 'hover:bg-red-50/50 text-slate-700 hover:text-red-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.dotColor && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const QuotationView: React.FC<QuotationViewProps> = ({
  projects = [],
  onConvertSuccess,
  onShowToast,
  isSidebarOpen,
  onToggleSidebar,
  activeRole,
  onNavigate,
}) => {
  // Top-level Sub-page Navigation: 'leads' (First Page) | 'quotations' (Second Page)
  const [activeTab, setActiveTab] = useState<'leads' | 'quotations'>('leads');

  // Fetch dynamic roles to show in Assignment
  const allRoles = useMemo(() => {
    const merged = [...MOCK_ROLES];
    try {
      const saved = localStorage.getItem('booshnam_custom_roles_v2');
      if (saved) {
        const customRoles = JSON.parse(saved);
        if (Array.isArray(customRoles)) {
          customRoles.forEach((cr: Role) => {
            if (!merged.find(r => r.code === cr.code)) {
              merged.push(cr);
            }
          });
        }
      }
    } catch {}
    return merged;
  }, []);

  // Fetch staff members to show in Assignment
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => getStaffMembers());

  // Dynamically build all assignable staff options from Staff & Users settings
  const assignableStaffOptions = useMemo(() => {
    const map = new Map<string, { name: string; label: string; roleName: string; roleCode: string }>();

    // 1. All active staff members from staffService (Workforce / Settings Staff & Payroll)
    staffMembers.forEach(staff => {
      if (staff.name && staff.status !== 'INACTIVE') {
        const roleObj = allRoles.find(r => r.code === staff.role_code);
        const roleName = roleObj ? roleObj.name : (staff.role_name || staff.designation || staff.role_code || 'Staff');
        const key = staff.name.toLowerCase().trim();
        map.set(key, {
          name: staff.name.trim(),
          label: `${staff.name.trim()} - ${roleName}`,
          roleName,
          roleCode: staff.role_code || ''
        });
      }
    });

    // 2. All user accounts from authService (Settings -> User Management)
    try {
      const userAccounts = getUserAccounts();
      userAccounts.forEach(acc => {
        const name = (acc.staff_name || acc.username || '').trim();
        const key = name.toLowerCase();
        if (name && acc.role_code !== 'SUPER_ADMIN' && !map.has(key)) {
          const roleObj = allRoles.find(r => r.code === acc.role_code);
          const roleName = roleObj ? roleObj.name : (acc.role_name || acc.role_code || 'Staff');
          map.set(key, {
            name,
            label: `${name} - ${roleName}`,
            roleName,
            roleCode: acc.role_code || ''
          });
        }
      });
    } catch {}

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [staffMembers, allRoles]);

  // Sync staff members whenever settings/accounts update in the background
  useEffect(() => {
    const handleStaffSync = () => {
      setStaffMembers(getStaffMembers());
    };
    window.addEventListener('booshnam_staff_updated', handleStaffSync);
    window.addEventListener('booshnam_accounts_updated', handleStaffSync);
    return () => {
      window.removeEventListener('booshnam_staff_updated', handleStaffSync);
      window.removeEventListener('booshnam_accounts_updated', handleStaffSync);
    };
  }, []);

  const currentUserAccount = getCurrentUserAccount();
  const isAdminOrSuperAdmin = useMemo(() => {
    const roleCode = (currentUserAccount?.role_code || activeRole || '').toUpperCase().trim();
    const roleName = (currentUserAccount?.role_name || '').toLowerCase().trim();
    const username = (currentUserAccount?.username || '').toLowerCase().trim();
    return (
      roleCode === 'SUPER_ADMIN' ||
      roleCode === 'ADMIN' ||
      roleCode === 'DIRECTOR' ||
      roleCode === 'OWNER' ||
      roleCode === 'OWNER_DIRECTOR' ||
      roleName.includes('super admin') ||
      roleName.includes('admin') ||
      roleName.includes('owner') ||
      roleName.includes('director') ||
      username === 'superadmin' ||
      username === 'admin' ||
      username === 'priya' ||
      username === 'rajesh'
    );
  }, [currentUserAccount, activeRole]);

  // =========================================================================
  // 1. LEADS STATE & PERSISTENCE
  // =========================================================================
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_leads_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_CRM_LEADS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_leads_v2', JSON.stringify(leads));
      window.dispatchEvent(new Event('booshnam_leads_updated'));
    } catch {}
  }, [leads]);

  // Leads Filters
  const [leadSearch, setLeadSearch] = useState('');
  const [leadAssigneeFilter, setLeadAssigneeFilter] = useState('ALL');
  const [leadPriorityFilter, setLeadPriorityFilter] = useState('ALL');
  const [leadStatusFilter, setLeadStatusFilter] = useState('ALL');
  const [leadSourceFilter, setLeadSourceFilter] = useState('ALL');
  const [leadCategoryFilter, setLeadCategoryFilter] = useState('ALL');
  const [leadFollowUpFilter, setLeadFollowUpFilter] = useState<'ALL' | 'DUE' | 'TODAY' | 'OVERDUE' | 'UPCOMING' | 'NO_DATE'>('ALL');

  const [viewedRemindersTick, setViewedRemindersTick] = useState(0);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);

  useEffect(() => {
    const handleRemindersUpdated = () => setViewedRemindersTick(t => t + 1);
    window.addEventListener('booshnam_reminders_viewed', handleRemindersUpdated);
    window.addEventListener('booshnam_leads_updated', handleRemindersUpdated);
    return () => {
      window.removeEventListener('booshnam_reminders_viewed', handleRemindersUpdated);
      window.removeEventListener('booshnam_leads_updated', handleRemindersUpdated);
    };
  }, []);

  // Follow-up statistics for notifications & badge alerts
  const followUpStats = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    let unviewedDue = 0;
    const viewedMap = getViewedRemindersMap();

    leads.forEach(l => {
      const info = getFollowUpStatus(l.followup_date);
      if (info.status === 'OVERDUE') overdue++;
      else if (info.status === 'TODAY') today++;
      else if (info.status === 'UPCOMING') upcoming++;

      if (info.status === 'OVERDUE' || info.status === 'TODAY') {
        const isViewed = isReminderViewed(l.id, l.followup_date);
        if (!isViewed) {
          unviewedDue++;
        }
      }
    });
    return { overdue, today, upcoming, totalDue: overdue + today, unviewedDue };
  }, [leads, viewedRemindersTick]);

  // List of due/overdue leads for reminders modal
  const dueLeads = useMemo(() => {
    return leads.filter(l => {
      if (!l.followup_date) return false;
      const info = getFollowUpStatus(l.followup_date);
      return info.status === 'OVERDUE' || info.status === 'TODAY';
    });
  }, [leads]);

  const handleOpenViewReminders = () => {
    // Open the Reminders Modal so the user can inspect and act on individual reminders
    setIsRemindersModalOpen(true);
    // Filter leads to DUE
    setLeadFollowUpFilter('DUE');
  };

  // New Lead Right Drawer State (Image 2)
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

  // New Lead Drawer Form Fields (All empty by default per user request)
  const [drawerAssignee, setDrawerAssignee] = useState('');
  const [drawerAssignedRole, setDrawerAssignedRole] = useState('');
  const [drawerDate, setDrawerDate] = useState('');
  const [drawerLeadType, setDrawerLeadType] = useState('');
  const [drawerContactName, setDrawerContactName] = useState('');
  const [drawerPhoneCode, setDrawerPhoneCode] = useState('+91');
  const [drawerPhone, setDrawerPhone] = useState('');
  const [drawerEmail, setDrawerEmail] = useState('');
  const [drawerCompanyName, setDrawerCompanyName] = useState('');
  const [drawerAddress, setDrawerAddress] = useState('');
  const [drawerSource, setDrawerSource] = useState('');
  const [drawerCategory, setDrawerCategory] = useState('');
  const [drawerStatus, setDrawerStatus] = useState('');
  const [drawerPriority, setDrawerPriority] = useState('Medium');
  const [drawerLastContactedDate, setDrawerLastContactedDate] = useState('');
  const [drawerFollowupDate, setDrawerFollowupDate] = useState('');
  const [drawerExpectedClosureDate, setDrawerExpectedClosureDate] = useState('');
  const [drawerBudget, setDrawerBudget] = useState('');
  const [drawerDescription, setDrawerDescription] = useState('');
  const [drawerValue, setDrawerValue] = useState('');
  const [drawerNotes, setDrawerNotes] = useState('');

  // New Lead Drawer Form Validation Errors & Scroll Ref
  const [drawerErrors, setDrawerErrors] = useState<{
    leadType?: string;
    contactName?: string;
    phone?: string;
    email?: string;
  }>({});
  const drawerScrollRef = useRef<HTMLDivElement>(null);

  // Row Action Dropdown state (with Portal anchor rect for unclipped positioning)
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);
  const [rowMenuAnchor, setRowMenuAnchor] = useState<{ id: string; rect: DOMRect } | null>(null);

  // =========================================================================
  // 2. QUOTATIONS STATE & PERSISTENCE
  // =========================================================================
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_quotations_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_CRM_QUOTATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_quotations_v2', JSON.stringify(quotations));
    } catch {}
  }, [quotations]);

  // Quotation Filters & Search (Image 3)
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<string>('ALL');
  const [quoteDateFilter, setQuoteDateFilter] = useState<string>('ALL');

  // Quotation Status Dropdown Popup (Image 3) & Row Actions
  const [activeQuoteStatusDropdownId, setActiveQuoteStatusDropdownId] = useState<string | null>(null);
  const [quoteStatusMenuAnchor, setQuoteStatusMenuAnchor] = useState<{ id: string; rect: DOMRect } | null>(null);
  const [activeQuoteRowMenuId, setActiveQuoteRowMenuId] = useState<string | null>(null);
  const [quoteRowMenuAnchor, setQuoteRowMenuAnchor] = useState<{ id: string; rect: DOMRect } | null>(null);

  // Preview & Download Modal States
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [downloadQuoteTarget, setDownloadQuoteTarget] = useState<Quotation | null>(null);

  // New Quotation Form Fields
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteStep, setQuoteStep] = useState<1 | 2>(1);
  const [quoteNumber, setQuoteNumber] = useState('');
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quoteClientName, setQuoteClientName] = useState('');
  const [quoteClientPhone, setQuoteClientPhone] = useState('');
  const [quoteClientEmail, setQuoteClientEmail] = useState('');
  const [quoteClientAddress, setQuoteClientAddress] = useState('');
  const [quoteProjectTitle, setQuoteProjectTitle] = useState('Soil Investigation');
  const [quoteDepartment, setQuoteDepartment] = useState<string>('CBE_SOIL_INVESTIGATION');
  const [quoteValidUntil, setQuoteValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteNotes, setQuoteNotes] = useState('Payment: 50% advance along with work order, balance upon draft report submission.');
  const [quoteTerms, setQuoteTerms] = useState<string>(() => getTermsConditions().quotationTerms);
  const [quoteErrors, setQuoteErrors] = useState<{ quotationNumber?: string; clientName?: string; projectTitle?: string }>({});
  const [quoteAttachmentName, setQuoteAttachmentName] = useState('');
  const [quoteAttachmentUrl, setQuoteAttachmentUrl] = useState<string | null>(null);
  const [quoteAttachmentUploadedAt, setQuoteAttachmentUploadedAt] = useState('');
  const quoteFileInputRef = useRef<HTMLInputElement>(null);

  // Client Selection Combobox State
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchFilter, setClientSearchFilter] = useState('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };
    if (isClientDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isClientDropdownOpen]);

  // Combine clients & parties from Finance Parties, Projects, and CRM Leads
  const clientOptions = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      source: 'Party' | 'Project' | 'Lead';
      phone?: string;
      email?: string;
      address?: string;
      projectTitle?: string;
      department?: string;
    }> = [];
    const seen = new Set<string>();

    // 1. Finance Parties
    try {
      const parties = getFinanceParties();
      parties.forEach(p => {
        const trimmed = p.name?.trim();
        if (trimmed && !seen.has(trimmed.toLowerCase())) {
          seen.add(trimmed.toLowerCase());
          list.push({
            id: `party-${p.id}`,
            name: trimmed,
            source: 'Party',
            phone: p.phone,
            email: p.email,
            address: p.address,
          });
        }
      });
    } catch {}

    // 2. Project Clients
    (projects || []).forEach(prj => {
      const client = prj.client_name?.trim();
      if (client && !seen.has(client.toLowerCase())) {
        seen.add(client.toLowerCase());
        list.push({
          id: `proj-${prj.id}`,
          name: client,
          source: 'Project',
          phone: (prj as any).client_phone || (prj as any).phone,
          email: (prj as any).client_email || (prj as any).email,
          address: prj.address || prj.location,
          projectTitle: prj.name,
          department: prj.department as string,
        });
      }
    });

    // 3. CRM Leads
    leads.forEach(l => {
      const name = l.client_name?.trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({
          id: `lead-${l.id}`,
          name: name,
          source: 'Lead',
          phone: l.phone,
          email: l.email,
          address: l.address,
          projectTitle: l.project_title || l.description || l.lead_type,
        });
      }
    });

    return list;
  }, [projects, leads]);

  const filteredClientOptions = useMemo(() => {
    const q = clientSearchFilter.trim().toLowerCase();
    if (!q) return clientOptions;
    return clientOptions.filter(
      c => c.name.toLowerCase().includes(q) ||
           (c.phone && c.phone.includes(q)) ||
           (c.email && c.email.toLowerCase().includes(q)) ||
           (c.projectTitle && c.projectTitle.toLowerCase().includes(q))
    );
  }, [clientOptions, clientSearchFilter]);

  // Date Formatter helper
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const suffix = (day >= 11 && day <= 13) ? 'th' : (day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day}${suffix} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  const getNextQuotationNumber = () => {
    const yr = '2026-27';
    const nextSeq = 3078 + quotations.length + 1;
    return `QBAG/${nextSeq}/${yr}`;
  };

  useEffect(() => {
    const handleTermsUpdate = () => {
      setQuoteTerms(getTermsConditions().quotationTerms);
    };
    window.addEventListener('booshnam_terms_updated', handleTermsUpdate);
    return () => window.removeEventListener('booshnam_terms_updated', handleTermsUpdate);
  }, []);

  const [quoteItems, setQuoteItems] = useState<QuotationItem[]>([]);

  // Function to open and initialize new quotation proposal
  const handleOpenNewQuotationModal = () => {
    setActiveTab('quotations');
    setEditingQuoteId(null);
    setQuoteStep(1);
    setQuoteNumber(getNextQuotationNumber());
    setQuoteDate(new Date().toISOString().split('T')[0]);
    setQuoteClientName('');
    setQuoteClientPhone('');
    setQuoteClientEmail('');
    setQuoteClientAddress('');
    setQuoteProjectTitle('');
    setQuoteDepartment('CBE_SOIL_INVESTIGATION');
    setQuoteDiscount(0);
    setQuoteNotes('Payment: 50% advance along with work order, balance upon draft report submission.');
    setQuoteTerms(getTermsConditions().quotationTerms);
    setQuoteAttachmentName('');
    setQuoteAttachmentUrl(null);
    setQuoteAttachmentUploadedAt('');
    setQuoteErrors({});
    setClientSearchFilter('');
    setQuoteItems([]);
    setIsNewQuoteModalOpen(true);
  };

  const handleEditQuotation = (quote: Quotation) => {
    setEditingQuoteId(quote.id);
    setQuoteStep(1);
    setQuoteNumber(quote.quotation_number);
    let isoDate = new Date().toISOString().split('T')[0];
    try {
      const parsedD = new Date(quote.date);
      if (!isNaN(parsedD.getTime())) {
        isoDate = parsedD.toISOString().split('T')[0];
      }
    } catch {}
    setQuoteDate(isoDate);
    setQuoteClientName(quote.client_name);
    setQuoteClientPhone(quote.client_phone || '');
    setQuoteClientEmail(quote.client_email || '');
    setQuoteClientAddress(quote.client_address || '');
    setQuoteProjectTitle(quote.project_title || '');
    setQuoteDepartment((quote.department as string) || 'CBE_SOIL_INVESTIGATION');
    setQuoteDiscount(quote.discount_amount || 0);
    setQuoteNotes(quote.notes || 'Payment: 50% advance along with work order, balance upon draft report submission.');
    setQuoteTerms(quote.terms_conditions || getTermsConditions().quotationTerms);
    setQuoteAttachmentName(quote.attachment_name || '');
    setQuoteAttachmentUrl(quote.attachment_url || null);
    setQuoteAttachmentUploadedAt(quote.attachment_uploaded_at || '');
    setQuoteErrors({});
    setClientSearchFilter('');
    setQuoteItems(quote.items && quote.items.length > 0 ? quote.items.map(it => {
      const qty = Number(it.quantity) || 1;
      const rate = Number(it.unit_rate) || 0;
      const sub = it.amount !== undefined ? Number(it.amount) : (qty * rate);
      const gstPct = it.gst_percentage !== undefined ? Number(it.gst_percentage) : 18;
      const gstAmt = it.gst_amount !== undefined ? Number(it.gst_amount) : Math.round((sub * gstPct) / 100);
      return {
        ...it,
        quantity: qty,
        unit_rate: rate,
        amount: sub,
        gst_percentage: gstPct,
        gst_amount: gstAmt,
      };
    }) : [
      {
        id: `item-${Date.now()}`,
        item_code: 'ITM-01',
        description: quote.project_title || 'Soil Testing Investigation & Report',
        unit: 'Package',
        quantity: 1,
        unit_rate: 15000,
        gst_percentage: 18,
        gst_amount: 2700,
        amount: 15000,
        category: 'Soil Testing'
      }
    ]);
    setIsNewQuoteModalOpen(true);
  };

  const handleQuoteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ts = getCurrentUploadTimestamp();
    setQuoteAttachmentName(file.name);
    setQuoteAttachmentUploadedAt(ts);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setQuoteAttachmentUrl(reader.result);
          onShowToast?.(`Quotation attachment "${file.name}" uploaded on ${ts}`);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setQuoteAttachmentUrl('https://images.unsplash.com/photo-1541888946425-d0fbb186156a?w=800&auto=format&fit=crop&q=80');
      onShowToast?.(`Document "${file.name}" attached on ${ts}`);
    }
  };

  // Listen for global quick action trigger from Sidebar
  useEffect(() => {
    const handleOpenNewQuote = () => {
      handleOpenNewQuotationModal();
    };
    window.addEventListener('booshnam_open_create_quotation', handleOpenNewQuote);
    if (sessionStorage.getItem('booshnam_auto_open_create_quotation')) {
      sessionStorage.removeItem('booshnam_auto_open_create_quotation');
      handleOpenNewQuote();
    }
    return () => window.removeEventListener('booshnam_open_create_quotation', handleOpenNewQuote);
  }, []);

  // Listen for global lead open trigger from Notifications or other views
  useEffect(() => {
    const handleOpenLead = (e: any) => {
      setActiveTab('leads');
      const leadId = e?.detail?.leadId || sessionStorage.getItem('booshnam_auto_open_lead_id');
      if (leadId) {
        sessionStorage.removeItem('booshnam_auto_open_lead_id');
        const target = leads.find(l => l.id === leadId || l.lead_number === leadId);
        if (target) {
          handleEditLead(target);
        }
      }
    };
    window.addEventListener('booshnam_open_lead_tab', handleOpenLead);
    const autoLeadId = sessionStorage.getItem('booshnam_auto_open_lead_id');
    if (autoLeadId) {
      handleOpenLead({ detail: { leadId: autoLeadId } });
    }
    return () => window.removeEventListener('booshnam_open_lead_tab', handleOpenLead);
  }, [leads]);

  const closeAllRowMenus = () => {
    setActiveRowMenuId(null);
    setRowMenuAnchor(null);
    setActiveQuoteRowMenuId(null);
    setQuoteRowMenuAnchor(null);
    setActiveQuoteStatusDropdownId(null);
    setQuoteStatusMenuAnchor(null);
  };

  // Close floating menus when clicking outside, scrolling, or pressing Escape
  useEffect(() => {
    const handleClose = (e?: MouseEvent | Event) => {
      if (e && (e.target as HTMLElement)?.closest?.('.dropdown-trigger-container')) {
        return;
      }
      closeAllRowMenus();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllRowMenus();
    };

    document.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // =========================================================================
  // FILTERED DATA
  // =========================================================================
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (leadSearch.trim()) {
        const q = leadSearch.toLowerCase();
        const matchesClient = (l.client_name || '').toLowerCase().includes(q);
        const matchesType = (l.lead_type || '').toLowerCase().includes(q);
        const matchesPhone = (l.phone || '').toLowerCase().includes(q);
        const matchesTitle = (l.project_title || '').toLowerCase().includes(q);
        if (!matchesClient && !matchesType && !matchesPhone && !matchesTitle) return false;
      }
      if (leadPriorityFilter !== 'ALL' && l.priority !== leadPriorityFilter) return false;
      if (leadStatusFilter !== 'ALL') {
        const statusMatch = (l.status_label || l.stage) === leadStatusFilter;
        if (!statusMatch) return false;
      }
      if (leadSourceFilter !== 'ALL' && l.source !== leadSourceFilter) return false;
      if (leadCategoryFilter !== 'ALL' && l.category !== leadCategoryFilter) return false;
      if (leadAssigneeFilter !== 'ALL') {
        if (leadAssigneeFilter === 'UNASSIGNED') {
          if (l.assigned_to_name && l.assigned_to_name.trim() !== '') return false;
        } else {
          const lAssignee = (l.assigned_to_name || '').toLowerCase().trim();
          const targetAssignee = leadAssigneeFilter.toLowerCase().trim();
          if (lAssignee !== targetAssignee && !lAssignee.includes(targetAssignee) && !targetAssignee.includes(lAssignee)) {
            return false;
          }
        }
      }
      if (leadFollowUpFilter !== 'ALL') {
        const info = getFollowUpStatus(l.followup_date);
        if (leadFollowUpFilter === 'DUE' && info.status !== 'OVERDUE' && info.status !== 'TODAY') return false;
        if (leadFollowUpFilter === 'TODAY' && info.status !== 'TODAY') return false;
        if (leadFollowUpFilter === 'OVERDUE' && info.status !== 'OVERDUE') return false;
        if (leadFollowUpFilter === 'UPCOMING' && info.status !== 'UPCOMING') return false;
        if (leadFollowUpFilter === 'NO_DATE' && l.followup_date) return false;
      }
      if (activeRole && !['SUPER_ADMIN', 'ADMIN', 'MARKETING'].includes(activeRole)) {
        if (l.assigned_role !== activeRole && l.assigned_department !== activeRole) return false;
      }
      
      return true;
    });
  }, [leads, leadSearch, leadAssigneeFilter, leadPriorityFilter, leadStatusFilter, leadSourceFilter, leadCategoryFilter, leadFollowUpFilter, activeRole]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      if (quoteStatusFilter !== 'ALL') {
        if (quoteStatusFilter === 'Client Confirmed' && q.status !== 'Client Confirmed' && q.status !== 'APPROVED') return false;
        if (quoteStatusFilter !== 'Client Confirmed' && q.status !== quoteStatusFilter) return false;
      }
      if (quoteSearch.trim()) {
        const query = quoteSearch.toLowerCase();
        const matchesNum = q.quotation_number.toLowerCase().includes(query);
        const matchesClient = q.client_name.toLowerCase().includes(query);
        const matchesSubject = (q.project_title || '').toLowerCase().includes(query);
        if (!matchesNum && !matchesClient && !matchesSubject) return false;
      }
      return true;
    });
  }, [quotations, quoteStatusFilter, quoteSearch]);

  // =========================================================================
  // CALCULATIONS
  // =========================================================================
  const quoteSubtotal = useMemo(() => {
    return quoteItems.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0), 0);
  }, [quoteItems]);

  const quoteGstAmount = useMemo(() => {
    return quoteItems.reduce((acc, it) => {
      const sub = (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0);
      const gstPct = it.gst_percentage !== undefined ? Number(it.gst_percentage) : 18;
      return acc + Math.round((sub * gstPct) / 100);
    }, 0);
  }, [quoteItems]);

  const quoteGrandTotal = useMemo(() => {
    const discounted = Math.max(0, quoteSubtotal - (Number(quoteDiscount) || 0));
    return discounted + quoteGstAmount;
  }, [quoteSubtotal, quoteDiscount, quoteGstAmount]);

  // =========================================================================
  // DRAWER HANDLERS: CREATE / EDIT LEAD
  // =========================================================================
  const handleOpenNewLeadDrawer = () => {
    setStaffMembers(getStaffMembers());
    setEditingLeadId(null);
    setDrawerErrors({});
    setDrawerAssignee('');
    setDrawerAssignedRole('');
    setDrawerDate('');
    setDrawerLeadType('');
    setDrawerContactName('');
    setDrawerPhoneCode('+91');
    setDrawerPhone('');
    setDrawerEmail('');
    setDrawerCompanyName('');
    setDrawerAddress('');
    setDrawerSource('');
    setDrawerCategory('');
    setDrawerStatus('');
    setDrawerPriority('Medium');
    setDrawerLastContactedDate('');
    setDrawerFollowupDate('');
    setDrawerExpectedClosureDate('');
    setDrawerBudget('');
    setDrawerDescription('');
    setDrawerValue('');
    setDrawerNotes('');
    setIsLeadDrawerOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setStaffMembers(getStaffMembers());
    markRemindersAsViewed([lead.id]);
    setEditingLeadId(lead.id);
    setDrawerErrors({});
    setDrawerAssignee(lead.assigned_to_name || '');
    setDrawerAssignedRole(lead.assigned_role || '');
    setDrawerDate(lead.creation_date || '');
    setDrawerLeadType(lead.lead_type || '');
    setDrawerContactName(lead.client_name || '');
    setDrawerPhoneCode('+91');
    setDrawerPhone(lead.phone || '');
    setDrawerEmail(lead.email || '');
    setDrawerCompanyName(lead.company_name || '');
    setDrawerAddress(lead.address || '');
    setDrawerSource(lead.source || '');
    setDrawerCategory(lead.category || '');
    setDrawerStatus(lead.status_label || '');
    setDrawerPriority(lead.priority || 'Medium');
    setDrawerLastContactedDate(lead.last_contacted_date || '');
    setDrawerFollowupDate(lead.followup_date || '');
    setDrawerExpectedClosureDate(lead.expected_closure_date || '');
    setDrawerBudget(lead.budget !== undefined ? String(lead.budget) : (lead.estimated_value ? String(lead.estimated_value) : ''));
    setDrawerDescription(lead.description || lead.notes || '');
    setDrawerValue(lead.estimated_value ? String(lead.estimated_value) : '');
    setDrawerNotes(lead.notes || '');
    setIsLeadDrawerOpen(true);
    closeAllRowMenus();
  };

  const handleSaveLeadFromDrawer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const errors: { leadType?: string; contactName?: string; phone?: string; email?: string } = {};

    if (!drawerLeadType.trim()) {
      errors.leadType = 'Please enter Lead Type';
    }

    if (!drawerContactName.trim()) {
      errors.contactName = 'Please enter Contact Name';
    }

    const cleanPhone = drawerPhone.trim();
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = 'Please enter Contact Number';
    } else if (cleanDigits.length < 10) {
      errors.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (drawerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(drawerEmail.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setDrawerErrors(errors);
      const firstError = Object.values(errors)[0];
      onShowToast?.(firstError);
      drawerScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setDrawerErrors({});

    const todayStr = '25 September 2026';
    const resolvedValue = Number(drawerBudget) || Number(drawerValue) || 15000;

    if (editingLeadId) {
      // Update existing lead
      const activeUser = getCurrentUserAccount();
      const currentSender = activeUser?.staff_name || 'Admin';

      setLeads(prev => prev.map(l => {
        if (l.id !== editingLeadId) return l;

        const isNewAssignment = drawerAssignee && drawerAssignee !== l.assigned_to_name;
        if (isNewAssignment) {
          addNotification({
            title: `Lead Assigned: ${drawerContactName.trim()}`,
            message: `Lead ${l.lead_number} (${drawerLeadType.trim() || 'Inquiry'}) has been assigned to you for follow-up.`,
            type: 'LEAD_ASSIGNED',
            recipient: drawerAssignee,
            leadId: l.id,
            requestCode: l.lead_number,
            projectName: `${drawerContactName.trim()} (${drawerLeadType.trim() || 'Lead'})`,
            sender: currentSender,
            silentToast: true,
          });

          sendLeadAssignedPush({
            leadId: l.id,
            leadNumber: l.lead_number,
            clientName: drawerContactName.trim(),
            leadType: drawerLeadType.trim() || 'Lead',
            assigneeName: drawerAssignee,
            phone: cleanPhone,
            category: drawerCategory || 'General',
            assignedBy: currentSender,
          });
        }

        return {
          ...l,
          lead_type: drawerLeadType || l.lead_type,
          client_name: drawerContactName.trim(),
          contact_person: drawerContactName.trim(),
          phone: cleanPhone,
          email: drawerEmail.trim(),
          company_name: drawerCompanyName.trim(),
          address: drawerAddress.trim(),
          source: drawerSource || l.source,
          category: drawerCategory || l.category,
          status_label: drawerStatus || l.status_label || 'New Lead',
          priority: drawerPriority || l.priority || 'Medium',
          last_contacted_date: drawerLastContactedDate,
          followup_date: drawerFollowupDate,
          expected_closure_date: drawerExpectedClosureDate,
          budget: Number(drawerBudget) || l.budget,
          description: drawerDescription.trim(),
          estimated_value: resolvedValue,
          notes: drawerDescription.trim() || drawerNotes.trim(),
          assigned_to_name: drawerAssignee,
          assigned_role: drawerAssignedRole,
          assigned_department: drawerAssignedRole,
          last_updated: todayStr
        };
      }));
      onShowToast?.(`Lead updated successfully!`);
    } else {
      // Create new lead
      const nextNum = `LD-${String(leads.length + 101).padStart(3, '0')}`;
      const activeUser = getCurrentUserAccount();
      const currentSender = activeUser?.staff_name || 'Admin';

      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        lead_number: nextNum,
        lead_type: drawerLeadType.trim() || 'Referal - soil testing',
        client_name: drawerContactName.trim(),
        contact_person: drawerContactName.trim(),
        phone: cleanPhone,
        email: drawerEmail.trim(),
        project_title: drawerCategory ? `${drawerCategory} for ${drawerContactName.trim()}` : `${drawerContactName.trim()} Inquiry`,
        company_name: drawerCompanyName.trim(),
        address: drawerAddress.trim(),
        estimated_value: resolvedValue,
        budget: Number(drawerBudget) || resolvedValue,
        last_contacted_date: drawerLastContactedDate,
        followup_date: drawerFollowupDate,
        expected_closure_date: drawerExpectedClosureDate,
        description: drawerDescription.trim(),
        stage: drawerStatus === 'Proposal Stage' ? 'PROPOSAL' : drawerStatus === 'Client Confirmed' ? 'WON' : 'NEW',
        probability: drawerStatus === 'Client Confirmed' ? 100 : drawerStatus === 'Proposal Stage' ? 60 : 20,
        status_label: drawerStatus || 'New Lead',
        source: drawerSource || 'Just dial',
        category: drawerCategory || 'Soil Testing',
        priority: drawerPriority || 'Medium',
        last_updated: todayStr,
        creation_date: drawerDate || '2026-09-25',
        notes: drawerDescription.trim() || drawerNotes.trim(),
        assigned_to_name: drawerAssignee,
        assigned_role: drawerAssignedRole,
        assigned_department: drawerAssignedRole
      };

      if (drawerAssignee) {
        addNotification({
          title: `New Lead Assigned: ${drawerContactName.trim()}`,
          message: `Lead ${nextNum} (${drawerLeadType.trim() || 'Inquiry'}) has been assigned to you for follow-up.`,
          type: 'LEAD_ASSIGNED',
          recipient: drawerAssignee,
          leadId: newLead.id,
          requestCode: nextNum,
          projectName: `${drawerContactName.trim()} (${drawerLeadType.trim() || 'Lead'})`,
          sender: currentSender,
          silentToast: true,
        });

        sendLeadAssignedPush({
          leadId: newLead.id,
          leadNumber: nextNum,
          clientName: drawerContactName.trim(),
          leadType: drawerLeadType.trim() || 'Lead',
          assigneeName: drawerAssignee,
          phone: cleanPhone,
          category: drawerCategory || 'General',
          assignedBy: currentSender,
        });
      }

      setLeads(prev => [newLead, ...prev]);
      onShowToast?.(drawerAssignee 
        ? `New Lead registered and assigned to ${drawerAssignee}!`
        : `New Lead registered successfully!`
      );
    }

    setIsLeadDrawerOpen(false);
  };

  const handleDeleteLead = async (id: string, name: string) => {
    closeAllRowMenus();
    if (!isAdminOrSuperAdmin) {
      onShowToast?.('Permission Denied: Only Admin or Super Admin can delete leads.');
      return;
    }
    const confirmed = await confirmAction({
      title: 'Delete Lead',
      message: `Are you sure you want to remove lead for "${name}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    onShowToast?.(`Lead removed successfully.`);
  };

  // Convert Lead to Quotation
  const handleConvertLeadToQuote = (lead: Lead) => {
    markRemindersAsViewed([lead.id]);
    closeAllRowMenus();
    setEditingQuoteId(null);
    setQuoteStep(1);
    setQuoteNumber(getNextQuotationNumber());
    setQuoteDate(new Date().toISOString().split('T')[0]);
    setQuoteClientName(lead.client_name);
    setQuoteClientPhone(lead.phone || '');
    setQuoteClientEmail(lead.email || '');
    setQuoteClientAddress(lead.address || '');
    setQuoteProjectTitle(lead.project_title || lead.lead_type || 'Soil Investigation');
    setQuoteDiscount(0);
    setQuoteErrors({});
    setClientSearchFilter('');
    const estVal = lead.estimated_value || 15000;
    setQuoteItems([
      {
        id: `item-${Date.now()}`,
        item_code: 'ITM-01',
        description: `${lead.project_title || 'Soil Testing Investigation & Report'}`,
        unit: 'Package',
        quantity: 1,
        unit_rate: estVal,
        amount: estVal,
        gst_percentage: 18,
        gst_amount: Math.round((estVal * 18) / 100),
        category: lead.category || 'Soil Testing'
      }
    ]);
    setActiveTab('quotations');
    setIsNewQuoteModalOpen(true);
    onShowToast?.(`Initiated quotation proposal for ${lead.client_name}!`);
  };

  // Convert Lead to Project: Prefill Create Project Wizard and seamlessly transition to Project Setup
  const handleConvertLeadToProject = (lead: Lead) => {
    markRemindersAsViewed([lead.id]);
    closeAllRowMenus();

    const budgetVal = Number(lead.budget) || Number(lead.estimated_value) || 0;
    const cleanTitle = lead.project_title?.trim() || `${lead.client_name} Project`;

    const deptMapped = 
      lead.category === 'Soil Testing' ? 'SOIL_INVESTIGATION' :
      lead.category === 'Architecture' ? 'ARCHITECTURE' :
      lead.category === 'Civil Construction' ? 'CONSTRUCTION' :
      lead.category === 'Structural' ? 'STRUCTURAL' :
      lead.category === 'Survey' ? 'SURVEY' : 'CONSTRUCTION';

    const convertPackage = {
      leadId: lead.id,
      leadNumber: lead.lead_number,
      projectName: cleanTitle,
      clientName: lead.client_name,
      address: lead.address || '',
      city: 'Chennai',
      estimatedBudget: budgetVal,
      scope: lead.description || lead.notes || `Converted from Lead ${lead.lead_number} (${lead.client_name}). Value: ₹ ${budgetVal.toLocaleString('en-IN')}`,
      department: deptMapped,
      assigneeName: lead.assigned_to_name || '',
      assigneeRole: lead.assigned_role || '',
      items: [],
    };

    try {
      sessionStorage.setItem('booshnam_convert_quotation_data', JSON.stringify(convertPackage));
      sessionStorage.setItem('booshnam_auto_open_create_project', 'true');
    } catch (e) {}

    // Dispatch global event for ProjectsView and navigate
    window.dispatchEvent(new CustomEvent('booshnam_open_create_project', { detail: convertPackage }));
    window.dispatchEvent(new CustomEvent('booshnam_navigate', { detail: { view: 'projects' } }));
    onNavigate?.('projects');
    onShowToast?.(`Opening Create Project Wizard for "${lead.client_name}"...`);

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('booshnam_open_create_project', { detail: convertPackage }));
    }, 80);
  };

  // Convert Quotation to Project: Prefill Create Project Wizard and seamlessly transition to Project Setup
  const handleConvertQuotationToProject = (quote: Quotation) => {
    setActiveQuoteRowMenuId(null);
    setActiveQuoteStatusDropdownId(null);
    setPreviewQuotation(null);

    const quoteRate = Number(quote.total_amount || quote.subtotal || 0);
    const cleanTitle = quote.project_title?.trim() || `${quote.client_name} Project`;

    const convertPackage = {
      quotationId: quote.id,
      quotationNumber: quote.quotation_number,
      projectName: cleanTitle,
      clientName: quote.client_name,
      address: quote.client_address || '',
      city: 'Chennai',
      estimatedBudget: quoteRate,
      scope: quote.notes || `Converted from Quotation ${quote.quotation_number}. Value: ₹ ${quoteRate.toLocaleString('en-IN')}`,
      department: quote.department || 'SOIL_INVESTIGATION',
      items: quote.items || [],
    };

    try {
      sessionStorage.setItem('booshnam_convert_quotation_data', JSON.stringify(convertPackage));
      sessionStorage.setItem('booshnam_auto_open_create_project', 'true');
    } catch (e) {}

    // Dispatch global event for ProjectsView and navigate
    window.dispatchEvent(new CustomEvent('booshnam_open_create_project', { detail: convertPackage }));
    window.dispatchEvent(new CustomEvent('booshnam_navigate', { detail: { view: 'projects' } }));
    onNavigate?.('projects');

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('booshnam_open_create_project', { detail: convertPackage }));
    }, 80);
  };

  // =========================================================================
  // QUOTATION HANDLERS
  // =========================================================================
  const handleAddQuoteItem = (preset?: Partial<QuotationItem>) => {
    const nextIdx = quoteItems.length + 1;
    const defaultCode = `ITM-${String(nextIdx).padStart(2, '0')}`;
    const qty = preset?.quantity ?? 1;
    const rate = preset?.unit_rate ?? 0;
    const gstPct = preset?.gst_percentage ?? 18;
    const sub = qty * rate;
    const gstAmt = Math.round((sub * gstPct) / 100);

    setQuoteItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        item_code: preset?.item_code || defaultCode,
        description: preset?.description || '',
        unit: preset?.unit || 'Nos',
        quantity: qty,
        unit_rate: rate,
        gst_percentage: gstPct,
        gst_amount: gstAmt,
        amount: sub,
        category: preset?.category || 'General'
      }
    ]);
  };

  const handleRemoveQuoteItem = (id: string) => {
    if (quoteItems.length <= 1) {
      onShowToast?.('At least one item is required in the quotation.');
      return;
    }
    setQuoteItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateQuoteItem = (id: string, field: keyof QuotationItem, val: any) => {
    setQuoteItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };
      if (field === 'quantity' || field === 'unit_rate' || field === 'gst_percentage') {
        const qty = field === 'quantity' ? Number(val) : Number(item.quantity);
        const rate = field === 'unit_rate' ? Number(val) : Number(item.unit_rate);
        const gstPct = field === 'gst_percentage' ? Number(val) : (item.gst_percentage !== undefined ? Number(item.gst_percentage) : 18);
        const sub = (qty || 0) * (rate || 0);
        updated.quantity = qty;
        updated.unit_rate = rate;
        updated.amount = sub;
        updated.gst_percentage = gstPct;
        updated.gst_amount = Math.round((sub * gstPct) / 100);
      }
      return updated;
    }));
  };

  const handleProceedToStep2 = () => {
    const errors: { quotationNumber?: string; clientName?: string; projectTitle?: string } = {};
    if (!quoteNumber.trim()) {
      errors.quotationNumber = 'Please enter Quotation Number';
    }
    if (!quoteClientName.trim()) {
      errors.clientName = 'Please enter or select Client Name';
    }
    if (!quoteProjectTitle.trim()) {
      errors.projectTitle = 'Please enter Quotation Title / Subject';
    }

    if (Object.keys(errors).length > 0) {
      setQuoteErrors(errors);
      onShowToast?.('Please fill required quotation details');
      return;
    }

    setQuoteErrors({});
    setQuoteStep(2);
  };

  const handleSaveQuotation = (status: Quotation['status'] = 'Draft') => {
    if (!quoteNumber.trim()) {
      setQuoteErrors({ quotationNumber: 'Please enter Quotation Number' });
      setQuoteStep(1);
      onShowToast?.('Please enter Quotation Number');
      return;
    }
    if (!quoteClientName.trim()) {
      setQuoteErrors({ clientName: 'Please enter or select Client Name' });
      setQuoteStep(1);
      onShowToast?.('Please enter Client Name');
      return;
    }
    if (!quoteProjectTitle.trim()) {
      setQuoteErrors({ projectTitle: 'Please enter Quotation Title / Subject' });
      setQuoteStep(1);
      onShowToast?.('Please enter Quotation Title / Subject');
      return;
    }
    if (quoteItems.length === 0) {
      onShowToast?.('Please add at least one line item to the quotation');
      return;
    }

    setQuoteErrors({});

    const formattedDate = formatDateDisplay(quoteDate) || quoteDate;

    const quotePayload: Quotation = {
      id: editingQuoteId || `quo-${Date.now()}`,
      quotation_number: quoteNumber.trim(),
      date: formattedDate,
      valid_until: quoteValidUntil,
      client_name: quoteClientName.trim(),
      client_phone: quoteClientPhone.trim() || undefined,
      client_email: quoteClientEmail.trim() || undefined,
      client_address: quoteClientAddress.trim() || 'Chennai.',
      project_title: quoteProjectTitle.trim(),
      department: quoteDepartment,
      status: editingQuoteId 
        ? (quotations.find(q => q.id === editingQuoteId)?.status || status) 
        : status,
      subtotal: quoteSubtotal,
      tax_percentage: 18,
      tax_amount: quoteGstAmount,
      discount_amount: Number(quoteDiscount) || 0,
      total_amount: quoteGrandTotal,
      notes: quoteNotes,
      terms_conditions: quoteTerms,
      items: quoteItems,
      attachment_name: quoteAttachmentName || undefined,
      attachment_url: quoteAttachmentUrl || undefined,
      attachment_uploaded_at: quoteAttachmentName ? (quoteAttachmentUploadedAt || getCurrentUploadTimestamp()) : undefined
    };

    if (editingQuoteId) {
      setQuotations(prev => prev.map(q => q.id === editingQuoteId ? quotePayload : q));
      onShowToast?.(`Quotation ${quoteNumber} updated successfully!`);
    } else {
      setQuotations(prev => [quotePayload, ...prev]);
      onShowToast?.(`Quotation ${quoteNumber} created with total cost ₹ ${quoteGrandTotal.toLocaleString('en-IN')}!`);
    }

    setIsNewQuoteModalOpen(false);
    setActiveTab('quotations');

    // Reset Form
    setEditingQuoteId(null);
    setQuoteStep(1);
    setQuoteClientName('');
    setQuoteClientPhone('');
    setQuoteClientEmail('');
    setQuoteClientAddress('');
    setQuoteProjectTitle('');
    setQuoteDiscount(0);
  };

  const handleUpdateQuotationStatus = (id: string, newStatus: string) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
    setActiveQuoteStatusDropdownId(null);
    onShowToast?.(`Status updated to ${newStatus}`);
  };

  const handleDeleteQuotation = async (id: string, num: string) => {
    setActiveQuoteRowMenuId(null);
    if (!isAdminOrSuperAdmin) {
      onShowToast?.('Permission Denied: Only Admin or Super Admin can delete quotations.');
      return;
    }
    const confirmed = await confirmAction({
      title: 'Delete Quotation',
      message: `Are you sure you want to permanently delete quotation ${num}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;
    setQuotations(prev => prev.filter(q => q.id !== id));
    if (previewQuotation?.id === id) setPreviewQuotation(null);
    onShowToast?.(`Quotation ${num} removed.`);
  };

  // Helper Text Color for Leads (clean text, no badge box or borders)
  const getLeadStatusColor = (status?: string) => {
    switch (status) {
      case 'Proposal Stage':
        return 'text-amber-600 font-semibold';
      case 'No Response':
        return 'text-slate-500 font-semibold';
      case 'Client Confirmed':
        return 'text-emerald-600 font-semibold';
      case 'Follow Up':
        return 'text-blue-600 font-semibold';
      case 'Lost':
        return 'text-rose-600 font-semibold';
      case 'New Lead':
      default:
        return 'text-red-600 font-semibold';
    }
  };
  const getLeadStatusBadge = getLeadStatusColor;

  // Helper Badge Color for Quotations
  const getQuoteStatusBadge = (status?: string) => {
    switch (status) {
      case 'Client Confirmed':
      case 'APPROVED':
        return 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]';
      case 'Sent':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'In Discussion':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'On Hold':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Rejected':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Draft':
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  // Fullscreen State & Toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsub = addFullscreenChangeListener((fs) => { setIsFullscreen(fs); });
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => { unsub(); window.removeEventListener('keydown', handleKeyDown); };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    setIsFullscreen(prev => !prev);
    try { await toggleBrowserFullscreen(); } catch (e) {}
  };

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-[#ffffff] h-full max-h-screen overflow-hidden font-sans transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-white ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
    }`}>
      {/* ── FIXED TOP HEADER BAR (Stays pinned in position, never moves or overlaps) ── */}
      <header className="px-6 pt-3.5 pb-0 bg-white border-b border-slate-200 shrink-0 z-30 shadow-2xs">
        <div className="flex items-center justify-between">
          {/* Left Title: Leads & Quotation */}
          <div>
            <h1 className="text-[26px] font-bold text-[#262626] font-heading tracking-tight">
              Leads & Quotation
            </h1>
          </div>

          {/* Right Header: Profile & Notifications */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isFullscreen ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-red-600" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <UserProfileDropdown showBell={true} />
          </div>
        </div>

        {/* ── SUB-PAGE TABS: [ 1. Leads ] [ 2. Quotation ] (Red & White Theme) ── */}
        <div className="flex items-center gap-6 mt-3">
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-2 ${
              activeTab === 'leads'
                ? 'text-red-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Leads</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors ${
              activeTab === 'leads'
                ? 'bg-red-50 text-red-600 border border-red-200/80'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {leads.length}
            </span>
            {activeTab === 'leads' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quotations')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-2 ${
              activeTab === 'quotations'
                ? 'text-red-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Quotation</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors ${
              activeTab === 'quotations'
                ? 'bg-red-50 text-red-600 border border-red-200/80'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {quotations.length}
            </span>
            {activeTab === 'quotations' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* ── SCROLLABLE MAIN CONTENT (Only this content area scrolls vertically!) ── */}
      <main className="p-6 space-y-4 flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-white">
        {/* ================================================================= */}
        {/* SUB-PAGE 1: LEADS (IMAGE 1) */}
        {/* ================================================================= */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filter Toolbar Row (Red and White Theme - Perfectly Aligned, No Clipping) */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 shrink-0">
                {/* Search Box */}
                <div className="relative shrink-0 w-36 sm:w-44">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="w-full h-9 pl-8 pr-7 text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 shadow-2xs transition-all"
                  />
                  {leadSearch && (
                    <button
                      type="button"
                      onClick={() => setLeadSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Priority Dropdown (FilterDropdown) */}
                <FilterDropdown
                  label="Priority"
                  value={leadPriorityFilter}
                  onChange={setLeadPriorityFilter}
                  options={[
                    { label: 'All Priorities', value: 'ALL' },
                    { label: 'High Priority', value: 'High', dotColor: 'bg-red-500' },
                    { label: 'Medium Priority', value: 'Medium', dotColor: 'bg-amber-500' },
                    { label: 'Low Priority', value: 'Low', dotColor: 'bg-emerald-500' },
                  ]}
                  minWidth="min-w-[135px]"
                />

                {/* Status Dropdown (FilterDropdown) */}
                <FilterDropdown
                  label="Status"
                  value={leadStatusFilter}
                  onChange={setLeadStatusFilter}
                  options={[
                    { label: 'All Statuses', value: 'ALL' },
                    { label: 'New Lead', value: 'New Lead', dotColor: 'bg-red-500' },
                    { label: 'Proposal Stage', value: 'Proposal Stage', dotColor: 'bg-amber-500' },
                    { label: 'Follow Up', value: 'Follow Up', dotColor: 'bg-blue-500' },
                    { label: 'No Response', value: 'No Response', dotColor: 'bg-slate-400' },
                    { label: 'Client Confirmed', value: 'Client Confirmed', dotColor: 'bg-emerald-500' },
                    { label: 'Lost', value: 'Lost', dotColor: 'bg-rose-500' },
                  ]}
                  minWidth="min-w-[155px]"
                />

                {/* Source Dropdown (FilterDropdown) */}
                <FilterDropdown
                  label="Source"
                  value={leadSourceFilter}
                  onChange={setLeadSourceFilter}
                  options={[
                    { label: 'All Sources', value: 'ALL' },
                    { label: 'Just dial', value: 'Just dial' },
                    { label: 'Referral', value: 'Referral' },
                    { label: 'Direct Walk-in', value: 'Direct Walk-in' },
                    { label: 'Website', value: 'Website' },
                    { label: 'Social Media', value: 'Social Media' },
                    { label: 'Google', value: 'Google' },
                  ]}
                  minWidth="min-w-[145px]"
                />

                {/* Category Dropdown (FilterDropdown) */}
                <FilterDropdown
                  label="Category"
                  value={leadCategoryFilter}
                  onChange={setLeadCategoryFilter}
                  options={[
                    { label: 'All Categories', value: 'ALL' },
                    { label: 'Soil Testing', value: 'Soil Testing' },
                    { label: 'Civil Construction', value: 'Civil Construction' },
                    { label: 'Architecture', value: 'Architecture' },
                    { label: 'Structural', value: 'Structural' },
                    { label: 'Survey', value: 'Survey' },
                  ]}
                  minWidth="min-w-[155px]"
                />

                {/* Assignee Dropdown (FilterDropdown - dynamically from Settings staff) */}
                <FilterDropdown
                  label="Assignee"
                  value={leadAssigneeFilter}
                  onChange={setLeadAssigneeFilter}
                  options={[
                    { label: 'All Assignees', value: 'ALL' },
                    { label: 'Unassigned', value: 'UNASSIGNED' },
                    ...assignableStaffOptions.map(staff => ({
                      label: staff.label,
                      value: staff.name
                    }))
                  ]}
                  minWidth="min-w-[160px]"
                />

                {/* Follow-up Reminders Dropdown */}
                <FilterDropdown
                  label={followUpStats.totalDue > 0 ? `Reminder (${followUpStats.totalDue})` : 'Reminder'}
                  value={leadFollowUpFilter}
                  onChange={(val) => setLeadFollowUpFilter(val as any)}
                  icon={
                    <BellRing 
                      className={`w-3.5 h-3.5 shrink-0 ${
                        leadFollowUpFilter === 'DUE' || followUpStats.totalDue > 0 ? 'text-red-600' : 'text-slate-400'
                      }`} 
                    />
                  }
                  options={[
                    { label: 'All Reminders', value: 'ALL' },
                    { label: `Reminder (${followUpStats.totalDue})`, value: 'DUE', dotColor: 'bg-red-500' },
                    { label: `Due Today (${followUpStats.today})`, value: 'TODAY', dotColor: 'bg-amber-500' },
                    { label: `Overdue (${followUpStats.overdue})`, value: 'OVERDUE', dotColor: 'bg-red-600' },
                    { label: `Upcoming (${followUpStats.upcoming})`, value: 'UPCOMING', dotColor: 'bg-blue-500' },
                    { label: 'No Date Set', value: 'NO_DATE' },
                  ]}
                  minWidth="min-w-[175px]"
                />
              </div>

              {/* "+ New Lead" Button (Red & White Theme - Perfectly Aligned) */}
              <div className="shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={handleOpenNewLeadDrawer}
                  className="h-9 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap border border-transparent"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>New Lead</span>
                </button>
              </div>
            </div>

            {/* Follow-up Reminders Alert Banner (only shows when there are unviewed due reminders) */}
            {followUpStats.unviewedDue > 0 && leadFollowUpFilter !== 'DUE' && (
              <div className="w-fit max-w-full bg-gradient-to-r from-red-50 via-white to-amber-50/40 border border-red-200/90 rounded-lg px-3 py-1.5 flex items-center gap-3.5 shadow-2xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <BellRing className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">
                      {followUpStats.unviewedDue} Follow-up {followUpStats.unviewedDue === 1 ? 'Reminder' : 'Reminders'} Pending:
                    </span>
                    <span className="text-slate-600 ml-1.5">
                      {followUpStats.today > 0 && <span className="text-amber-700 font-semibold">{followUpStats.today} due today</span>}
                      {followUpStats.today > 0 && followUpStats.overdue > 0 && ' • '}
                      {followUpStats.overdue > 0 && <span className="text-red-700 font-semibold">{followUpStats.overdue} overdue</span>}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenViewReminders}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-md font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Bell className="w-3 h-3 text-white fill-white" />
                  <span>View Reminders</span>
                </button>
              </div>
            )}

            {/* Showing Count & Reset filters */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-0.5">
              <div className="flex items-center gap-2">
                <span>Showing <strong className="text-slate-800 font-semibold">{filteredLeads.length}</strong> of {leads.length} leads</span>
                {(leadSearch || leadAssigneeFilter !== 'ALL' || leadPriorityFilter !== 'ALL' || leadStatusFilter !== 'ALL' || leadSourceFilter !== 'ALL' || leadCategoryFilter !== 'ALL' || leadFollowUpFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setLeadSearch('');
                      setLeadAssigneeFilter('ALL');
                      setLeadPriorityFilter('ALL');
                      setLeadStatusFilter('ALL');
                      setLeadSourceFilter('ALL');
                      setLeadCategoryFilter('ALL');
                      setLeadFollowUpFilter('ALL');
                    }}
                    className="text-[11px] text-red-600 hover:text-red-700 font-semibold underline underline-offset-2 cursor-pointer ml-1"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Leads Table (matching Image 1) */}
            <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs table-fixed">
                  <thead>
                    <tr className="bg-[#f8fafc] text-slate-600 border-b border-slate-200/80">
                      <th className="py-3 px-2 font-semibold text-slate-700 w-[5%] text-center">S.No.</th>
                      <th className="py-3 px-2.5 font-semibold text-slate-700 text-left w-[14%] truncate">Lead Type</th>
                      <th className="py-3 px-2.5 font-semibold text-slate-700 text-left w-[16%] truncate">Contact Name</th>
                      <th className="py-3 px-2.5 font-semibold text-slate-700 text-left whitespace-nowrap w-[13%]">Last Updated</th>
                      <th className="py-3 px-2.5 font-semibold text-slate-700 text-left whitespace-nowrap w-[13%]">Contact Number</th>
                      <th className="py-3 px-2.5 font-semibold text-slate-700 text-left whitespace-nowrap w-[11%]">Status</th>
                      <th className="py-3 px-2.5 font-semibold text-slate-700 text-left whitespace-nowrap w-[13%]">Follow Up</th>
                      <th className="py-3 px-2.5 font-semibold text-slate-700 text-left whitespace-nowrap w-[9%] truncate">Source</th>
                      <th className="py-3 px-2 font-semibold text-slate-700 text-center w-[6%]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map((lead, idx) => (
                      <tr 
                        key={lead.id}
                        onClick={() => handleEditLead(lead)}
                        className="hover:bg-slate-50/80 transition-colors group text-slate-800 cursor-pointer"
                      >
                        <td className="py-3.5 px-2 font-medium text-slate-500 text-center align-middle">
                          {idx + 1}
                        </td>

                        <td className="py-3.5 px-2.5 font-semibold text-slate-800 text-left align-middle truncate">
                          {lead.lead_type || 'Referal - soil testing'}
                        </td>

                        <td className="py-3.5 px-2.5 font-medium text-slate-900 text-left align-middle truncate">
                          <div className="font-semibold text-slate-900 truncate">{lead.client_name}</div>
                          {lead.assigned_to_name ? (
                            <div className="text-[10px] text-slate-500 font-normal flex items-center gap-1 mt-0.5 truncate" title={`Assigned to: ${lead.assigned_to_name} (${lead.assigned_role || 'Staff'})`}>
                              <span className="text-slate-400">Assigned:</span>
                              <span className="text-slate-700 font-semibold">{lead.assigned_to_name}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              <span>Unassigned</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-2.5 text-slate-500 text-left whitespace-nowrap align-middle">
                          {lead.last_updated || '25 September 2026'}
                        </td>

                        <td className="py-3.5 px-2.5 tracking-tight text-slate-700 text-left whitespace-nowrap align-middle">
                          <a 
                            href={`tel:${lead.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-red-600 hover:underline"
                            title="Call contact"
                          >
                            {lead.phone}
                          </a>
                        </td>

                        {/* Plain Status Text - No boxed tag/pill container */}
                        <td className="py-3.5 px-2.5 text-left whitespace-nowrap align-middle">
                          <span className={`text-xs ${getLeadStatusColor(lead.status_label || lead.stage)}`}>
                            {lead.status_label || lead.stage}
                          </span>
                        </td>

                        {/* Plain Follow Up Date - No boxed tag/pill container */}
                        <td className="py-3.5 px-2.5 text-left whitespace-nowrap align-middle" onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            const info = getFollowUpStatus(lead.followup_date);
                            const isViewed = isReminderViewed(lead.id, lead.followup_date);
                            if (!lead.followup_date || info.status === 'NONE') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleEditLead(lead)}
                                  className="text-xs text-slate-400 hover:text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Click to set follow up date"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Set Date</span>
                                </button>
                              );
                            }
                            if (info.status === 'OVERDUE') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleEditLead(lead)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer transition-colors group"
                                  title="Overdue! Click to view or reschedule follow-up"
                                >
                                  <BellRing className={`w-3.5 h-3.5 text-red-500 shrink-0 ${!isViewed ? 'animate-pulse' : ''}`} />
                                  <span>{info.label}</span>
                                  {!isViewed && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" title="Unread reminder" />
                                  )}
                                </button>
                              );
                            }
                            if (info.status === 'TODAY') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleEditLead(lead)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer transition-colors group"
                                  title="Due today! Click to view or reschedule follow-up"
                                >
                                  <Bell className={`w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500/20 ${!isViewed ? 'animate-bounce' : ''}`} />
                                  <span>{info.label}</span>
                                  {!isViewed && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unread reminder" />
                                  )}
                                </button>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => handleEditLead(lead)}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:underline cursor-pointer transition-colors"
                                title="Click to view or reschedule follow-up"
                              >
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{info.label}</span>
                              </button>
                            );
                          })()}
                        </td>

                        <td className="py-3.5 px-2.5 text-slate-600 whitespace-nowrap text-left align-middle truncate" title={lead.source || 'Just dial'}>
                          {lead.source || 'Just dial'}
                        </td>
                        <td className="py-3.5 px-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block dropdown-trigger-container">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (rowMenuAnchor?.id === lead.id) {
                                  closeAllRowMenus();
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  closeAllRowMenus();
                                  setRowMenuAnchor({ id: lead.id, rect });
                                  setActiveRowMenuId(lead.id);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                rowMenuAnchor?.id === lead.id
                                  ? 'bg-slate-200 text-slate-800'
                                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                              }`}
                              title="Lead Actions"
                              aria-label="Lead Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <p className="text-sm font-medium">No leads match the selected filter criteria.</p>
                          <button
                            type="button"
                            onClick={handleOpenNewLeadDrawer}
                            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs"
                          >
                            + Register New Lead
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUB-PAGE 2: QUOTATION (IMAGE 3 - RED & WHITE THEME) */}
        {/* ================================================================= */}
        {activeTab === 'quotations' && (
          <div className="space-y-4">
            {/* Quotation Filters Toolbar (Red & White Theme - Perfectly Aligned, No Clipping) */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Search Quotation */}
                <div className="relative shrink-0 w-44 sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search Quotation..."
                    value={quoteSearch}
                    onChange={(e) => setQuoteSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-7 text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 shadow-2xs transition-all"
                  />
                  {quoteSearch && (
                    <button
                      type="button"
                      onClick={() => setQuoteSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Date Filter Button */}
                <button
                  type="button"
                  onClick={() => onShowToast?.('Date range filter')}
                  className="h-9 px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2 shrink-0 shadow-2xs transition-all cursor-pointer hover:bg-slate-50/70"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Date Filter</span>
                </button>

                {/* Status Dropdown Filter: 'All Status' right next to Date Filter */}
                <FilterDropdown
                  label="All Status"
                  value={quoteStatusFilter}
                  onChange={setQuoteStatusFilter}
                  options={[
                    { label: 'All Statuses', value: 'ALL' },
                    { label: 'Client Confirmed', value: 'Client Confirmed', dotColor: 'bg-emerald-500' },
                    { label: 'In Discussion', value: 'In Discussion', dotColor: 'bg-amber-500' },
                    { label: 'Draft', value: 'Draft', dotColor: 'bg-slate-400' },
                    { label: 'Sent', value: 'Sent', dotColor: 'bg-blue-500' },
                    { label: 'On Hold', value: 'On Hold', dotColor: 'bg-amber-500' },
                    { label: 'Rejected', value: 'Rejected', dotColor: 'bg-red-500' },
                  ]}
                  minWidth="min-w-[155px]"
                />
              </div>

              {/* "+ New Quotation" Button (Red & White Theme - Perfectly Aligned) */}
              <div className="shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={handleOpenNewQuotationModal}
                  className="h-9 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap border border-transparent"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>New Quotation</span>
                </button>
              </div>
            </div>

            {/* Quotations Table (matching Image 3) */}
            <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs table-fixed">
                  <thead>
                    <tr className="bg-[#f8fafc] text-slate-600 border-b border-slate-200/80">
                      <th className="py-3 px-3.5 font-semibold text-slate-700 w-[14%] text-left whitespace-nowrap">Quote #</th>
                      <th className="py-3 px-3.5 font-semibold text-slate-700 w-[11%] text-left whitespace-nowrap">Date</th>
                      <th className="py-3 px-3.5 font-semibold text-slate-700 text-left w-[20%] truncate">Subject</th>
                      <th className="py-3 px-3.5 font-semibold text-slate-700 text-left w-[18%] truncate">Client</th>
                      <th className="py-3 px-3.5 font-semibold text-slate-700 text-left whitespace-nowrap w-[11%]">Est. Amount</th>
                      <th className="py-3 px-3.5 font-semibold text-slate-700 w-[11%] text-left">Status</th>
                      <th className="py-3 px-3.5 font-semibold text-slate-700 text-right w-[15%]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQuotations.map((quote) => (
                      <tr
                        key={quote.id}
                        className="hover:bg-slate-50/70 transition-colors group text-slate-800"
                      >
                        {/* Quotation Code */}
                        <td className="py-3.5 px-3.5 font-semibold text-slate-800 tracking-tight text-left align-middle">
                          {quote.quotation_number}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-3.5 text-slate-500 whitespace-nowrap text-left align-middle">
                          {quote.date}
                        </td>

                        {/* Subject & Attachment */}
                        <td className="py-3.5 px-3.5 font-medium text-slate-800 text-left align-middle">
                          <div>{quote.project_title || 'Soil Investigation'}</div>
                          {quote.attachment_name && (
                            <div className="text-[11px] text-emerald-700 font-normal flex items-center gap-1.5 mt-1" title={`Uploaded on ${quote.attachment_uploaded_at || quote.date}`}>
                              <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-slate-700 truncate max-w-[150px]">{quote.attachment_name}</span>
                              <span className="text-slate-500 font-medium text-[10px] flex items-center gap-1 bg-slate-100/80 px-1.5 py-0.2 rounded border border-slate-200">
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                <span>{quote.attachment_uploaded_at || quote.date}</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Client */}
                        <td className="py-3.5 px-3.5 font-medium text-slate-900 text-left align-middle truncate">
                          {quote.client_name}
                        </td>

                        {/* Est. Amount */}
                        <td className="py-3.5 px-3.5 font-semibold text-slate-900 tracking-tight whitespace-nowrap text-left align-middle">
                          ₹ {quote.total_amount.toLocaleString('en-IN')}
                        </td>

                        {/* Status Dropdown Pill with Menu (matching Image 3) */}
                        <td className="py-3.5 px-3.5 relative dropdown-trigger-container text-left align-middle">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (quoteStatusMenuAnchor?.id === quote.id) {
                                closeAllRowMenus();
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                closeAllRowMenus();
                                setQuoteStatusMenuAnchor({ id: quote.id, rect });
                                setActiveQuoteStatusDropdownId(quote.id);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center justify-between gap-1.5 cursor-pointer transition-all ${getQuoteStatusBadge(quote.status)}`}
                          >
                            <span>{quote.status === 'APPROVED' ? 'Client Confirmed' : quote.status}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${quoteStatusMenuAnchor?.id === quote.id ? 'rotate-180' : 'opacity-70'}`} />
                          </button>
                        </td>

                        {/* Row Actions: Convert to Project (when confirmed) & More Menu */}
                        <td className="py-3.5 px-3.5 text-right align-middle relative dropdown-trigger-container">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Direct Convert to Project Button when Confirmed */}
                            {(quote.status === 'Client Confirmed' || quote.status === 'APPROVED') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConvertQuotationToProject(quote);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                                title={`Convert to Project with budget ₹ ${quote.total_amount.toLocaleString('en-IN')}`}
                              >
                                <Briefcase className="w-3 h-3" />
                                <span>Convert to Project</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (quoteRowMenuAnchor?.id === quote.id) {
                                  closeAllRowMenus();
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  closeAllRowMenus();
                                  setQuoteRowMenuAnchor({ id: quote.id, rect });
                                  setActiveQuoteRowMenuId(quote.id);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                                quoteRowMenuAnchor?.id === quote.id
                                  ? 'bg-slate-200 text-slate-800'
                                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                              }`}
                              title="Quotation Actions"
                              aria-label="Quotation Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredQuotations.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <p className="text-sm font-medium">No quotations found matching your search filter.</p>
                          <button
                            type="button"
                            onClick={() => setIsNewQuoteModalOpen(true)}
                            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs"
                          >
                            + Create New Quotation
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================================================================= */}
      {/* RIGHT-HAND SIDEBAR / DRAWER: NEW LEAD (IMAGE 2) */}
      {/* ================================================================= */}
      {isLeadDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end">
          <div 
            className="w-full sm:w-[500px] md:w-[540px] bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 rounded-l-3xl rounded-l-drawer overflow-hidden animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header (matching Image 2 & latest screenshot) */}
            <div className="px-6 py-4 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsLeadDrawerOpen(false);
                    setDrawerErrors({});
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
                <h2 className="text-base font-black text-slate-900 tracking-wider uppercase font-heading">
                  {editingLeadId ? 'EDIT LEAD' : 'NEW LEAD'}
                </h2>
              </div>

              {/* Save Button (Red & White Theme) */}
              <button
                type="button"
                onClick={() => handleSaveLeadFromDrawer()}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                Save
              </button>
            </div>

            {/* Red Accent Line across 100% width under header (Red & White Theme) */}
            <div className="h-1 bg-red-600 w-full" />

            {/* Top Error Alert Banner if validation failed */}
            {Object.keys(drawerErrors).length > 0 && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-800">Please fill in the required fields:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-red-700 font-medium">
                    {drawerErrors.leadType && <li>{drawerErrors.leadType}</li>}
                    {drawerErrors.contactName && <li>{drawerErrors.contactName}</li>}
                    {drawerErrors.phone && <li>{drawerErrors.phone}</li>}
                    {drawerErrors.email && <li>{drawerErrors.email}</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* Drawer Form Body (Perfect Alignment & Red/White Theme) */}
            <div ref={drawerScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Row 1: LEAD ASSIGNEE & DATE (Perfect 2-col alignment) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* LEAD ASSIGNEE */}
                <div className="flex gap-2">
                  <FloatingSelect
                    className="flex-1"
                    label="ASSIGN TO"
                    value={drawerAssignee}
                    onChange={(val) => {
                      setDrawerAssignee(val);
                      const staff = assignableStaffOptions.find(s => s.name === val);
                      if (staff) {
                        setDrawerAssignedRole(staff.roleName || staff.roleCode || '');
                      } else {
                        setDrawerAssignedRole('');
                      }
                    }}
                    placeholder="Select Staff Member"
                    options={[
                      { label: 'Unassigned', value: '' },
                      ...assignableStaffOptions.map(staff => ({
                        label: staff.label,
                        value: staff.name
                      }))
                    ]}
                  />
                </div>

                {/* DATE */}
                <CustomDatePicker
                  value={drawerDate}
                  onChange={setDrawerDate}
                  label="DATE"
                  variant="floating"
                  align="right"
                  placeholder="DD-MM-YYYY"
                />
              </div>

              {/* LEAD TYPE * */}
              <div className="space-y-1">
                <div className={`relative border rounded-xl h-11 px-3.5 flex items-center transition-colors ${
                  drawerErrors.leadType 
                    ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20' 
                    : 'border-slate-300 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100'
                }`}>
                  <label className={`absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold tracking-wider uppercase leading-none select-none z-10 transition-colors ${
                    drawerErrors.leadType ? 'text-red-600' : 'text-slate-400'
                  }`}>
                    LEAD TYPE *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder=""
                    value={drawerLeadType}
                    onChange={(e) => {
                      setDrawerLeadType(e.target.value);
                      if (drawerErrors.leadType) setDrawerErrors(prev => ({ ...prev, leadType: undefined }));
                    }}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none pr-6"
                  />
                  <Info className={`w-4 h-4 absolute right-3 pointer-events-none transition-colors ${
                    drawerErrors.leadType ? 'text-red-500' : 'text-slate-400'
                  }`} />
                </div>
                {drawerErrors.leadType && (
                  <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 ml-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{drawerErrors.leadType}</span>
                  </p>
                )}
              </div>

              {/* CONTACT NAME * */}
              <div className="space-y-1">
                <div className={`relative border rounded-xl h-11 px-3.5 flex items-center transition-colors ${
                  drawerErrors.contactName 
                    ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20' 
                    : 'border-slate-300 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100'
                }`}>
                  <label className={`absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold tracking-wider uppercase leading-none select-none z-10 transition-colors ${
                    drawerErrors.contactName ? 'text-red-600' : 'text-slate-400'
                  }`}>
                    CONTACT NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder=""
                    value={drawerContactName}
                    onChange={(e) => {
                      setDrawerContactName(e.target.value);
                      if (drawerErrors.contactName) setDrawerErrors(prev => ({ ...prev, contactName: undefined }));
                    }}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
                  />
                </div>
                {drawerErrors.contactName && (
                  <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 ml-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{drawerErrors.contactName}</span>
                  </p>
                )}
              </div>

              {/* PHONE NO. * (with Flag and +91 code) */}
              <div className="space-y-1">
                <div className={`relative border rounded-xl h-11 px-3.5 flex items-center transition-colors ${
                  drawerErrors.phone 
                    ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20' 
                    : 'border-slate-300 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100'
                }`}>
                  <label className={`absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold tracking-wider uppercase leading-none select-none z-10 transition-colors ${
                    drawerErrors.phone ? 'text-red-600' : 'text-slate-400'
                  }`}>
                    PHONE NO. *
                  </label>
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 text-slate-700 font-medium select-none">
                      <span className="text-sm">🇮🇳</span>
                      <span>+91</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder=""
                      value={drawerPhone}
                      onChange={(e) => {
                        setDrawerPhone(e.target.value);
                        if (drawerErrors.phone) setDrawerErrors(prev => ({ ...prev, phone: undefined }));
                      }}
                      className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
                    />
                  </div>
                </div>
                {drawerErrors.phone && (
                  <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 ml-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{drawerErrors.phone}</span>
                  </p>
                )}
              </div>

              {/* EMAIL */}
              <div className="space-y-1">
                <div className={`relative border rounded-xl h-11 px-3.5 flex items-center transition-colors ${
                  drawerErrors.email 
                    ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20' 
                    : 'border-slate-300 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100'
                }`}>
                  <label className={`absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold tracking-wider uppercase leading-none select-none z-10 transition-colors ${
                    drawerErrors.email ? 'text-red-600' : 'text-slate-400'
                  }`}>
                    EMAIL
                  </label>
                  <input
                    type="email"
                    placeholder=""
                    value={drawerEmail}
                    onChange={(e) => {
                      setDrawerEmail(e.target.value);
                      if (drawerErrors.email) setDrawerErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
                  />
                </div>
                {drawerErrors.email && (
                  <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 ml-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{drawerErrors.email}</span>
                  </p>
                )}
              </div>

              {/* COMPANY NAME */}
              <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                  COMPANY NAME
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={drawerCompanyName}
                  onChange={(e) => setDrawerCompanyName(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
                />
              </div>

              {/* ADDRESS */}
              <div className="relative border border-slate-300 rounded-xl px-3.5 py-2.5 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                  ADDRESS
                </label>
                <textarea
                  rows={2}
                  placeholder=""
                  value={drawerAddress}
                  onChange={(e) => setDrawerAddress(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none resize-none pt-1"
                />
              </div>

              {/* SOURCE */}
              <FloatingSelect
                label="SOURCE"
                value={drawerSource}
                onChange={setDrawerSource}
                placeholder="Select Source"
                options={[
                  { label: 'Select Source', value: '' },
                  { label: 'Just dial', value: 'Just dial' },
                  { label: 'Referral', value: 'Referral' },
                  { label: 'Direct Walk-in', value: 'Direct Walk-in' },
                  { label: 'Website', value: 'Website' },
                  { label: 'Social Media', value: 'Social Media' },
                  { label: 'Google', value: 'Google' },
                ]}
              />

              {/* CATEGORY */}
              <FloatingSelect
                label="CATEGORY"
                value={drawerCategory}
                onChange={setDrawerCategory}
                placeholder="Select Category"
                options={[
                  { label: 'Select Category', value: '' },
                  { label: 'Soil Testing', value: 'Soil Testing' },
                  { label: 'Civil Construction', value: 'Civil Construction' },
                  { label: 'Architecture', value: 'Architecture' },
                  { label: 'Structural', value: 'Structural' },
                  { label: 'Survey', value: 'Survey' },
                ]}
              />

              {/* Row: LEAD STATUS & PRIORITY (Perfect 2-col alignment with uniform h-11) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatingSelect
                  label="LEAD STATUS"
                  value={drawerStatus}
                  onChange={setDrawerStatus}
                  placeholder="Select Status"
                  options={[
                    { label: 'Select Status', value: '' },
                    { label: 'New Lead', value: 'New Lead', dotColor: 'bg-red-500' },
                    { label: 'Proposal Stage', value: 'Proposal Stage', dotColor: 'bg-amber-500' },
                    { label: 'No Response', value: 'No Response', dotColor: 'bg-slate-400' },
                    { label: 'Follow Up', value: 'Follow Up', dotColor: 'bg-blue-500' },
                    { label: 'Client Confirmed', value: 'Client Confirmed', dotColor: 'bg-emerald-500' },
                    { label: 'Lost', value: 'Lost', dotColor: 'bg-rose-500' },
                  ]}
                />

                <FloatingSelect
                  label="PRIORITY"
                  value={drawerPriority}
                  onChange={setDrawerPriority}
                  placeholder="Select Priority"
                  align="right"
                  options={[
                    { label: 'High', value: 'High', dotColor: 'bg-red-500' },
                    { label: 'Medium', value: 'Medium', dotColor: 'bg-amber-500' },
                    { label: 'Low', value: 'Low', dotColor: 'bg-emerald-500' },
                  ]}
                />
              </div>

              {/* Row: LAST CONTACTED DATE & FOLLOW UP DATE (Perfect 2-col alignment with uniform h-11) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomDatePicker
                  value={drawerLastContactedDate}
                  onChange={setDrawerLastContactedDate}
                  label="LAST CONTACTED DATE"
                  variant="floating"
                  placeholder="DD-MM-YYYY"
                />

                <CustomDatePicker
                  value={drawerFollowupDate}
                  onChange={setDrawerFollowupDate}
                  label="FOLLOW UP DATE"
                  variant="floating"
                  align="right"
                  placeholder="DD-MM-YYYY"
                />
              </div>

              {/* Row: EXPECTED CLOSURE DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomDatePicker
                  value={drawerExpectedClosureDate}
                  onChange={setDrawerExpectedClosureDate}
                  label="EXPECTED CLOSURE DATE"
                  variant="floating"
                  placeholder="DD-MM-YYYY"
                />
              </div>

              {/* DESCRIPTION */}
              <div className="relative border border-slate-300 rounded-xl px-3.5 py-2.5 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                  DESCRIPTION
                </label>
                <textarea
                  rows={3}
                  placeholder=""
                  value={drawerDescription}
                  onChange={(e) => setDrawerDescription(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none resize-none pt-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: CREATE / EDIT QUOTATION PROPOSAL (RED & WHITE THEME) */}
      {/* ================================================================= */}
      {isNewQuoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingQuoteId ? 'Edit Quotation Proposal' : 'Create Quotation Proposal'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsNewQuoteModalOpen(false);
                  setQuoteErrors({});
                  setEditingQuoteId(null);
                }}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Navigation Bar */}
            <div className="flex items-center px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuoteStep(1)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    quoteStep === 1
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    quoteStep === 1 ? 'bg-white text-red-600' : 'bg-slate-200 text-slate-700'
                  }`}>
                    1
                  </span>
                  <span>Quotation Details</span>
                  {quoteNumber && quoteClientName && quoteProjectTitle && (
                    <Check className={`w-3.5 h-3.5 ${quoteStep === 1 ? 'text-white' : 'text-emerald-600'}`} />
                  )}
                </button>

                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

                <button
                  type="button"
                  onClick={handleProceedToStep2}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    quoteStep === 2
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    quoteStep === 2 ? 'bg-white text-red-600' : 'bg-slate-200 text-slate-700'
                  }`}>
                    2
                  </span>
                  <span>Line Items & Pricing</span>
                  {quoteItems.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      quoteStep === 2 ? 'bg-white/20 text-white' : 'bg-red-50 text-red-700'
                    }`}>
                      {quoteItems.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 text-xs space-y-5">
              {/* ========================================================= */}
              {/* STEP 1: QUOTATION & CLIENT DETAILS */}
              {/* ========================================================= */}
              {quoteStep === 1 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Row 1: Quotation Identification */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Quotation Identification
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {/* Quotation Number */}
                      <div>
                        <label className={`block text-xs font-bold mb-1 transition-colors ${
                          quoteErrors.quotationNumber ? 'text-red-600' : 'text-slate-700'
                        }`}>
                          Quotation Number *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. QBAG/3079/2026-27"
                          value={quoteNumber}
                          onChange={(e) => {
                            setQuoteNumber(e.target.value);
                            if (quoteErrors.quotationNumber) {
                              setQuoteErrors(prev => ({ ...prev, quotationNumber: undefined }));
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold tracking-tight text-slate-900 focus:outline-none transition-colors ${
                            quoteErrors.quotationNumber
                              ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                              : 'border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-100 bg-white'
                          }`}
                        />
                        {quoteErrors.quotationNumber && (
                          <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{quoteErrors.quotationNumber}</span>
                          </p>
                        )}
                      </div>

                      {/* Quotation Date */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Quotation Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={quoteDate}
                          onChange={(e) => setQuoteDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 bg-white cursor-pointer"
                        />
                      </div>

                      {/* Valid Until */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Valid Until Date
                        </label>
                        <input
                          type="date"
                          value={quoteValidUntil}
                          onChange={(e) => setQuoteValidUntil(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 bg-white cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Client Details */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Client Details
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {/* Searchable Client Name Combobox */}
                      <div className="sm:col-span-2 relative" ref={clientDropdownRef}>
                        <label className={`block text-xs font-bold mb-1 transition-colors ${
                          quoteErrors.clientName ? 'text-red-600' : 'text-slate-700'
                        }`}>
                          Client Name *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="Type to search or enter Client name..."
                            value={quoteClientName}
                            onFocus={() => {
                              setIsClientDropdownOpen(true);
                              setClientSearchFilter(quoteClientName);
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQuoteClientName(val);
                              setClientSearchFilter(val);
                              setIsClientDropdownOpen(true);
                              if (quoteErrors.clientName) {
                                setQuoteErrors(prev => ({ ...prev, clientName: undefined }));
                              }
                            }}
                            className={`w-full pl-9 pr-8 py-2 border rounded-xl text-xs text-slate-900 font-medium focus:outline-none transition-colors bg-white ${
                              quoteErrors.clientName
                                ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                                : 'border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-100'
                            }`}
                          />
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                          {quoteClientName && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuoteClientName('');
                                setClientSearchFilter('');
                              }}
                              className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {quoteErrors.clientName && (
                          <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{quoteErrors.clientName}</span>
                          </p>
                        )}

                        {/* Search Suggestions Dropdown */}
                        {isClientDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95">
                            {filteredClientOptions.length > 0 ? (
                              filteredClientOptions.slice(0, 15).map((opt) => (
                                <div
                                  key={opt.id}
                                  onClick={() => {
                                    setQuoteClientName(opt.name);
                                    if (opt.phone) setQuoteClientPhone(opt.phone);
                                    if (opt.email) setQuoteClientEmail(opt.email);
                                    if (opt.address) setQuoteClientAddress(opt.address);
                                    if (!quoteProjectTitle.trim() && opt.projectTitle) {
                                      setQuoteProjectTitle(opt.projectTitle);
                                    }
                                    if (opt.department) {
                                      setQuoteDepartment(opt.department);
                                    }
                                    setIsClientDropdownOpen(false);
                                    if (quoteErrors.clientName) {
                                      setQuoteErrors(prev => ({ ...prev, clientName: undefined }));
                                    }
                                  }}
                                  className="p-2.5 hover:bg-red-50/60 cursor-pointer transition-colors flex items-center justify-between text-left group"
                                >
                                  <div className="min-w-0 pr-2">
                                    <p className="font-bold text-slate-900 group-hover:text-red-700 truncate">{opt.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">
                                      {opt.projectTitle ? `Project: ${opt.projectTitle} • ` : ''}
                                      {opt.phone || opt.email || opt.address || 'No contact details'}
                                    </p>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                    opt.source === 'Party' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : opt.source === 'Project'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {opt.source}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-slate-500">
                                <p className="text-xs">No matching saved clients found.</p>
                                <button
                                  type="button"
                                  onClick={() => setIsClientDropdownOpen(false)}
                                  className="mt-1.5 text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                                >
                                  Use "{clientSearchFilter}" as custom client name
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                        <input
                          type="text"
                          placeholder="e.g. 98401 23456"
                          value={quoteClientPhone}
                          onChange={(e) => setQuoteClientPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 bg-white"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                        <input
                          type="email"
                          placeholder="e.g. client@example.com"
                          value={quoteClientEmail}
                          onChange={(e) => setQuoteClientEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 bg-white"
                        />
                      </div>

                      {/* Location */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                        <input
                          type="text"
                          placeholder="e.g. Chennai, Tamil Nadu"
                          value={quoteClientAddress}
                          onChange={(e) => setQuoteClientAddress(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Subject / Scope & Department */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Scope & Classification
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className={`block text-xs font-bold mb-1 transition-colors ${
                          quoteErrors.projectTitle ? 'text-red-600' : 'text-slate-700'
                        }`}>
                          Quotation Title / Subject / Scope *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Soil Investigations to be carried out for proposed structure at Arasankalai"
                          value={quoteProjectTitle}
                          onChange={(e) => {
                            setQuoteProjectTitle(e.target.value);
                            if (quoteErrors.projectTitle) {
                              setQuoteErrors(prev => ({ ...prev, projectTitle: undefined }));
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-xl text-xs text-slate-900 focus:outline-none transition-colors bg-white ${
                            quoteErrors.projectTitle
                              ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                              : 'border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-100'
                          }`}
                        />
                        {quoteErrors.projectTitle && (
                          <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{quoteErrors.projectTitle}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                        <CustomSelect
                          value={quoteDepartment}
                          onChange={(val) => setQuoteDepartment(val)}
                          options={[
                            { value: 'CBE_SOIL_INVESTIGATION', label: 'Soil Investigation' },
                            { value: 'CONSTRUCTION', label: 'Civil Construction' },
                            { value: 'ARCHITECTURE', label: 'Architecture' },
                            { value: 'STRUCTURAL', label: 'Structural' },
                            { value: 'SURVEY', label: 'Survey' },
                          ]}
                          size="md"
                          className="w-full"
                          triggerClassName="w-full !rounded-xl !h-[38px] text-xs font-semibold text-slate-800 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 2: LINE ITEMS SCOPE & COST ESTIMATION */}
              {/* ========================================================= */}
              {quoteStep === 2 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Line Items Table Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Line Item Scope & Pricing
                        </h4>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {quoteItems.length} items
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddQuoteItem()}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item</span>
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[760px]">
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3 w-28">Item Code</th>
                              <th className="py-2.5 px-3">Item Name / Description</th>
                              <th className="py-2.5 px-3 w-24 text-center">Unit</th>
                              <th className="py-2.5 px-3 w-20 text-center">Est. Qty</th>
                              <th className="py-2.5 px-3 w-28 text-center">Rate (₹)</th>
                              <th className="py-2.5 px-3 w-24 text-center">GST %</th>
                              <th className="py-2.5 px-3 w-24 text-right">GST Amt (₹)</th>
                              <th className="py-2.5 px-3 w-28 text-right font-bold text-slate-900">Total (₹)</th>
                              <th className="py-2.5 px-2 w-10 text-center">Del</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {quoteItems.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-slate-400">
                                  <p className="font-semibold text-xs text-slate-600">No items added yet</p>
                                  <p className="text-[11px] text-slate-400 mt-1">Click "+ Add Item" above to add line items with scope, rates, and GST.</p>
                                </td>
                              </tr>
                            ) : (
                              quoteItems.map((item, idx) => {
                                const qty = Number(item.quantity) || 0;
                                const rate = Number(item.unit_rate) || 0;
                                const sub = qty * rate;
                                const gstPct = item.gst_percentage !== undefined ? Number(item.gst_percentage) : 18;
                                const gstAmt = item.gst_amount !== undefined ? item.gst_amount : Math.round((sub * gstPct) / 100);
                                const netTotal = sub + gstAmt;

                                return (
                                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                    {/* Item Code */}
                                    <td className="py-2 px-3">
                                      <input
                                        type="text"
                                        placeholder={`ITM-0${idx + 1}`}
                                        value={item.item_code || ''}
                                        onChange={(e) => handleUpdateQuoteItem(item.id, 'item_code', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-red-600 bg-white"
                                      />
                                    </td>

                                    {/* Item Name / Description */}
                                    <td className="py-2 px-3">
                                      <input
                                        type="text"
                                        placeholder="Describe item scope..."
                                        value={item.description}
                                        onChange={(e) => handleUpdateQuoteItem(item.id, 'description', e.target.value)}
                                        className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600 bg-white"
                                      />
                                    </td>

                                    {/* Unit */}
                                    <td className="py-2 px-3 text-center">
                                      <input
                                        type="text"
                                        list={`units-list-${item.id}`}
                                        placeholder="Unit"
                                        value={item.unit}
                                        onChange={(e) => handleUpdateQuoteItem(item.id, 'unit', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium text-center text-slate-900 focus:outline-none focus:border-red-600 bg-white"
                                      />
                                      <datalist id={`units-list-${item.id}`}>
                                        <option value="Package" />
                                        <option value="Nos" />
                                        <option value="Bore" />
                                        <option value="Per Bore" />
                                        <option value="Sqft" />
                                        <option value="Cum" />
                                        <option value="RM" />
                                        <option value="LS" />
                                        <option value="MT" />
                                        <option value="Day" />
                                        <option value="Hour" />
                                      </datalist>
                                    </td>

                                    {/* Estimated Quantity */}
                                    <td className="py-2 px-3 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        placeholder="0"
                                        value={item.quantity === 0 ? '' : item.quantity}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => {
                                          const raw = e.target.value.replace(/^0+(?=\d)/, '');
                                          handleUpdateQuoteItem(item.id, 'quantity', raw === '' ? 0 : Number(raw));
                                        }}
                                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs text-center font-semibold tracking-tight text-slate-900 focus:outline-none focus:border-red-600 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                    </td>

                                    {/* Rate (₹) */}
                                    <td className="py-2 px-3 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        placeholder="0"
                                        value={item.unit_rate === 0 ? '' : item.unit_rate}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => {
                                          const raw = e.target.value.replace(/^0+(?=\d)/, '');
                                          handleUpdateQuoteItem(item.id, 'unit_rate', raw === '' ? 0 : Number(raw));
                                        }}
                                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs text-center font-semibold tracking-tight text-slate-900 focus:outline-none focus:border-red-600 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                    </td>

                                    {/* GST % */}
                                    <td className="py-2 px-3 text-center">
                                      <select
                                        value={item.gst_percentage !== undefined ? item.gst_percentage : 18}
                                        onChange={(e) => handleUpdateQuoteItem(item.id, 'gst_percentage', Number(e.target.value))}
                                        className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-center text-slate-800 focus:outline-none focus:border-red-600 bg-white cursor-pointer"
                                      >
                                        <option value={0}>0%</option>
                                        <option value={5}>5%</option>
                                        <option value={12}>12%</option>
                                        <option value={18}>18%</option>
                                        <option value={28}>28%</option>
                                      </select>
                                    </td>

                                    {/* GST Amt (₹) */}
                                    <td className="py-2 px-3 text-right font-medium text-slate-600 tracking-tight">
                                      ₹ {gstAmt.toLocaleString('en-IN')}
                                    </td>

                                    {/* Net Total (₹) */}
                                    <td className="py-2 px-3 text-right font-bold text-slate-900 tracking-tight">
                                      ₹ {netTotal.toLocaleString('en-IN')}
                                    </td>

                                    {/* Delete */}
                                    <td className="py-2 px-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveQuoteItem(item.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                                        title="Remove item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Notes, Terms & Summary Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-3 border-t border-slate-200">
                    {/* Left: Notes & Terms & Attachments */}
                    <div className="w-full sm:w-1/2 space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Special Notes & Payment Terms</label>
                        <textarea
                          rows={2}
                          value={quoteNotes}
                          onChange={(e) => setQuoteNotes(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-red-600 resize-none bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700">Terms & Conditions</label>
                          <span className="text-[10px] text-slate-400">Configured in Document & Fields</span>
                        </div>
                        <textarea
                          rows={3}
                          value={quoteTerms}
                          onChange={(e) => setQuoteTerms(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-red-600 resize-none bg-white"
                        />
                      </div>

                      {/* Upload Scope Document / Reference File */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700">Attach Document / Drawing / Scope Proof</label>
                          <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                        </div>

                        <input 
                          type="file" 
                          ref={quoteFileInputRef}
                          onChange={handleQuoteFileChange}
                          className="hidden"
                          accept="image/*,.pdf,.dwg,.doc,.docx"
                        />

                        {quoteAttachmentName ? (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                                <Paperclip className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="truncate block font-semibold text-slate-800 text-xs">{quoteAttachmentName}</span>
                                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>Uploaded: <strong className="text-slate-700">{quoteAttachmentUploadedAt || getCurrentUploadTimestamp()}</strong></span>
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => quoteFileInputRef.current?.click()}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-white cursor-pointer transition-colors"
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuoteAttachmentName('');
                                  setQuoteAttachmentUrl(null);
                                  setQuoteAttachmentUploadedAt('');
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                                title="Remove attachment"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => quoteFileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 hover:border-red-500 rounded-xl p-3 flex items-center justify-center gap-2 bg-slate-50/50 hover:bg-red-50/20 cursor-pointer transition-all text-center"
                          >
                            <Upload className="w-4 h-4 text-red-600" />
                            <span className="text-xs font-semibold text-slate-700">Click to attach Client Scope or Drawing file</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Totals Card */}
                    <div className="w-full sm:w-80 bg-slate-50/90 p-4 rounded-2xl space-y-2.5 border border-slate-200 shadow-2xs">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Cost Calculation Summary
                      </h4>

                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Items Subtotal:</span>
                        <span className="tracking-tight font-semibold text-slate-900">₹ {quoteSubtotal.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Discount (₹):</span>
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={quoteDiscount === 0 ? '' : quoteDiscount}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/^0+(?=\d)/, '');
                            setQuoteDiscount(raw === '' ? 0 : Math.max(0, Number(raw)));
                          }}
                          className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-center tracking-tight text-xs font-semibold focus:outline-none focus:border-red-600 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Total GST (Sum of items):</span>
                        <span className="tracking-tight font-semibold text-slate-900">₹ {quoteGstAmount.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="border-t border-slate-200 pt-2.5 mt-2 flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-900">Estimated Total:</span>
                        <span className="tracking-tight text-base text-red-600 font-extrabold">
                          ₹ {quoteGrandTotal.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-[11px] text-slate-500 leading-snug">
                        <strong className="text-slate-700 block mb-0.5">In Words:</strong>
                        <span>{numberToIndianWords(quoteGrandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {quoteStep === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewQuoteModalOpen(false);
                      setQuoteErrors({});
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                  >
                    <span>Proceed to Add Items</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setQuoteStep(1)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Details</span>
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSaveQuotation('Draft')}
                      className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer transition-colors bg-white shadow-2xs"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveQuotation('Client Confirmed')}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Save Quotation (₹ {quoteGrandTotal.toLocaleString('en-IN')})</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* FOLLOW-UP REMINDERS MODAL (View & Manage Due Reminders) */}
      {/* ================================================================= */}
      {isRemindersModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600/30 text-red-400 flex items-center justify-center">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Follow-up Reminders</h3>
                  <p className="text-[11px] text-slate-400">
                    {dueLeads.length} client {dueLeads.length === 1 ? 'follow-up' : 'follow-ups'} pending action
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRemindersModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="text-xs text-slate-600 flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Client Inquiries Requiring Follow-up</span>
                <span className="text-[11px] font-semibold flex items-center gap-1">
                  {followUpStats.unviewedDue > 0 ? (
                    <span className="text-red-600 flex items-center gap-1 font-bold">
                      <BellRing className="w-3.5 h-3.5 animate-pulse" />
                      {followUpStats.unviewedDue} Unread {followUpStats.unviewedDue === 1 ? 'Notification' : 'Notifications'}
                    </span>
                  ) : (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      All Reminders Viewed
                    </span>
                  )}
                </span>
              </div>

              {dueLeads.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">All follow-ups completed!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No overdue or today's client reminders.</p>
                </div>
              ) : (
                dueLeads.map((lead, idx) => {
                  const info = getFollowUpStatus(lead.followup_date);
                  const isRead = isReminderViewed(lead.id, lead.followup_date);
                  return (
                    <div 
                      key={lead.id || idx}
                      className={`p-3.5 rounded-xl border transition-all space-y-2 bg-white shadow-2xs ${
                        !isRead ? 'border-red-300 ring-1 ring-red-100 bg-red-50/15' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 mt-1 shadow-xs animate-pulse" title="Unread reminder" />
                          )}
                          <div>
                            <div className="font-bold text-xs text-slate-900">{lead.contact_person || lead.client_name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{lead.project_title || lead.client_name}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${info.badgeClass}`}>
                          {info.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="tracking-tight text-[11px]">{lead.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isRead && (
                            <button
                              type="button"
                              onClick={() => {
                                markRemindersAsViewed([lead.id]);
                                onShowToast?.(`Marked reminder for ${lead.client_name} as read`);
                              }}
                              className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1"
                              title="Mark this reminder as read"
                            >
                              <CheckCircle2 className="w-3 h-3 text-slate-500" />
                              <span>Mark Read</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              markRemindersAsViewed([lead.id]);
                              setIsRemindersModalOpen(false);
                              handleEditLead(lead);
                            }}
                            className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-md font-semibold transition-colors cursor-pointer"
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              markRemindersAsViewed([lead.id]);
                              setIsRemindersModalOpen(false);
                              handleConvertLeadToQuote(lead);
                            }}
                            className="px-2.5 py-1 text-[11px] bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            Create Quote
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                {followUpStats.unviewedDue > 0 ? (
                  <span>Opening each lead will decrement the Quotation bell badge.</span>
                ) : (
                  <span className="text-emerald-600 font-medium">All notifications cleared from Quotation bell.</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {followUpStats.unviewedDue > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      markRemindersAsViewed();
                      onShowToast?.('All follow-up reminders marked as read');
                    }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Mark All Read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsRemindersModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DOWNLOAD FORMAT SELECTION MODAL (WORD / PDF) */}
      {/* ================================================================= */}
      {downloadQuoteTarget && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600/30 flex items-center justify-center text-red-400">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Download Quotation</h3>
                  <p className="text-[11px] text-slate-400 tracking-tight">{downloadQuoteTarget.quotation_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDownloadQuoteTarget(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-600">
                Choose your preferred file format for <span className="font-bold text-slate-900">{downloadQuoteTarget.client_name}</span> proposal.
              </div>

              {/* Option 1: PDF */}
              <div 
                onClick={() => {
                  exportQuotationToPDF(downloadQuoteTarget);
                  onShowToast?.(`Downloaded PDF for ${downloadQuoteTarget.quotation_number}`);
                  setDownloadQuoteTarget(null);
                }}
                className="p-4 border-2 border-slate-200 hover:border-red-500 hover:bg-red-50/30 rounded-xl cursor-pointer transition-all flex items-start gap-3.5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-red-700">Official PDF (.pdf)</span>
                    <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Recommended</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-normal">
                    2-Page official print-ready proposal with Booshnam ISO/NABL header, itemized work scope table, and notes.
                  </p>
                </div>
              </div>

              {/* Option 2: Word */}
              <div 
                onClick={() => {
                  exportQuotationToWord(downloadQuoteTarget);
                  onShowToast?.(`Downloaded Word doc for ${downloadQuoteTarget.quotation_number}`);
                  setDownloadQuoteTarget(null);
                }}
                className="p-4 border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl cursor-pointer transition-all flex items-start gap-3.5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-blue-700">Microsoft Word (.doc)</span>
                    <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Editable</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-normal">
                    Editable Microsoft Word document formatted with standard tables, notes, and letterhead.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setDownloadQuoteTarget(null)}
                className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* OFFICIAL BOOSHNAM 2-PAGE PROPOSAL PREVIEW MODAL */}
      {/* ================================================================= */}
      {/* ================================================================= */}
      {/* OFFICIAL BOOSHNAM PROPOSAL PREVIEW MODAL (Smart 1-Page / 2-Page) */}
      {/* ================================================================= */}
      {previewQuotation && (() => {
        const isPreviewSinglePage = (previewQuotation.items?.length || 0) <= 4;

        // Reusable Official 4-Column Footer (Exact match to User's Reference Image)
        const renderOfficialFooter = () => (
          <div className="mt-8 pt-2.5 border-t-2 border-red-600 text-[9px] leading-tight text-slate-700 shrink-0">
            <div className="flex items-center justify-between pb-1">
              <div>
                <div className="font-bold text-red-600 text-[11px] tracking-wide font-serif">BOOSHNAM ASSOCIATES PVT. LTD.</div>
                <div className="italic font-semibold text-red-700 text-[9px]">ISO & NABL Accredited Laboratory</div>
              </div>
            </div>

            {/* 4-column address grid matching uploaded image with icons */}
            <div className="border-t border-slate-200 pt-2 pb-2 grid grid-cols-1 sm:grid-cols-4 gap-3 text-[8.8px] text-slate-700 items-start">
              {/* Col 1: Chennai Address */}
              <div className="flex items-start gap-1">
                <MapPin className="w-3 h-3 text-slate-800 shrink-0 mt-0.5" />
                <div>
                  Plot no: 8, Door no: 2, LIC Colony, 6th Street, (Near by Shankar Nagar, Pammal), Anakaputhur, <strong className="text-slate-900 font-bold">Chennai</strong> - 600 075
                </div>
              </div>

              {/* Col 2: Coimbatore Address */}
              <div className="pl-0 sm:pl-1">
                Old No. 80, New No. 36, Maniam Kaliappa Street, KK Pudur, <strong className="text-slate-900 font-bold">Coimbatore</strong> - 641038
              </div>

              {/* Col 3: Phone */}
              <div className="flex items-start gap-1">
                <Phone className="w-3 h-3 text-slate-800 shrink-0 mt-0.5" />
                <div className="font-medium">
                  <div>+91 96296 31255 | 96001 84996,</div>
                  <div>95002 77170</div>
                </div>
              </div>

              {/* Col 4: Email & Web */}
              <div className="flex flex-col gap-0.5 sm:text-right">
                <div className="flex items-center gap-1 sm:justify-end">
                  <Mail className="w-3 h-3 text-slate-800 shrink-0" />
                  <span className="text-slate-900 font-medium">booshnamassociates@gmail.com</span>
                </div>
                <div className="flex items-center gap-1 sm:justify-end">
                  <Globe className="w-3 h-3 text-slate-800 shrink-0" />
                  <span className="text-slate-900 font-medium">www.booshnamassociates.com</span>
                </div>
              </div>
            </div>

            {/* Registration Details */}
            <div className="border-t border-slate-200 pt-1 text-center font-bold text-[8.2px] text-slate-600">
              GSTIN: 33AAKCB8628A1ZW | IT PAN: AAKCB8628A | CIN: U45309TN2022PTC153348
            </div>
          </div>
        );

        // Notes and Signatory Block
        const renderNotesAndSignature = (isCompact: boolean) => (
          <div className={isCompact ? "mt-8 md:mt-10" : "mt-10"}>
            <div className="text-[11px] font-bold text-black uppercase tracking-wider">
              NOTES
            </div>
            <ol className={`mt-2.5 space-y-1.5 ${isCompact ? 'text-[9.5px]' : 'text-xs'} text-slate-900 leading-relaxed list-decimal list-inside`}>
              <li>GST 18% Will be added.</li>
              <li>50% payment shall be made while issuing the work order, 50% shall be made while submitting the report.</li>
              <li>Site shall be cleared of any obstructions, obligations, etc.</li>
              <li>Water shall be provided for drilling purposes.</li>
              <li>If there is significant variation in soil characteristics among the boreholes, it may be necessary to conduct additional drilling to evaluate the nature of the soil at varying depths and across different locations.</li>
              <li>Soil Sample will be disposed of within 2 days from the date of issue of the test report.</li>
            </ol>

            <div className={`${isCompact ? 'mt-10 md:mt-12' : 'mt-20 md:mt-24'} text-center italic font-bold text-xs text-slate-900`}>
              Expecting your valuable order
            </div>

            <div className={`${isCompact ? 'mt-8 md:mt-10' : 'mt-16 md:mt-20'} text-right space-y-0.5`}>
              <div className="font-bold text-xs text-black">Er. A. Nivedhitha M.tech.,(Ph.D)</div>
              <div className="font-bold text-xs text-black">Geotechnical Engineer.</div>
            </div>
          </div>
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-2xs flex items-center justify-center p-2 md:p-6 overflow-y-auto">
            <div className="bg-slate-200/90 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden my-auto flex flex-col max-h-[92vh]">
              {/* Action Bar Header */}
              <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-red-500" />
                  <div>
                    <span className="font-bold text-sm">Official Quotation Preview</span>
                    <span className="text-slate-400 text-xs ml-2 tracking-tight">({previewQuotation.quotation_number})</span>
                    <span className="ml-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white shadow-2xs">
                      {isPreviewSinglePage ? '1 Page (Single Page Fit)' : '2 Pages (Multi-item Proposal)'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Convert to Project Button */}
                  <button
                    type="button"
                    onClick={() => handleConvertQuotationToProject(previewQuotation)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors active:scale-95"
                    title={`Launch Project with this proposal value (₹ ${previewQuotation.total_amount.toLocaleString('en-IN')})`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Convert to Project</span>
                  </button>
                  {/* Download Button (opens download modal for PDF/Word) */}
                  <button
                    type="button"
                    onClick={() => setDownloadQuoteTarget(previewQuotation)}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download (PDF / Word)</span>
                  </button>
                  {/* Print Button */}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setPreviewQuotation(null)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Container with A4 Page(s) */}
              <div className="overflow-y-auto p-4 md:p-8 flex flex-col items-center gap-8 bg-slate-200">
                {/* PAGE 1 */}
                <div className="bg-white w-full max-w-[800px] shadow-2xl border border-slate-300 rounded-xs p-8 md:p-10 text-slate-900 font-sans flex flex-col justify-between min-h-[1100px]">
                  <div>
                    {/* Top Bar: Logo Left, Legal Meta Right */}
                    <div className="flex items-start justify-between border-b-0 pb-2">
                      <div>
                        <div className="text-2xl md:text-3xl font-black text-red-600 tracking-tight font-serif">
                          BOOSHNAM
                        </div>
                        <div className="text-[10px] tracking-widest text-slate-500 uppercase font-semibold mt-0.5">
                          — ASSOCIATES —
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-bold text-slate-900 leading-snug">
                        <div>GSTIN: 33AAKCB8628A1ZW</div>
                        <div>QUOTATION No: {previewQuotation.quotation_number}</div>
                        <div>IT PAN No: AACB8628A</div>
                        <div>SACCODE: 998331</div>
                        <div className="mt-4 font-bold text-xs">{previewQuotation.date || '25th Sep 2026'}</div>
                      </div>
                    </div>

                    {/* To Address */}
                    <div className="mt-3 text-xs text-slate-900">
                      <div className="font-bold">To,</div>
                      <div className="font-bold">{previewQuotation.client_name || 'Mr. Prakash'}</div>
                      <div>{previewQuotation.client_address || 'Chennai.'}</div>
                    </div>

                    {/* Subject Line */}
                    <div className="mt-4 text-xs font-bold text-slate-900">
                      SUB: Quotation for {previewQuotation.project_title || 'Soil Investigations to be carried out for proposed structure at Arasankalai.'}
                    </div>

                    {/* Quotation Table matching Screenshot */}
                    <div className="mt-3.5 border-2 border-black">
                      <div className="bg-white text-center font-bold text-xs py-1 border-b border-black uppercase tracking-wider">
                        QUOTATION
                      </div>
                      <table className="w-full text-[11px] border-collapse text-black">
                        <thead>
                          <tr className="bg-white font-bold text-center border-b border-black">
                            <th className="border-r border-black p-1.5 w-14">Item Code</th>
                            <th className="border-r border-black p-1.5 text-left">Description of Work</th>
                            <th className="border-r border-black p-1.5 w-12">Unit</th>
                            <th className="border-r border-black p-1.5 w-14">Quantity</th>
                            <th className="border-r border-black p-1.5 w-20 text-right pr-2">Rate</th>
                            <th className="p-1.5 w-24 text-right pr-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                          {(previewQuotation.items && previewQuotation.items.length > 0 ? previewQuotation.items : []).map((it, idx) => {
                            const code = it.item_code || `${idx + 1}.0`;
                            const qtyStr = it.quantity && it.quantity > 0 ? it.quantity.toFixed(1) : '-';
                            const rateStr = it.unit_rate && it.unit_rate > 0 ? it.unit_rate.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-';
                            const isInclusive = it.amount === 0 && (code === '3.0' || code === '4.0' || it.description.toLowerCase().includes('report'));
                            const amountStr = it.amount && it.amount > 0 
                              ? it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) 
                              : isInclusive ? 'Inclusive' : '-';

                            return (
                              <tr key={it.id || idx} className="align-top">
                                <td className="border-r border-black p-1.5 text-center font-bold">{code}</td>
                                <td className="border-r border-black p-1.5 leading-snug">{it.description}</td>
                                <td className="border-r border-black p-1.5 text-center">{it.unit || ''}</td>
                                <td className="border-r border-black p-1.5 text-center">{qtyStr}</td>
                                <td className="border-r border-black p-1.5 text-right tracking-tight pr-2">{rateStr}</td>
                                <td className="p-1.5 text-right tracking-tight font-medium pr-2">{amountStr}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-black font-bold">
                            <td colSpan={5} className="border-r border-black p-1.5 text-right pr-3">Total</td>
                            <td className="p-1.5 text-right tracking-tight pr-2">
                              {previewQuotation.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Overall Total in Words */}
                    <div className="mt-2.5 text-center font-bold text-xs text-black">
                      Overall Total: {numberToIndianWords(previewQuotation.total_amount)} (Rs. {previewQuotation.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})/-
                    </div>

                    {/* IF SINGLE PAGE: Render Notes, Expecting Order & Signatory directly on Page 1! */}
                    {isPreviewSinglePage && renderNotesAndSignature(true)}
                  </div>

                  {/* Page 1 Footer */}
                  {renderOfficialFooter()}
                </div>

                {/* PAGE 2: Only rendered if items overflow and cannot fit on Page 1 */}
                {!isPreviewSinglePage && (
                  <div className="bg-white w-full max-w-[800px] shadow-2xl border border-slate-300 rounded-xs p-8 md:p-12 text-slate-900 font-sans flex flex-col justify-between min-h-[1100px]">
                    <div>
                      {/* Top Bar: Logo Left */}
                      <div className="flex items-start justify-between pb-2">
                        <div>
                          <div className="text-2xl md:text-3xl font-black text-red-600 tracking-tight font-serif">
                            BOOSHNAM
                          </div>
                          <div className="text-[10px] tracking-widest text-slate-500 uppercase font-semibold mt-0.5">
                            — ASSOCIATES —
                          </div>
                        </div>
                      </div>

                      {renderNotesAndSignature(false)}
                    </div>

                    {/* Page 2 Footer */}
                    {renderOfficialFooter()}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── PORTAL DROPDOWNS: Rendered at body level so table overflow/clipping NEVER cuts off menus ── */}
      {rowMenuAnchor && typeof document !== 'undefined' && (() => {
        const activeLead = leads.find((l) => l.id === rowMenuAnchor.id);
        if (!activeLead) return null;

        const rect = rowMenuAnchor.rect;
        const menuHeight = 220;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

        const top = openUp ? undefined : rect.bottom + 4;
        const bottom = openUp ? Math.max(8, window.innerHeight - rect.top + 4) : undefined;
        const right = Math.max(12, Math.min(window.innerWidth - rect.right, window.innerWidth - 210));

        return createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: top !== undefined ? `${top}px` : undefined,
              bottom: bottom !== undefined ? `${bottom}px` : undefined,
              right: `${right}px`,
              zIndex: 9999,
            }}
            className="w-48 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 text-left text-xs animate-in fade-in zoom-in-95 select-none"
          >
            {!isReminderViewed(activeLead.id, activeLead.followup_date) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  markRemindersAsViewed([activeLead.id]);
                  closeAllRowMenus();
                  onShowToast?.(`Reminder for ${activeLead.client_name} marked as read`);
                }}
                className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Mark as Read</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                closeAllRowMenus();
                handleConvertLeadToQuote(activeLead);
              }}
              className="w-full px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer font-medium"
            >
              <Calculator className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>Create Quotation</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeAllRowMenus();
                handleConvertLeadToProject(activeLead);
              }}
              className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 cursor-pointer font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Convert to Project</span>
            </button>
            {isAdminOrSuperAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    closeAllRowMenus();
                    handleEditLead(activeLead);
                  }}
                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Edit Lead</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    closeAllRowMenus();
                    handleDeleteLead(activeLead.id, activeLead.client_name);
                  }}
                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Delete Lead</span>
                </button>
              </>
            )}
          </div>,
          document.body
        );
      })()}

      {/* Quotations Table Row Menu Portal */}
      {quoteRowMenuAnchor && typeof document !== 'undefined' && (() => {
        const quote = quotations.find((q) => q.id === quoteRowMenuAnchor.id);
        if (!quote) return null;

        const rect = quoteRowMenuAnchor.rect;
        const menuHeight = 220;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

        const top = openUp ? undefined : rect.bottom + 4;
        const bottom = openUp ? Math.max(8, window.innerHeight - rect.top + 4) : undefined;
        const right = Math.max(12, Math.min(window.innerWidth - rect.right, window.innerWidth - 210));

        return createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: top !== undefined ? `${top}px` : undefined,
              bottom: bottom !== undefined ? `${bottom}px` : undefined,
              right: `${right}px`,
              zIndex: 9999,
            }}
            className="w-48 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 text-left text-xs animate-in fade-in zoom-in-95 select-none"
          >
            <button
              type="button"
              onClick={() => {
                closeAllRowMenus();
                handleConvertQuotationToProject(quote);
              }}
              className="w-full px-3 py-2 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 cursor-pointer font-bold"
            >
              <Briefcase className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Convert to Project</span>
            </button>
            {isAdminOrSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  closeAllRowMenus();
                  handleEditQuotation(quote);
                }}
                className="w-full px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer font-medium"
              >
                <Edit2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>Edit Quotation</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                closeAllRowMenus();
                setPreviewQuotation(quote);
              }}
              className="w-full px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer font-medium"
            >
              <Eye className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>Preview Proposal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeAllRowMenus();
                setDownloadQuoteTarget(quote);
              }}
              className="w-full px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer font-medium"
            >
              <Download className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>Download (PDF / Word)</span>
            </button>
            {isAdminOrSuperAdmin && (
              <>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    closeAllRowMenus();
                    handleDeleteQuotation(quote.id, quote.quotation_number);
                  }}
                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Delete Quotation</span>
                </button>
              </>
            )}
          </div>,
          document.body
        );
      })()}

      {/* Quotations Table Status Menu Portal */}
      {quoteStatusMenuAnchor && typeof document !== 'undefined' && (() => {
        const quote = quotations.find((q) => q.id === quoteStatusMenuAnchor.id);
        if (!quote) return null;

        const rect = quoteStatusMenuAnchor.rect;
        const menuHeight = 260;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

        const top = openUp ? undefined : rect.bottom + 4;
        const bottom = openUp ? Math.max(8, window.innerHeight - rect.top + 4) : undefined;
        const left = Math.max(12, Math.min(rect.left, window.innerWidth - 190));

        return createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: top !== undefined ? `${top}px` : undefined,
              bottom: bottom !== undefined ? `${bottom}px` : undefined,
              left: `${left}px`,
              zIndex: 9999,
            }}
            className="w-44 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 text-left text-xs animate-in fade-in zoom-in-95 select-none"
          >
            {['Draft', 'Sent', 'In Discussion', 'On Hold', 'Client Confirmed', 'Rejected'].map((statusOption) => (
              <button
                key={statusOption}
                type="button"
                onClick={() => {
                  handleUpdateQuotationStatus(quote.id, statusOption);
                  closeAllRowMenus();
                }}
                className={`w-full px-3.5 py-2 text-left hover:bg-red-50/50 transition-colors flex items-center justify-between cursor-pointer ${
                  quote.status === statusOption || (statusOption === 'Client Confirmed' && quote.status === 'APPROVED')
                    ? 'font-bold text-red-600 bg-red-50/70'
                    : 'text-slate-700'
                }`}
              >
                <span>{statusOption}</span>
                {(quote.status === statusOption || (statusOption === 'Client Confirmed' && quote.status === 'APPROVED')) && (
                  <Check className="w-3.5 h-3.5 text-red-600 shrink-0" />
                )}
              </button>
            ))}
          </div>,
          document.body
        );
      })()}
    </div>
  );
};

export default QuotationView;
