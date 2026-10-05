import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Phone, MapPin, Upload, Trash2, CheckCircle2, 
  MoreVertical, Plus, Calendar, Store, Users, BarChart2, 
  Check, ChevronDown, BookOpen, Layers, Gift, Trophy, Bell, 
  ExternalLink, FileText, Clock, Shield, Sliders, CreditCard, 
  Key, Zap, X, AlertTriangle, ArrowRight, Sparkles, CheckSquare,
  LayoutGrid, ShoppingCart, Truck, ClipboardCheck, Calculator,
  UserCheck, Search, RefreshCw, ShieldCheck, ListTodo, Settings as SettingsIcon,
  SlidersHorizontal, Home, Edit2, Lock, Eye, EyeOff, User as UserIcon, KeyRound, UserPlus,
  Image as ImageIcon, PenTool, Info, CheckCircle, Landmark
} from 'lucide-react';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { Role } from '../types';
import { 
  ALL_SYSTEM_MODULES, 
  getStoredRolePermissions, 
  saveStoredRolePermission, 
  resetRolePermissions,
  RoleAccessPermission,
  SystemModule
} from '../lib/roleAccess';
import { MOCK_ROLES } from '../lib/mockData';
import { 
  getStaffMembers, 
  markStaffLoginCreated, 
  StaffMember,
  getStaffAllocatedProjects,
  toggleStaffProjectAllocation,
  removeAllStaffProjectAllocations,
  saveStaffMember,
  deleteStaffMember,
  clearAllStaffMembers
} from '../lib/staffService';
import { getUserAccounts, saveUserAccount, deleteUserAccount, UserAccount, syncStaffRoleToAccount } from '../lib/authService';
import { ORGANIZATION_DEPARTMENTS } from '../lib/departmentService';
import { confirmAction } from '../lib/dialogService';
import { 
  getTermsConditions, 
  saveTermsConditions, 
  saveInvoiceTerms, 
  saveQuotationTerms, 
  saveSubconTerms, 
  saveBOQTerms, 
  savePurchaseOrderTerms 
} from '../lib/termsService';
import { HolidaysManager } from '../components/HolidaysManager';

interface Branch {
  id: string;
  name: string;
  isPrimary: boolean;
  address: string;
  gstNumber: string;
  city: string;
}

