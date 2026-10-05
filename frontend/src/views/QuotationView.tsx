import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calculator, Plus, Search, Filter, Download, Printer, Eye, 
  Trash2, CheckCircle2, Clock, AlertCircle, X, ChevronRight, 
  ArrowRight, Briefcase, Building2, Phone, Mail, FileText, 
  Sparkles, ShieldCheck, MapPin, Calendar, Check,
  ChevronDown, RotateCcw, Award, Layers, MoreVertical, Edit2,
  Gift, HelpCircle, Info, Bell, BellRing, Globe
} from 'lucide-react';
import { Project, Department, Lead, Quotation, QuotationItem } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { CustomSelect } from '../components/CustomSelect';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { confirmAction } from '../lib/dialogService';
import { getFollowUpStatus, getViewedRemindersMap, markRemindersAsViewed, isReminderViewed } from '../lib/leadsNotificationService';
import { exportQuotationToPDF, exportQuotationToWord, numberToIndianWords } from '../lib/quotationExportService';
import { getTermsConditions } from '../lib/termsService';
import { getUserAccounts, UserAccount } from '../lib/authService';

interface QuotationViewProps {
  projects?: Project[];
  onConvertSuccess?: (projectName: string) => void;
  onShowToast?: (msg: string) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  activeRole?: string;
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
}) => {
  // Top-level Sub-page Navigation: 'leads' (First Page) | 'quotations' (Second Page)
  const [activeTab, setActiveTab] = useState<'leads' | 'quotations'>('leads');

  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  useEffect(() => {
    import('../lib/authService').then(({ getUserAccounts, getCurrentUserAccount }) => {
      setAllUsers(getUserAccounts());
      setCurrentUser(getCurrentUserAccount());
    });
  }, []);

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
  const [drawerAssignedToUserId, setDrawerAssignedToUserId] = useState('');
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

  // Row Action Dropdown state
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);

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

  // Quotation Status Dropdown Popup (Image 3)
  const [activeQuoteStatusDropdownId, setActiveQuoteStatusDropdownId] = useState<string | null>(null);
  const [activeQuoteRowMenuId, setActiveQuoteRowMenuId] = useState<string | null>(null);

  // Preview & Download Modal States
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [downloadQuoteTarget, setDownloadQuoteTarget] = useState<Quotation | null>(null);

  // New Quotation Form Fields
  const [quoteClientName, setQuoteClientName] = useState('');
  const [quoteClientPhone, setQuoteClientPhone] = useState('');
  const [quoteClientEmail, setQuoteClientEmail] = useState('');
  const [quoteClientAddress, setQuoteClientAddress] = useState('');
  const [quoteProjectTitle, setQuoteProjectTitle] = useState('Soil Investigation');
  const [quoteDepartment, setQuoteDepartment] = useState<string>('CBE_SOIL_INVESTIGATION');
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quoteValidUntil, setQuoteValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteNotes, setQuoteNotes] = useState('Payment: 50% advance along with work order, balance upon draft report submission.');
  const [quoteTerms, setQuoteTerms] = useState<string>(() => getTermsConditions().quotationTerms);

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
    setQuoteClientName('');
    setQuoteClientPhone('');
    setQuoteClientEmail('');
    setQuoteClientAddress('');
    setQuoteProjectTitle('Soil Investigation');
    setQuoteDiscount(0);
    setQuoteItems([
      {
        id: `item-${Date.now()}`,
        description: 'Soil Testing Investigation & Report',
        unit: 'Package',
        quantity: 1,
        unit_rate: 15000,
        amount: 15000,
        category: 'Soil Testing'
      }
    ]);
    setIsNewQuoteModalOpen(true);
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

  // Close floating menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-trigger-container')) {
        setActiveQuoteStatusDropdownId(null);
        setActiveRowMenuId(null);
        setActiveQuoteRowMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
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
      if (leadFollowUpFilter !== 'ALL') {
        const info = getFollowUpStatus(l.followup_date);
        if (leadFollowUpFilter === 'DUE' && info.status !== 'OVERDUE' && info.status !== 'TODAY') return false;
        if (leadFollowUpFilter === 'TODAY' && info.status !== 'TODAY') return false;
        if (leadFollowUpFilter === 'OVERDUE' && info.status !== 'OVERDUE') return false;
        if (leadFollowUpFilter === 'UPCOMING' && info.status !== 'UPCOMING') return false;
        if (leadFollowUpFilter === 'NO_DATE' && l.followup_date) return false;
      }
      if (activeRole && !['SUPER_ADMIN', 'ADMIN', 'MARKETING'].includes(activeRole)) {
        if (l.assigned_to_id !== currentUser?.id && l.assigned_role !== activeRole && l.assigned_department !== activeRole) return false;
      }
      
      return true;
    });
  }, [leads, leadSearch, leadPriorityFilter, leadStatusFilter, leadSourceFilter, leadCategoryFilter, leadFollowUpFilter, activeRole, currentUser]);

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
    const discounted = Math.max(0, quoteSubtotal - (Number(quoteDiscount) || 0));
    return Math.round(discounted * 0.18);
  }, [quoteSubtotal, quoteDiscount]);

  const quoteGrandTotal = useMemo(() => {
    const discounted = Math.max(0, quoteSubtotal - (Number(quoteDiscount) || 0));
    return discounted + quoteGstAmount;
  }, [quoteSubtotal, quoteDiscount, quoteGstAmount]);

  // =========================================================================
  // DRAWER HANDLERS: CREATE / EDIT LEAD
  // =========================================================================
  const handleOpenNewLeadDrawer = () => {
    setEditingLeadId(null);
    setDrawerAssignee('');
    setDrawerAssignedToUserId('');
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
    markRemindersAsViewed([lead.id]);
    setEditingLeadId(lead.id);
    setDrawerAssignee(lead.assigned_to_name || '');
    setDrawerAssignedToUserId(lead.assigned_to_id || '');
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
    setActiveRowMenuId(null);
  };

  const handleSaveLeadFromDrawer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!drawerContactName.trim()) {
      onShowToast?.('Please enter Contact Name');
      return;
    }
    if (!drawerPhone.trim()) {
      onShowToast?.('Please enter Contact Number');
      return;
    }

    const todayStr = '25 September 2026';
    const cleanPhone = drawerPhone.trim();
    const resolvedValue = Number(drawerBudget) || Number(drawerValue) || 15000;

    if (editingLeadId) {
      // Update existing lead
      setLeads(prev => prev.map(l => {
        if (l.id !== editingLeadId) return l;
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
          assigned_to_id: drawerAssignedToUserId,
          assigned_to_name: allUsers.find(u => u.id === drawerAssignedToUserId)?.staff_name || drawerAssignee,
          assigned_role: allUsers.find(u => u.id === drawerAssignedToUserId)?.role_code || l.assigned_role,
          assigned_department: allUsers.find(u => u.id === drawerAssignedToUserId)?.department || l.assigned_department,
          last_updated: todayStr
        };
      }));
      onShowToast?.(`Lead updated successfully!`);
    } else {
      // Create new lead
      const nextNum = `LD-${String(leads.length + 101).padStart(3, '0')}`;
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
        assigned_to_id: drawerAssignedToUserId,
        assigned_to_name: allUsers.find(u => u.id === drawerAssignedToUserId)?.staff_name || '',
        assigned_role: allUsers.find(u => u.id === drawerAssignedToUserId)?.role_code || '',
        assigned_department: allUsers.find(u => u.id === drawerAssignedToUserId)?.department || ''
      };
      setLeads(prev => [newLead, ...prev]);
      onShowToast?.(`New Lead registered successfully!`);
    }

    setIsLeadDrawerOpen(false);
  };

  const handleDeleteLead = async (id: string, name: string) => {
    setActiveRowMenuId(null);
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
    setActiveRowMenuId(null);
    setQuoteClientName(lead.client_name);
    setQuoteClientPhone(lead.phone || '');
    setQuoteClientEmail(lead.email || '');
    setQuoteClientAddress(lead.address || '');
    setQuoteProjectTitle(lead.project_title || lead.lead_type || 'Soil Investigation');
    setQuoteItems([
      {
        id: '1',
        item_code: 'ITM-01',
        description: `${lead.project_title || 'Soil Testing Investigation & Report'}`,
        unit: 'Package',
        quantity: 1,
        unit_rate: lead.estimated_value || 15000,
        amount: lead.estimated_value || 15000,
        category: lead.category || 'Soil Testing'
      }
    ]);
    setActiveTab('quotations');
    setIsNewQuoteModalOpen(true);
    onShowToast?.(`Initiated quotation for ${lead.client_name}!`);
  };

  // Convert Lead to Project
  const handleConvertLeadToProject = (lead: Lead) => {
    markRemindersAsViewed([lead.id]);
    setActiveRowMenuId(null);
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: 'WON', status_label: 'Client Confirmed', probability: 100 } : l));
    onConvertSuccess?.(lead.project_title || `${lead.client_name} Project`);
    onShowToast?.(`Lead marked as Confirmed & Project Launched!`);
  };

  // =========================================================================
  // QUOTATION HANDLERS
  // =========================================================================
  const handleAddQuoteItem = () => {
    setQuoteItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: '',
        unit: 'Nos',
        quantity: 1,
        unit_rate: 0,
        amount: 0,
        category: 'Soil Testing'
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
      if (field === 'quantity' || field === 'unit_rate') {
        const qty = field === 'quantity' ? Number(val) : Number(item.quantity);
        const rate = field === 'unit_rate' ? Number(val) : Number(item.unit_rate);
        updated.amount = (qty || 0) * (rate || 0);
      }
      return updated;
    }));
  };

  const handleSaveQuotation = (status: Quotation['status'] = 'Draft') => {
    if (!quoteClientName.trim()) {
      onShowToast?.('Please enter Client Name');
      return;
    }

    const nextCode = `QBAG/${String(quotations.length + 3078)}/2026-27`;
    const newQuote: Quotation = {
      id: `quo-${Date.now()}`,
      quotation_number: nextCode,
      date: '25th Sep 2026',
      valid_until: quoteValidUntil,
      client_name: quoteClientName.trim(),
      client_phone: quoteClientPhone.trim() || undefined,
      client_email: quoteClientEmail.trim() || undefined,
      client_address: quoteClientAddress.trim() || 'Chennai.',
      project_title: quoteProjectTitle.trim() || 'Soil Investigations to be carried out for proposed structure at Arasankalai.',
      department: quoteDepartment,
      status: status,
      subtotal: quoteSubtotal,
      tax_percentage: 18,
      tax_amount: quoteGstAmount,
      discount_amount: Number(quoteDiscount) || 0,
      total_amount: quoteGrandTotal,
      notes: quoteNotes,
      terms_conditions: quoteTerms,
      items: quoteItems
    };

    setQuotations(prev => [newQuote, ...prev]);
    setIsNewQuoteModalOpen(false);
    setActiveTab('quotations'); // Auto-switch to quotations page!
    onShowToast?.(`Quotation ${nextCode} generated successfully!`);

    // Reset Form
    setQuoteClientName('');
    setQuoteClientPhone('');
    setQuoteClientEmail('');
    setQuoteClientAddress('');
    setQuoteProjectTitle('Soil Investigation');
    setQuoteDiscount(0);
    setQuoteItems([
      { id: '1', description: 'Soil Investigation Bore Hole Drilling & Sample Collection', unit: 'Bore', quantity: 1, unit_rate: 15000, amount: 15000, category: 'Soil Testing' }
    ]);
  };

  const handleUpdateQuotationStatus = (id: string, newStatus: string) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
    setActiveQuoteStatusDropdownId(null);
    onShowToast?.(`Status updated to ${newStatus}`);
  };

  const handleDeleteQuotation = async (id: string, num: string) => {
    setActiveQuoteRowMenuId(null);
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

  // Helper Badge Color for Leads
  const getLeadStatusBadge = (status?: string) => {
    switch (status) {
      case 'Proposal Stage':
        return 'bg-amber-50 text-amber-700 border border-amber-200/80 font-semibold';
      case 'No Response':
        return 'bg-slate-100 text-slate-600 border border-slate-200/80 font-semibold';
      case 'Client Confirmed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold';
      case 'Follow Up':
        return 'bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold';
      case 'Lost':
        return 'bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold';
      case 'New Lead':
      default:
        return 'bg-red-50 text-red-600 border border-red-200/80 font-semibold';
    }
  };

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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#ffffff] h-full max-h-screen overflow-hidden font-sans">
      {/* ── FIXED TOP HEADER BAR (Stays pinned in position, never moves or overlaps) ── */}
      <header className="px-6 pt-3.5 pb-0 bg-white border-b border-slate-200 shrink-0 z-30 shadow-2xs">
        <div className="flex items-center justify-between">
          {/* Left Title: Leads & Quotation */}
          <div>
            <h1 className="text-[21px] font-bold text-[#262626] font-heading tracking-tight">
              Leads & Quotation
            </h1>
          </div>

          {/* Right Header: Profile & Notifications */}
          <div className="flex items-center gap-3">
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
                {(leadSearch || leadPriorityFilter !== 'ALL' || leadStatusFilter !== 'ALL' || leadSourceFilter !== 'ALL' || leadCategoryFilter !== 'ALL' || leadFollowUpFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setLeadSearch('');
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
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8fafc] text-slate-600 border-b border-slate-200/80">
                      <th className="py-3 px-4 font-semibold text-slate-700 w-16 text-center">S.No.</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Lead Type</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Contact Name</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Last Updated</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Contact Number</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">Follow Up</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Source</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 text-center w-12">
                        <button 
                          type="button" 
                          onClick={handleOpenNewLeadDrawer}
                          title="Quick Add Lead"
                          className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-slate-400 cursor-pointer transition-colors"
                        >
                          <Plus className="w-4 h-4 inline" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map((lead, idx) => (
                      <tr 
                        key={lead.id}
                        onClick={() => handleEditLead(lead)}
                        className="hover:bg-slate-50/80 transition-colors group text-slate-800 cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-medium text-slate-500">
                          {idx + 1}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {lead.lead_type || 'Referal - soil testing'}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {lead.client_name}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {lead.last_updated || '25 September 2026'}
                        </td>

                        <td className="py-3.5 px-4 tracking-tight text-slate-700 whitespace-nowrap">
                          <a 
                            href={`tel:${lead.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-red-600 hover:underline"
                            title="Call contact"
                          >
                            {lead.phone}
                          </a>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-block px-3 py-1 rounded-md text-[11px] font-semibold tracking-wide ${getLeadStatusBadge(lead.status_label || lead.stage)}`}>
                            {lead.status_label || lead.stage}
                          </span>
                        </td>

                        {/* Follow Up Column with Status Badges and Reminders */}
                        <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            const info = getFollowUpStatus(lead.followup_date);
                            const isViewed = isReminderViewed(lead.id, lead.followup_date);
                            if (!lead.followup_date || info.status === 'NONE') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleEditLead(lead)}
                                  className="text-[11px] text-slate-400 hover:text-red-600 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Click to set follow up date"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Set Date</span>
                                </button>
                              );
                            }
                            if (info.status === 'OVERDUE') {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleEditLead(lead)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer shadow-2xs group"
                                    title="Overdue! Click to view or reschedule follow-up"
                                  >
                                    <BellRing className={`w-3.5 h-3.5 text-red-600 shrink-0 ${!isViewed ? 'animate-pulse' : ''}`} />
                                    <span>{info.label}</span>
                                  </button>
                                  {!isViewed && (
                                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 shadow-xs" title="Unread reminder" />
                                  )}
                                </div>
                              );
                            }
                            if (info.status === 'TODAY') {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleEditLead(lead)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs group"
                                    title="Due today! Click to view or reschedule follow-up"
                                  >
                                    <Bell className={`w-3.5 h-3.5 text-amber-600 shrink-0 fill-amber-500/20 ${!isViewed ? 'animate-bounce' : ''}`} />
                                    <span>{info.label}</span>
                                  </button>
                                  {!isViewed && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-xs" title="Unread reminder" />
                                  )}
                                </div>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => handleEditLead(lead)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Click to view or reschedule follow-up"
                              >
                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{info.label}</span>
                              </button>
                            );
                          })()}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {lead.source || 'Just dial'}
                        </td>
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block dropdown-trigger-container">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRowMenuId(activeRowMenuId === lead.id ? null : lead.id);
                              }}
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
  
                            {/* Options Dropdown */}
                            {activeRowMenuId === lead.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-left text-xs animate-in fade-in zoom-in-95">
                                {!isReminderViewed(lead.id, lead.followup_date) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markRemindersAsViewed([lead.id]);
                                      setActiveRowMenuId(null);
                                      onShowToast?.(`Reminder for ${lead.client_name} marked as read`);
                                    }}
                                    className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Mark as Read</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleConvertLeadToQuote(lead)}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Calculator className="w-3.5 h-3.5 text-red-600" />
                                  <span>Create Quotation</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConvertLeadToProject(lead)}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Convert to Project</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditLead(lead)}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Edit Lead</span>
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLead(lead.id, lead.client_name)}
                                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Lead</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
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
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8fafc] text-slate-600 border-b border-slate-200/80">
                      <th className="py-3 px-4 font-semibold text-slate-700 w-28 text-center">S.No.</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 w-32">Date</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Subject</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Client</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Est. Amount</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 w-44">Status</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQuotations.map((quote) => (
                      <tr
                        key={quote.id}
                        className="hover:bg-slate-50/70 transition-colors group text-slate-800"
                      >
                        {/* Quotation Code */}
                        <td className="py-3.5 px-4 font-semibold text-slate-800 tracking-tight">
                          {quote.quotation_number}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {quote.date}
                        </td>

                        {/* Subject */}
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {quote.project_title || 'Soil Investigation'}
                        </td>

                        {/* Client */}
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {quote.client_name}
                        </td>

                        {/* Est. Amount */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900 tracking-tight whitespace-nowrap">
                          ₹ {quote.total_amount.toLocaleString('en-IN')}
                        </td>

                        {/* Status Dropdown Pill with Menu (matching Image 3) */}
                        <td className="py-3.5 px-4 relative dropdown-trigger-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveQuoteStatusDropdownId(activeQuoteStatusDropdownId === quote.id ? null : quote.id);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-all ${getQuoteStatusBadge(quote.status)}`}
                          >
                            <span>{quote.status === 'APPROVED' ? 'Client Confirmed' : quote.status}</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                          </button>

                          {/* Floating Status Dropdown Menu (Image 3) */}
                          {activeQuoteStatusDropdownId === quote.id && (
                            <div className="absolute left-4 top-11 w-44 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 py-1.5 text-left text-xs animate-in fade-in zoom-in-95">
                              {['Draft', 'Sent', 'In Discussion', 'On Hold', 'Client Confirmed', 'Rejected'].map((statusOption) => (
                                <button
                                  key={statusOption}
                                  type="button"
                                  onClick={() => handleUpdateQuotationStatus(quote.id, statusOption)}
                                  className={`w-full px-3.5 py-2 text-left hover:bg-red-50/50 transition-colors flex items-center justify-between cursor-pointer ${
                                    quote.status === statusOption || (statusOption === 'Client Confirmed' && quote.status === 'APPROVED')
                                      ? 'font-bold text-red-600 bg-red-50/70'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  <span>{statusOption}</span>
                                  {(quote.status === statusOption || (statusOption === 'Client Confirmed' && quote.status === 'APPROVED')) && (
                                    <Check className="w-3.5 h-3.5 text-red-600" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Row Actions */}
                        <td className="py-3.5 px-4 text-center relative dropdown-trigger-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveQuoteRowMenuId(activeQuoteRowMenuId === quote.id ? null : quote.id);
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeQuoteRowMenuId === quote.id && (
                            <div className="absolute right-4 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-left text-xs animate-in fade-in zoom-in-95">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveQuoteRowMenuId(null);
                                  setPreviewQuotation(quote);
                                }}
                                className="w-full px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Eye className="w-3.5 h-3.5 text-red-600" />
                                <span>Preview Proposal</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveQuoteRowMenuId(null);
                                  setDownloadQuoteTarget(quote);
                                }}
                                className="w-full px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Download className="w-3.5 h-3.5 text-red-600" />
                                <span>Download (PDF / Word)</span>
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                type="button"
                                onClick={() => handleDeleteQuotation(quote.id, quote.quotation_number)}
                                className="w-full px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Quotation</span>
                              </button>
                            </div>
                          )}
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
            className="w-full sm:w-[500px] md:w-[540px] bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header (matching Image 2 & latest screenshot) */}
            <div className="px-6 py-4 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsLeadDrawerOpen(false)}
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

            {/* Drawer Form Body (Perfect Alignment & Red/White Theme) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Row 1: LEAD ASSIGNEE & DATE (Perfect 2-col alignment) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* LEAD ASSIGNEE */}
                <div className="flex gap-2">
                  <FloatingSelect
                    className="flex-1"
                    label="ASSIGN TO PERSON"
                    value={drawerAssignedToUserId}
                    onChange={setDrawerAssignedToUserId}
                    placeholder="Select Staff Member"
                    options={[
                      { label: 'Unassigned', value: '' },
                      ...allUsers
                        .filter(u => !(activeRole === 'MARKETING' && u.role_code === 'MARKETING'))
                        .map(u => ({ label: `${u.staff_name} (${u.role_name})`, value: u.id }))
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
              <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                  LEAD TYPE *
                </label>
                <input
                  type="text"
                  required
                  placeholder=""
                  value={drawerLeadType}
                  onChange={(e) => setDrawerLeadType(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none pr-6"
                />
                <Info className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
              </div>

              {/* CONTACT NAME * */}
              <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                  CONTACT NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder=""
                  value={drawerContactName}
                  onChange={(e) => setDrawerContactName(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
                />
              </div>

              {/* PHONE NO. * (with Flag and +91 code) */}
              <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
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
                    onChange={(e) => setDrawerPhone(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                  EMAIL
                </label>
                <input
                  type="email"
                  placeholder=""
                  value={drawerEmail}
                  onChange={(e) => setDrawerEmail(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
                />
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
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create Quotation Proposal</h3>
                  <p className="text-xs text-slate-500">Commercial estimation with itemized pricing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewQuoteModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
              {/* Client & Project Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karthick"
                    value={quoteClientName}
                    onChange={(e) => setQuoteClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Phone</label>
                  <input
                    type="text"
                    placeholder="98401 23456"
                    value={quoteClientPhone}
                    onChange={(e) => setQuoteClientPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Email</label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={quoteClientEmail}
                    onChange={(e) => setQuoteClientEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject / Scope *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Soil Investigation"
                    value={quoteProjectTitle}
                    onChange={(e) => setQuoteProjectTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                  />
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
                    triggerClassName="w-full !rounded-xl !h-[38px] text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Line Item Scope & Pricing</h4>
                  <button
                    type="button"
                    onClick={handleAddQuoteItem}
                    className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 w-28">Category</th>
                        <th className="py-2.5 px-3 w-24">Unit</th>
                        <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                        <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                        <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                        <th className="py-2.5 px-3 w-10 text-center">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quoteItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="Describe work scope..."
                              value={item.description}
                              onChange={(e) => handleUpdateQuoteItem(item.id, 'description', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-red-600"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.category || 'Soil Testing'}
                              onChange={(e) => handleUpdateQuoteItem(item.id, 'category', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-red-600"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleUpdateQuoteItem(item.id, 'unit', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-red-600"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuoteItem(item.id, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right tracking-tight text-slate-900 focus:outline-none focus:border-red-600"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min={0}
                              value={item.unit_rate}
                              onChange={(e) => handleUpdateQuoteItem(item.id, 'unit_rate', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right tracking-tight text-slate-900 focus:outline-none focus:border-red-600"
                            />
                          </td>
                          <td className="py-2 px-3 text-right tracking-tight font-semibold text-slate-900">
                            ₹ {(item.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveQuoteItem(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-3 border-t border-slate-100">
                <div className="w-full sm:w-1/2 space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Special Notes & Payment Terms</label>
                    <textarea
                      rows={2}
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-red-600 resize-none"
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
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-red-600 resize-none"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Subtotal:</span>
                    <span className="tracking-tight font-medium">₹ {quoteSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Discount (₹):</span>
                    <input
                      type="number"
                      min={0}
                      value={quoteDiscount}
                      onChange={(e) => setQuoteDiscount(Number(e.target.value))}
                      className="w-24 px-2 py-0.5 border border-slate-200 rounded text-right tracking-tight text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>GST (18%):</span>
                    <span className="tracking-tight font-medium">₹ {quoteGstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                    <span>Estimated Total:</span>
                    <span className="tracking-tight text-red-600 font-bold">₹ {quoteGrandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsNewQuoteModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('Draft')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('Client Confirmed')}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                >
                  Confirm & Save
                </button>
              </div>
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
    </div>
  );
};

export default QuotationView;
