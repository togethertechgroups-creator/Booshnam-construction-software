import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Search, Calendar, Pencil, ChevronDown, 
  Upload, Check, Building2, User, CreditCard, DollarSign,
  Receipt, FileText, AlertCircle, Sparkles, CloudUpload
} from 'lucide-react';
import { Project } from '../../types';
import { PartyRecord, getFinanceParties } from '../../lib/financeSyncService';
import { getCurrentUserAccount } from '../../lib/authService';
import { MOCK_USER } from '../../lib/mockData';
import { getUserAccessibleProjects } from '../../lib/projectAccessService';

export function getLoggedInUserPartyName(directoryParties?: PartyRecord[]): string {
  try {
    let candidate = '';
    // 1. Check active session account
    const active = getCurrentUserAccount();
    if (active) {
      if (active.staff_name && active.staff_name.trim()) {
        candidate = active.staff_name.trim();
      } else if (active.username && active.username.trim()) {
        candidate = active.username.trim();
      }
    }

    // 2. Check siteops_user in localStorage
    if (!candidate && typeof window !== 'undefined') {
      const stored = localStorage.getItem('siteops_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const fullName = `${parsed.first_name || ''} ${parsed.last_name || ''}`.trim();
        if (fullName) {
          candidate = fullName;
        } else if (parsed.name && parsed.name.trim()) {
          candidate = parsed.name.trim();
        } else if (parsed.username && parsed.username.trim()) {
          candidate = parsed.username.trim();
        }
      }
    }

    // 3. Fallback to MOCK_USER
    if (!candidate && typeof MOCK_USER !== 'undefined') {
      const mockFull = `${MOCK_USER.first_name || ''} ${MOCK_USER.last_name || ''}`.trim();
      candidate = mockFull || MOCK_USER.username || '';
    }

    if (!candidate) return '';

    // 4. If directory parties exist, match canonical name (e.g. cvh, bala)
    if (Array.isArray(directoryParties) && directoryParties.length > 0) {
      const clean = candidate.toLowerCase().trim();
      const matched = directoryParties.find(p => 
        p.name.toLowerCase().trim() === clean ||
        clean.includes(p.name.toLowerCase().trim()) ||
        p.name.toLowerCase().trim().includes(clean)
      );
      if (matched) return matched.name;
    }

    return candidate;
  } catch (err) {
    console.error('Error resolving logged-in party name', err);
    return '';
  }
}

export interface PaymentRequestSubmitData {
  requestCode: string;
  date: string;
  partyName: string;
  projectName: string;
  category: string;
  requestType?: string;
  amount: number;
  dueDate?: string;
  notes?: string;
  files?: File[];
  routedTo?: 'ADMIN' | 'ADMIN_AND_SUPER_ADMIN';
}

interface CreatePaymentRequestDrawerFlowProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: Project[];
  parties?: PartyRecord[];
  existingRequestsCount?: number;
  onSaveSuccess: (requestData: PaymentRequestSubmitData) => void;
}

// Request Types for Construction Payment Requests (Exact match to Image 3)
export const PAYMENT_REQUEST_TYPES = [
  'Advance against PO',
  'Advance against Subcon Work Order',
  'Advance against BOQ',
  'Payment against Material Purchase',
  'Payment against Subcon Expense',
  'Payment against Other Expense',
  'Payment against Equipment Expense',
  'Advance for Labour',
  'Petty Cash',
  'Other'
];

