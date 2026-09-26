import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calculator, Plus, Search, Filter, Download, Printer, Eye, 
  Trash2, CheckCircle2, Clock, AlertCircle, X, ChevronRight, 
  ArrowRight, Briefcase, Building2, Phone, Mail, FileText, 
  Sparkles, ShieldCheck, MapPin, Calendar, Check,
  ChevronDown, RotateCcw, Award, Layers, MoreVertical, Edit2,
  Gift, HelpCircle, Info
} from 'lucide-react';
import { Project, Department, Lead, Quotation, QuotationItem } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { CustomSelect } from '../components/CustomSelect';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { confirmAction } from '../lib/dialogService';

interface QuotationViewProps {
  projects?: Project[];
  onConvertSuccess?: (projectName: string) => void;
  onShowToast?: (msg: string) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

// Initial Sample Leads matching User Screenshot (Image 1)
const INITIAL_CRM_LEADS: Lead[] = [
  {
    id: 'lead-1',
    lead_number: 'LD-101',
    lead_type: 'Referal - soil testing',
    client_name: 'Raghupathi porur ls',
    contact_person: 'Raghupathi',
    phone: '8939321946',
    email: 'raghupathi@gmail.com',
    project_title: 'Soil Testing Investigation - Porur',
    estimated_value: 12500,
    stage: 'NEW',
    probability: 20,
    status_label: 'New Lead',
    source: 'Just dial',
    category: 'Soil Testing',
    last_updated: '25 September 2026',
    creation_date: '2026-09-25'
  },
  {
    id: 'lead-2',
    lead_number: 'LD-102',
    lead_type: 'Referal - soil testing',
    client_name: 'Gopinath raman str ref valasarawakkam',
    contact_person: 'Gopinath Raman',
    phone: '8610056620',
    email: 'gopinath.raman@outlook.com',
    project_title: 'Residential Soil Test - Valasarawakkam',
    estimated_value: 18000,
    stage: 'NEW',
    probability: 20,
    status_label: 'New Lead',
    source: 'Just dial',
    category: 'Soil Testing',
    last_updated: '25 September 2026',
    creation_date: '2026-09-25'
  },
  {
    id: 'lead-3',
    lead_number: 'LD-103',
    lead_type: 'JD - Soil testing',
    client_name: 'THIRUNARU',
    contact_person: 'Thirunaru',
    phone: '9790261464',
    email: 'thirunaru@yahoo.com',
    project_title: 'Commercial Soil Test & Bore Hole Analysis',
    estimated_value: 20500,
    stage: 'PROPOSAL',
    probability: 60,
    status_label: 'Proposal Stage',
    source: 'Just dial',
    category: 'Soil Testing',
    last_updated: '25 September 2026',
    creation_date: '2026-09-25'
  },
  {
    id: 'lead-4',
    lead_number: 'LD-104',
    lead_type: 'JD - Soil testing',
    client_name: 'NATAJI',
    contact_person: 'Nataji',
    phone: '9971414371',
    email: 'nataji.const@gmail.com',
    project_title: 'Multi-storey Structural Soil Investigation',
    estimated_value: 38500,
    stage: 'PROPOSAL',
    probability: 60,
    status_label: 'Proposal Stage',
    source: 'Just dial',
    category: 'Soil Testing',
    last_updated: '25 September 2026',
    creation_date: '2026-09-25'
  },
  {
    id: 'lead-5',
    lead_number: 'LD-105',
    lead_type: 'JD - Soil testing',
    client_name: 'KARUPASAMY',
    contact_person: 'Karupasamy',
    phone: '9500077332',
    email: 'karupasamy@gmail.com',
    project_title: 'Factory Warehouse Soil Investigation',
    estimated_value: 22000,
    stage: 'PROPOSAL',
    probability: 60,
    status_label: 'Proposal Stage',
    source: 'Just dial',
    category: 'Soil Testing',
    last_updated: '25 September 2026',
    creation_date: '2026-09-25'
  },
  {
    id: 'lead-6',
    lead_number: 'LD-106',
    lead_type: 'Referal - soil testing',
    client_name: 'Suryathaniga LS Venkatesh ls staff',
    contact_person: 'Suryathaniga',
    phone: '8220224979',
    email: 'suryathaniga@gmail.com',
    project_title: 'Plot Soil Test - LS Venkatesh Staff',
    estimated_value: 11500,
    stage: 'NEW',
    probability: 20,
    status_label: 'New Lead',
    source: 'Just dial',
    category: 'Soil Testing',
    last_updated: '25 September 2026',
    creation_date: '2026-09-25'
  },
  {
    id: 'lead-7',
    lead_number: 'LD-107',
    lead_type: 'Referal - soil testing',
    client_name: 'Mani p sathlokar',
    contact_person: 'Mani P',
    phone: '8754145167',
    email: 'manip.sathlokar@gmail.com',
    project_title: 'Industrial Layout Soil Investigation',
    estimated_value: 30000,
    stage: 'NEW',
    probability: 20,
    status_label: 'New Lead',
    source: 'Just dial',
    category: 'Soil Testing',
    last_updated: '25 September 2026',
    creation_date: '2026-09-25'
  },
  {
    id: 'lead-8',
    lead_number: 'LD-108',
    lead_type: 'Referal - soil testing',
    client_name: 'Pavithran AE Meyyur',
    contact_person: 'Pavithran',
    phone: '9566051166',
    email: 'pavithran.meyyur@gmail.com',
    project_title: 'Civil Bridge Soil Exploration',
    estimated_value: 15500,
    stage: 'NEW',
    probability: 20,
    status_label: 'New Lead',
    source: 'Referral',
    category: 'Soil Testing',
    last_updated: '25 September 2026',
    creation_date: '2026-09-25'
  },
  {
    id: 'lead-9',
    lead_number: 'LD-109',
    lead_type: 'BUILDER - SOIL TESTING',
    client_name: 'AKS CONSTRUCTION',
    contact_person: 'Arumugam (Director)',
    phone: '9842289820',
    email: 'info@aksconstruction.in',
    project_title: 'G+4 Apartment Soil Investigation & Bearing Capacity',
    estimated_value: 45000,
    stage: 'CONTACTED',
    probability: 30,
    status_label: 'No Response',
    source: 'Referral',
    category: 'Civil Construction',
    last_updated: '25 September 2026',
    creation_date: '2026-09-25'
  }
];

// Initial Sample Quotations matching User Screenshot (Image 3)
const INITIAL_CRM_QUOTATIONS: Quotation[] = [
  {
    id: 'quo-1',
    quotation_number: 'QBAG2289',
    date: '25 Sep 2026',
    valid_until: '25 Oct 2026',
    client_name: 'Karthick',
    client_phone: '9840123456',
    client_email: 'karthick@gmail.com',
    project_title: 'Soil Investigation',
    department: 'CBE_SOIL_INVESTIGATION',
    status: 'Client Confirmed',
    subtotal: 9745,
    tax_percentage: 18,
    tax_amount: 1755,
    total_amount: 11500,
    notes: 'Soil bore hole testing and safe bearing capacity determination.',
    items: [
      { id: '1', item_code: 'ITM-01', description: 'Soil Investigation Bore Hole Drilling & Sample Collection (Up to 10m)', unit: 'Bore', quantity: 1, unit_rate: 9745, amount: 9745, category: 'Soil Investigation' }
    ]
  },
  {
    id: 'quo-2',
    quotation_number: 'QBAG2288',
    date: '25 Sep 2026',
    valid_until: '25 Oct 2026',
    client_name: 'Ashwin AVK Cons Tambaram',
    client_phone: '9840234567',
    client_email: 'ashwin@avkcons.com',
    project_title: 'Soil Investigation',
    department: 'CBE_SOIL_INVESTIGATION',
    status: 'Client Confirmed',
    subtotal: 17373,
    tax_percentage: 18,
    tax_amount: 3127,
    total_amount: 20500,
    notes: 'Double bore hole exploration with laboratory plate load testing.',
    items: [
      { id: '1', item_code: 'ITM-01', description: 'Bore Hole Investigation (2 Nos) with SPT and Laboratory Grain Analysis', unit: 'Package', quantity: 1, unit_rate: 17373, amount: 17373, category: 'Soil Investigation' }
    ]
  },
  {
    id: 'quo-3',
    quotation_number: 'QBAG2287',
    date: '25 Sep 2026',
    valid_until: '25 Oct 2026',
    client_name: 'Raj Malayanur',
    client_phone: '9840345678',
    client_email: 'raj.malayanur@gmail.com',
    project_title: 'Soil Investigation',
    department: 'CBE_SOIL_INVESTIGATION',
    status: 'Client Confirmed',
    subtotal: 17373,
    tax_percentage: 18,
    tax_amount: 3127,
    total_amount: 20500,
    notes: 'Geotechnical Investigation for commercial structure.',
    items: [
      { id: '1', item_code: 'ITM-01', description: 'Soil Stratigraphy and Safe Bearing Capacity Evaluation Report', unit: 'Package', quantity: 1, unit_rate: 17373, amount: 17373, category: 'Soil Investigation' }
    ]
  },
  {
    id: 'quo-4',
    quotation_number: 'QBAG2286',
    date: '24 Sep 2026',
    valid_until: '24 Oct 2026',
    client_name: 'Rajashekar T Structural',
    client_phone: '9840456789',
    client_email: 'rajashekar.t@struct.in',
    project_title: 'Soil Investigation',
    department: 'CBE_SOIL_INVESTIGATION',
    status: 'Client Confirmed',
    subtotal: 32627,
    tax_percentage: 18,
    tax_amount: 5873,
    total_amount: 38500,
    notes: 'Deep borehole geotechnical drilling with rock core recovery.',
    items: [
      { id: '1', item_code: 'ITM-01', description: 'Deep Geotechnical Borehole Investigation with Core Recovery Analysis', unit: 'Package', quantity: 1, unit_rate: 32627, amount: 32627, category: 'Soil Investigation' }
    ]
  },
  {
    id: 'quo-5',
    quotation_number: 'QBAG2285',
    date: '24 Sep 2026',
    valid_until: '24 Oct 2026',
    client_name: 'Thanigai Velan Construction',
    client_phone: '9840567890',
    client_email: 'thanigai@velanconst.com',
    project_title: 'Soil Investigation',
    department: 'CBE_SOIL_INVESTIGATION',
    status: 'Client Confirmed',
    subtotal: 9745,
    tax_percentage: 18,
    tax_amount: 1755,
    total_amount: 11500,
    notes: 'Residential single-point borehole testing.',
    items: [
      { id: '1', item_code: 'ITM-01', description: 'Single Point Borehole Soil Investigation & Foundation Advisory', unit: 'Bore', quantity: 1, unit_rate: 9745, amount: 9745, category: 'Soil Investigation' }
    ]
  },
  {
    id: 'quo-6',
    quotation_number: 'QBAG2284',
    date: '24 Sep 2026',
    valid_until: '24 Oct 2026',
    client_name: 'Navya Gerugambakkam',
    client_phone: '9840678901',
    client_email: 'navya.g@gmail.com',
    project_title: 'Soil Investigation',
    department: 'CBE_SOIL_INVESTIGATION',
    status: 'Client Confirmed',
    subtotal: 17373,
    tax_percentage: 18,
    tax_amount: 3127,
    total_amount: 20500,
    notes: 'Standard penetration testing and triaxial compression test.',
    items: [
      { id: '1', item_code: 'ITM-01', description: 'Standard Penetration Testing (SPT) and Triaxial Test Analysis', unit: 'Package', quantity: 1, unit_rate: 17373, amount: 17373, category: 'Soil Investigation' }
    ]
  },
  {
    id: 'quo-7',
    quotation_number: 'QBAG2283',
    date: '24 Sep 2026',
    valid_until: '24 Oct 2026',
    client_name: 'Nazir',
    client_phone: '9840789012',
    client_email: 'nazir.props@gmail.com',
    project_title: 'Soil Investigation',
    department: 'CBE_SOIL_INVESTIGATION',
    status: 'Client Confirmed',
    subtotal: 17373,
    tax_percentage: 18,
    tax_amount: 3127,
    total_amount: 20500,
    notes: 'Foundation depth recommendations for residential building.',
    items: [
      { id: '1', item_code: 'ITM-01', description: 'Soil Testing & Safe Foundation Recommendation Report', unit: 'Package', quantity: 1, unit_rate: 17373, amount: 17373, category: 'Soil Investigation' }
    ]
  }
];

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
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  minWidth = 'min-w-[130px]'
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
        <div className="flex items-center gap-1.5 truncate max-w-[125px]">
          {selectedOption?.dotColor && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotColor}`} />
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

export const QuotationView: React.FC<QuotationViewProps> = ({
  projects = [],
  onConvertSuccess,
  onShowToast,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  // Top-level Sub-page Navigation: 'leads' (First Page) | 'quotations' (Second Page)
  const [activeTab, setActiveTab] = useState<'leads' | 'quotations'>('leads');

  // =========================================================================
  // 1. LEADS STATE & PERSISTENCE
  // =========================================================================
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_leads_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_CRM_LEADS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_leads_v2', JSON.stringify(leads));
    } catch {}
  }, [leads]);

  // Leads Filters
  const [leadSearch, setLeadSearch] = useState('');
  const [leadAssigneeFilter, setLeadAssigneeFilter] = useState('ALL');
  const [leadPriorityFilter, setLeadPriorityFilter] = useState('ALL');
  const [leadStatusFilter, setLeadStatusFilter] = useState('ALL');
  const [leadSourceFilter, setLeadSourceFilter] = useState('ALL');
  const [leadCategoryFilter, setLeadCategoryFilter] = useState('ALL');

  // New Lead Right Drawer State (Image 2)
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

  // New Lead Drawer Form Fields (All empty by default per user request)
  const [drawerAssignee, setDrawerAssignee] = useState('');
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

  // Preview & Modal States
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

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
  const [quoteTerms, setQuoteTerms] = useState('1. Rates are valid for 30 days.\n2. Taxes as applicable.\n3. Site access and power to be provided by client.');

  const [quoteItems, setQuoteItems] = useState<QuotationItem[]>([
    {
      id: '1',
      description: 'Soil Investigation Bore Hole Drilling & Sample Collection',
      unit: 'Bore',
      quantity: 1,
      unit_rate: 15000,
      amount: 15000,
      category: 'Soil Testing'
    }
  ]);

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
      return true;
    });
  }, [leads, leadSearch, leadPriorityFilter, leadStatusFilter, leadSourceFilter, leadCategoryFilter]);

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
    setEditingLeadId(lead.id);
    setDrawerAssignee(lead.assigned_to_name || '');
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
        notes: drawerDescription.trim() || drawerNotes.trim()
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

    const nextCode = `QBAG${String(quotations.length + 2289)}`;
    const newQuote: Quotation = {
      id: `quo-${Date.now()}`,
      quotation_number: nextCode,
      date: '25 Sep 2026',
      valid_until: quoteValidUntil,
      client_name: quoteClientName.trim(),
      client_phone: quoteClientPhone.trim() || undefined,
      client_email: quoteClientEmail.trim() || undefined,
      client_address: quoteClientAddress.trim() || undefined,
      project_title: quoteProjectTitle.trim() || 'Soil Investigation',
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
    <div className="flex-1 flex flex-col min-w-0 bg-[#ffffff] min-h-screen font-sans">
      {/* ── TOP HEADER BAR ── */}
      <header className="px-6 py-3.5 bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          {/* Left Title: Quotation */}
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Quotation
            </h1>
          </div>

          {/* Right Header: Profile & Notifications */}
          <div className="flex items-center gap-3">
            <UserProfileDropdown showBell={true} />
          </div>
        </div>

        {/* ── SUB-PAGE TABS: [ 1. Leads ] [ 2. Quotation ] (Red & White Theme) ── */}
        <div className="flex items-center gap-6 mt-3 border-b border-slate-200/80">
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

      {/* ── MAIN CONTENT ── */}
      <main className="p-6 space-y-4 flex-1">
        {/* ================================================================= */}
        {/* SUB-PAGE 1: LEADS (IMAGE 1) */}
        {/* ================================================================= */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filter Toolbar Row (Red and White Theme - Perfectly Aligned, No Clipping) */}
            <div className="relative z-30 flex items-center justify-between gap-3">
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
              </div>

              {/* "+ New Lead" Button (Red & White Theme) */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleOpenNewLeadDrawer}
                  className="h-9 px-4.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs shadow-red-600/20 flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                >
                  <span>New Lead</span>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Showing Count & Reset filters */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-0.5">
              <div className="flex items-center gap-2">
                <span>Showing <strong className="text-slate-800 font-semibold">{filteredLeads.length}</strong> of {leads.length} leads</span>
                {(leadSearch || leadPriorityFilter !== 'ALL' || leadStatusFilter !== 'ALL' || leadSourceFilter !== 'ALL' || leadCategoryFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setLeadSearch('');
                      setLeadPriorityFilter('ALL');
                      setLeadStatusFilter('ALL');
                      setLeadSourceFilter('ALL');
                      setLeadCategoryFilter('ALL');
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
                        className="hover:bg-slate-50/70 transition-colors group text-slate-800"
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

                        <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                          <a 
                            href={`tel:${lead.phone}`}
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

                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {lead.source || 'Just dial'}
                        </td>

                        <td className="py-3.5 px-4 text-center relative dropdown-trigger-container">
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
                            <div className="absolute right-4 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-left text-xs animate-in fade-in zoom-in-95">
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
            <div className="relative z-30 flex items-center justify-between gap-3">
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

              {/* "+ New Quotation" Button (Red & White Theme) */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewQuoteModalOpen(true)}
                  className="h-9 px-4.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs shadow-red-600/20 flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
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
                        <td className="py-3.5 px-4 font-semibold text-slate-800 font-mono">
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
                        <td className="py-3.5 px-4 font-semibold text-slate-900 font-mono whitespace-nowrap">
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
                            <div className="absolute right-4 top-10 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-left text-xs animate-in fade-in zoom-in-95">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveQuoteRowMenuId(null);
                                  setPreviewQuotation(quote);
                                }}
                                className="w-full px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Eye className="w-3.5 h-3.5 text-red-600" />
                                <span>Preview / Print (PDF)</span>
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
                <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                    LEAD ASSIGNEE
                  </label>
                  <select
                    value={drawerAssignee}
                    onChange={(e) => setDrawerAssignee(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer appearance-none pr-6"
                  >
                    <option value="">Select Assignee</option>
                    <option value="Venkatesh (Site Ops)">Venkatesh (Site Ops)</option>
                    <option value="Karthik (Sales)">Karthik (Sales)</option>
                    <option value="Suryathaniga (Staff)">Suryathaniga (Staff)</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
                </div>

                {/* DATE */}
                <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center gap-2 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                    DATE
                  </label>
                  <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <input
                    type="date"
                    value={drawerDate}
                    onChange={(e) => setDrawerDate(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
                  />
                </div>
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
              <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                  SOURCE
                </label>
                <select
                  value={drawerSource}
                  onChange={(e) => setDrawerSource(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer appearance-none pr-6"
                >
                  <option value="">Select Source</option>
                  <option value="Just dial">Just dial</option>
                  <option value="Referral">Referral</option>
                  <option value="Direct Walk-in">Direct Walk-in</option>
                  <option value="Website">Website</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Google">Google</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
              </div>

              {/* CATEGORY */}
              <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                  CATEGORY
                </label>
                <select
                  value={drawerCategory}
                  onChange={(e) => setDrawerCategory(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer appearance-none pr-6"
                >
                  <option value="">Select Category</option>
                  <option value="Soil Testing">Soil Testing</option>
                  <option value="Civil Construction">Civil Construction</option>
                  <option value="Architecture">Architecture</option>
                  <option value="Structural">Structural</option>
                  <option value="Survey">Survey</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
              </div>

              {/* Row: LEAD STATUS & PRIORITY (Perfect 2-col alignment with uniform h-11) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                    LEAD STATUS
                  </label>
                  <select
                    value={drawerStatus}
                    onChange={(e) => setDrawerStatus(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer appearance-none pr-6"
                  >
                    <option value="">Select Status</option>
                    <option value="New Lead">New Lead</option>
                    <option value="Proposal Stage">Proposal Stage</option>
                    <option value="No Response">No Response</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Client Confirmed">Client Confirmed</option>
                    <option value="Lost">Lost</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
                </div>

                <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                    PRIORITY
                  </label>
                  <select
                    value={drawerPriority}
                    onChange={(e) => setDrawerPriority(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer appearance-none pr-6"
                  >
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
                </div>
              </div>

              {/* Row: LAST CONTACTED DATE & FOLLOW UP DATE (Perfect 2-col alignment with uniform h-11) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center gap-2 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                    LAST CONTACTED DATE
                  </label>
                  <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <input
                    type="date"
                    value={drawerLastContactedDate}
                    onChange={(e) => setDrawerLastContactedDate(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center gap-2 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                    FOLLOW UP DATE
                  </label>
                  <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <input
                    type="date"
                    value={drawerFollowupDate}
                    onChange={(e) => setDrawerFollowupDate(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Row: EXPECTED CLOSURE DATE & BUDGET (Perfect 2-col alignment with uniform h-11) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center gap-2 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                    EXPECTED CLOSURE DATE
                  </label>
                  <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <input
                    type="date"
                    value={drawerExpectedClosureDate}
                    onChange={(e) => setDrawerExpectedClosureDate(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="relative border border-slate-300 rounded-xl h-11 px-3.5 flex items-center focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-colors">
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none select-none z-10">
                    BUDGET
                  </label>
                  <input
                    type="number"
                    placeholder=""
                    value={drawerBudget}
                    onChange={(e) => {
                      setDrawerBudget(e.target.value);
                      setDrawerValue(e.target.value);
                    }}
                    className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none font-mono"
                  />
                </div>
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
                  <select
                    value={quoteDepartment}
                    onChange={(e) => setQuoteDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 cursor-pointer"
                  >
                    <option value="CBE_SOIL_INVESTIGATION">Soil Investigation</option>
                    <option value="CONSTRUCTION">Civil Construction</option>
                    <option value="ARCHITECTURE">Architecture</option>
                    <option value="STRUCTURAL">Structural</option>
                    <option value="SURVEY">Survey</option>
                  </select>
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
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right font-mono text-slate-900 focus:outline-none focus:border-red-600"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min={0}
                              value={item.unit_rate}
                              onChange={(e) => handleUpdateQuoteItem(item.id, 'unit_rate', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right font-mono text-slate-900 focus:outline-none focus:border-red-600"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
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
                <div className="w-full sm:w-1/2 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Special Notes & Payment Terms</label>
                  <textarea
                    rows={3}
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-red-600 resize-none"
                  />
                </div>

                <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-medium">₹ {quoteSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Discount (₹):</span>
                    <input
                      type="number"
                      min={0}
                      value={quoteDiscount}
                      onChange={(e) => setQuoteDiscount(Number(e.target.value))}
                      className="w-24 px-2 py-0.5 border border-slate-200 rounded text-right font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>GST (18%):</span>
                    <span className="font-mono font-medium">₹ {quoteGstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                    <span>Estimated Total:</span>
                    <span className="font-mono text-red-600 font-bold">₹ {quoteGrandTotal.toLocaleString('en-IN')}</span>
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
      {/* FULL PRINTABLE / PDF PROPOSAL PREVIEW (RED & WHITE THEME) */}
      {/* ================================================================= */}
      {previewQuotation && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-400" />
                <span className="font-bold text-sm">Quotation Preview — {previewQuotation.quotation_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewQuotation(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-xs text-slate-800 bg-white">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div>
                  <div className="text-xl font-black text-slate-900 font-heading">BOOSHNAM GROUP</div>
                  <div className="text-[11px] text-slate-500 font-medium">Construction & Soil Investigation Division</div>
                  <div className="text-[11px] text-slate-400 mt-1">GSTIN: 33AAACB1234F1Z9</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900 font-mono">{previewQuotation.quotation_number}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Date: {previewQuotation.date}</div>
                  <div className="text-slate-500 text-[11px]">Valid Until: {previewQuotation.valid_until}</div>
                </div>
              </div>

              {/* Client & Scope Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">QUOTATION TO:</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{previewQuotation.client_name}</div>
                  {previewQuotation.client_phone && <div className="text-slate-600 mt-0.5">{previewQuotation.client_phone}</div>}
                  {previewQuotation.client_email && <div className="text-slate-600">{previewQuotation.client_email}</div>}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PROJECT SUBJECT:</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{previewQuotation.project_title}</div>
                  <div className="text-slate-600 mt-0.5">Status: <span className="font-semibold text-red-600">{previewQuotation.status}</span></div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 w-20 text-center">Unit</th>
                      <th className="py-2.5 px-3 w-16 text-right">Qty</th>
                      <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewQuotation.items.map((it, idx) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{it.description}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{it.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹ {(it.unit_rate || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">₹ {(it.amount || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹ {previewQuotation.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {previewQuotation.discount_amount ? (
                    <div className="flex justify-between text-slate-600">
                      <span>Discount:</span>
                      <span className="font-mono text-emerald-600">- ₹ {previewQuotation.discount_amount.toLocaleString('en-IN')}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%):</span>
                    <span className="font-mono">₹ {previewQuotation.tax_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-sm text-slate-900">
                    <span>Estimated Total:</span>
                    <span className="font-mono text-red-600 font-bold">₹ {previewQuotation.total_amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {previewQuotation.notes && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800">Payment Terms: </span>
                  {previewQuotation.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationView;