interface SettingsViewProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  activeRole?: Role;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  activeRole,
}) => {
  // Navigation State
  const [activeNav, setActiveNav] = useState<string>('company');
  const [activeCompanyTab, setActiveCompanyTab] = useState<'details' | 'branches'>('details');

  // Roles & Access subtab: 'team_access' | 'roles'
  const [rolesAccessSubTab, setRolesAccessSubTab] = useState<'team_access' | 'roles'>('team_access');
  const [searchTeamQuery, setSearchTeamQuery] = useState<string>('');
  const [staffList, setStaffList] = useState<StaffMember[]>(() => getStaffMembers());
  const [selectedStaffForProjects, setSelectedStaffForProjects] = useState<StaffMember | null>(null);
  const [showAddTeamMemberModal, setShowAddTeamMemberModal] = useState<boolean>(false);
  const [newTeamMemberForm, setNewTeamMemberForm] = useState({
    name: '',
    phone: '',
    email: '',
    role_code: 'SITE_ENGINEER',
    role_name: 'Site Engineer',
    department: 'Civil Engineering',
    password: '',
  });
  const [showMemberPassword, setShowMemberPassword] = useState<boolean>(false);

  const computeMemberAllowedPages = (roleCode: string, department: string): string[] => {
    const storedPerms = getStoredRolePermissions();
    if (storedPerms[roleCode] && Array.isArray(storedPerms[roleCode].allowedPages) && storedPerms[roleCode].allowedPages.length > 0) {
      return storedPerms[roleCode].allowedPages;
    }
    const cleanDept = (department || '').toUpperCase();
    if (cleanDept.includes('SOIL')) {
      return ['projects', 'site_ops', 'documents', 'setting', 'dept_soil', 'departments'];
    }
    if (cleanDept.includes('ARCH')) {
      return ['projects', 'departments', 'dept_architecture', 'approvals', 'documents', 'setting'];
    }
    if (cleanDept.includes('CONST') || cleanDept.includes('CIVIL')) {
      return ['projects', 'site_ops', 'workforce', 'equipment', 'dept_construction', 'documents', 'setting'];
    }
    if (cleanDept.includes('ACCOUNT') || cleanDept.includes('FINANCE')) {
      return ['finance', 'payments', 'procurement', 'approvals', 'dept_accounts', 'setting'];
    }
    if (cleanDept.includes('MARKET')) {
      return ['quotation', 'dept_marketing', 'setting'];
    }
    if (cleanDept.includes('SURVEY')) {
      return ['projects', 'site_ops', 'documents', 'setting'];
    }
    if (cleanDept.includes('MATERIAL')) {
      return ['projects', 'site_ops', 'documents', 'setting'];
    }
    if (cleanDept.includes('STRUCT')) {
      return ['projects', 'documents', 'approvals', 'setting'];
    }
    if (cleanDept.includes('GOV')) {
      return ['projects', 'site_ops', 'documents', 'setting'];
    }
    if (roleCode === 'ACCOUNTS') return ['finance', 'payments', 'procurement', 'approvals', 'setting'];
    if (roleCode === 'ARCHITECT') return ['projects', 'departments', 'approvals', 'documents', 'setting'];
    if (roleCode === 'SITE_ENGINEER') return ['projects', 'site_ops', 'payments', 'documents', 'approvals', 'setting'];
    if (roleCode === 'SUPERVISOR') return ['projects', 'workforce', 'site_ops', 'documents', 'approvals', 'setting'];
    return ['projects', 'site_ops', 'documents', 'setting'];
  };

  useEffect(() => {
    const handleUpdate = () => {
      setStaffList(getStaffMembers());
    };
    window.addEventListener('booshnam_staff_updated', handleUpdate);
    window.addEventListener('booshnam_projects_updated', handleUpdate);
    return () => {
      window.removeEventListener('booshnam_staff_updated', handleUpdate);
      window.removeEventListener('booshnam_projects_updated', handleUpdate);
    };
  }, []);

  // ── Document & Fields (Terms & Conditions) State ──
  const [docFieldsTab, setDocFieldsTab] = useState<'pdf_template' | 'terms_conditions' | 'number_format'>('terms_conditions');
  const [termsData, setTermsData] = useState(() => getTermsConditions());
  const [invoiceTermsInput, setInvoiceTermsInput] = useState(() => getTermsConditions().invoiceTerms);
  const [quotationTermsInput, setQuotationTermsInput] = useState(() => getTermsConditions().quotationTerms);
  const [subconTermsInput, setSubconTermsInput] = useState(() => getTermsConditions().subconTerms);
  const [boqTermsInput, setBoqTermsInput] = useState(() => getTermsConditions().boqTerms);
  const [poTermsInput, setPoTermsInput] = useState(() => getTermsConditions().purchaseOrderTerms);

  const [isEditingInvoiceTerms, setIsEditingInvoiceTerms] = useState(false);
  const [isEditingQuotationTerms, setIsEditingQuotationTerms] = useState(false);

  const [showSubconBox, setShowSubconBox] = useState(() => Boolean(getTermsConditions().subconTerms));
  const [showBoqBox, setShowBoqBox] = useState(() => Boolean(getTermsConditions().boqTerms));
  const [showPoBox, setShowPoBox] = useState(() => Boolean(getTermsConditions().purchaseOrderTerms));

  const [invoiceSavedTick, setInvoiceSavedTick] = useState(false);
  const [quotationSavedTick, setQuotationSavedTick] = useState(false);

  // Number format states
  const [invPrefix, setInvPrefix] = useState('INV-2026-');
  const [quoPrefix, setQuoPrefix] = useState('QBAG_');
  const [poPrefix, setPoPrefix] = useState('PO-2026-');

  // PDF Template states
  const [showLetterheadHeader, setShowLetterheadHeader] = useState(true);
  const [showBankDetailsOnPdf, setShowBankDetailsOnPdf] = useState(true);
  const [showNablBadge, setShowNablBadge] = useState(true);
  const [showAuthorizedSignatory, setShowAuthorizedSignatory] = useState(true);

  useEffect(() => {
    const handleSync = (e: any) => {
      const data = e.detail || getTermsConditions();
      setTermsData(data);
      setInvoiceTermsInput(data.invoiceTerms);
      setQuotationTermsInput(data.quotationTerms);
      setSubconTermsInput(data.subconTerms);
      setBoqTermsInput(data.boqTerms);
      setPoTermsInput(data.purchaseOrderTerms);
      if (data.subconTerms) setShowSubconBox(true);
      if (data.boqTerms) setShowBoqBox(true);
      if (data.purchaseOrderTerms) setShowPoBox(true);
    };
    window.addEventListener('booshnam_terms_updated', handleSync);
    return () => window.removeEventListener('booshnam_terms_updated', handleSync);
  }, []);

  const handleSaveInvoiceTermsOnly = () => {
    saveInvoiceTerms(invoiceTermsInput);
    setIsEditingInvoiceTerms(false);
    setInvoiceSavedTick(true);
    setTimeout(() => setInvoiceSavedTick(false), 3000);
    showToast('Invoice Terms & Conditions saved! Will automatically appear on all generated invoices.');
  };

  const handleSaveQuotationTermsOnly = () => {
    saveQuotationTerms(quotationTermsInput);
    setIsEditingQuotationTerms(false);
    setQuotationSavedTick(true);
    setTimeout(() => setQuotationSavedTick(false), 3000);
    showToast('Quotation Terms & Conditions saved! Will automatically appear on all generated quotations.');
  };

  const handleSaveAllTermsAndConditions = () => {
    saveTermsConditions({
      invoiceTerms: invoiceTermsInput,
      quotationTerms: quotationTermsInput,
      subconTerms: subconTermsInput,
      boqTerms: boqTermsInput,
      purchaseOrderTerms: poTermsInput,
      invoiceTermsUpdatedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      quotationTermsUpdatedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      subconTermsUpdatedAt: showSubconBox ? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      boqTermsUpdatedAt: showBoqBox ? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      purchaseOrderTermsUpdatedAt: showPoBox ? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    });
    setIsEditingInvoiceTerms(false);
    setIsEditingQuotationTerms(false);
    setInvoiceSavedTick(true);
    setQuotationSavedTick(true);
    setTimeout(() => {
      setInvoiceSavedTick(false);
      setQuotationSavedTick(false);
    }, 3000);
    showToast('All Terms & Conditions saved successfully! Both Invoices and Quotations updated.');
  };

  const allProjects = useMemo(() => {
    try {
      const raw = localStorage.getItem('booshnam_projects_v2');
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) {
          return p.filter((x: any) => 
            !x.id?.startsWith('proj-') &&
            !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (x.name || x.title || x.client_name || '').includes(t))
          );
        }
      }
    } catch (e) {}
    return [];
  }, [staffList]);

  const filteredTeamMembers = useMemo(() => {
    if (!searchTeamQuery.trim()) return staffList;
    const q = searchTeamQuery.toLowerCase().trim();
    return staffList.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      s.role_name.toLowerCase().includes(q) ||
      s.employee_code.toLowerCase().includes(q)
    );
  }, [staffList, searchTeamQuery]);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. Company Details State
  const [companyDetails, setCompanyDetails] = useState({
    name: 'Booshnam Associates Pvt Ltd',
    phone: '9629631255',
    address: 'Plot No.8, Door No.2, LIC Colony, 6th Street, (Near Shankar Nagar, Pammal), Anakaputhur ,Chennai, Tamil Nadu - 600075',
  });

  // Assets state (Logo, Signature, Stamp) - Persisted in localStorage across refreshes
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('booshnam_asset_logo_url') || null;
  });
  const [hasLogo, setHasLogo] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('booshnam_asset_logo_deleted') !== 'true';
  });

  const [signatureUrl, setSignatureUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('booshnam_asset_signature_url') || null;
  });
  const [hasSignature, setHasSignature] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('booshnam_asset_signature_deleted') !== 'true';
  });

  const [stampUrl, setStampUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('booshnam_asset_stamp_url') || null;
  });
  const [hasStamp, setHasStamp] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('booshnam_asset_stamp_deleted') !== 'true';
  });

  // Handlers for Logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoUrl(dataUrl);
      setHasLogo(true);
      try {
        localStorage.setItem('booshnam_asset_logo_url', dataUrl);
        localStorage.removeItem('booshnam_asset_logo_deleted');
      } catch (err) {
        console.warn('Failed to save logo to localStorage', err);
      }
      showToast('Logo uploaded successfully');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteLogo = async () => {
    const confirmed = await confirmAction({
      title: 'Remove Company Logo',
      message: 'Are you sure you want to remove the company logo from branding & official documents?',
      confirmText: 'Remove Logo',
      cancelText: 'Keep Logo',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;
    setHasLogo(false);
    setLogoUrl(null);
    try {
      localStorage.setItem('booshnam_asset_logo_deleted', 'true');
      localStorage.removeItem('booshnam_asset_logo_url');
    } catch (err) {
      console.warn('Failed to delete logo in localStorage', err);
    }
    showToast('Logo removed completely');
  };

  // Handlers for Signature
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSignatureUrl(dataUrl);
      setHasSignature(true);
      try {
        localStorage.setItem('booshnam_asset_signature_url', dataUrl);
        localStorage.removeItem('booshnam_asset_signature_deleted');
      } catch (err) {
        console.warn('Failed to save signature to localStorage', err);
      }
      showToast('Signature uploaded successfully');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteSignature = async () => {
    const confirmed = await confirmAction({
      title: 'Remove Digital Signature',
      message: 'Are you sure you want to remove the authorized digital signature from reports?',
      confirmText: 'Remove Signature',
      cancelText: 'Keep Signature',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;
    setHasSignature(false);
    setSignatureUrl(null);
    try {
      localStorage.setItem('booshnam_asset_signature_deleted', 'true');
      localStorage.removeItem('booshnam_asset_signature_url');
    } catch (err) {
      console.warn('Failed to delete signature in localStorage', err);
    }
    showToast('Signature removed completely');
  };

  // Handlers for Stamp
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setStampUrl(dataUrl);
      setHasStamp(true);
      try {
        localStorage.setItem('booshnam_asset_stamp_url', dataUrl);
        localStorage.removeItem('booshnam_asset_stamp_deleted');
      } catch (err) {
        console.warn('Failed to save stamp to localStorage', err);
      }
      showToast('Stamp uploaded successfully');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteStamp = async () => {
    const confirmed = await confirmAction({
      title: 'Remove Company Stamp',
      message: 'Are you sure you want to remove the official company seal / stamp?',
      confirmText: 'Remove Stamp',
      cancelText: 'Keep Stamp',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;
    setHasStamp(false);
    setStampUrl(null);
    try {
      localStorage.setItem('booshnam_asset_stamp_deleted', 'true');
      localStorage.removeItem('booshnam_asset_stamp_url');
    } catch (err) {
      console.warn('Failed to delete stamp in localStorage', err);
    }
    showToast('Stamp removed completely');
  };

  // Leave company modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // 2. Branches State
  const [branches, setBranches] = useState<Branch[]>([
    {
      id: 'b-1',
      name: 'Pammal, Chennai-600075',
      isPrimary: true,
      address: 'Plot No.8, Door No.2, LIC Colony, 6th Street, (Near Shankar Nagar, Pammal), Anakaputhur Chennai, Tamil Nadu - 600075',
      gstNumber: '33AAKCB8628A1ZW',
      city: 'Chennai'
    }
  ]);

  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchForm, setNewBranchForm] = useState({
    name: '',
    gst: '',
    googleAddress: '',
    addressLine1: '',
    city: '',
    state: '',
    zip: '',
    country: 'India'
  });

  const [openBranchMenuId, setOpenBranchMenuId] = useState<string | null>(null);



  // Handle Branch creation
  const handleCreateBranch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newBranchForm.name.trim()) {
      showToast('Please enter a branch name');
      return;
    }

    const constructedAddress = [
      newBranchForm.addressLine1,
      newBranchForm.city,
      newBranchForm.state ? `${newBranchForm.state} - ${newBranchForm.zip}` : newBranchForm.zip,
      newBranchForm.country
    ].filter(Boolean).join(', ') || newBranchForm.googleAddress || 'New Branch Location';

    const newBranch: Branch = {
      id: `b-${Date.now()}`,
      name: newBranchForm.name,
      isPrimary: false,
      address: constructedAddress,
      gstNumber: newBranchForm.gst || '33AAKCB8628A1ZW',
      city: newBranchForm.city || 'Chennai'
    };

    setBranches(prev => [...prev, newBranch]);
    setShowNewBranchModal(false);
    setNewBranchForm({
      name: '',
      gst: '',
      googleAddress: '',
      addressLine1: '',
      city: '',
      state: '',
      zip: '',
      country: 'India'
    });
    showToast(`Branch "${newBranch.name}" created successfully`);
  };

  const handleSetPrimaryBranch = (id: string) => {
    setBranches(prev => prev.map(b => ({
      ...b,
      isPrimary: b.id === id
    })));
    setOpenBranchMenuId(null);
    showToast('Primary branch updated');
  };

  const handleDeleteBranch = async (id: string) => {
    if (branches.length <= 1) {
      showToast('Cannot delete the only branch');
      return;
    }
    const branch = branches.find(b => b.id === id);
    const confirmed = await confirmAction({
      title: 'Delete Branch Location',
      message: `Are you sure you want to delete branch "${branch?.name || 'this branch'}"?\nThis action cannot be undone.`,
      confirmText: 'Delete Branch',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;
    setBranches(prev => prev.filter(b => b.id !== id));
    setOpenBranchMenuId(null);
    showToast('Branch deleted');
  };

  // 4. Roles & Granular Permissions State
  const [rolePermissions, setRolePermissions] = useState<Record<string, RoleAccessPermission>>(() => getStoredRolePermissions());
  const [searchRoleQuery, setSearchRoleQuery] = useState('');

  // Create / Configure Access Modal State
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [modalRoleCode, setModalRoleCode] = useState<string>('ADMIN');
  const [modalDepartment, setModalDepartment] = useState<string>('Soil Investigation');
  const [isCreatingNewRole, setIsCreatingNewRole] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRoleDesc, setCustomRoleDesc] = useState('');
  const [modalSelectedPages, setModalSelectedPages] = useState<string[]>([]);
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>('all');

  // Staff and User Credential Creation State
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => getStaffMembers());
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL_STAFF');
  const [staffUsername, setStaffUsername] = useState<string>('');
  const [staffPassword, setStaffPassword] = useState<string>('password123');
  const [staffConfirmPassword, setStaffConfirmPassword] = useState<string>('password123');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [staffSearchText, setStaffSearchText] = useState('');

  const openCreateAccessModal = (targetCode?: string, targetStaffId?: string) => {
    setModalStep(1);
    const latestStaff = getStaffMembers();
    setStaffMembers(latestStaff);

    if (targetStaffId) {
      const foundStaff = latestStaff.find(s => s.id === targetStaffId);
      if (foundStaff) {
        setSelectedStaffId(foundStaff.id);
        setModalRoleCode(foundStaff.role_code);
        setStaffUsername(foundStaff.username || foundStaff.name.toLowerCase().replace(/[^a-z0-9]/g, '.'));
        setModalDepartment(foundStaff.department || 'Soil Investigation');
      }
    } else {
      setSelectedStaffId('ALL_STAFF');
      setStaffUsername('');
      if (targetCode && (rolePermissions[targetCode] as any)?.department) {
        setModalDepartment((rolePermissions[targetCode] as any).department);
      } else {
        setModalDepartment('Soil Investigation');
      }
    }

    if (targetCode && rolePermissions[targetCode]) {
      setIsCreatingNewRole(false);
      setModalRoleCode(targetCode);
      setModalSelectedPages(rolePermissions[targetCode].allowedPages || []);
      if ((rolePermissions[targetCode] as any).department) {
        setModalDepartment((rolePermissions[targetCode] as any).department);
      }
    } else {
      const target = targetCode || 'ADMIN';
      setIsCreatingNewRole(false);
      setModalRoleCode(target);
      setModalSelectedPages(rolePermissions[target]?.allowedPages || ALL_SYSTEM_MODULES.map(m => m.id));
      if ((rolePermissions[target] as any)?.department) {
        setModalDepartment((rolePermissions[target] as any).department);
      }
    }
    setStaffPassword('password123');
    setStaffConfirmPassword('password123');
    setModalCategoryFilter('all');
    setShowAccessModal(true);
  };

  const handleSelectStaffInModal = (staffId: string) => {
    setSelectedStaffId(staffId);
    if (staffId === 'ALL_STAFF') {
      setStaffUsername('');
      return;
    }
    const staff = staffMembers.find(s => s.id === staffId);
    if (staff) {
      setModalRoleCode(staff.role_code);
      if (staff.department) {
        setModalDepartment(staff.department);
      }
      const suggestedUsername = staff.username || staff.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
      setStaffUsername(suggestedUsername);

      // Check if this staff already has an existing account
      const accounts = getUserAccounts();
      const existingAcc = accounts.find(a => a.staff_id === staff.id || a.username.toLowerCase() === suggestedUsername.toLowerCase());
      if (existingAcc) {
        if (existingAcc.department) {
          setModalDepartment(existingAcc.department);
        }
        setModalSelectedPages(existingAcc.allowedPages);
        setStaffPassword(existingAcc.password);
        setStaffConfirmPassword(existingAcc.password);
      } else {
        const rolePerm = rolePermissions[staff.role_code];
        if (rolePerm) {
          setModalSelectedPages(rolePerm.allowedPages);
          if ((rolePerm as any).department) {
            setModalDepartment((rolePerm as any).department);
          }
        }
      }
    }
  };

  const handleModalRoleChange = (code: string) => {
    if (code === '__NEW__') {
      setIsCreatingNewRole(true);
      setCustomRoleName('');
      setCustomRoleDesc('');
      setModalSelectedPages(['projects', 'documents', 'setting']);
    } else {
      setIsCreatingNewRole(false);
      setModalRoleCode(code);
      const perm = rolePermissions[code];
      setModalSelectedPages(perm ? perm.allowedPages : ALL_SYSTEM_MODULES.map(m => m.id));
      if ((perm as any)?.department) {
        setModalDepartment((perm as any).department);
      }
    }
  };

  const handleToggleModulePage = (pageId: string) => {
    setModalSelectedPages(prev => 
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const handleSelectAllModalPages = () => {
    setModalSelectedPages(ALL_SYSTEM_MODULES.map(m => m.id));
  };

  const handleDeselectAllModalPages = () => {
    setModalSelectedPages([]);
  };

  // Step 1 -> Step 2 transition
  const handleProceedToCredentials = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedStaffId === 'ALL_STAFF') {
      // Just save the generic role default
      handleSaveRoleAccess();
      return;
    }
    // Proceed to Step 2 to configure Username and Password
    const targetStaff = staffMembers.find(s => s.id === selectedStaffId);
    if (targetStaff && !staffUsername) {
      setStaffUsername(targetStaff.username || targetStaff.name.toLowerCase().replace(/[^a-z0-9]/g, '.'));
    }
    setModalStep(2);
  };

  // Step 2: Final Save with Username & Password
  const handleFinalSaveAccount = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!staffUsername.trim()) {
      showToast('Please enter a username for this staff member');
      return;
    }
    if (staffPassword.length < 4) {
      showToast('Password must be at least 4 characters');
      return;
    }
    if (staffPassword !== staffConfirmPassword) {
      showToast('Passwords do not match');
      return;
    }

    const targetStaff = staffMembers.find(s => s.id === selectedStaffId);
    const roleObj = MOCK_ROLES.find(r => r.code === modalRoleCode) || { name: modalRoleCode };

    const newAccount: UserAccount = {
      id: `usr-${Date.now()}`,
      username: staffUsername.trim().toLowerCase(),
      password: staffPassword.trim(),
      phone: targetStaff?.phone || '',
      staff_id: targetStaff?.id,
      staff_name: targetStaff?.name || customRoleName || 'Staff Member',
      staff_code: targetStaff?.employee_code || 'EMP-SITE',
      role_code: modalRoleCode,
      role_name: roleObj.name,
      department: modalDepartment,
      allowedPages: modalSelectedPages,
      created_at: new Date().toISOString().split('T')[0]
    };

    saveUserAccount(newAccount);
    if (targetStaff) {
      const updatedStaff: StaffMember = {
        ...targetStaff,
        department: modalDepartment,
        role_code: modalRoleCode,
        role_name: roleObj.name
      };
      saveStaffMember(updatedStaff);
      markStaffLoginCreated(targetStaff.id, newAccount.username);
    }

    // Also update role permission defaults
    if (rolePermissions[modalRoleCode]) {
      const updatedPerm: RoleAccessPermission = {
        ...rolePermissions[modalRoleCode],
        allowedPages: modalSelectedPages,
        department: modalDepartment
      };
      saveStoredRolePermission(updatedPerm);
      setRolePermissions(getStoredRolePermissions());
    }

    setShowAccessModal(false);
    showToast(`Access & login created for "${newAccount.staff_name}" (${modalDepartment})`);
  };

  const handleSaveRoleAccess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isCreatingNewRole) {
      if (!customRoleName.trim()) {
        showToast('Please enter a role name');
        return;
      }
      const generatedCode = customRoleName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const newPerm: RoleAccessPermission = {
        roleCode: generatedCode,
        roleName: customRoleName.trim(),
        description: customRoleDesc.trim() || 'Custom operational role',
        allowedPages: modalSelectedPages,
        department: modalDepartment,
        isSystemRole: false
      };
      saveStoredRolePermission(newPerm);
      setRolePermissions(getStoredRolePermissions());
      setShowAccessModal(false);
      showToast(`Role "${newPerm.roleName}" access created for ${modalDepartment}`);
    } else {
      const existing = rolePermissions[modalRoleCode];
      if (!existing) return;
      const updated: RoleAccessPermission = {
        ...existing,
        allowedPages: modalSelectedPages,
        department: modalDepartment
      };
      saveStoredRolePermission(updated);
      setRolePermissions(getStoredRolePermissions());
      setShowAccessModal(false);
      showToast(`Access permissions saved for "${updated.roleName}" (${modalDepartment})`);
    }
  };

  const handleResetDefaults = async () => {
    const confirmed = await confirmAction({
      title: 'Reset Role Permissions',
      message: 'Are you sure you want to reset all role access permissions to system defaults?\nAny custom permissions configured for roles will be overwritten.',
      confirmText: 'Reset to Defaults',
      cancelText: 'Cancel',
      variant: 'warning',
      icon: 'alert'
    });
    if (confirmed) {
      const reset = resetRolePermissions();
      setRolePermissions(reset);
      showToast('All role permissions reset to default');
    }
  };

  const getModuleIconComponent = (id: string) => {
    switch (id) {
      case 'dashboard': return LayoutGrid;
      case 'projects': return Home;
      case 'departments': return Layers;
      case 'clients': return UserCheck;
      case 'workforce': return Users;
      case 'finance': return Landmark;
      case 'payments': return CreditCard;
      case 'procurement': return ShoppingCart;
      case 'equipment': return Truck;
      case 'documents': return BookOpen;
      case 'approvals': return ShieldCheck;
      case 'site_ops': return FileText;
      case 'setting': return SettingsIcon;
      default: return Layers;
    }
  };

  // Nav Items in Settings horizontal navigation bar
  const navItems = [
    { id: 'company', label: 'Company' },
    { id: 'document_fields', label: 'Document & Fields' },
    { id: 'roles_access', label: 'Roles & Access' },
    { id: 'holidays', label: 'Holidays & Week Offs' },
  ];

  const primaryBranch = branches.find(b => b.isPrimary) || branches[0];
  const otherBranchesCount = branches.filter(b => !b.isPrimary).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white min-h-screen pb-16">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h1 className="text-[21px] font-bold text-[#262626] font-heading tracking-tight">
              Company Settings
            </h1>
          </div>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-4">
            <UserProfileDropdown showBell={true} onShowToast={showToast} />
          </div>
        </div>

        {/* Horizontal Navigation Row directly below Header */}
        <div className="px-4 sm:px-6 bg-white">
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-2.5">
            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  type="button"
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border ${
                    isActive
                      ? 'bg-red-50 text-red-600 font-bold border-red-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium border-transparent'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Settings Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        {activeNav === 'holidays' && (
          <div className="w-full min-w-0">
            <HolidaysManager onShowToast={showToast} />
          </div>
        )}
        {/* Settings Content Panel */}
        {activeNav !== 'holidays' && (
          <main className="w-full min-w-0 bg-white rounded-xl border border-slate-200 shadow-2xs p-6 md:p-8">
          {activeNav === 'company' && (
            <div>
              {/* Horizontal Tabs: Company Details | Branches | Business Profile */}
              <div className="flex items-center border-b border-slate-200 gap-8 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveCompanyTab('details')}
                  className={`pb-3 text-sm font-semibold transition-colors cursor-pointer relative ${
                    activeCompanyTab === 'details'
                      ? 'text-slate-900 border-b-2 border-red-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Company Details
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCompanyTab('branches')}
                  className={`pb-3 text-sm font-semibold transition-colors cursor-pointer relative ${
                    activeCompanyTab === 'branches'
                      ? 'text-slate-900 border-b-2 border-red-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Branches
                </button>


              </div>

              {/* TAB 1: Company Details */}
              {activeCompanyTab === 'details' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <h2 className="text-base font-semibold text-slate-800">
                    Enter your Company details
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Form: Inputs and Save Button */}
                    <div className="lg:col-span-8 space-y-6">
                      {/* Company Name */}
                      <div className="relative">
                        <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={companyDetails.name}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="relative">
                        <div className="absolute -top-2.5 left-3 px-1.5 bg-white flex items-center gap-1.5 z-10">
                          <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                            Phone Number (10 Digits)
                          </label>
                          {companyDetails.phone && (
                            <span className={`text-[9px] tracking-tight font-bold ${companyDetails.phone.length === 10 ? 'text-green-600' : 'text-amber-600'}`}>
                              {companyDetails.phone.length}/10
                            </span>
                          )}
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          placeholder="e.g. 9840123456"
                          value={companyDetails.phone}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          onKeyDown={(e) => {
                            if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
                            if (e.ctrlKey || e.metaKey) return;
                            if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10);
                            setCompanyDetails({ ...companyDetails, phone: paste });
                          }}
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                        />
                      </div>

                      {/* Company Primary Address */}
                      <div className="relative">
                        <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                          Company Primary Address
                        </label>
                        <textarea
                          rows={3}
                          value={companyDetails.address}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, address: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors resize-none"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <button
                          type="button"
                          onClick={() => showToast('Company details saved successfully')}
                          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowLeaveModal(true)}
                          className="px-4 py-2 rounded-lg border border-red-400 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Leave Company</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Logo, Signature, Stamp */}
                    <div className="lg:col-span-4 space-y-8 lg:pl-4">
                      {/* Your Logo */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-700">Your Logo</div>
                        <div className={`w-36 h-36 rounded-2xl flex flex-col items-center justify-center p-3 shadow-2xs relative group overflow-hidden transition-all ${
                          hasLogo
                            ? logoUrl
                              ? 'bg-white border border-slate-200'
                              : 'bg-red-600 text-white'
                            : 'bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400'
                        }`}>
                          {hasLogo ? (
                            logoUrl ? (
                              <img src={logoUrl} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <div className="text-center select-none">
                                <div className="w-7 h-7 mx-auto mb-1.5 border-2 border-white rounded-md flex items-center justify-center">
                                  <Building2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="font-black text-xs tracking-wider uppercase">BOOSHNAM</div>
                                <div className="text-[9px] tracking-widest text-red-100 font-light uppercase mt-0.5">ASSOCIATES</div>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-center p-2">
                              <ImageIcon className="w-6 h-6 text-slate-300 stroke-[1.5]" />
                              <span className="text-[11px] text-slate-400 font-medium">No Logo</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs pt-1">
                          <label className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Logo</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleLogoUpload} 
                            />
                          </label>
                          {hasLogo && (
                            <button
                              type="button"
                              onClick={handleDeleteLogo}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                              title="Delete Logo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Your Signature */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-700">Your Signature</div>
                        <div className={`w-48 h-24 rounded-xl border flex items-center justify-center p-2 relative shadow-2xs overflow-hidden transition-all ${
                          hasSignature
                            ? 'border-slate-200 bg-white'
                            : 'bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400'
                        }`}>
                          {hasSignature ? (
                            signatureUrl ? (
                              <img src={signatureUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <svg className="w-40 h-20 text-[#1e40af]" viewBox="0 0 160 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M 20 60 C 40 40, 50 15, 70 25 C 90 35, 75 70, 65 75 C 60 78, 62 55, 80 45 C 95 38, 110 50, 140 20" />
                                <path d="M 60 30 L 75 75" />
                                <path d="M 72 45 L 85 55" />
                                <circle cx="95" cy="52" r="1.5" fill="currentColor" />
                              </svg>
                            )
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-center">
                              <PenTool className="w-5 h-5 text-slate-300 stroke-[1.5]" />
                              <span className="text-[11px] text-slate-400 font-medium">No Signature</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs pt-1">
                          <label className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Signature</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleSignatureUpload} 
                            />
                          </label>
                          {hasSignature && (
                            <button
                              type="button"
                              onClick={handleDeleteSignature}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                              title="Delete Signature"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Stamp */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-700">Stamp</div>
                        <div className={`w-32 h-32 rounded-xl border flex items-center justify-center p-2 relative shadow-2xs overflow-hidden transition-all ${
                          hasStamp
                            ? 'border-slate-200 bg-white'
                            : 'bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400'
                        }`}>
                          {hasStamp ? (
                            stampUrl ? (
                              <img src={stampUrl} alt="Company Stamp" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <div className="w-28 h-28 rounded-full border-2 border-[#1e40af] p-1 flex items-center justify-center text-center text-[#1e40af] select-none transform -rotate-6">
                                <div className="w-full h-full rounded-full border border-dashed border-[#1e40af] flex flex-col items-center justify-center p-1">
                                  <div className="text-[7px] font-black uppercase tracking-tighter leading-tight">BOOSHNAM ASSOCIATES</div>
                                  <div className="text-[6px] font-bold uppercase tracking-wider text-slate-700">PRIVATE LIMITED</div>
                                  <div className="w-16 h-px bg-[#1e40af] my-0.5" />
                                  <div className="text-[8px] font-extrabold uppercase">CHENNAI</div>
                                  <div className="text-[7px] font-bold">600075</div>
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-center">
                              <CheckSquare className="w-5 h-5 text-slate-300 stroke-[1.5]" />
                              <span className="text-[11px] text-slate-400 font-medium">No Stamp</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs pt-1">
                          <label className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Stamp</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleStampUpload} 
                            />
                          </label>
                          {hasStamp && (
                            <button
                              type="button"
                              onClick={handleDeleteStamp}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                              title="Delete Stamp"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Branches */}
              {activeCompanyTab === 'branches' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Top Metric Container Matching Screenshot 2 */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1">
                      {/* Metric 1: Total Branches */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[11px] font-medium text-slate-500">Total Branches</div>
                          <div className="text-xl font-bold text-slate-900">{branches.length}</div>
                          <div className="text-[10px] text-slate-400">Active branches</div>
                        </div>
                      </div>

                      {/* Metric 2: Primary Branch */}
                      <div className="flex items-center gap-3.5 sm:border-l sm:border-slate-100 sm:pl-6">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <Check className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-slate-500">Primary Branch</div>
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {primaryBranch?.name || 'Chennai'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {primaryBranch?.city || 'Chennai'}
                          </div>
                        </div>
                      </div>

                      {/* Metric 3: Other Branches */}
                      <div className="flex items-center gap-3.5 sm:border-l sm:border-slate-100 sm:pl-6">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[11px] font-medium text-slate-500">Other Branches</div>
                          <div className="text-xl font-bold text-slate-900">{otherBranchesCount}</div>
                          <div className="text-[10px] text-slate-400">Across locations</div>
                        </div>
                      </div>
                    </div>

                    {/* + New Branch Button */}
                    <div className="shrink-0 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowNewBranchModal(true)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New Branch</span>
                      </button>
                    </div>
                  </div>

                  {/* Branch Cards List */}
                  <div className="space-y-4">
                    {branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs hover:shadow-xs transition-all"
                      >
                        {/* Left Side: Avatar Initials + Branch Info */}
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-700 border border-red-200 font-bold text-sm flex items-center justify-center shrink-0">
                            {branch.name.substring(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-900">
                                {branch.name}
                              </h3>
                              {branch.isPrimary && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-md">
                                  Primary
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                              {branch.address}
                            </p>
                          </div>
                        </div>

                        {/* Right Side: Badges & 3-Dots Menu */}
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center relative">
                          {branch.isPrimary && (
                            <span className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-medium rounded-lg">
                              Primary Address
                            </span>
                          )}

                          <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs tracking-tight font-medium rounded-lg">
                            GST: {branch.gstNumber}
                          </span>

                          {/* 3-Dots Menu */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenBranchMenuId(openBranchMenuId === branch.id ? null : branch.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openBranchMenuId === branch.id && (
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-xs">
                                {!branch.isPrimary && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryBranch(branch.id)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 transition-colors"
                                  >
                                    Set as Primary
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenBranchMenuId(null);
                                    showToast('Branch edit mode opened');
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 transition-colors"
                                >
                                  Edit Branch
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBranch(branch.id)}
                                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 transition-colors"
                                >
                                  Delete Branch
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              DOCUMENT & FIELDS SECTION (With Terms & Conditions)
          ═════════════════════════════════════════════════════════════ */}
          {activeNav === 'document_fields' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Top Horizontal Tabs: PDF Template | Terms & Conditions | Number Format */}
              <div className="flex items-center border-b border-slate-200 gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
                {[
                  { id: 'pdf_template', label: 'PDF Template' },
                  { id: 'terms_conditions', label: 'Terms & Conditions' },
                  { id: 'number_format', label: 'Number Format' },
                ].map((tab) => {
                  const isActive = docFieldsTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDocFieldsTab(tab.id as any)}
                      className={`pb-3 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap relative ${
                        isActive
                          ? 'text-red-600 border-b-2 border-red-600 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── TAB 2: TERMS & CONDITIONS (Matching User Screenshot) ── */}
              {docFieldsTab === 'terms_conditions' && (
                <div className="space-y-6 max-w-4xl">
                  {/* Title & Subtitle */}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Terms & Conditions</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Add Your Own Customised Terms & Conditions</p>
                  </div>

                  {/* 1. Invoice Terms Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">Invoice Terms</label>
                      <div className="flex items-center gap-2">
                        {invoiceSavedTick && (
                          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved to Invoices</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsEditingInvoiceTerms(!isEditingInvoiceTerms)}
                          className="text-xs font-semibold text-slate-600 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        >
                          {isEditingInvoiceTerms ? 'Done Editing' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveInvoiceTermsOnly}
                          className="px-4 py-2 min-h-[36px] bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Save Invoice Terms</span>
                        </button>
                      </div>
                    </div>

                    {/* Stylized Outlined Card with Floating INVOICE TERMS Tag */}
                    <div className="relative border border-red-200 hover:border-red-300 rounded-lg p-3.5 pt-3 bg-white focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500 transition shadow-2xs">
                      <span className="absolute -top-2 left-4 bg-white px-1.5 text-[10px] font-bold text-red-600 tracking-wider">
                        INVOICE TERMS
                      </span>
                      {isEditingInvoiceTerms ? (
                        <textarea
                          rows={3}
                          value={invoiceTermsInput}
                          onChange={(e) => setInvoiceTermsInput(e.target.value)}
                          placeholder="Enter your customized invoice terms & conditions..."
                          className="w-full text-xs text-slate-800 leading-relaxed focus:outline-none resize-none bg-transparent"
                          autoFocus
                        />
                      ) : (
                        <div 
                          onClick={() => setIsEditingInvoiceTerms(true)}
                          className="text-xs text-slate-800 leading-relaxed cursor-text min-h-[44px]"
                          title="Click to edit"
                        >
                          {invoiceTermsInput || <span className="text-slate-400 italic">No terms entered. Click to add.</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Quotation Terms Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">Quotation Terms</label>
                      <div className="flex items-center gap-2">
                        {quotationSavedTick && (
                          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved to Quotations</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsEditingQuotationTerms(!isEditingQuotationTerms)}
                          className="text-xs font-semibold text-slate-600 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        >
                          {isEditingQuotationTerms ? 'Done Editing' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveQuotationTermsOnly}
                          className="px-4 py-2 min-h-[36px] bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Save Quotation Terms</span>
                        </button>
                      </div>
                    </div>

                    {/* Stylized Outlined Card with Floating QUOTATION TERMS Tag */}
                    <div className="relative border border-red-200 hover:border-red-300 rounded-lg p-3.5 pt-3 bg-white focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500 transition shadow-2xs">
                      <span className="absolute -top-2 left-4 bg-white px-1.5 text-[10px] font-bold text-red-600 tracking-wider">
                        QUOTATION TERMS
                      </span>
                      {isEditingQuotationTerms ? (
                        <textarea
                          rows={4}
                          value={quotationTermsInput}
                          onChange={(e) => setQuotationTermsInput(e.target.value)}
                          placeholder="Enter your customized quotation terms & conditions..."
                          className="w-full text-xs text-slate-800 leading-relaxed focus:outline-none resize-none bg-transparent"
                          autoFocus
                        />
                      ) : (
                        <div 
                          onClick={() => setIsEditingQuotationTerms(true)}
                          className="text-xs text-slate-800 leading-relaxed cursor-text min-h-[56px]"
                          title="Click to edit"
                        >
                          {quotationTermsInput || <span className="text-slate-400 italic">No terms entered. Click to add.</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Subcon Terms Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">Subcon Terms</label>
                      {showSubconBox && (
                        <button
                          type="button"
                          onClick={() => {
                            saveSubconTerms(subconTermsInput);
                            showToast('Subcon Terms saved successfully!');
                          }}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-semibold rounded border border-red-200 transition"
                        >
                          Save Subcon Terms
                        </button>
                      )}
                    </div>
                    {showSubconBox ? (
                      <div className="relative border border-red-200 hover:border-red-300 rounded-lg p-3.5 pt-3 bg-white focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500 transition shadow-2xs">
                        <span className="absolute -top-2 left-4 bg-white px-1.5 text-[10px] font-bold text-red-600 tracking-wider">
                          SUBCON TERMS
                        </span>
                        <textarea
                          rows={3}
                          value={subconTermsInput}
                          onChange={(e) => setSubconTermsInput(e.target.value)}
                          placeholder="Enter Subcontractor agreement terms, milestone retention, defect liability, and site safety compliance..."
                          className="w-full text-xs text-slate-800 leading-relaxed focus:outline-none resize-none bg-transparent"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSubconBox(true)}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer underline transition-colors"
                      >
                        + Add Terms and Conditions
                      </button>
                    )}
                  </div>

                  {/* 4. BOQ Terms Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">BOQ Terms</label>
                      {showBoqBox && (
                        <button
                          type="button"
                          onClick={() => {
                            saveBOQTerms(boqTermsInput);
                            showToast('BOQ Terms saved successfully!');
                          }}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-semibold rounded border border-red-200 transition"
                        >
                          Save BOQ Terms
                        </button>
                      )}
                    </div>
                    {showBoqBox ? (
                      <div className="relative border border-red-200 hover:border-red-300 rounded-lg p-3.5 pt-3 bg-white focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500 transition shadow-2xs">
                        <span className="absolute -top-2 left-4 bg-white px-1.5 text-[10px] font-bold text-red-600 tracking-wider">
                          BOQ TERMS
                        </span>
                        <textarea
                          rows={3}
                          value={boqTermsInput}
                          onChange={(e) => setBoqTermsInput(e.target.value)}
                          placeholder="Enter BOQ measurement specifications, variation thresholds, and price escalation clauses..."
                          className="w-full text-xs text-slate-800 leading-relaxed focus:outline-none resize-none bg-transparent"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowBoqBox(true)}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer underline transition-colors"
                      >
                        + Add Terms and Conditions
                      </button>
                    )}
                  </div>

                  {/* 5. Purchase Order Terms Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">Purchase Order Terms</label>
                      {showPoBox && (
                        <button
                          type="button"
                          onClick={() => {
                            savePurchaseOrderTerms(poTermsInput);
                            showToast('Purchase Order Terms saved successfully!');
                          }}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-semibold rounded border border-red-200 transition"
                        >
                          Save PO Terms
                        </button>
                      )}
                    </div>
                    {showPoBox ? (
                      <div className="relative border border-red-200 hover:border-red-300 rounded-lg p-3.5 pt-3 bg-white focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500 transition shadow-2xs">
                        <span className="absolute -top-2 left-4 bg-white px-1.5 text-[10px] font-bold text-red-600 tracking-wider">
                          PURCHASE ORDER TERMS
                        </span>
                        <textarea
                          rows={3}
                          value={poTermsInput}
                          onChange={(e) => setPoTermsInput(e.target.value)}
                          placeholder="Enter vendor delivery timelines, GRN inspection standards, and payment credit terms..."
                          className="w-full text-xs text-slate-800 leading-relaxed focus:outline-none resize-none bg-transparent"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPoBox(true)}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer underline transition-colors"
                      >
                        + Add Terms and Conditions
                      </button>
                    )}
                  </div>

                  {/* Bottom Action Bar with Save Button matching Red & White Theme */}
                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      Changes update immediately across Invoices and Quotations.
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveAllTermsAndConditions}
                      className="px-7 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-95"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* ── TAB 1: PDF TEMPLATE ── */}
              {docFieldsTab === 'pdf_template' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">PDF Template & Letterhead Styling</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Customize letterhead headers, logos, and authorized signatory blocks on generated documents.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Booshnam Brand Header</span>
                        <input
                          type="checkbox"
                          checked={showLetterheadHeader}
                          onChange={(e) => setShowLetterheadHeader(e.target.checked)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">Includes official red header bar, company brand name, and registered address.</p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Bank Details for Direct Payment</span>
                        <input
                          type="checkbox"
                          checked={showBankDetailsOnPdf}
                          onChange={(e) => setShowBankDetailsOnPdf(e.target.checked)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">Prints HDFC Bank Account No & IFSC on invoices for immediate client transfers.</p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">NABL & ISO Quality Badges</span>
                        <input
                          type="checkbox"
                          checked={showNablBadge}
                          onChange={(e) => setShowNablBadge(e.target.checked)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">Displays official quality compliance badges on footer.</p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Digital Signatory Stamp</span>
                        <input
                          type="checkbox"
                          checked={showAuthorizedSignatory}
                          onChange={(e) => setShowAuthorizedSignatory(e.target.checked)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">Places authorized engineer and director signature stamp lines.</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => showToast('PDF Template styling preferences updated')}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-sm"
                    >
                      Save PDF Settings
                    </button>
                  </div>
                </div>
              )}

              {/* ── TAB 3: NUMBER FORMAT ── */}
              {docFieldsTab === 'number_format' && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Document Numbering & Sequences</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Define standard automatic prefixes and serial numbering for system generated files.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Prefix & Format</label>
                      <input
                        type="text"
                        value={invPrefix}
                        onChange={(e) => setInvPrefix(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs tracking-tight text-slate-800 focus:outline-none focus:border-red-600"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Preview: {invPrefix}001</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Quotation Prefix & Format</label>
                      <input
                        type="text"
                        value={quoPrefix}
                        onChange={(e) => setQuoPrefix(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs tracking-tight text-slate-800 focus:outline-none focus:border-red-600"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Preview: {quoPrefix}3078</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Order Prefix & Format</label>
                      <input
                        type="text"
                        value={poPrefix}
                        onChange={(e) => setPoPrefix(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs tracking-tight text-slate-800 focus:outline-none focus:border-red-600"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Preview: {poPrefix}042</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => showToast('Number formats saved')}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-sm"
                    >
                      Save Number Format
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}



          {activeNav === 'roles_access' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Horizontal Tabs: Team & Access | Roles (Matching Reference Screenshot) */}
              <div className="flex items-center border-b border-slate-200 gap-8 mb-4">
                <button
                  type="button"
                  onClick={() => setRolesAccessSubTab('team_access')}
                  className={`pb-3 text-sm font-semibold transition-colors cursor-pointer relative ${
                    rolesAccessSubTab === 'team_access'
                      ? 'text-slate-900 border-b-2 border-red-600 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Team & Access
                </button>

                <button
                  type="button"
                  onClick={() => setRolesAccessSubTab('roles')}
                  className={`pb-3 text-sm font-semibold transition-colors cursor-pointer relative ${
                    rolesAccessSubTab === 'roles'
                      ? 'text-slate-900 border-b-2 border-red-600 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Roles
                </button>
              </div>

              {/* ── SUBTAB 1: TEAM & ACCESS (Matching Reference Screenshot) ── */}
              {rolesAccessSubTab === 'team_access' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Title & Subtitle + Add Member Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Manage your Team Roles and Accessibility</h2>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>You have used {staffList.length} out of 30 team member slots.</span>
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 inline-flex items-center justify-center text-[9px] font-bold cursor-help" title="Maximum team member allocation limit">ⓘ</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {staffList.length > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = await confirmAction({
                              title: 'Remove All Team Members',
                              message: 'Are you sure you want to remove all team members and revoke their access? You can add new members anytime.',
                              confirmText: 'Clear All Members',
                              cancelText: 'Cancel',
                              variant: 'danger',
                              icon: 'trash',
                            });
                            if (confirmed) {
                              clearAllStaffMembers();
                              setStaffList([]);
                              showToast('All team members removed successfully');
                            }
                          }}
                          className="px-3 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear All</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAddTeamMemberModal(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Member</span>
                      </button>
                    </div>
                  </div>

                  {/* Search Input Bar */}
                  <div className="relative max-w-xs">
                    <input
                      type="text"
                      placeholder="search"
                      value={searchTeamQuery}
                      onChange={(e) => setSearchTeamQuery(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-2xs"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>

                  {/* Team & Access Table Matching Screenshot */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-semibold text-[11px]">
                          <tr>
                            <th className="py-3 px-5 font-semibold">Name</th>
                            <th className="py-3 px-5 font-semibold">Role</th>
                            <th className="py-3 px-5 font-semibold">Access</th>
                            <th className="py-3 px-5 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredTeamMembers.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-10 text-center text-slate-500 text-xs">
                                <div className="max-w-xs mx-auto space-y-2">
                                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                                  <p className="font-semibold text-slate-700">No team members added yet</p>
                                  <p className="text-[11px] text-slate-400">
                                    Click &quot;Add Member&quot; to configure staff with their mobile number, assigned department, and login password.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredTeamMembers.map((staff) => {
                              const alloc = getStaffAllocatedProjects(staff.name, staff.role_code);
                              const initials = staff.name
                                .split(' ')
                                .map((n) => n[0])
                                .filter(Boolean)
                                .join('')
                                .substring(0, 2)
                                .toUpperCase();

                              return (
                                <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                                  {/* Column 1: Name (Avatar + Name + Phone) */}
                                  <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 border border-red-200 font-black text-xs flex items-center justify-center shrink-0">
                                        {initials}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-bold text-slate-900 text-xs truncate">{staff.name}</div>
                                        <div className="text-[11px] text-slate-500 font-normal truncate flex items-center gap-1.5">
                                          <span>{staff.phone}</span>
                                          {staff.department && (
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                              {staff.department}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Column 2: Role Dropdown */}
                                  <td className="py-3.5 px-5">
                                    <select
                                      value={staff.role_code}
                                      onChange={(e) => {
                                        const newCode = e.target.value;
                                        const roleObj = MOCK_ROLES.find((r) => r.code === newCode);
                                        const updatedStaff: StaffMember = {
                                          ...staff,
                                          role_code: newCode,
                                          role_name: roleObj?.name || staff.role_name,
                                          designation: roleObj?.name || staff.designation,
                                        };
                                        saveStaffMember(updatedStaff);
                                        const rolePages = computeMemberAllowedPages(newCode, staff.department);
                                        syncStaffRoleToAccount(staff.id, staff.phone, newCode, roleObj?.name || newCode, rolePages);
                                        setStaffList(getStaffMembers());
                                        showToast(`Role updated to ${roleObj?.name || newCode} for ${staff.name}`);
                                      }}
                                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-hidden focus:border-red-500 cursor-pointer shadow-2xs"
                                    >
                                      {MOCK_ROLES.map((r) => (
                                        <option key={r.code} value={r.code}>
                                          {r.name}
                                        </option>
                                      ))}
                                    </select>
                                  </td>

                                  {/* Column 3: Access (Project count pill) */}
                                  <td className="py-3.5 px-5">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedStaffForProjects(staff)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 rounded-md text-xs font-bold transition cursor-pointer shadow-2xs"
                                      title="Click to view & allocate project access"
                                    >
                                      <span>
                                        {alloc.isAllAccess
                                          ? `${alloc.totalProjects} Project (All)`
                                          : `${alloc.totalProjects} Project`}
                                      </span>
                                    </button>
                                  </td>

                                  {/* Column 4: Action (Remove Access & Delete Member) */}
                                  <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const confirmed = await confirmAction({
                                            title: 'Remove Project Access',
                                            message: `Are you sure you want to remove all project access for ${staff.name}?\nThey will be unassigned from all active projects.`,
                                            confirmText: 'Remove Access',
                                            cancelText: 'Cancel',
                                            variant: 'danger',
                                            icon: 'trash',
                                          });
                                          if (confirmed) {
                                            removeAllStaffProjectAllocations(staff.name);
                                            setStaffList(getStaffMembers());
                                            showToast(`Removed all project access for ${staff.name}`);
                                          }
                                        }}
                                        className="px-2.5 py-1.5 border border-red-300 hover:bg-red-50 text-red-600 rounded-md text-xs font-semibold transition cursor-pointer shadow-2xs"
                                      >
                                        Remove Access
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const confirmed = await confirmAction({
                                            title: 'Delete Team Member',
                                            message: `Are you sure you want to completely remove ${staff.name} (${staff.phone}) and revoke their login credentials?`,
                                            confirmText: 'Delete Member',
                                            cancelText: 'Cancel',
                                            variant: 'danger',
                                            icon: 'trash',
                                          });
                                          if (confirmed) {
                                            deleteStaffMember(staff.id);
                                            deleteUserAccount(staff.id);
                                            deleteUserAccount(staff.phone);
                                            setStaffList(getStaffMembers());
                                            showToast(`Removed team member ${staff.name}`);
                                          }
                                        }}
                                        title={`Delete ${staff.name} from team`}
                                        className="p-1.5 border border-slate-200 hover:border-red-400 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
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
              )}

              {/* ── SUBTAB 2: ROLES & GRANULAR PERMISSIONS ── */}
              {rolesAccessSubTab === 'roles' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Header with Title and 'Create Access' button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Roles & Granular Permissions</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Assign and customize page-level access across Dashboard, Projects, Financials, and Settings for each role.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openCreateAccessModal()}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Access</span>
                      </button>
                    </div>
                  </div>

                  {/* Active persona box matching Screenshot 2 */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                      <span>
                        Active persona: <strong className="text-slate-900 font-bold">{activeRole?.name || 'Super Admin'}</strong> ({activeRole?.code === 'SUPER_ADMIN' ? 'Full Workspace Access' : 'Custom Configured Access'}).
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Switch persona from the left sidebar anytime.
                    </span>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search roles by title, code or scope..."
                        value={searchRoleQuery}
                        onChange={(e) => setSearchRoleQuery(e.target.value)}
                        className="w-full pl-8 pr-8 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                      {searchRoleQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchRoleQuery('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Reset all roles to defaults"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reset Defaults</span>
                      </button>
                      <span className="px-2.5 py-1.5 bg-red-50 text-red-700 font-semibold text-xs rounded-lg border border-red-200">
                        {Object.values(rolePermissions).filter(r => 
                          r.roleName.toLowerCase().includes(searchRoleQuery.toLowerCase()) ||
                          r.roleCode.toLowerCase().includes(searchRoleQuery.toLowerCase())
                        ).length} Roles
                      </span>
                    </div>
                  </div>

                  {/* Roles Cards List */}
                  <div className="grid grid-cols-1 gap-3.5">
                    {Object.values(rolePermissions)
                      .filter(r => 
                        r.roleName.toLowerCase().includes(searchRoleQuery.toLowerCase()) ||
                        r.roleCode.toLowerCase().includes(searchRoleQuery.toLowerCase()) ||
                        r.description.toLowerCase().includes(searchRoleQuery.toLowerCase())
                      )
                      .map((role) => {
                        const isSuper = role.roleCode === 'SUPER_ADMIN';
                        const allowedCount = role.allowedPages ? role.allowedPages.length : 0;
                        const totalModules = ALL_SYSTEM_MODULES.length;
                        const isAllAllowed = allowedCount === totalModules;

                        return (
                          <div
                            key={role.roleCode}
                            className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            {/* Left Info: Avatar + Details */}
                            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSuper 
                                  ? 'bg-red-50 text-red-700 border border-red-200' 
                                  : role.roleCode === 'ADMIN'
                                  ? 'bg-blue-100 text-blue-700'
                                  : role.roleCode === 'SUPERVISOR'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                <Shield className="w-5 h-5 text-red-600" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-sm text-slate-900">{role.roleName}</h3>
                                  <span className="tracking-tight text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                    {role.roleCode}
                                  </span>
                                  {role.isSystemRole && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                                      System Role
                                    </span>
                                  )}
                                  {role.department && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                      {role.department}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                  {role.description}
                                </p>
                              </div>
                            </div>

                            {/* Right Info: Permissions Summary + Configure Access Button */}
                            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                                isAllAllowed
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : allowedCount > 0
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                {allowedCount} / {totalModules} Pages
                              </span>

                              <button
                                type="button"
                                onClick={() => openCreateAccessModal(role.roleCode)}
                                className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Configure Access</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
        )}
      </div>

      {/* New Branch Page / Modal Matching Screenshot */}
      {showNewBranchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs overflow-y-auto flex items-start justify-center p-0 sm:p-6 md:p-8">
          <div className="bg-white w-full max-w-xl min-h-screen sm:min-h-0 sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col my-auto">
            {/* Top Bar: ✕ NEW BRANCH | Cancel Save */}
            <div className="px-6 py-4 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowNewBranchModal(false)}
                  className="p-1 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-slate-900 tracking-wide uppercase">
                  NEW BRANCH
                </h2>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowNewBranchModal(false)}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 px-2 py-1 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateBranch()}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Red Divider Line */}
            <div className="h-1 bg-red-600 w-full" />

            {/* Form Body Matching Screenshot */}
            <form onSubmit={handleCreateBranch} className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
              {/* BRANCH NAME */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-slate-400 tracking-wider uppercase z-10">
                  BRANCH NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder=""
                  value={newBranchForm.name}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, name: e.target.value })}
                  className="w-full h-12 px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>

              {/* GST */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-slate-400 tracking-wider uppercase z-10">
                  GST
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={newBranchForm.gst}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, gst: e.target.value })}
                  className="w-full h-12 px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 tracking-tight focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>

              {/* Heading: Project Geo Location */}
              <div className="pt-2">
                <h3 className="text-base font-bold text-slate-900">
                  Project Geo Location
                </h3>
              </div>

              {/* GOOGLE ADDRESS */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-slate-400 tracking-wider uppercase z-10">
                  GOOGLE ADDRESS
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={newBranchForm.googleAddress}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, googleAddress: e.target.value })}
                  className="w-full h-12 px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>

              {/* Heading: Address Details */}
              <div className="pt-2">
                <h3 className="text-base font-bold text-slate-900">
                  Address Details
                </h3>
              </div>

              {/* ADDRESS LINE 1 */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-slate-400 tracking-wider uppercase z-10">
                  ADDRESS LINE 1
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={newBranchForm.addressLine1}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, addressLine1: e.target.value })}
                  className="w-full h-12 px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>

              {/* CITY */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-slate-400 tracking-wider uppercase z-10">
                  CITY
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={newBranchForm.city}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, city: e.target.value })}
                  className="w-full h-12 px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>

              {/* STATE / PROVINCE */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-slate-400 tracking-wider uppercase z-10">
                  STATE / PROVINCE
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={newBranchForm.state}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, state: e.target.value })}
                  className="w-full h-12 px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>

              {/* ZIP / POSTAL CODE */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-slate-400 tracking-wider uppercase z-10">
                  ZIP / POSTAL CODE
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={newBranchForm.zip}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, zip: e.target.value })}
                  className="w-full h-12 px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>

              {/* COUNTRY */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-slate-400 tracking-wider uppercase z-10">
                  COUNTRY
                </label>
                <div className="relative">
                  <select
                    value={newBranchForm.country}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, country: e.target.value })}
                    className="w-full h-12 px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 bg-white appearance-none cursor-pointer focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  >
                    <option value="India">🇮🇳 India</option>
                    <option value="United Arab Emirates">🇦🇪 United Arab Emirates</option>
                    <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
                    <option value="Singapore">🇸🇬 Singapore</option>
                    <option value="United States">🇺🇸 United States</option>
                    <option value="United Kingdom">🇬🇧 United Kingdom</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-4 top-4 pointer-events-none" />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Company Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Leave Company?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to exit <strong>Booshnam Associates Pvt Ltd</strong>? You will lose access to active projects and financials until reinvited.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  showToast('Leave company request submitted');
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Confirm Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Configure Role Access Modal (2-Step Wizard) */}
      {showAccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs overflow-y-auto flex items-start justify-center p-0 sm:p-6 md:p-8">
          <div className="bg-white w-full max-w-3xl min-h-screen sm:min-h-0 sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col my-auto">
            {/* Top Bar: Title | Step Indicator | Actions */}
            <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAccessModal(false)}
                  className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                      {isCreatingNewRole ? 'CREATE NEW ROLE' : 'CONFIGURE ROLE & STAFF ACCESS'}
                    </h2>
                    <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold rounded-md">
                      Step {modalStep} of 2
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {modalStep === 1 
                      ? 'Select the target role, staff member, and check the allowed page permissions.' 
                      : 'Configure login username and password credentials for this staff member.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccessModal(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {modalStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleProceedToCredentials}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{selectedStaffId === 'ALL_STAFF' ? 'Save Access' : 'Next: Credentials'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalStep(1)}
                      className="px-3 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalSaveAccount}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save & Create Account</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Red Accent Line */}
            <div className="h-1 bg-red-600 w-full" />

            {/* Modal Body: STEP 1 (Role + Staff Selection + Page Access Checkboxes) */}
            {modalStep === 1 && (
              <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto max-h-[75vh]">
                {/* Section 1: Role & Staff Selection */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span>1. Target Role & Staff Member Assignment</span>
                    {selectedStaffId !== 'ALL_STAFF' && (
                      <span className="text-[11px] text-red-600 font-semibold lowercase flex items-center gap-1">
                        <UserIcon className="w-3 h-3" /> Individual staff mode
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Role Selection */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                        Target Role *
                      </label>
                      <div className="relative">
                        <select
                          value={isCreatingNewRole ? '__NEW__' : modalRoleCode}
                          onChange={(e) => handleModalRoleChange(e.target.value)}
                          className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white appearance-none cursor-pointer focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        >
                          <optgroup label="System Roles">
                            {Object.values(rolePermissions)
                              .filter(r => r.isSystemRole)
                              .map(r => (
                                <option key={r.roleCode} value={r.roleCode}>
                                  {r.roleName} ({r.roleCode})
                                </option>
                              ))}
                          </optgroup>
                          {Object.values(rolePermissions).some(r => !r.isSystemRole) && (
                            <optgroup label="Custom Roles">
                              {Object.values(rolePermissions)
                                .filter(r => !r.isSystemRole)
                                .map(r => (
                                  <option key={r.roleCode} value={r.roleCode}>
                                    {r.roleName} ({r.roleCode})
                                  </option>
                                ))}
                            </optgroup>
                          )}
                          <option value="__NEW__">+ Create New Custom Role...</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                      </div>
                    </div>

                    {/* Staff Selection Dropdown */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Select Staff Member
                        </label>
                        <span className="text-[10px] text-slate-400">Search / Pick</span>
                      </div>
                      <div className="relative">
                        <select
                          value={selectedStaffId}
                          onChange={(e) => handleSelectStaffInModal(e.target.value)}
                          className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white appearance-none cursor-pointer focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        >
                          <option value="ALL_STAFF">Global Role Default (Apply to all staff with this role)</option>
                          <optgroup label="Registered Staff Members">
                            {staffMembers.map(staff => (
                              <option key={staff.id} value={staff.id}>
                                {staff.name} — {staff.employee_code} ({staff.role_name})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Assigned Department / Service Selection (Strict Isolation) */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-red-600" />
                        <span>Assigned Department / Service *</span>
                      </label>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        Strict Department Isolation
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={modalDepartment}
                        onChange={(e) => setModalDepartment(e.target.value)}
                        className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 bg-white appearance-none cursor-pointer focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      >
                        {modalRoleCode === 'SUPER_ADMIN' && (
                          <option value="Booshnam Associates">Booshnam Associates (All Departments / Company-wide Overview)</option>
                        )}
                        <option value="Soil Investigation">Soil Investigation</option>
                        <option value="Material Testing">Material Testing</option>
                        <option value="Surveying">Surveying</option>
                        <option value="Structural">Structural</option>
                        <option value="Architectural">Architectural</option>
                        <option value="Sculpture">Sculpture</option>
                        <option value="Private Construction">Private Construction</option>
                        <option value="Government Projects">Government Projects</option>
                        <option value="Coimbatore – Soil Investigation">Coimbatore – Soil Investigation</option>
                        <option value="Coimbatore – Material Testing">Coimbatore – Material Testing</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5 leading-snug">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>When this user logs in, <strong>only this selected department</strong> will be visible in the sidebar switcher, dashboard, and projects. All other departments will remain strictly hidden.</span>
                    </p>
                  </div>

                  {/* Selected Staff Details Pill */}
                  {selectedStaffId !== 'ALL_STAFF' && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      {(() => {
                        const targetStaff = staffMembers.find(s => s.id === selectedStaffId);
                        if (!targetStaff) return null;
                        return (
                          <>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold text-xs flex items-center justify-center shrink-0">
                                {targetStaff.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900">{targetStaff.name}</span>
                                <span className="text-slate-400 tracking-tight text-[11px] ml-1.5">({targetStaff.employee_code})</span>
                                <div className="text-[11px] text-slate-500">{targetStaff.designation} • {targetStaff.department}</div>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              DOB: <strong>{targetStaff.dob}</strong> | DOJ: <strong>{targetStaff.doj}</strong>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {isCreatingNewRole && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">New Role Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Site Quality Auditor"
                          value={customRoleName}
                          onChange={(e) => setCustomRoleName(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Description</label>
                        <input
                          type="text"
                          placeholder="Role scope & responsibilities"
                          value={customRoleDesc}
                          onChange={(e) => setCustomRoleDesc(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Page & Module Permissions with Checkboxes */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        2. Page & Module Permissions
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Check the boxes for each page this {selectedStaffId !== 'ALL_STAFF' ? 'staff member' : 'role'} can view and access.
                      </span>
                    </div>

                    {/* Counter & Bulk Select */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs font-bold px-2.5 py-1 bg-red-50 text-red-600 rounded-md border border-red-200">
                        {modalSelectedPages.length} / {ALL_SYSTEM_MODULES.length} Selected
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllModalPages}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllModalPages}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    {[
                      { id: 'all', label: 'All Pages' },
                      { id: 'Core Operations', label: 'Core Operations' },
                      { id: 'Financials & Supply', label: 'Financials & Supply' },
                      { id: 'Repository & Quality', label: 'Repository & QA' },
                      { id: 'Administration', label: 'Administration' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setModalCategoryFilter(cat.id)}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          modalCategoryFilter === cat.id
                            ? 'bg-red-600 text-white shadow-2xs font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Checkbox Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {ALL_SYSTEM_MODULES
                      .filter(m => modalCategoryFilter === 'all' || m.category === modalCategoryFilter)
                      .map((mod) => {
                        const isChecked = modalSelectedPages.includes(mod.id);
                        const IconComponent = getModuleIconComponent(mod.id);

                        return (
                          <label
                            key={mod.id}
                            className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-red-50/50 border-red-200 shadow-2xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleModulePage(mod.id)}
                              className="w-4 h-4 mt-0.5 rounded text-red-600 focus:ring-red-500 accent-red-600 border-slate-300 cursor-pointer"
                            />

                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isChecked ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <IconComponent className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-xs font-bold ${isChecked ? 'text-red-600' : 'text-slate-800'}`}>
                                  {mod.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium truncate">
                                  {mod.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                {mod.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Body: STEP 2 (Create Username & Password Credentials) */}
            {modalStep === 2 && (
              <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto max-h-[75vh]">
                {/* Staff summary banner */}
                <div className="bg-gradient-to-r from-red-50 to-red-100/40 p-4 rounded-xl border border-red-200 flex items-center justify-between gap-4">
                  {(() => {
                    const targetStaff = staffMembers.find(s => s.id === selectedStaffId);
                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                          {targetStaff?.name.substring(0, 2).toUpperCase() || 'ST'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {targetStaff?.name} <span className="tracking-tight text-xs text-red-700">({targetStaff?.employee_code})</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span>Assigned Role: <strong className="text-red-900">{rolePermissions[modalRoleCode]?.roleName || modalRoleCode}</strong></span>
                            <span>•</span>
                            <span>Dept: <strong className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{modalDepartment}</strong></span>
                            <span>•</span>
                            <span>{modalSelectedPages.length} Modules Authorized</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <span className="px-2.5 py-1 bg-white text-red-600 text-xs font-bold rounded-lg border border-red-200 shrink-0">
                    Step 2: Login Setup
                  </span>
                </div>

                {/* Form fields for Username & Password */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Staff Login Credentials
                  </h3>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Username *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={staffUsername}
                        onChange={(e) => setStaffUsername(e.target.value)}
                        placeholder="e.g. arun.verma"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      The staff member will use this username to sign into the system.
                    </span>
                  </div>

                  {/* Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Password *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showStaffPassword ? 'text' : 'password'}
                          required
                          value={staffPassword}
                          onChange={(e) => setStaffPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 tracking-tight focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowStaffPassword(!showStaffPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showStaffPassword ? 'text' : 'password'}
                          required
                          value={staffConfirmPassword}
                          onChange={(e) => setStaffConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 tracking-tight focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary of granted access */}
                  <div className="pt-2">
                    <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                      Authorized Modules for this Account:
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ALL_SYSTEM_MODULES
                        .filter(m => modalSelectedPages.includes(m.id))
                        .map(m => (
                          <span key={m.id} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-semibold">
                            {m.name}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Helper notice */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    When this staff logs in with these credentials, only the <strong>{modalSelectedPages.length} checked pages</strong> will appear on their dashboard and sidebar.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MANAGE PROJECT ACCESS MODAL ── */}
      {selectedStaffForProjects && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold flex items-center justify-center text-sm">
                  {selectedStaffForProjects.name
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Project Access: {selectedStaffForProjects.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStaffForProjects.role_name} • {selectedStaffForProjects.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaffForProjects(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {(() => {
                const alloc = getStaffAllocatedProjects(selectedStaffForProjects.name, selectedStaffForProjects.role_code);
                return (
                  <>
                    <div className="flex items-center justify-between bg-red-50/70 border border-red-200/80 rounded-xl p-3.5 text-xs text-red-900">
                      <div>
                        <span className="font-bold">Allocated Projects: </span>
                        <span>{alloc.isAllAccess ? 'All Projects (Admin Privilege)' : `${alloc.totalProjects} Projects Assigned`}</span>
                      </div>
                      <span className="text-[11px] bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-md border border-red-200">
                        {alloc.totalProjects} Active
                      </span>
                    </div>

                    {alloc.isAllAccess && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          This team member is assigned an <strong>Admin / Director</strong> role, granting company-wide visibility to all projects by default.
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Select Projects to Assign / Unassign
                      </div>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-white">
                        {allProjects.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            No projects found in the system.
                          </div>
                        ) : (
                          allProjects.map((project: any) => {
                            const isAssigned = alloc.allocatedProjects.some((p) => p.id === project.id);
                            return (
                              <div
                                key={project.id}
                                onClick={() => {
                                  toggleStaffProjectAllocation(selectedStaffForProjects.name, selectedStaffForProjects.role_code, project.id);
                                  setStaffList(getStaffMembers());
                                }}
                                className="p-3.5 hover:bg-slate-50/80 flex items-center justify-between cursor-pointer transition select-none"
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    readOnly
                                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer pointer-events-none"
                                  />
                                  <div>
                                    <div className="font-bold text-slate-800 text-xs">{project.name}</div>
                                    <div className="text-[11px] text-slate-400">
                                      {project.code || project.id} • {project.location || 'Site Location'}
                                    </div>
                                  </div>
                                </div>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                    isAssigned
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {isAssigned ? 'Assigned' : 'Unassigned'}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedStaffForProjects(null)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD TEAM MEMBER MODAL ── */}
      {showAddTeamMemberModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-base font-bold text-slate-900">Add Member</h3>
              <button
                type="button"
                onClick={() => setShowAddTeamMemberModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTeamMemberForm.name.trim()) {
                  showToast('Please enter member name');
                  return;
                }
                const cleanPhone = newTeamMemberForm.phone.trim().replace(/\D/g, '');
                if (!cleanPhone || cleanPhone.length < 7) {
                  showToast('Please enter a valid mobile number');
                  return;
                }
                if (!newTeamMemberForm.password.trim()) {
                  showToast('Please create a login password for the member');
                  return;
                }
                const todayStr = new Date().toISOString().split('T')[0];
                const newMemberId = `mem-${Date.now()}`;
                const newMember: StaffMember = {
                  id: newMemberId,
                  name: newTeamMemberForm.name.trim(),
                  employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                  phone: newTeamMemberForm.phone.trim(),
                  email:
                    newTeamMemberForm.email.trim() ||
                    `${newTeamMemberForm.name.toLowerCase().replace(/\s+/g, '')}@booshnam.com`,
                  role_code: newTeamMemberForm.role_code,
                  role_name: newTeamMemberForm.role_name,
                  department: newTeamMemberForm.department,
                  designation: newTeamMemberForm.role_name,
                  dob: '1995-01-01',
                  doj: todayStr,
                  employment_type: 'Full-time',
                  salary: 45000,
                  salary_type: 'Month',
                  status: 'ACTIVE',
                  has_login_account: true,
                  username: newTeamMemberForm.phone.trim(),
                  created_at: todayStr,
                };
                saveStaffMember(newMember);

                // Create associated login credentials for phone + password authentication
                const allowedPages = computeMemberAllowedPages(newMember.role_code, newMember.department);
                const newAccount: UserAccount = {
                  id: `usr-${Date.now()}`,
                  username: newMember.phone,
                  phone: newMember.phone,
                  password: newTeamMemberForm.password.trim(),
                  staff_id: newMember.id,
                  staff_name: newMember.name,
                  staff_code: newMember.employee_code,
                  role_code: newMember.role_code,
                  role_name: newMember.role_name,
                  department: newMember.department,
                  allowedPages,
                  created_at: todayStr,
                };
                saveUserAccount(newAccount);

                setStaffList(getStaffMembers());
                setShowAddTeamMemberModal(false);
                setNewTeamMemberForm({
                  name: '',
                  phone: '',
                  email: '',
                  role_code: 'SITE_ENGINEER',
                  role_name: 'Site Engineer',
                  department: 'Construction Department',
                  password: '',
                });
                showToast(`Member "${newMember.name}" added with password login credentials`);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newTeamMemberForm.name}
                  onChange={(e) => setNewTeamMemberForm({ ...newTeamMemberForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile Number (Login ID) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9840123456"
                  value={newTeamMemberForm.phone}
                  onChange={(e) => setNewTeamMemberForm({ ...newTeamMemberForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">This number will be used by the member to log in.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Role & Designation *
                </label>
                <select
                  value={newTeamMemberForm.role_code}
                  onChange={(e) => {
                    const code = e.target.value;
                    const r = MOCK_ROLES.find((item) => item.code === code);
                    setNewTeamMemberForm({
                      ...newTeamMemberForm,
                      role_code: code,
                      role_name: r?.name || code,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                >
                  {MOCK_ROLES.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Assigned Department *
                </label>
                <select
                  value={newTeamMemberForm.department}
                  onChange={(e) => setNewTeamMemberForm({ ...newTeamMemberForm, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                >
                  {ORGANIZATION_DEPARTMENTS.filter(d => !d.isMainOverview).map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">When this member logs in, they will only see and access their assigned department.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Create Login Password *
                </label>
                <div className="relative">
                  <input
                    type={showMemberPassword ? 'text' : 'password'}
                    required
                    placeholder="Create password (min 4 characters)"
                    value={newTeamMemberForm.password}
                    onChange={(e) => setNewTeamMemberForm({ ...newTeamMemberForm, password: e.target.value })}
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMemberPassword(!showMemberPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showMemberPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTeamMemberModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