export const CreatePaymentRequestDrawerFlow: React.FC<CreatePaymentRequestDrawerFlowProps> = ({
  isOpen,
  onClose,
  projects = [],
  parties = [],
  existingRequestsCount = 0,
  onSaveSuccess
}) => {
  // Step 1: 'select_project' (Image 1) -> Step 2: 'drawer' (Image 2)
  const [step, setStep] = useState<'select_project' | 'drawer'>('select_project');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // Step 2 Form States (Image 2)
  const [requestCode, setRequestCode] = useState('');
  const [isEditingRequestCode, setIsEditingRequestCode] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [partyName, setPartyName] = useState(() => getLoggedInUserPartyName(parties));
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [requestType, setRequestType] = useState('');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [formErrors, setFormErrors] = useState<{ party?: string; amount?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const prevIsOpenRef = useRef(false);

  // Directory parties strictly from Party page (parties prop or getFinanceParties())
  const directoryParties = useMemo(() => {
    return (parties && parties.length > 0) ? parties : getFinanceParties();
  }, [parties]);

  // Real-time synchronization on project updates, deletions, or session user switch
  const [projectsSyncTick, setProjectsSyncTick] = useState(0);

  useEffect(() => {
    const handleSync = () => setProjectsSyncTick(t => t + 1);
    window.addEventListener('booshnam_projects_updated', handleSync);
    window.addEventListener('booshnam_projects_deleted', handleSync);
    window.addEventListener('booshnam_session_changed', handleSync);
    window.addEventListener('siteops_user_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('booshnam_projects_updated', handleSync);
      window.removeEventListener('booshnam_projects_deleted', handleSync);
      window.removeEventListener('booshnam_session_changed', handleSync);
      window.removeEventListener('siteops_user_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Available Projects: strictly filtered to active non-deleted projects accessible by the logged-in user
  const availableProjects = useMemo(() => {
    return getUserAccessibleProjects(projects);
  }, [projects, projectsSyncTick]);

  // Compute initials for project avatar
  const getProjectInitials = (p: Project) => {
    if (p.initials) return p.initials;
    if (p.code) {
      const parts = p.code.split(/[-_ ]/);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
      }
      return p.code.slice(0, 2).toUpperCase();
    }
    if (p.name) {
      const words = p.name.trim().split(/\s+/);
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return p.name.slice(0, 2).toUpperCase();
    }
    return 'PR';
  };

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return availableProjects;
    const q = projectSearchQuery.toLowerCase().trim();
    return availableProjects.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) || 
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.client_name && p.client_name.toLowerCase().includes(q))
    );
  }, [availableProjects, projectSearchQuery]);

  // Filter parties for Step 2 party search
  const filteredParties = useMemo(() => {
    const q = partySearchQuery.toLowerCase().trim();
    if (!q) return directoryParties;
    return directoryParties.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.type && p.type.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  }, [directoryParties, partySearchQuery]);

  // Reset fields when opening modal
  const resetAllFields = () => {
    const nextNum = (existingRequestsCount || 0) + 1;
    setRequestCode(`#-${nextNum}`);
    setIsEditingRequestCode(false);
    const today = new Date();
    setPaymentDate(today.toISOString().split('T')[0]);
    const defaultParty = getLoggedInUserPartyName(directoryParties);
    setPartyName(defaultParty);
    setIsPartyDropdownOpen(false);
    setPartySearchQuery('');
    setRequestType('');
    setIsTypeDropdownOpen(false);
    setAmount('');
    setDueDate('');
    setNotes('');
    setUploadedFiles([]);
    setFormErrors({});
    setSelectedProject(null);
    setProjectSearchQuery('');
    setStep('select_project');
  };

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      resetAllFields();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, existingRequestsCount]);

  const handleClose = () => {
    resetAllFields();
    onClose();
  };

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    if (isPartyDropdownOpen || isTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPartyDropdownOpen, isTypeDropdownOpen]);

  // Step 1: Project Selection
  const handleSelectProject = (proj: Project) => {
    setSelectedProject(proj);
    if (!partyName.trim()) {
      setPartyName(getLoggedInUserPartyName(directoryParties));
    }
    setStep('drawer');
  };

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Form Submission
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const errors: { party?: string; amount?: string } = {};

    if (!partyName.trim()) {
      errors.party = 'Party Name is required';
    }

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      errors.amount = 'Please enter a valid amount greater than 0';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const isAboveThreshold = numAmt > 2000;
    const routedTo = isAboveThreshold ? 'ADMIN_AND_SUPER_ADMIN' : 'ADMIN';

    onSaveSuccess({
      requestCode: requestCode || `#-${Date.now().toString().slice(-2)}`,
      date: paymentDate,
      partyName: partyName.trim(),
      projectName: selectedProject?.name || availableProjects[0]?.name || 'Booshnam Project',
      category: requestType || 'Other',
      requestType: requestType || 'Other',
      amount: numAmt,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
      files: uploadedFiles,
      routedTo
    });

    handleClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          IMAGE 1: MODAL - "SELECT PROJECT"
      ───────────────────────────────────────────────────────────── */}
      {step === 'select_project' && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 animate-in zoom-in-95 duration-150 flex flex-col space-y-4 max-h-[90vh]"
          >
            {/* Header: Title + Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Select Project</h3>
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Floating Project Search Input (Matching Image 1) */}
            <div className="relative pt-2">
              <div className="relative border border-slate-300 rounded-xl px-3.5 h-12 flex items-center bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                <span className="absolute -top-2.5 left-4 bg-white px-1.5 text-[10px] font-bold text-slate-500 group-focus-within:text-red-600 tracking-wider uppercase transition-colors">
                  PROJECT NAME <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  autoFocus
                  placeholder="Type to search project..."
                  value={projectSearchQuery}
                  onChange={e => setProjectSearchQuery(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium text-slate-800 focus:outline-none bg-transparent pr-6"
                />
                {projectSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setProjectSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer absolute right-3"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List of Projects (Scrollable, Matching Image 1 with Red & White Theme) */}
            <div className="overflow-y-auto max-h-[340px] space-y-1.5 pr-1 divide-y divide-slate-50">
              {filteredProjects.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No projects available</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {projectSearchQuery.trim()
                      ? 'No projects match your search query.'
                      : 'No active projects are allocated to your login account.'}
                  </p>
                </div>
              ) : (
                filteredProjects.map((p, idx) => {
                  const initials = getProjectInitials(p);
                  return (
                    <div
                      key={p.id || idx}
                      onClick={() => handleSelectProject(p)}
                      className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-50/70 border border-transparent hover:border-red-200 transition-all cursor-pointer"
                    >
                      {/* Initials Avatar Box in Brand Red */}
                      <div className="w-9 h-9 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {initials}
                      </div>

                      {/* Project Text */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-red-600 truncate transition-colors">
                          {p.name}
                        </div>
                        {p.client_name && (
                          <div className="text-[11px] text-slate-400 truncate">
                            Client: {p.client_name} {p.code ? `• ${p.code}` : ''}
                          </div>
                        )}
                      </div>

                      <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-end border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          IMAGE 2: SIDE DRAWER - "PAYMENT REQUESTS" (Red & White Theme)
      ───────────────────────────────────────────────────────────── */}
      {step === 'drawer' && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-150">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={handleClose}
          />

          {/* Drawer Panel */}
          <div 
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 rounded-l-3xl rounded-l-drawer overflow-hidden animate-in slide-in-from-right duration-200"
          >
            {/* 1. Header Bar matching Image 2 */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col">
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-wider uppercase select-none">
                    PAYMENT REQUESTS
                  </h2>
                  <span className="text-[11px] font-bold text-slate-500 truncate max-w-[220px] uppercase">
                    {selectedProject ? selectedProject.name : 'Booshnam Project'}
                  </span>
                </div>
              </div>

              {/* Red & White Save Button */}
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="px-5 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-all cursor-pointer uppercase tracking-wider"
              >
                save
              </button>
            </div>

            {/* Red Accent Line below header */}
            <div className="h-[2.5px] bg-red-600 w-full shrink-0" />

            {/* 2. Scrollable Form Body matching Image 2 */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
              
              {/* Row 1: REQUEST NUMBER * and PAYMENT DATE * */}
              <div className="grid grid-cols-2 gap-3">
                {/* REQUEST NUMBER * */}
                <div className="relative pt-1.5">
                  <div className="relative border border-slate-300 rounded-xl px-3.5 h-12 flex items-center bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                      REQUEST NUMBER <span className="text-red-500">*</span>
                    </span>
                    {isEditingRequestCode ? (
                      <input
                        type="text"
                        value={requestCode}
                        onChange={e => setRequestCode(e.target.value)}
                        onBlur={() => setIsEditingRequestCode(false)}
                        autoFocus
                        className="w-full text-xs font-mono font-bold text-slate-800 focus:outline-none bg-transparent"
                      />
                    ) : (
                      <div className="w-full flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-800">{requestCode}</span>
                        <button
                          type="button"
                          onClick={() => setIsEditingRequestCode(true)}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                          title="Edit Request Code"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* PAYMENT DATE * */}
                <div className="relative pt-1.5">
                  <div className="relative border border-slate-300 rounded-xl px-3.5 h-12 flex items-center bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                      PAYMENT DATE <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 focus:outline-none bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: PARTY NAME* with Search Icon & Interactive Dropdown */}
              <div className="relative pt-1.5" ref={partyDropdownRef}>
                <div className={`relative border rounded-xl px-3.5 h-12 flex items-center bg-white group transition-all ${
                  formErrors.party ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500'
                }`}>
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                    PARTY NAME <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Search or enter party name..."
                    value={partyName}
                    onChange={e => {
                      setPartyName(e.target.value);
                      setPartySearchQuery(e.target.value);
                      setIsPartyDropdownOpen(true);
                      if (formErrors.party) setFormErrors(prev => ({ ...prev, party: undefined }));
                    }}
                    onFocus={() => setIsPartyDropdownOpen(true)}
                    className="w-full text-xs font-semibold text-slate-800 focus:outline-none bg-transparent pr-6"
                  />
                  <Search 
                    className="w-4 h-4 text-slate-400 cursor-pointer absolute right-3.5 hover:text-red-600 transition-colors" 
                    onClick={() => setIsPartyDropdownOpen(!isPartyDropdownOpen)} 
                  />
                </div>
                {formErrors.party && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">{formErrors.party}</p>
                )}

                {/* Dropdown list of Parties from Accounts & Finance */}
                {isPartyDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredParties.length === 0 ? (
                      <div className="p-3 text-center">
                        <p className="text-xs text-slate-500">No matching parties in directory</p>
                        {partyName.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsPartyDropdownOpen(false);
                            }}
                            className="mt-1 text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                          >
                            + Use "{partyName.trim()}" as party
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredParties.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setPartyName(p.name);
                            setIsPartyDropdownOpen(false);
                            if (formErrors.party) setFormErrors(prev => ({ ...prev, party: undefined }));
                          }}
                          className="p-2.5 hover:bg-red-50/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                              {p.avatarText || p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">{p.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {p.type} {p.phone ? `• ${p.phone}` : ''}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-red-600 shrink-0 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                            Select
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Row 3: TYPE* Dropdown */}
              <div className="relative pt-1.5" ref={typeDropdownRef}>
                <div 
                  onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                  className="relative border border-slate-300 rounded-xl px-3.5 h-12 flex items-center justify-between bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 cursor-pointer transition-all"
                >
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                    TYPE <span className="text-red-500">*</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-800">{requestType || 'Select Request Type'}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180 text-red-600' : ''}`} />
                </div>

                {isTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {PAYMENT_REQUEST_TYPES.map(typeOpt => (
                      <div
                        key={typeOpt}
                        onClick={() => {
                          setRequestType(typeOpt);
                          setIsTypeDropdownOpen(false);
                        }}
                        className={`p-2.5 text-xs font-medium cursor-pointer transition-colors flex items-center justify-between ${
                          requestType === typeOpt ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{typeOpt}</span>
                        {requestType === typeOpt && <Check className="w-3.5 h-3.5 text-red-600" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 4: AMOUNT* and DUE DATE* */}
              <div className="grid grid-cols-2 gap-3">
                {/* AMOUNT * */}
                <div className="relative pt-1.5">
                  <div className={`relative border rounded-xl px-3.5 h-12 flex items-center bg-white group transition-all ${
                    formErrors.amount ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500'
                  }`}>
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                      AMOUNT <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="0"
                      value={amount}
                      onChange={e => {
                        setAmount(e.target.value);
                        if (formErrors.amount) setFormErrors(prev => ({ ...prev, amount: undefined }));
                      }}
                      className="w-full text-xs sm:text-sm font-bold text-slate-900 focus:outline-none bg-transparent pr-12"
                    />
                    {/* Currency indicator pill */}
                    <div className="absolute right-2 px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 select-none pointer-events-none">
                      <span>₹</span>
                      <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                    </div>
                  </div>
                  {formErrors.amount && (
                    <p className="text-[10px] text-red-500 mt-1 font-medium">{formErrors.amount}</p>
                  )}
                </div>

                {/* DUE DATE * */}
                <div className="relative pt-1.5">
                  <div className="relative border border-slate-300 rounded-xl px-3.5 h-12 flex items-center bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                      DUE DATE
                    </span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 focus:outline-none bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: NOTES */}
              <div className="relative pt-1.5">
                <div className="relative border border-slate-300 rounded-xl p-3 bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                    NOTES
                  </span>
                  <textarea
                    rows={3}
                    placeholder="Enter notes, justification, or invoice reference..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 focus:outline-none bg-transparent resize-none"
                  />
                </div>
              </div>

              {/* Row 6: Upload Files (Matching Image 2) */}
              <div>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-red-500 rounded-xl py-6 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-red-600 transition-all cursor-pointer bg-slate-50/50 hover:bg-red-50/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Upload Files</span>
                    <CloudUpload className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                </button>

                {/* Uploaded File Tags */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="font-medium text-slate-800 truncate">{file.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer ml-2"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* 3. Bottom Footer Bar with Red & White Actions */}
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setStep('select_project')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ← Back to Projects
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-all cursor-pointer uppercase tracking-wider"
                >
                  Save Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
