import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Search, ArrowLeft, SquarePen, MoreVertical, 
  Download, UploadCloud, Calendar, Check, X, FileSpreadsheet,
  Layers, CheckCircle2, ChevronDown, ChevronRight, DollarSign, Eye, Trash2, Copy,
  FilePlus, FolderPlus, Sparkles, FileText, Percent, Mail, Settings
} from 'lucide-react';
import { Project, WBSTask, BOQRecord, BOQItem, SalesInvoice, SalesInvoiceItem } from '../../../types';
import { CustomSelect } from '../../CustomSelect';
import { confirmAction, setFormDirty, clearFormDirty, confirmNavigationIfDirty } from '../../../lib/dialogService';
import { getProjectInvoices, saveProjectInvoices, addSalesInvoice, deleteSalesInvoice, updateSalesInvoice, getCompanyBanks } from '../../../lib/invoiceService';
import { exportSalesInvoiceToPDF, exportSalesInvoiceToExcel } from '../../../lib/invoiceExportService';
import { getFinanceParties, ensurePartyExists, getPartyAvatarInfo } from '../../../lib/financeSyncService';

interface BOQTabProps {
  project: Project;
  tasks?: WBSTask[];
  onShowToast?: (msg: string) => void;
  onNavigateTab?: (tab: string) => void;
}

// Seed line items matching Onsite Teams / Soil investigation BOQ
const SEED_SOIL_ITEMS: BOQItem[] = [
  {
    id: 'soil-item-1',
    s_no: 1,
    type: 'item',
    item_code: 'MOB-01',
    hsn_sac_code: '998334',
    description: 'Mobilization and De-mobilisation of Men and Equipments to the site location where the soil investigations have to be carried out.',
    specification: 'Complete mobilization of drilling rigs, SPT setup, testing crews, and demobilization upon report clearance.',
    dimensions: '-',
    unit_rate: 2000,
    quantity: 1,
    unit: 'nos',
    cost_price: 2000,
    mark_up_percent: 0,
    gst_percent: 0,
    billed_quantity: 1,
    sales_price: 2000
  },
  {
    id: 'soil-item-2',
    s_no: 2,
    type: 'item',
    item_code: 'SPT-01',
    hsn_sac_code: '998334',
    description: 'Boring through all type of soil strata and conducting SPT tests at the specified interval at the investigation location in accordance with I. S: 2131 . Collection of SPT samples and disturbed samples in accordance with I.S:1498- 1970 from the existing soil strata. Drilling in Soil',
    specification: 'Standard Penetration Testing as per IS: 2131, undisturbed soil sampling & classification per IS: 1498-1970.',
    dimensions: '-',
    unit_rate: 0,
    quantity: 1,
    unit: 'nos',
    cost_price: 0,
    mark_up_percent: 0,
    gst_percent: 0,
    billed_quantity: 1,
    sales_price: 0
  },
  {
    id: 'soil-item-3',
    s_no: 3,
    type: 'item',
    item_code: 'DRL-10M',
    hsn_sac_code: '998334',
    description: '0.00m to 10.0m or a depth where SPT>60-whicheveris met earlier and SPT @ 1.50m interval',
    specification: 'Rotary borehole advance from 0 to 10m depth, SPT testing at 1.50m intervals or refusal depth SPT > 60.',
    dimensions: '-',
    unit_rate: 10000,
    quantity: 2,
    unit: 'nos',
    cost_price: 8000,
    mark_up_percent: 25,
    gst_percent: 0,
    billed_quantity: 1,
    sales_price: 20000
  },
  {
    id: 'soil-item-4',
    s_no: 4,
    type: 'item',
    item_code: 'DRL-20M',
    hsn_sac_code: '998334',
    description: '10.00m to 20.0m or a depth where SPT>60-whichever is met earlier and SPT @ 2.00 m interval',
    specification: 'Subsurface borehole advance 10m to 20m depth with SPT test intervals @ 2.0m.',
    dimensions: '-',
    unit_rate: 0,
    quantity: 1,
    unit: 'RMT',
    cost_price: 0,
    mark_up_percent: 0,
    gst_percent: 0,
    billed_quantity: 0,
    sales_price: 0
  },
  {
    id: 'soil-item-5',
    s_no: 5,
    type: 'item',
    item_code: 'DRL-30M',
    hsn_sac_code: '998334',
    description: '20.00m to 30.0m or a depth where SPT>60-whichever is met earlier and SPT @ 2.00 m interval',
    specification: 'Subsurface borehole advance 20m to 30m depth with SPT test intervals @ 2.0m.',
    dimensions: '-',
    unit_rate: 0,
    quantity: 1,
    unit: 'RMT',
    cost_price: 0,
    mark_up_percent: 0,
    gst_percent: 0,
    billed_quantity: 0,
    sales_price: 0
  },
  {
    id: 'soil-item-6',
    s_no: 6,
    type: 'item',
    item_code: 'RCK-WR',
    hsn_sac_code: '998334',
    description: 'Drilling in soil where SPT>60 / Weathered Rock',
    specification: 'Rotary drilling in dense strata where SPT N > 60 and weathered bed rock formations.',
    dimensions: '-',
    unit_rate: 2500,
    quantity: 3,
    unit: 'RMT',
    cost_price: 1800,
    mark_up_percent: 38.89,
    gst_percent: 0,
    billed_quantity: 0,
    sales_price: 7500
  },
  {
    id: 'soil-item-7',
    s_no: 7,
    type: 'item',
    item_code: 'RCK-DIA',
    hsn_sac_code: '998334',
    description: 'Drilling in hard rock / strata using Diamond cutter',
    specification: 'Diamond core drilling NX/BX core barrel in hard rock strata as per IS: 4464.',
    dimensions: '-',
    unit_rate: 0,
    quantity: 1,
    unit: 'RMT',
    cost_price: 0,
    mark_up_percent: 0,
    gst_percent: 0,
    billed_quantity: 0,
    sales_price: 0
  }
];

export const BOQTab: React.FC<BOQTabProps> = ({
  project,
  tasks = [],
  onShowToast,
  onNavigateTab
}) => {
  const storageKey = `siteops_boq_records_v2_${project?.id || 'default'}`;

  // State: List of BOQs
  const [boqList, setBOQList] = useState<BOQRecord[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy auto-seeded dummy #Sales-59 SOIL BOQ so new projects start clean
          const clean = parsed.filter(b => !(
            (b.id === `boq-${project?.id}` || b.id === 'boq-demo') &&
            b.boq_number === '#Sales-59' &&
            b.title === 'SOIL' &&
            b.boq_value === 30000 &&
            b.billed_value === 0
          ));
          return clean;
        }
      }
    } catch {
      // ignore
    }
    // Check if quotation-converted items exist
    try {
      const converted = localStorage.getItem(`siteops_boq_items_${project?.id}`);
      if (converted) {
        const parsedItems = JSON.parse(converted);
        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
          const totalVal = parsedItems.reduce((acc: number, it: BOQItem) => acc + (it.sales_price || 0), 0);
          return [{
            id: `boq-${project?.id || 'converted'}`,
            project_id: project?.id || '',
            boq_number: '#BOQ1871',
            date: new Date().toISOString().split('T')[0],
            client_name: project?.client_name || '',
            title: project?.name || 'General Works',
            tax_type: 'ITEM_LEVEL',
            milestone_completed: 0,
            milestone_total: 0,
            physical_progress: 0,
            boq_value: totalVal || 0,
            billed_value: 0,
            items: parsedItems,
            created_at: new Date().toISOString()
          }];
        }
      }
    } catch {}

    // Default: Empty list! User creates BOQs manually using "+ BOQ" button
    return [];
  });

  // Save changes to local storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(boqList));
    } catch {
      // ignore
    }
  }, [boqList, storageKey]);

  // Clients loaded strictly from Parties (filter where type === 'Client' or category === 'CLIENT') + project.client_name
  const loadClientParties = () => {
    const finParties = getFinanceParties();
    const result: Array<{ id: string; name: string; phone?: string; email?: string; avatarText?: string; avatarColor?: string }> = [];
    const seen = new Set<string>();

    // 1. Project's designated client name (from project info)
    if (project?.client_name && project.client_name.trim()) {
      const cName = project.client_name.trim();
      seen.add(cName.toLowerCase());
      const { text, color } = getPartyAvatarInfo(cName, 'Client');
      result.push({
        id: `pty-proj-${project.id || 'client'}`,
        name: cName,
        avatarText: text,
        avatarColor: color
      });
    }

    // 2. Client parties added in Party tab / Accounts & Finance
    finParties.forEach(p => {
      if (!p || !p.name) return;
      const isClient = p.type === 'Client' || (p as any).category === 'CLIENT';
      if (isClient) {
        const cleanName = p.name.trim();
        if (!seen.has(cleanName.toLowerCase())) {
          seen.add(cleanName.toLowerCase());
          const { text, color } = getPartyAvatarInfo(cleanName, 'Client');
          result.push({
            id: p.id,
            name: cleanName,
            phone: p.phone,
            email: p.email,
            avatarText: p.avatarText || text,
            avatarColor: p.avatarColor || color
          });
        }
      }
    });

    return result;
  };

  const [availableClients, setAvailableClients] = useState(loadClientParties);

  // Sync clients whenever party changes or storage event fires
  useEffect(() => {
    const handleSyncParties = () => {
      setAvailableClients(loadClientParties());
    };
    window.addEventListener('storage', handleSyncParties);
    window.addEventListener('booshnam_finance_updated', handleSyncParties);
    return () => {
      window.removeEventListener('storage', handleSyncParties);
      window.removeEventListener('booshnam_finance_updated', handleSyncParties);
    };
  }, [project.client_name, project.id]);

  // Selected BOQ for Detail View (Image 3)
  const [selectedBOQ, setSelectedBOQ] = useState<BOQRecord | null>(null);

  // Search filter for List view (Image 1)
  const [searchQuery, setSearchQuery] = useState('');

  // Search filter for Items view (Image 3)
  const [itemSearch, setItemSearch] = useState('');

  // Active Detail Sub-Tab: Items | Budget | Milestone | Invoices
  const [activeDetailTab, setActiveDetailTab] = useState<'items' | 'budget' | 'milestone' | 'invoices'>('items');

  // Invoices State (Video Flow: + Sales Invoice & Invoice Detail Drawer)
  const [invoices, setInvoices] = useState<SalesInvoice[]>(() => {
    return getProjectInvoices(project.id, selectedBOQ?.client_name || project.client_name);
  });
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<SalesInvoice | null>(null);
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const [isInvoiceMoreMenuOpen, setIsInvoiceMoreMenuOpen] = useState(false);
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false);
  const [editInvoiceClientName, setEditInvoiceClientName] = useState('');
  const [editInvoiceDate, setEditInvoiceDate] = useState('');
  const [editInvoiceItems, setEditInvoiceItems] = useState<SalesInvoiceItem[]>([]);
  const [searchInvoiceItemQuery, setSearchInvoiceItemQuery] = useState('');
  const [isCreateInvoiceDrawerOpen, setIsCreateInvoiceDrawerOpen] = useState(false);
  const [invoiceStep, setInvoiceStep] = useState<1 | 2>(1);
  const [selectedItemIdsForInvoice, setSelectedItemIdsForInvoice] = useState<string[]>([]);
  const [invoiceQuantities, setInvoiceQuantities] = useState<Record<string, number>>({});
  const [invoiceRates, setInvoiceRates] = useState<Record<string, number>>({});
  const [newInvoiceNumber, setNewInvoiceNumber] = useState('INV-70');
  const [newInvoiceDate, setNewInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newInvoiceClientName, setNewInvoiceClientName] = useState(project.client_name || 'Jisha Jeevan Buildtech');

  // Sync invoices when selectedBOQ changes or event is fired
  useEffect(() => {
    setInvoices(getProjectInvoices(project.id, selectedBOQ?.client_name || project.client_name));
  }, [project.id, selectedBOQ?.client_name]);

  useEffect(() => {
    const handler = () => {
      const refreshed = getProjectInvoices(project.id, selectedBOQ?.client_name || project.client_name);
      setInvoices(refreshed);
      setSelectedInvoiceForDetail(prev => {
        if (!prev) return null;
        return refreshed.find(i => i.id === prev.id) || prev;
      });
    };
    window.addEventListener('siteops_invoices_updated', handler);
    return () => window.removeEventListener('siteops_invoices_updated', handler);
  }, [project.id, selectedBOQ?.client_name]);

  // Modal State: Create BOQ Modal (Image 2)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Form State: Create BOQ Modal
  const [newBOQNumber, setNewBOQNumber] = useState('#BOQ1873');
  const [newBOQDate, setNewBOQDate] = useState('2026-09-17');
  const [newClientName, setNewClientName] = useState(project.client_name || '');
  const [newBOQTitle, setNewBOQTitle] = useState('');
  const [newTaxType, setNewTaxType] = useState<'ITEM_LEVEL' | 'BILL_LEVEL'>('ITEM_LEVEL');
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: string }>>([]);

  // Modal State: In-Page Edit BOQ Modal (No browser prompt)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditClientDropdownOpen, setIsEditClientDropdownOpen] = useState(false);
  const editClientDropdownRef = useRef<HTMLDivElement>(null);
  const [editTargetBOQ, setEditTargetBOQ] = useState<BOQRecord | null>(null);
  const [editBOQNumber, setEditBOQNumber] = useState('');
  const [editBOQDate, setEditBOQDate] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editBOQTitle, setEditBOQTitle] = useState('');
  const [editTaxType, setEditTaxType] = useState<'ITEM_LEVEL' | 'BILL_LEVEL'>('ITEM_LEVEL');
  const [activeEditFocus, setActiveEditFocus] = useState<'number' | 'date' | 'client' | 'title'>('title');

  // Dismiss dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
      if (editClientDropdownRef.current && !editClientDropdownRef.current.contains(e.target as Node)) {
        setIsEditClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter clients for Create BOQ Modal
  const filteredCreateClients = useMemo(() => {
    if (!newClientName.trim()) return availableClients;
    const q = newClientName.toLowerCase().trim();
    return availableClients.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q))
    );
  }, [availableClients, newClientName]);

  // Filter clients for Edit BOQ Modal
  const filteredEditClients = useMemo(() => {
    if (!editClientName.trim()) return availableClients;
    const q = editClientName.toLowerCase().trim();
    return availableClients.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q))
    );
  }, [availableClients, editClientName]);

  // Modal State: Add / Edit Line Item to Selected BOQ
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemHsnSac, setNewItemHsnSac] = useState('998334');
  const [newItemSpecification, setNewItemSpecification] = useState('');
  const [newItemDimensions, setNewItemDimensions] = useState('-');
  const [newItemUnit, setNewItemUnit] = useState('nos');
  const [newItemGST, setNewItemGST] = useState<number>(0);
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnitRate, setNewItemUnitRate] = useState<number>(0);
  const [newItemCostPrice, setNewItemCostPrice] = useState<number>(0);
  const [newItemMarkup, setNewItemMarkup] = useState<number>(0);
  const [newItemSupplyAndInstall, setNewItemSupplyAndInstall] = useState(false);
  const [newItemParentId, setNewItemParentId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDiscountPercent, setNewItemDiscountPercent] = useState<number>(0);
  const [newItemAdditionalCharges, setNewItemAdditionalCharges] = useState<number>(0);
  const [newItemLinkedTaskId, setNewItemLinkedTaskId] = useState<string>('');
  const [newItemBilledQty, setNewItemBilledQty] = useState<number>(0);
  const [newItemProgress, setNewItemProgress] = useState<number>(0);
  const [newItemMarkupType, setNewItemMarkupType] = useState<'%' | '₹'>('%');
  const [isCostComponentOpen, setIsCostComponentOpen] = useState(false);
  const [isCostCodeOpen, setIsCostCodeOpen] = useState(false);
  const [newItemCostCode, setNewItemCostCode] = useState('');
  const [isHsnOpen, setIsHsnOpen] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [itemAttachedFiles, setItemAttachedFiles] = useState<{ name: string; size: number }[]>([]);
  const itemFileInputRef = useRef<HTMLInputElement>(null);
  const [costComponentsList, setCostComponentsList] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [newSupplyRate, setNewSupplyRate] = useState<number>(0);
  const [newInstallRate, setNewInstallRate] = useState<number>(0);
  
  // Modal State: Add Section
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionAssignToParent, setNewSectionAssignToParent] = useState(false);
  const [newSectionParentId, setNewSectionParentId] = useState<string | null>(null);

  // Edit Mode State for BOQ Detail View
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftItems, setDraftItems] = useState<BOQItem[]>([]);

  // Add Item Dropdown State (+ Add Item ∨)
  const [isAddItemDropdownOpen, setIsAddItemDropdownOpen] = useState(false);
  const addItemDropdownRef = useRef<HTMLDivElement>(null);

  // Bottom financial controls state (Matching Image)
  const [additionalDiscount, setAdditionalDiscount] = useState<number>(() => selectedBOQ?.additional_discount || 0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(() => selectedBOQ?.additional_charges || 0);
  const [isAdditionalChargesPercent, setIsAdditionalChargesPercent] = useState<boolean>(() => selectedBOQ?.additional_charges_percent || false);
  const [isRoundOff, setIsRoundOff] = useState<boolean>(() => selectedBOQ?.round_off || false);

  // Bottom notes & terms expansion state
  const [isBankDetailsOpen, setIsBankDetailsOpen] = useState(false);
  const [bankDetailsText, setBankDetailsText] = useState(() => selectedBOQ?.bank_details || '');
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [termsText, setTermsText] = useState(() => selectedBOQ?.terms_and_conditions || '');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesText, setNotesText] = useState(() => selectedBOQ?.notes || '');

  // Synchronize bottom controls when selected BOQ changes
  useEffect(() => {
    if (selectedBOQ) {
      setAdditionalDiscount(selectedBOQ.additional_discount || 0);
      setAdditionalCharges(selectedBOQ.additional_charges || 0);
      setIsAdditionalChargesPercent(selectedBOQ.additional_charges_percent || false);
      setIsRoundOff(selectedBOQ.round_off || false);
      setBankDetailsText(selectedBOQ.bank_details || '');
      setTermsText(selectedBOQ.terms_and_conditions || '');
      setNotesText(selectedBOQ.notes || '');
    }
  }, [selectedBOQ?.id]);

  // Click outside listener for Add Item dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addItemDropdownRef.current && !addItemDropdownRef.current.contains(event.target as Node)) {
        setIsAddItemDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal State: Link Task Modal
  const [linkTaskTargetItem, setLinkTaskTargetItem] = useState<BOQItem | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  // Action Menu state for List rows
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [openItemMenuId, setOpenItemMenuId] = useState<string | null>(null);
  const [rowMenuPos, setRowMenuPos] = useState<{ top: number; right: number } | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  // Close row action menu on outside click, window resize or scroll
  useEffect(() => {
    if (!openRowMenuId) return;
    const handleDismiss = (e: MouseEvent) => {
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
        setOpenRowMenuId(null);
        setRowMenuPos(null);
      }
    };
    const handleScrollOrResize = () => {
      setOpenRowMenuId(null);
      setRowMenuPos(null);
    };
    document.addEventListener('mousedown', handleDismiss);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openRowMenuId]);

  // Open Create Modal with auto-incremented BOQ number
  const handleOpenCreateModal = () => {
    const nextSeq = 1871 + boqList.length;
    setNewBOQNumber(`#BOQ${nextSeq}`);
    setNewBOQDate(new Date().toISOString().split('T')[0]);
    const defaultClient = project.client_name?.trim() || (availableClients.length > 0 ? availableClients[0].name : '');
    setNewClientName(defaultClient);
    setNewBOQTitle('');
    setNewTaxType('ITEM_LEVEL');
    setAttachedFiles([]);
    setIsClientDropdownOpen(false);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal with selected field focused
  const handleOpenEditModal = (boq: BOQRecord, focus: 'number' | 'date' | 'client' | 'title' = 'title') => {
    setEditTargetBOQ(boq);
    setEditBOQNumber(boq.boq_number);
    setEditBOQDate(boq.date);
    setEditClientName(boq.client_name);
    setEditBOQTitle(boq.title);
    setEditTaxType(boq.tax_type || 'ITEM_LEVEL');
    setActiveEditFocus(focus);
    setIsEditClientDropdownOpen(false);
    setIsEditModalOpen(true);
  };

  // Dirty state tracking for BOQ creation modal
  useEffect(() => {
    if (!isCreateModalOpen) {
      clearFormDirty();
      return;
    }
    const isDirty = Boolean(newBOQTitle.trim() || attachedFiles.length > 0);
    if (isDirty) {
      setFormDirty(true, 'BOQ form');
    } else {
      clearFormDirty();
    }
    return () => {
      clearFormDirty();
    };
  }, [isCreateModalOpen, newBOQTitle, attachedFiles]);

  const handleCloseCreateModal = async () => {
    const canLeave = await confirmNavigationIfDirty();
    if (canLeave) {
      clearFormDirty();
      setIsClientDropdownOpen(false);
      setIsCreateModalOpen(false);
    }
  };

  // Submit Edit BOQ Form
  const handleSaveEditBOQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetBOQ) return;

    const confirmed = await confirmAction({
      title: 'Update BOQ',
      message: `Are you sure you want to save changes to BOQ "${editBOQNumber.trim() || editTargetBOQ.boq_number}"?`,
      confirmText: 'Update BOQ',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    const updated: BOQRecord = {
      ...editTargetBOQ,
      boq_number: editBOQNumber.trim() || editTargetBOQ.boq_number,
      date: editBOQDate || editTargetBOQ.date,
      client_name: editClientName.trim() || editTargetBOQ.client_name,
      title: editBOQTitle.trim() || editTargetBOQ.title,
      tax_type: editTaxType
    };

    try {
      ensurePartyExists(updated.client_name, project.name, 'Client');
    } catch {}

    setBOQList(prev => prev.map(b => b.id === updated.id ? updated : b));
    if (selectedBOQ?.id === updated.id) {
      setSelectedBOQ(updated);
    }
    setIsEditClientDropdownOpen(false);
    setIsEditModalOpen(false);
    setEditTargetBOQ(null);
    onShowToast?.(`BOQ ${updated.boq_number} updated successfully!`);
  };

  // Submit Create BOQ Form (Image 2 -> Image 1)
  const handleCreateBOQSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBOQNumber.trim() || !newClientName.trim()) {
      if (onShowToast) {
        onShowToast('Please fill all required fields (BOQ Number & Client Name)');
      } else {
        window.dispatchEvent(new CustomEvent('siteops_toast', {
          detail: { title: 'Validation Warning', message: 'Please fill all required fields (BOQ Number & Client Name)', type: 'warning' }
        }));
      }
      return;
    }

    const confirmed = await confirmAction({
      title: 'Create BOQ Record',
      message: `Are you sure you want to create BOQ "${newBOQNumber.trim()}" for ${newClientName.trim()}?`,
      confirmText: 'Create BOQ',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    clearFormDirty();
    const createdRecord: BOQRecord = {
      id: `boq-${Date.now()}`,
      project_id: project.id,
      boq_number: newBOQNumber.trim(),
      date: newBOQDate,
      client_name: newClientName.trim(),
      title: newBOQTitle.trim() || 'General Works',
      tax_type: newTaxType,
      milestone_completed: 0,
      milestone_total: 0,
      physical_progress: 0,
      boq_value: 0,
      billed_value: 0,
      media_files: attachedFiles,
      items: [],
      created_at: new Date().toISOString()
    };

    try {
      ensurePartyExists(createdRecord.client_name, project.name, 'Client');
    } catch {}

    const updated = [createdRecord, ...boqList];
    setBOQList(updated);
    setIsClientDropdownOpen(false);
    setIsCreateModalOpen(false);
    onShowToast?.(`BOQ ${createdRecord.boq_number} created successfully!`);
  };

  // Confirm delete BOQ with standard in-app confirmation modal
  const handleDeleteBOQ = async (id: string) => {
    const toDelete = boqList.find(b => b.id === id);
    const confirmed = await confirmAction({
      title: 'Delete BOQ',
      message: `Are you sure you want to delete BOQ "${toDelete?.boq_number || id}"? This action cannot be undone.`,
      confirmText: 'Delete BOQ',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;

    setBOQList(prev => prev.filter(b => b.id !== id));
    if (selectedBOQ?.id === id) {
      setSelectedBOQ(null);
    }
    onShowToast?.(`BOQ ${toDelete?.boq_number || ''} deleted`);
  };

  // Toggle Edit Mode
  const toggleEditMode = () => {
    if (!isEditMode) {
      setDraftItems([...(selectedBOQ?.items || [])]);
      setIsEditMode(true);
    } else {
      setIsEditMode(false);
    }
  };

  // Save Edit Mode Changes
  const handleSaveEditMode = async () => {
    if (!selectedBOQ) return;
    const itemsTotal = draftItems.reduce((acc, i) => acc + (i.total_amount || i.sales_price || 0), 0);
    const updatedBOQ: BOQRecord = {
      ...selectedBOQ,
      items: draftItems,
      boq_value: itemsTotal,
      additional_discount: Number(additionalDiscount) || 0,
      additional_charges: Number(additionalCharges) || 0,
      additional_charges_percent: isAdditionalChargesPercent,
      round_off: isRoundOff,
      bank_details: bankDetailsText,
      terms_and_conditions: termsText,
      notes: notesText
    };
    setSelectedBOQ(updatedBOQ);
    const updatedList = boqList.map(b => b.id === updatedBOQ.id ? updatedBOQ : b);
    setBOQList(updatedList);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedList));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
    setIsEditMode(false);
    onShowToast?.(`BOQ saved successfully!`);
  };

  // Quick load standard soil investigation items
  const handleLoadSampleSoilItems = () => {
    if (!selectedBOQ) return;
    const newItems = SEED_SOIL_ITEMS.map((item, idx) => ({
      ...item,
      id: `item-${Date.now()}-${idx}`
    }));
    const newBOQValue = newItems.reduce((acc, i) => acc + (i.total_amount || i.sales_price || 0), 0);
    const updatedBOQ: BOQRecord = {
      ...selectedBOQ,
      items: newItems,
      boq_value: newBOQValue
    };
    setSelectedBOQ(updatedBOQ);
    setDraftItems(newItems);
    const updatedList = boqList.map(b => b.id === updatedBOQ.id ? updatedBOQ : b);
    setBOQList(updatedList);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedList));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
    onShowToast?.('Sample Soil Investigation items loaded successfully!');
  };

  // Add Section to Draft Items
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    const newSection: BOQItem = {
      id: `section-${Date.now()}`,
      s_no: draftItems.length + 1, // Will be recomputed on render
      type: 'section',
      description: newSectionName.trim(),
      parent_id: newSectionAssignToParent ? newSectionParentId || undefined : undefined,
      unit_rate: 0,
      quantity: 0,
      unit: '',
      billed_quantity: 0,
      sales_price: 0
    };

    setDraftItems([...draftItems, newSection]);
    setIsAddSectionModalOpen(false);
    setNewSectionName('');
    setNewSectionAssignToParent(false);
    setNewSectionParentId(null);
  };

  // Open Add Item Drawer (Matches User Screenshots)
  const handleOpenAddItem = (parentId?: string | null) => {
    setEditingItem(null);
    setNewItemDesc('');
    setNewItemCode('');
    setNewItemHsnSac('');
    setNewItemSpecification('');
    setNewItemDimensions('-');
    setNewItemUnit('%'); // Matches Screenshot 1 default '%'
    setNewItemGST(18);    // Matches Screenshot 1 default '18'
    setNewItemQty(0);     // Matches Screenshot 1 default '0'
    setNewItemUnitRate(0);
    setNewItemCostPrice(0);
    setNewItemMarkup(0);
    setNewItemMarkupType('%');
    setNewItemSupplyAndInstall(false);
    setNewSupplyRate(0);
    setNewInstallRate(0);
    setNewItemParentId(parentId || null);
    setNewItemName('');
    setNewItemDiscountPercent(0);
    setNewItemAdditionalCharges(0);
    setNewItemLinkedTaskId('');
    setNewItemBilledQty(0);
    setNewItemProgress(0);
    setIsCostComponentOpen(false);
    setIsCostCodeOpen(false);
    setNewItemCostCode('');
    setIsHsnOpen(false);
    setIsDescriptionOpen(false);
    setItemAttachedFiles([]);
    setCostComponentsList([]);
    setIsAddItemModalOpen(true);
  };

  // Open Edit Item Drawer
  const handleOpenEditItem = (item: BOQItem) => {
    setEditingItem(item);
    setNewItemDesc(item.description || '');
    setNewItemCode(item.item_code || '');
    setNewItemHsnSac(item.hsn_sac_code || '');
    setNewItemSpecification(item.specification || '');
    setNewItemDimensions(item.dimensions || '-');
    setNewItemUnit(item.unit || '%');
    setNewItemGST(item.gst_percent !== undefined ? item.gst_percent : 18);
    setNewItemQty(item.quantity !== undefined ? item.quantity : 0);
    setNewItemUnitRate(item.unit_rate || 0);
    setNewItemCostPrice(item.cost_price || 0);
    setNewItemMarkup(item.mark_up_percent || 0);
    setNewItemMarkupType('%');
    setNewItemSupplyAndInstall(Boolean(item.supply_rate || item.installation_rate));
    setNewSupplyRate(item.supply_rate || 0);
    setNewInstallRate(item.installation_rate || 0);
    setNewItemParentId(item.parent_id || null);
    setNewItemName(item.item_name || item.description || '');
    setNewItemDiscountPercent(item.discount_percent || 0);
    setNewItemAdditionalCharges(item.additional_charges || 0);
    setNewItemLinkedTaskId(item.linked_task_id || '');
    setNewItemBilledQty(item.billed_quantity || 0);
    setNewItemProgress(item.progress_percentage || 0);
    setIsCostComponentOpen(false);
    setIsCostCodeOpen(Boolean(item.cost_code));
    setNewItemCostCode(item.cost_code || '');
    setIsHsnOpen(Boolean(item.hsn_sac_code));
    setIsDescriptionOpen(Boolean(item.description && item.description !== item.item_name));
    setItemAttachedFiles(item.attached_files ? item.attached_files.map(f => ({ name: f, size: 1024 })) : []);
    setCostComponentsList([]);
    setIsAddItemModalOpen(true);
  };

  // Handle Item File Attachment
  const handleItemFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(f => ({
        name: f.name,
        size: f.size
      }));
      setItemAttachedFiles(prev => [...prev, ...newFiles]);
      onShowToast?.(`${newFiles.length} file(s) attached`);
    }
  };

  // Duplicate an Item
  const handleDuplicateItem = (item: BOQItem) => {
    const cloned: BOQItem = {
      ...item,
      id: `item-${Date.now()}`,
      description: `${item.description} (Copy)`,
      billed_quantity: 0,
      progress_percentage: 0,
      linked_task_id: undefined,
      linked_task_name: undefined
    };
    if (isEditMode) {
      setDraftItems(prev => [...prev, cloned]);
    } else if (selectedBOQ) {
      const updatedItems = [...selectedBOQ.items, cloned];
      const newBOQValue = updatedItems.reduce((acc, i) => acc + (i.total_amount || i.sales_price || 0), 0);
      const updatedBOQ = { ...selectedBOQ, items: updatedItems, boq_value: newBOQValue };
      setSelectedBOQ(updatedBOQ);
      setBOQList(prev => prev.map(b => b.id === updatedBOQ.id ? updatedBOQ : b));
    }
    onShowToast?.(`Item "${item.description.slice(0, 25)}..." duplicated`);
  };

  // Delete an Item
  const handleDeleteItem = async (itemId: string) => {
    const confirmed = await confirmAction({
      title: 'Delete BOQ Item',
      message: 'Are you sure you want to remove this line item from the BOQ?',
      confirmText: 'Delete Item',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;

    if (isEditMode) {
      setDraftItems(prev => prev.filter(i => i.id !== itemId));
    } else if (selectedBOQ) {
      const updatedItems = selectedBOQ.items.filter(i => i.id !== itemId);
      const newBOQValue = updatedItems.reduce((acc, i) => acc + (i.total_amount || i.sales_price || 0), 0);
      const updatedBOQ = { ...selectedBOQ, items: updatedItems, boq_value: newBOQValue };
      setSelectedBOQ(updatedBOQ);
      setBOQList(prev => prev.map(b => b.id === updatedBOQ.id ? updatedBOQ : b));
    }
    onShowToast?.('Item removed from BOQ');
  };

  // Add or Update Item in BOQ
  const handleAddLineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDesc = newItemDesc.trim() || newItemName.trim();
    if (!finalDesc) {
      onShowToast?.('Please enter item name or description');
      return;
    }

    // Unit rate determination
    let rate = Number(newItemUnitRate);
    if ((!rate || rate === 0) && Number(newItemCostPrice) > 0) {
      if (newItemMarkupType === '%') {
        rate = Math.round(Number(newItemCostPrice) * (1 + Number(newItemMarkup) / 100));
      } else {
        rate = Math.round(Number(newItemCostPrice) + Number(newItemMarkup));
      }
    }
    if ((!rate || rate === 0) && newItemSupplyAndInstall && (newSupplyRate > 0 || newInstallRate > 0)) {
      rate = Number(newSupplyRate) + Number(newInstallRate);
    }
    const qty = Number(newItemQty) !== undefined && !isNaN(Number(newItemQty)) ? Number(newItemQty) : 0;
    const calculatedAmount = Math.round(rate * qty);
    const discountPercent = Number(newItemDiscountPercent) || 0;
    const discountAmount = Math.round((calculatedAmount * discountPercent) / 100);
    const taxableBase = Math.max(0, calculatedAmount - discountAmount);
    const gstPercent = Number(newItemGST) || 0;
    const taxAmount = Math.round((taxableBase * gstPercent) / 100);
    const additionalCharges = Number(newItemAdditionalCharges) || 0;
    const totalAmount = taxableBase + taxAmount + additionalCharges;

    const matchedTask = tasks.find(t => t.id === newItemLinkedTaskId);

    if (editingItem) {
      const updated: BOQItem = {
        ...editingItem,
        item_name: newItemName.trim() || undefined,
        description: finalDesc,
        item_code: newItemCode.trim(),
        hsn_sac_code: newItemHsnSac.trim(),
        specification: newItemSpecification.trim(),
        dimensions: newItemDimensions.trim() || '-',
        unit: newItemUnit.trim() || '%',
        gst_percent: gstPercent,
        tax_percent: gstPercent,
        tax_amount: taxAmount,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        additional_charges: additionalCharges,
        quantity: qty,
        cost_price: Number(newItemCostPrice),
        mark_up_percent: Number(newItemMarkup),
        unit_rate: rate,
        calculated_amount: calculatedAmount,
        total_amount: totalAmount,
        sales_price: totalAmount,
        cost_code: newItemCostCode.trim() || undefined,
        supply_rate: newItemSupplyAndInstall ? newSupplyRate : undefined,
        installation_rate: newItemSupplyAndInstall ? newInstallRate : undefined,
        attached_files: itemAttachedFiles.length > 0 ? itemAttachedFiles.map(f => f.name) : undefined,
        linked_task_id: newItemLinkedTaskId || undefined,
        linked_task_name: matchedTask?.title || undefined,
        billed_quantity: Number(newItemBilledQty) || 0,
        progress_percentage: Number(newItemProgress) || 0,
        parent_id: newItemParentId || undefined
      };

      if (isEditMode) {
        setDraftItems(prev => prev.map(it => it.id === editingItem.id ? updated : it));
      }
      if (selectedBOQ) {
        const updatedItems = selectedBOQ.items.map(it => it.id === editingItem.id ? updated : it);
        const newBOQValue = updatedItems.reduce((acc, i) => acc + (i.total_amount || i.sales_price || 0), 0);
        const updatedBOQ = { ...selectedBOQ, items: updatedItems, boq_value: newBOQValue };
        setSelectedBOQ(updatedBOQ);
        const updatedList = boqList.map(b => b.id === updatedBOQ.id ? updatedBOQ : b);
        setBOQList(updatedList);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updatedList));
          window.dispatchEvent(new Event('storage'));
        } catch (e) {}
      }
      onShowToast?.('Item updated successfully');
    } else {
      const newItem: BOQItem = {
        id: `item-${Date.now()}`,
        s_no: (selectedBOQ?.items.length || 0) + 1,
        type: 'item',
        parent_id: newItemParentId || undefined,
        item_name: newItemName.trim() || undefined,
        item_code: newItemCode.trim(),
        hsn_sac_code: newItemHsnSac.trim(),
        specification: newItemSpecification.trim(),
        description: finalDesc,
        dimensions: newItemDimensions.trim() || '-',
        cost_price: Number(newItemCostPrice),
        mark_up_percent: Number(newItemMarkup),
        gst_percent: gstPercent,
        tax_percent: gstPercent,
        tax_amount: taxAmount,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        additional_charges: additionalCharges,
        unit_rate: rate,
        quantity: qty,
        unit: newItemUnit.trim() || '%',
        calculated_amount: calculatedAmount,
        total_amount: totalAmount,
        sales_price: totalAmount,
        cost_code: newItemCostCode.trim() || undefined,
        supply_rate: newItemSupplyAndInstall ? newSupplyRate : undefined,
        installation_rate: newItemSupplyAndInstall ? newInstallRate : undefined,
        attached_files: itemAttachedFiles.length > 0 ? itemAttachedFiles.map(f => f.name) : undefined,
        linked_task_id: newItemLinkedTaskId || undefined,
        linked_task_name: matchedTask?.title || undefined,
        billed_quantity: Number(newItemBilledQty) || 0,
        progress_percentage: Number(newItemProgress) || 0
      };

      if (isEditMode) {
        setDraftItems(prev => [...prev, newItem]);
      }
      if (selectedBOQ) {
        const updatedItems = [...selectedBOQ.items, newItem];
        const newBOQValue = updatedItems.reduce((acc, i) => acc + (i.total_amount || i.sales_price || 0), 0);
        const updatedBOQ = { ...selectedBOQ, items: updatedItems, boq_value: newBOQValue };
        setSelectedBOQ(updatedBOQ);
        const updatedList = boqList.map(b => b.id === updatedBOQ.id ? updatedBOQ : b);
        setBOQList(updatedList);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updatedList));
          window.dispatchEvent(new Event('storage'));
        } catch (e) {}
      }
      onShowToast?.('New item added to BOQ');
    }

    setIsAddItemModalOpen(false);
    setEditingItem(null);
  };

  // Handle Task Linking
  const handleConfirmLinkTask = () => {
    if (!selectedBOQ || !linkTaskTargetItem) return;

    const taskObj = tasks.find(t => t.id === selectedTaskId);
    const updatedItems = selectedBOQ.items.map(item => {
      if (item.id === linkTaskTargetItem.id) {
        return {
          ...item,
          linked_task_id: selectedTaskId,
          linked_task_name: taskObj?.title || 'Linked WBS Task',
          progress_percentage: taskObj?.progress_percentage || 0
        };
      }
      return item;
    });

    const updatedBOQ = { ...selectedBOQ, items: updatedItems };
    setSelectedBOQ(updatedBOQ);
    setBOQList(boqList.map(b => b.id === updatedBOQ.id ? updatedBOQ : b));
    setLinkTaskTargetItem(null);
    setSelectedTaskId('');
    onShowToast?.(`Task linked to item #${linkTaskTargetItem.s_no}`);
  };

  // Filter BOQs in list view
  const filteredBOQList = boqList.filter(b => 
    b.boq_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build hierarchy and assign sequence numbers
  const buildHierarchicalItems = (items: BOQItem[]) => {
    // Enrich with seed values if missing
    const enriched = items.map(item => {
      const seed = SEED_SOIL_ITEMS.find(s => s.description.trim().toLowerCase() === item.description.trim().toLowerCase());
      if (seed) {
        return {
          ...item,
          item_code: item.item_code || seed.item_code,
          hsn_sac_code: item.hsn_sac_code || seed.hsn_sac_code,
          specification: item.specification || seed.specification,
          dimensions: item.dimensions && item.dimensions !== '-' ? item.dimensions : seed.dimensions
        };
      }
      return item;
    });

    const grouped: { [key: string]: BOQItem[] } = { root: [] };
    enriched.forEach(item => {
      const pid = item.parent_id || 'root';
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(item);
    });

    const flattened: (BOQItem & { display_sno: string; level: number })[] = [];
    const traverse = (parentId: string, prefix: string, level: number) => {
      const children = grouped[parentId] || [];
      children.forEach((child, idx) => {
        const display_sno = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
        flattened.push({ ...child, display_sno, level });
        traverse(child.id, display_sno, level + 1);
      });
    };
    traverse('root', '', 0);

    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase();
      return flattened.filter(item => 
        item.description.toLowerCase().includes(q) ||
        (item.item_code && item.item_code.toLowerCase().includes(q)) ||
        (item.hsn_sac_code && item.hsn_sac_code.toLowerCase().includes(q)) ||
        (item.specification && item.specification.toLowerCase().includes(q)) ||
        item.unit.toLowerCase().includes(q)
      );
    }
    return flattened;
  };

  // The active list to display in the table
  const displayItems = selectedBOQ ? buildHierarchicalItems(isEditMode ? draftItems : selectedBOQ.items) : [];

  // Financial calculations for bottom summary (Matching Image)
  const itemSubTotal = useMemo(() => {
    return displayItems.reduce((acc, it) => acc + (it.type === 'item' ? (Number(it.sales_price || it.total_amount) || 0) : 0), 0);
  }, [displayItems]);

  const totalTax = useMemo(() => {
    return displayItems.reduce((acc, it) => acc + (it.type === 'item' ? (Number(it.tax_amount) || Math.round((Number(it.sales_price || 0) * (it.gst_percent || 0)) / 100)) : 0), 0);
  }, [displayItems]);

  const chargesCalculated = useMemo(() => {
    const rawVal = Number(additionalCharges) || 0;
    return isAdditionalChargesPercent ? Math.round((itemSubTotal * rawVal) / 100) : rawVal;
  }, [itemSubTotal, additionalCharges, isAdditionalChargesPercent]);

  const finalBOQTotal = useMemo(() => {
    const disc = Number(additionalDiscount) || 0;
    const raw = Math.max(0, itemSubTotal + totalTax - disc + chargesCalculated);
    return isRoundOff ? Math.round(raw) : raw;
  }, [itemSubTotal, totalTax, additionalDiscount, chargesCalculated, isRoundOff]);

  // Helper date formatter: e.g. "16 Sep, 2026"
  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month}, ${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateBadge = (dateStr?: string) => {
    try {
      const d = new Date(dateStr || Date.now());
      if (isNaN(d.getTime())) return { text: '07 Oct 26' };
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = String(d.getFullYear()).slice(-2);
      return { text: `${day} ${month} ${year}` };
    } catch {
      return { text: '07 Oct 26' };
    }
  };

  const formatDueDate = (dateStr?: string) => {
    try {
      const d = new Date(dateStr || Date.now());
      if (isNaN(d.getTime())) return '14 Oct 2026';
      const due = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
      const day = due.getDate();
      const month = due.toLocaleDateString('en-US', { month: 'short' });
      const year = due.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return '14 Oct 2026';
    }
  };

  // Open Add Item modal directly
  const handleOpenAddNewItem = () => {
    setEditingItem(null);
    setNewItemDesc('');
    setNewItemCode('');
    setNewItemName('');
    setNewItemQty(1);
    setNewItemUnit('nos');
    setNewItemUnitRate(0);
    setNewItemCostPrice(0);
    setNewItemMarkup(0);
    setNewItemGST(0);
    setIsAddItemModalOpen(true);
  };

  // Open Edit Invoice Modal
  const handleOpenEditInvoice = (inv: SalesInvoice) => {
    setEditInvoiceClientName(inv.client_name);
    setEditInvoiceDate(inv.invoice_date);
    setEditInvoiceItems(JSON.parse(JSON.stringify(inv.items || [])));
    setIsEditInvoiceModalOpen(true);
    setIsInvoiceMoreMenuOpen(false);
    setIsDownloadDropdownOpen(false);
  };

  // Save Edited Invoice
  const handleSaveEditedInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForDetail || !selectedBOQ) return;

    const subTotal = editInvoiceItems.reduce((acc, it) => acc + (it.invoiced_quantity * it.unit_rate), 0);
    const gstTotal = editInvoiceItems.reduce((acc, it) => acc + Math.round((it.invoiced_quantity * it.unit_rate * (it.gst_percent || 0)) / 100), 0);
    const grandTotal = subTotal + gstTotal;
    const settled = selectedInvoiceForDetail.settled_amount || 0;
    const balanceDue = Math.max(0, grandTotal - settled);

    const updatedItems: SalesInvoiceItem[] = editInvoiceItems.map(it => {
      const sub = it.invoiced_quantity * it.unit_rate;
      const gst = Math.round((sub * (it.gst_percent || 0)) / 100);
      return {
        ...it,
        subtotal: sub,
        gst_amount: gst,
        total_amount: sub + gst
      };
    });

    // Calculate quantity differences for BOQ items
    const oldQtyMap: Record<string, number> = {};
    selectedInvoiceForDetail.items.forEach(it => {
      if (it.item_id) oldQtyMap[it.item_id] = it.invoiced_quantity;
    });

    const updatedBOQItems = selectedBOQ.items.map(bi => {
      const newMatching = updatedItems.find(it => it.item_id === bi.id || it.description === bi.description);
      if (newMatching) {
        const oldQty = oldQtyMap[bi.id] || (selectedInvoiceForDetail.items.find(it => it.description === bi.description)?.invoiced_quantity || 0);
        const diff = newMatching.invoiced_quantity - oldQty;
        return {
          ...bi,
          billed_quantity: Math.max(0, (bi.billed_quantity || 0) + diff)
        };
      }
      return bi;
    });

    const diffValue = grandTotal - selectedInvoiceForDetail.total_amount;
    const updatedBOQ: BOQRecord = {
      ...selectedBOQ,
      items: updatedBOQItems,
      billed_value: Math.max(0, (selectedBOQ.billed_value || 0) + diffValue)
    };
    setSelectedBOQ(updatedBOQ);
    setBOQList(prev => prev.map(b => b.id === updatedBOQ.id ? updatedBOQ : b));

    const updatedInvoice: SalesInvoice = {
      ...selectedInvoiceForDetail,
      client_name: editInvoiceClientName.trim() || selectedInvoiceForDetail.client_name,
      invoice_date: editInvoiceDate,
      items: updatedItems,
      sub_total: subTotal,
      gst_amount: gstTotal,
      total_amount: grandTotal,
      balance_due: balanceDue
    };

    const updatedInvoicesList = updateSalesInvoice(project.id, updatedInvoice);
    setInvoices(updatedInvoicesList);
    setSelectedInvoiceForDetail(updatedInvoice);
    setIsEditInvoiceModalOpen(false);
    onShowToast?.(`Invoice ${updatedInvoice.invoice_number} updated successfully!`);
  };

  // Delete Invoice
  const handleDeleteInvoice = (inv: SalesInvoice) => {
    const confirmed = window.confirm(`Are you sure you want to delete invoice ${inv.invoice_number}? This will restore the invoiced quantities back to the BOQ items.`);
    if (!confirmed) return;

    if (selectedBOQ) {
      const itemQuantitiesReverted: Record<string, number> = {};
      inv.items.forEach(it => {
        if (it.item_id) {
          itemQuantitiesReverted[it.item_id] = (itemQuantitiesReverted[it.item_id] || 0) + it.invoiced_quantity;
        } else {
          const matched = selectedBOQ.items.find(bi => bi.description === it.description || bi.item_name === it.item_name);
          if (matched) {
            itemQuantitiesReverted[matched.id] = (itemQuantitiesReverted[matched.id] || 0) + it.invoiced_quantity;
          }
        }
      });

      const updatedBOQItems = selectedBOQ.items.map(bi => {
        const qtyToRevert = itemQuantitiesReverted[bi.id] || 0;
        if (qtyToRevert > 0) {
          return {
            ...bi,
            billed_quantity: Math.max(0, (bi.billed_quantity || 0) - qtyToRevert)
          };
        }
        return bi;
      });

      const updatedBilledValue = Math.max(0, (selectedBOQ.billed_value || 0) - inv.total_amount);
      const updatedBOQ: BOQRecord = {
        ...selectedBOQ,
        items: updatedBOQItems,
        billed_value: updatedBilledValue
      };

      setSelectedBOQ(updatedBOQ);
      setBOQList(prev => prev.map(b => b.id === updatedBOQ.id ? updatedBOQ : b));
    }

    const updatedInvoices = deleteSalesInvoice(project.id, inv.id);
    setInvoices(updatedInvoices);
    setSelectedInvoiceForDetail(null);
    setIsInvoiceMoreMenuOpen(false);
    onShowToast?.(`Invoice ${inv.invoice_number} deleted successfully.`);
  };

  // Available Items for Invoice: ONLY items with remaining uninvoiced quantity!
  // Once an item is fully invoiced in sales, it disappears from this list.
  const availableItemsForInvoice = useMemo(() => {
    if (!selectedBOQ) return [];
    return selectedBOQ.items.filter(item => {
      if (item.type === 'section') return false;
      const billed = Number(item.billed_quantity) || 0;
      const total = Number(item.quantity) || 1;
      const hasRemaining = total > billed;
      if (!hasRemaining) return false;

      if (searchInvoiceItemQuery.trim()) {
        const q = searchInvoiceItemQuery.toLowerCase();
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchName = item.item_name?.toLowerCase().includes(q);
        const matchCode = item.item_code?.toLowerCase().includes(q);
        return matchDesc || matchName || matchCode;
      }
      return true;
    });
  }, [selectedBOQ, searchInvoiceItemQuery]);

  // Handle Open Create Invoice (Step 1 of 2 in Video Flow)
  const handleOpenCreateInvoice = () => {
    setInvoiceStep(1);
    setSearchInvoiceItemQuery('');
    const invCount = invoices.length;
    setNewInvoiceNumber(`INV-${String(70 + invCount)}`);
    setNewInvoiceDate(new Date().toISOString().split('T')[0]);
    setNewInvoiceClientName(selectedBOQ?.client_name || project.client_name || 'Jisha Jeevan Buildtech');

    // Default select first available item with uninvoiced quantity
    const available = selectedBOQ?.items?.filter(it => it.type !== 'section' && (it.quantity || 1) > (it.billed_quantity || 0)) || [];
    
    if (available.length > 0) {
      const first = available[0];
      setSelectedItemIdsForInvoice([first.id]);
      const unbilledQty = Math.max(1, (first.quantity || 1) - (first.billed_quantity || 0));
      setInvoiceQuantities({ [first.id]: unbilledQty });
      setInvoiceRates({ [first.id]: first.sales_price || first.unit_rate || 2000 });
    } else {
      setSelectedItemIdsForInvoice([]);
      setInvoiceQuantities({});
      setInvoiceRates({});
    }
    setIsCreateInvoiceDrawerOpen(true);
  };

  // Toggle Item selection in Invoice Step 1
  const handleToggleItemForInvoice = (itemId: string, remainingQty: number, rate: number) => {
    if (selectedItemIdsForInvoice.includes(itemId)) {
      setSelectedItemIdsForInvoice(prev => prev.filter(id => id !== itemId));
    } else {
      setSelectedItemIdsForInvoice(prev => [...prev, itemId]);
      if (!invoiceQuantities[itemId]) {
        setInvoiceQuantities(prev => ({ ...prev, [itemId]: remainingQty || 1 }));
      }
      if (!invoiceRates[itemId]) {
        setInvoiceRates(prev => ({ ...prev, [itemId]: rate || 2500 }));
      }
    }
  };

  // Save Sales Invoice (Step 2 in Video Flow)
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBOQ) return;
    if (selectedItemIdsForInvoice.length === 0) {
      onShowToast?.('Please select at least one item to invoice');
      return;
    }

    const itemsToInvoice: SalesInvoiceItem[] = selectedBOQ.items
      .filter(it => selectedItemIdsForInvoice.includes(it.id))
      .map(it => {
        const qty = Number(invoiceQuantities[it.id]) || 1;
        const rate = Number(invoiceRates[it.id]) || it.sales_price || it.unit_rate || 0;
        const subtotal = Math.round(qty * rate);
        const gstPct = Number(it.gst_percent) || 0;
        const gstAmt = Math.round((subtotal * gstPct) / 100);
        const total = subtotal + gstAmt;
        return {
          id: `inv-item-${Date.now()}-${it.id}`,
          item_id: it.id,
          item_code: it.item_code,
          item_name: it.item_name || it.description.slice(0, 30),
          description: it.description,
          unit: it.unit || 'nos',
          invoiced_quantity: qty,
          total_quantity: it.quantity,
          unit_rate: rate,
          subtotal: subtotal,
          gst_percent: gstPct,
          gst_amount: gstAmt,
          total_amount: total
        };
      });

    const subTotal = itemsToInvoice.reduce((acc, it) => acc + it.subtotal, 0);
    const gstTotal = itemsToInvoice.reduce((acc, it) => acc + it.gst_amount, 0);
    const grandTotal = itemsToInvoice.reduce((acc, it) => acc + it.total_amount, 0);

    const newInvoice: SalesInvoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      project_id: project.id,
      boq_id: selectedBOQ.id,
      boq_number: selectedBOQ.boq_number,
      invoice_number: newInvoiceNumber.trim() || `INV-${String(70 + invoices.length)}`,
      invoice_date: newInvoiceDate,
      client_name: newInvoiceClientName.trim() || selectedBOQ.client_name,
      items: itemsToInvoice,
      sub_total: subTotal,
      discount: 0,
      gst_amount: gstTotal,
      total_amount: grandTotal,
      settled_amount: 0,
      balance_due: grandTotal,
      status: 'APPROVED',
      bank_name: 'Axis Bank',
      bank_account: '918020048192847',
      created_at: new Date().toISOString()
    };

    // Update billed quantity on line items in selectedBOQ
    const updatedBOQItems = selectedBOQ.items.map(it => {
      if (selectedItemIdsForInvoice.includes(it.id)) {
        const invoicedQty = Number(invoiceQuantities[it.id]) || 0;
        return {
          ...it,
          billed_quantity: (it.billed_quantity || 0) + invoicedQty
        };
      }
      return it;
    });

    const newBilledValue = (selectedBOQ.billed_value || 0) + grandTotal;
    const updatedBOQ: BOQRecord = {
      ...selectedBOQ,
      items: updatedBOQItems,
      billed_value: newBilledValue
    };

    setSelectedBOQ(updatedBOQ);
    setBOQList(prev => prev.map(b => b.id === updatedBOQ.id ? updatedBOQ : b));

    // Save to invoice service
    const updatedInvoices = addSalesInvoice(project.id, newInvoice);
    setInvoices(updatedInvoices);

    setIsCreateInvoiceDrawerOpen(false);
    onShowToast?.(`Sales Invoice ${newInvoice.invoice_number} created successfully!`);
  };

  // =========================================================================
  // VIEW 3: BOQ DETAIL VIEW (Red & White Theme)
  // =========================================================================
  if (selectedBOQ) {
    return (
      <div className="space-y-4 font-sans select-none">
        
        {/* Top Header Information Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          
          {/* Left: Back Button & 3 Info Badges */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => setSelectedBOQ(null)}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
              title="Back to BOQ List"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Badge 1: BOQ Title & Client Name */}
            <div className="border border-slate-200/90 rounded-xl px-3 py-1.5 bg-white flex items-center justify-between gap-4 min-w-[140px] shadow-2xs">
              <div>
                <div className="text-[11px] font-medium text-slate-400 capitalize leading-tight">
                  {selectedBOQ.title || 'Soil'}
                </div>
                <div className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight mt-0.5">
                  {selectedBOQ.client_name}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => handleOpenEditModal(selectedBOQ, 'title')}
                className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors"
                title="Edit Title / Client"
              >
                <SquarePen className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Badge 2: BOQ Number */}
            <div className="border border-slate-200/90 rounded-xl px-3 py-1.5 bg-white flex items-center justify-between gap-4 min-w-[120px] shadow-2xs">
              <div>
                <div className="text-[11px] font-medium text-slate-400 leading-tight">BOQ No.</div>
                <div className="text-xs sm:text-[13px] font-bold text-slate-800 tracking-tight leading-tight mt-0.5">
                  {selectedBOQ.boq_number}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => handleOpenEditModal(selectedBOQ, 'number')}
                className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors"
                title="Edit BOQ Number"
              >
                <SquarePen className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Badge 3: BOQ Date */}
            <div className="border border-slate-200/90 rounded-xl px-3 py-1.5 bg-white flex items-center justify-between gap-4 min-w-[130px] shadow-2xs">
              <div>
                <div className="text-[11px] font-medium text-slate-400 leading-tight">BOQ Date</div>
                <div className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight mt-0.5">
                  {formatDateDisplay(selectedBOQ.date)}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => handleOpenEditModal(selectedBOQ, 'date')}
                className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors"
                title="Edit BOQ Date"
              >
                <SquarePen className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: 3 KPI Summary Cards */}
          <div className="flex items-center gap-2.5 shrink-0 self-end xl:self-auto">
            {/* KPI 1: BOQ Value */}
            <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs min-w-[105px]">
              <div className="text-[10px] font-medium text-slate-500">BOQ Value</div>
              <div className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight mt-0.5">
                ₹ {selectedBOQ.boq_value.toLocaleString()}
              </div>
            </div>

            {/* KPI 2: Progress */}
            <div className="px-3.5 py-1.5 rounded-xl bg-[#eaf7f2] border border-emerald-100 shadow-2xs min-w-[95px]">
              <div className="text-[10px] font-medium text-emerald-800">Progress</div>
              <div className="text-sm sm:text-[15px] font-bold text-emerald-900 tracking-tight mt-0.5">
                {selectedBOQ.physical_progress}%
              </div>
            </div>

            {/* KPI 3: Billed */}
            <div className="px-3.5 py-1.5 rounded-xl bg-[#fff5f5] border border-red-100 shadow-2xs min-w-[105px]">
              <div className="text-[10px] font-medium text-red-600">Billed</div>
              <div className="text-sm sm:text-[15px] font-bold text-red-950 tracking-tight mt-0.5">
                ₹ {(invoices.reduce((s, inv) => s + (Number(inv.total_amount) || 0), 0) || selectedBOQ.billed_value || 0).toLocaleString()}
              </div>
            </div>
          </div>

        </div>

        {/* Sub-Navigation Pills Bar & Action Controls (Red & White Theme) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          
          {/* Navigation Pills: Items | Budget | Milestone | Invoices */}
          <div className="inline-flex items-center p-1 bg-white rounded-full border border-slate-200 shadow-xs self-start">
            <button
              type="button"
              onClick={() => setActiveDetailTab('items')}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeDetailTab === 'items'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Items
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab('budget')}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeDetailTab === 'budget'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Budget
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab('milestone')}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeDetailTab === 'milestone'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Milestone
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab('invoices')}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeDetailTab === 'invoices'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Invoices
            </button>
          </div>

          {/* Right Toolbar (Red Theme) */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {!isEditMode ? (
              <>
                {/* Search Pill */}
                <div className="relative w-36 sm:w-44">
                  <input
                    type="text"
                    placeholder="search"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="w-full pr-8 pl-3.5 py-1.5 text-xs bg-white border border-slate-200/90 rounded-full text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600 shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>

                {/* + Section Button */}
                <button
                  type="button"
                  onClick={() => {
                    setDraftItems([...(selectedBOQ?.items || [])]);
                    setIsEditMode(true);
                    setIsAddSectionModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white border border-red-600 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Add new section"
                >
                  <Plus className="w-3.5 h-3.5 text-red-600" />
                  <span>Section</span>
                </button>

                {/* + Add Item Dropdown Button */}
                <div className="relative" ref={addItemDropdownRef}>
                  <div className="inline-flex rounded-lg shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftItems([...(selectedBOQ?.items || [])]);
                        setIsEditMode(true);
                        handleOpenAddItem();
                      }}
                      className="px-3 py-1.5 bg-white border border-red-600 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-l-lg flex items-center gap-1 transition-colors cursor-pointer"
                      title="Add line item"
                    >
                      <Plus className="w-3.5 h-3.5 text-red-600" />
                      <span>Add Item</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddItemDropdownOpen(!isAddItemDropdownOpen)}
                      className="px-1.5 py-1.5 bg-white border-y border-r border-red-600 hover:bg-red-50 text-red-700 rounded-r-lg transition-colors cursor-pointer flex items-center justify-center"
                      title="More item options"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAddItemDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Dropdown Options */}
                  {isAddItemDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddItemDropdownOpen(false);
                          setDraftItems([...(selectedBOQ?.items || [])]);
                          setIsEditMode(true);
                          handleOpenAddItem();
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-800 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-red-600" />
                        <span>New Custom Item</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddItemDropdownOpen(false);
                          handleLoadSampleSoilItems();
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 hover:text-red-900 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-red-600" />
                        <span>Load Soil Investigation Items</span>
                      </button>
                      <div className="h-px bg-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddItemDropdownOpen(false);
                          setDraftItems([...(selectedBOQ?.items || [])]);
                          setIsEditMode(true);
                          setIsAddSectionModalOpen(true);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-800 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-red-600" />
                        <span>Add Section</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit Mode Toggle / Save Button */}
                <button
                  type="button"
                  onClick={toggleEditMode}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer active:scale-95"
                  title="Enter edit mode"
                >
                  Edit
                </button>

                {/* Download Icon */}
                <button
                  type="button"
                  onClick={() => onShowToast?.(`Exporting ${selectedBOQ.boq_number} items...`)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                  title="Download BOQ"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* 3 Dots Menu */}
                <button
                  type="button"
                  onClick={() => onShowToast?.('More BOQ actions')}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {/* + Section Button (Red Border) */}
                <button
                  type="button"
                  onClick={() => setIsAddSectionModalOpen(true)}
                  className="px-3.5 py-1.5 bg-white border border-red-600 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-red-600" />
                  <span>Section</span>
                </button>

                {/* + Add Item Dropdown Button (Red Border) */}
                <div className="relative" ref={addItemDropdownRef}>
                  <div className="inline-flex rounded-lg shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleOpenAddItem()}
                      className="px-3.5 py-1.5 bg-white border border-red-600 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-l-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-red-600" />
                      <span>Add Item</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddItemDropdownOpen(!isAddItemDropdownOpen)}
                      className="px-1.5 py-1.5 bg-white border-y border-r border-red-600 hover:bg-red-50 text-red-700 rounded-r-lg transition-colors cursor-pointer flex items-center justify-center"
                      title="Item options"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAddItemDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Dropdown Options */}
                  {isAddItemDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddItemDropdownOpen(false);
                          handleOpenAddItem();
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-800 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-red-600" />
                        <span>New Custom Item</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddItemDropdownOpen(false);
                          handleLoadSampleSoilItems();
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 hover:text-red-900 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-red-600" />
                        <span>Load Soil Investigation Items</span>
                      </button>
                      <div className="h-px bg-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddItemDropdownOpen(false);
                          setIsAddSectionModalOpen(true);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-800 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-red-600" />
                        <span>Add Section</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Save Button (Solid Red) */}
                <button
                  type="button"
                  onClick={handleSaveEditMode}
                  className="px-5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer active:scale-95"
                >
                  Save
                </button>

                {/* Close Edit Mode Button (Red Border) */}
                <button
                  type="button"
                  onClick={toggleEditMode}
                  className="p-1.5 bg-white border border-red-600 hover:bg-red-50 text-red-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
                  title="Close edit mode"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>

        {/* SUBTAB 1: Items Table (Red & White Theme) */}
        {activeDetailTab === 'items' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead className="bg-[#f8f9fc] text-slate-800 font-bold border-b border-slate-200/80 select-none">
                  <tr>
                    <th className="py-3.5 px-4 w-14 font-bold text-slate-800 text-[13px]">S.No</th>
                    <th className="py-3.5 px-4 min-w-[340px] font-bold text-slate-800 text-[13px]">Item</th>
                    <th className="py-3.5 px-4 w-28 text-center font-bold text-slate-800 text-[13px]">N x L x W x H</th>
                    <th className="py-3.5 px-4 w-28 text-right font-bold text-slate-800 text-[13px]">Unit rate (₹)</th>
                    <th className="py-3.5 px-4 w-28 text-right font-bold text-slate-800 text-[13px]">QTY</th>
                    <th className="py-3.5 px-4 w-28 text-center font-bold text-slate-800 text-[13px]">Progress</th>
                    <th className="py-3.5 px-4 w-28 text-right font-bold text-slate-800 text-[13px]">Billed Qty</th>
                    <th className="py-3.5 px-4 w-32 text-right font-bold text-slate-800 text-[13px]">Sales Price (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                          <p className="text-sm font-medium text-slate-700">
                            No BOQ Billing Activity Item found
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDraftItems([...(selectedBOQ?.items || [])]);
                                setIsEditMode(true);
                                handleOpenAddItem();
                              }}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Item</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleLoadSampleSoilItems}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-red-600" />
                              <span>Load Sample Items</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDraftItems([...(selectedBOQ?.items || [])]);
                                setIsEditMode(true);
                                setIsAddSectionModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-red-600" />
                              <span>Section</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((item) => (
                      <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors group ${item.type === 'section' ? 'bg-slate-50/40' : ''}`}>
                        {/* S.No */}
                        <td className="py-3.5 px-4 font-medium text-slate-800 align-top">
                          {item.display_sno}
                        </td>

                        {/* Item Description, Badges & Specs */}
                        <td className="py-3.5 px-4 text-slate-800 leading-relaxed align-top relative">
                          <div 
                            className={`flex items-start gap-1.5 max-w-2xl text-[12.5px] ${item.type === 'section' ? 'font-bold text-slate-900' : 'font-normal text-slate-800'}`} 
                            style={{ paddingLeft: `${item.level * 1.25}rem` }}
                          >
                            {item.type === 'section' && <ChevronDown className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />}
                            {item.type === 'item' && item.level > 0 && <span className="text-slate-300 mx-0.5 shrink-0">↳</span>}
                            
                            <div className="flex-1 min-w-0">
                              <div className="leading-snug">{item.description}</div>

                              {/* Badges: Item Code, HSN/SAC, Tax */}
                              {item.type === 'item' && (item.item_code || item.hsn_sac_code || (item.gst_percent !== undefined && item.gst_percent > 0)) && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  {item.item_code && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                      Code: {item.item_code}
                                    </span>
                                  )}
                                  {item.hsn_sac_code && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                                      HSN/SAC: {item.hsn_sac_code}
                                    </span>
                                  )}
                                  {item.gst_percent !== undefined && item.gst_percent > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                      +{item.gst_percent}% GST
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Detailed Technical Specification */}
                              {item.specification && (
                                <div className="mt-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200/70 rounded-md p-1.5 leading-snug">
                                  <span className="font-semibold text-slate-600">Spec: </span>
                                  <span>{item.specification}</span>
                                </div>
                              )}

                              {/* Linked WBS Task */}
                              {item.linked_task_name && (
                                <div className="mt-1 text-[10px] text-red-600 font-medium flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Linked: {item.linked_task_name}</span>
                                </div>
                              )}

                              {/* Quick Item Actions (Edit, Duplicate, Delete) */}
                              {item.type === 'item' && (
                                <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditItem(item)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-red-600 hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                    title="Edit item details"
                                  >
                                    <SquarePen className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateItem(item)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                    title="Duplicate item"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Duplicate</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                    title="Delete item"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Hover Actions for Section in Edit Mode */}
                          {isEditMode && item.type === 'section' && (
                            <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenAddItem(item.id)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Add item to the section"
                              >
                                <FilePlus className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onShowToast?.('Add item from library')}
                                className="p-1 hover:bg-slate-200 rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Add item from library"
                              >
                                <Layers className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewSectionParentId(item.id);
                                  setNewSectionAssignToParent(true);
                                  setIsAddSectionModalOpen(true);
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Add sub-section"
                              >
                                <FolderPlus className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* N x L x W x H */}
                        <td className="py-3.5 px-4 text-center tracking-tight text-slate-500 align-top">
                          {item.type === 'item' ? item.dimensions || '-' : '-'}
                        </td>

                        {/* Unit rate */}
                        <td className="py-3.5 px-4 text-right tracking-tight font-medium text-slate-800 align-top">
                          {item.type === 'item' ? (
                            <div>
                              <div>{item.unit_rate ? item.unit_rate.toLocaleString() : '0'}</div>
                              {item.gst_percent !== undefined && (
                                <div className="text-[10px] text-slate-400 font-normal">+{item.gst_percent}% GST</div>
                              )}
                            </div>
                          ) : '-'}
                        </td>

                        {/* QTY */}
                        <td className="py-3.5 px-4 text-right tracking-tight text-slate-800 align-top">
                          {item.type === 'item' ? (
                            <>{item.quantity} <span className="text-slate-600 text-[11px]">{item.unit}</span></>
                          ) : '-'}
                        </td>

                        {/* Progress Button */}
                        <td className="py-3.5 px-4 text-center align-top">
                          {item.type === 'item' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLinkTaskTargetItem(item);
                                setSelectedTaskId(item.linked_task_id || (tasks[0]?.id ?? ''));
                              }}
                              className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer inline-flex items-center gap-1 ${
                                item.linked_task_id
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-red-50/60 text-red-600 border-red-200 hover:bg-red-100/70'
                              }`}
                            >
                              {item.linked_task_id ? `${item.progress_percentage || 0}% Done` : 'Link Task'}
                            </button>
                          ) : '-'}
                        </td>

                        {/* Billed Qty */}
                        <td className="py-3.5 px-4 text-right tracking-tight text-slate-800 align-top">
                          {item.type === 'item' ? (
                            <>{item.billed_quantity} <span className="text-slate-600 text-[11px]">{item.unit}</span></>
                          ) : '-'}
                        </td>

                        {/* Sales Price */}
                        <td className="py-3.5 px-4 text-right tracking-tight font-semibold text-slate-900 align-top">
                          {item.type === 'item' ? (
                            <div>
                              <div>{item.sales_price ? item.sales_price.toLocaleString() : '0'}</div>
                              {item.gst_percent !== undefined && item.gst_percent > 0 && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Total: ₹ {Math.round(item.sales_price * (1 + item.gst_percent / 100)).toLocaleString()}
                                </div>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Totals */}
            <div className="bg-[#f8f9fc] border-t border-slate-200/80 px-4 py-3 flex items-center justify-between text-xs font-medium text-slate-600">
              <div>Total {displayItems.filter(i => i.type === 'item').length} line items</div>
              <div className="flex items-center gap-6 tracking-tight font-bold text-slate-800">
                <div>
                  Total BOQ: <span className="text-slate-900">₹ {selectedBOQ.boq_value.toLocaleString()}</span>
                </div>
                <div>
                  Total Billed: <span className="text-red-600">₹ {selectedBOQ.billed_value.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Financial & Terms Card (Exact Match to User Screenshot) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Bank Details, Terms & Conditions, Notes */}
                <div className="space-y-4">
                  {/* + Bank Details */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsBankDetailsOpen(!isBankDetailsOpen)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Bank Details</span>
                    </button>
                    {(isBankDetailsOpen || Boolean(bankDetailsText)) && (
                      <div className="animate-in fade-in duration-150">
                        <textarea
                          rows={2}
                          placeholder="e.g. Bank: HDFC Bank, A/C: 50200012345678, IFSC: HDFC0001234, Branch: Coimbatore"
                          value={bankDetailsText}
                          onChange={(e) => setBankDetailsText(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 bg-slate-50/50"
                        />
                      </div>
                    )}
                  </div>

                  {/* + Add Terms and Conditions */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsTermsOpen(!isTermsOpen)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Terms and Conditions</span>
                    </button>
                    {(isTermsOpen || Boolean(termsText)) && (
                      <div className="animate-in fade-in duration-150">
                        <textarea
                          rows={2}
                          placeholder="e.g. 1. 50% Advance with work order. 2. Testing as per IS standards. 3. GST 18% extra as applicable."
                          value={termsText}
                          onChange={(e) => setTermsText(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 bg-slate-50/50"
                        />
                      </div>
                    )}
                  </div>

                  {/* + Add Note */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsNotesOpen(!isNotesOpen)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Note</span>
                    </button>
                    {(isNotesOpen || Boolean(notesText)) && (
                      <div className="animate-in fade-in duration-150">
                        <textarea
                          rows={2}
                          placeholder="e.g. Borehole location marking by client engineer before mobilization."
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 bg-slate-50/50"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Financial Breakdown */}
                <div className="space-y-3.5 max-w-md ml-auto w-full text-xs text-slate-700">
                  {/* Item Sub Total */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-600">Item Sub Total</span>
                    <span className="font-semibold text-slate-900 text-[13px]">
                      ₹ {itemSubTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* IGST */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-600">IGST</span>
                    <span className="font-semibold text-slate-900 text-[13px]">
                      ₹ {totalTax.toLocaleString()}
                    </span>
                  </div>

                  {/* Additional Discount */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-slate-600">Additional Discount</span>
                    <div className="relative w-48 sm:w-56">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={additionalDiscount === 0 ? '0' : additionalDiscount}
                        onChange={(e) => setAdditionalDiscount(Number(e.target.value) || 0)}
                        className="w-full text-center py-1.5 px-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Additional Charges */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative w-full border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100">
                      <span className="text-slate-600 font-medium">Additional Charges</span>
                    </div>
                    <div className="relative w-48 sm:w-56 flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 bg-white">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={additionalCharges === 0 ? '0' : additionalCharges}
                        onChange={(e) => setAdditionalCharges(Number(e.target.value) || 0)}
                        className="w-full text-center py-1.5 px-2 focus:outline-none font-medium text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => setIsAdditionalChargesPercent(!isAdditionalChargesPercent)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-red-50 text-red-700 hover:bg-red-100 border-l border-slate-200 transition-colors cursor-pointer"
                        title="Toggle percentage / flat rupees"
                      >
                        {isAdditionalChargesPercent ? `${additionalCharges || 0}%` : '0%'}
                      </button>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-sm">Total Amount</span>
                      <span className="font-bold text-slate-900 text-base">
                        ₹ {finalBOQTotal.toLocaleString()}
                      </span>
                    </div>

                    {/* Round Off Checkbox */}
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="boq-round-off"
                        checked={isRoundOff}
                        onChange={(e) => setIsRoundOff(e.target.checked)}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                      />
                      <label htmlFor="boq-round-off" className="text-xs text-slate-600 cursor-pointer select-none">
                        Round Off
                      </label>
                    </div>
                  </div>

                  {/* Quick Save changes button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveEditMode}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer active:scale-95"
                    >
                      Save Financials & Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: Budget Breakdown View */}
        {activeDetailTab === 'budget' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Budget vs Estimated Takeoff</h3>
              <p className="text-xs text-slate-500 mt-0.5">Comparison of baseline project cost allocations with this BOQ scope.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Allocated Budget</div>
                <div className="text-lg font-bold tracking-tight text-slate-900 mt-1">₹ {selectedBOQ.boq_value.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">From BOQ Line Items</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Billed to Client</div>
                <div className="text-lg font-bold tracking-tight text-red-600 mt-1">₹ {selectedBOQ.billed_value.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">RA Bills raised</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Budget Utilization</div>
                <div className="text-lg font-bold tracking-tight text-emerald-700 mt-1">
                  {selectedBOQ.boq_value > 0 ? ((selectedBOQ.billed_value / selectedBOQ.boq_value) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Current execution ratio</div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: Milestone View */}
        {activeDetailTab === 'milestone' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Milestones & Stage Gate Approvals</h3>
              <p className="text-xs text-slate-500 mt-0.5">Milestone schedule linked with {selectedBOQ.title} BOQ items.</p>
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="text-xs font-bold text-slate-800">Stage 1: Geotechnical Soil Testing & SPT Boreholes</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Scope: 10m boring, undisturbed sample collection, SPT N-value checks</div>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold">In Progress</span>
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="text-xs font-bold text-slate-800">Stage 2: Laboratory Chemical & Shear Parameter Analysis</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Scope: Gradation, moisture, Atterberg limits, Triaxial shear parameters</div>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">Upcoming</span>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: Invoices View (Video Flow: + Sales Invoice & Settlement) */}
        {activeDetailTab === 'invoices' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Invoices & RA Bills</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tax invoices generated against {selectedBOQ.boq_number}.</p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateInvoice}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Sales Invoice</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="py-3 px-4 font-bold text-slate-800 text-[13px]">Invoice No</th>
                    <th className="py-3 px-4 font-bold text-slate-800 text-[13px]">Client Name</th>
                    <th className="py-3 px-4 font-bold text-slate-800 text-[13px]">Invoice Date</th>
                    <th className="py-3 px-4 font-bold text-slate-800 text-[13px] text-right">Total Amount (₹)</th>
                    <th className="py-3 px-4 font-bold text-slate-800 text-[13px] text-right">Balance Due (₹)</th>
                    <th className="py-3 px-4 font-bold text-slate-800 text-[13px] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No invoices generated yet. Click "+ Sales Invoice" to bill items.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => {
                      const isSettled = (inv.balance_due !== undefined ? inv.balance_due : inv.total_amount) === 0 || inv.status === 'SETTLED';
                      const isPartiallySettled = !isSettled && ((inv.settled_amount || 0) > 0 || inv.status === 'PARTIALLY_SETTLED');
                      return (
                        <tr 
                          key={inv.id} 
                          onClick={() => {
                            setSelectedInvoiceForDetail(inv);
                            setIsDownloadDropdownOpen(false);
                            setIsInvoiceMoreMenuOpen(false);
                          }}
                          className="hover:bg-red-50/30 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 tracking-tight font-bold text-slate-800">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">{inv.client_name}</td>
                          <td className="py-3 px-4 text-slate-600">{formatDateDisplay(inv.invoice_date)}</td>
                          <td className="py-3 px-4 text-right tracking-tight font-bold text-slate-900">
                            ₹ {inv.total_amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right tracking-tight text-red-600 font-bold">
                            ₹ {(inv.balance_due ?? inv.total_amount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                              isSettled
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isPartiallySettled
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {isSettled ? 'SETTLED' : isPartiallySettled ? 'PARTIAL' : 'APPROVED'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* INVOICE DETAIL DRAWER (Matching Screenshots 1, 2, 3) */}
            {selectedInvoiceForDetail && (
              <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
                <div className="bg-white max-w-lg w-full h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200">
                  
                  {/* Header: ✕ SALES INVOICE, Entry by Bagyavathi Accountant, Mail, Download, Edit, 3-dots */}
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white relative">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoiceForDetail(null);
                          setIsDownloadDropdownOpen(false);
                          setIsInvoiceMoreMenuOpen(false);
                        }}
                        className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm tracking-wide">SALES INVOICE</h3>
                        <p className="text-[11px] text-slate-500">Entry by Bagyavathi Accountant</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 relative">
                      {/* Email icon button */}
                      <button
                        type="button"
                        title="Share Invoice by Email"
                        onClick={() => {
                          window.open(`mailto:?subject=${encodeURIComponent(`Invoice ${selectedInvoiceForDetail.invoice_number} - ${selectedInvoiceForDetail.client_name}`)}&body=${encodeURIComponent(`Dear ${selectedInvoiceForDetail.client_name},\n\nPlease find your Sales Invoice #${selectedInvoiceForDetail.invoice_number} for ₹${selectedInvoiceForDetail.total_amount.toLocaleString('en-IN')}.\n\nProject: ${project.name}\nBOQ No: ${selectedInvoiceForDetail.boq_number || selectedBOQ.boq_number || 'Sales-62'}\n\nRegards,\nBOOSHNAM ASSOCIATES PVT LTD`)}`);
                        }}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                      </button>

                      {/* Download icon button with dropdown (PDF & Excel) */}
                      <div className="relative">
                        <button
                          type="button"
                          title="Download Invoice"
                          onClick={() => {
                            setIsDownloadDropdownOpen(!isDownloadDropdownOpen);
                            setIsInvoiceMoreMenuOpen(false);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {isDownloadDropdownOpen && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setIsDownloadDropdownOpen(false);
                                exportSalesInvoiceToPDF(selectedInvoiceForDetail, project.name);
                                onShowToast?.(`Downloading ${selectedInvoiceForDetail.invoice_number} as PDF...`);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2.5 cursor-pointer font-medium"
                            >
                              <FileText className="w-4 h-4 text-red-600" />
                              <span>Download PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsDownloadDropdownOpen(false);
                                exportSalesInvoiceToExcel(selectedInvoiceForDetail, project.name);
                                onShowToast?.(`Downloading ${selectedInvoiceForDetail.invoice_number} as Excel (.xlsx)...`);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 cursor-pointer font-medium"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                              <span>Download Excel (.xlsx)</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Edit icon button */}
                      <button
                        type="button"
                        title="Edit Invoice"
                        onClick={() => handleOpenEditInvoice(selectedInvoiceForDetail)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200 transition-colors"
                      >
                        <SquarePen className="w-4 h-4" />
                      </button>

                      {/* 3-dots menu button with Delete option (Screenshot 3) */}
                      <div className="relative">
                        <button
                          type="button"
                          title="More Options"
                          onClick={() => {
                            setIsInvoiceMoreMenuOpen(!isInvoiceMoreMenuOpen);
                            setIsDownloadDropdownOpen(false);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isInvoiceMoreMenuOpen && (
                          <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(selectedInvoiceForDetail)}
                              className="w-full px-3.5 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body matching Screenshots 1 & 2 */}
                  <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                    
                    {/* Top Info Block: Date Badge + Client Details */}
                    <div className="flex items-start gap-3.5">
                      {/* Blue calendar date badge */}
                      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg px-2.5 py-2 flex flex-col items-center justify-center shrink-0 min-w-[70px]">
                        <span className="text-[10px] font-bold text-[#1d4ed8] leading-tight">
                          {formatDateBadge(selectedInvoiceForDetail.invoice_date).text}
                        </span>
                        <div className="mt-1 w-6 h-6 rounded bg-[#3b82f6] text-white flex items-center justify-center text-[9px] font-bold shadow-2xs">
                          INV
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-xs text-slate-700">
                          Client: <span className="font-bold text-slate-900">{selectedInvoiceForDetail.client_name}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-600">
                          #{selectedInvoiceForDetail.invoice_number}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight">
                          Project: {project.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          BOQ No: {selectedInvoiceForDetail.boq_number || selectedBOQ.boq_number || 'Sales-62'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Due Date: {formatDueDate(selectedInvoiceForDetail.invoice_date)}
                        </div>
                      </div>
                    </div>

                    {/* Address Block */}
                    <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-slate-100 text-xs">
                      <div>
                        <div className="text-slate-600 font-medium">Bill From:</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">No address available</div>
                        <div className="text-slate-600 font-medium mt-2.5">Ship From:</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">No address available</div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-600 font-medium">Bill To:</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">No address available</div>
                        <div className="text-slate-600 font-medium mt-2.5">Ship To:</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">No address available</div>
                      </div>
                    </div>

                    {/* Line Items Table (Screenshot 1) */}
                    <div className="border-b border-slate-100 pb-3">
                      <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium pb-2 border-b border-slate-100">
                        <span className="flex-1">Item</span>
                        <span className="w-16 text-center">Qty.</span>
                        <span className="w-20 text-right">Amt.</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {selectedInvoiceForDetail.items?.map((item, idx) => (
                          <div key={idx} className="py-3 flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-normal text-slate-800 text-xs leading-relaxed">
                                {item.item_name || item.description}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                ₹ {item.unit_rate.toLocaleString('en-IN')}/{item.unit || 'nos'}
                              </div>
                            </div>
                            <div className="w-16 text-center font-medium text-slate-700 text-xs pt-0.5">
                              {item.invoiced_quantity}
                            </div>
                            <div className="w-20 text-right font-medium text-slate-800 text-xs pt-0.5">
                              {item.total_amount.toLocaleString('en-IN')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tax & Financial Breakdown (Screenshot 2) */}
                    <div className="space-y-2 text-xs text-slate-600 pt-1">
                      <div className="flex justify-between">
                        <span>SGST (9%)</span>
                        <span>₹ {Math.round((selectedInvoiceForDetail.gst_amount || 0) / 2).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CGST (9%)</span>
                        <span>₹ {Math.round((selectedInvoiceForDetail.gst_amount || 0) / 2).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span>₹ {(selectedInvoiceForDetail.discount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Additional Charges</span>
                        <span>₹ 0</span>
                      </div>

                      <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900">
                        <span>Total Amount</span>
                        <span>₹ {selectedInvoiceForDetail.total_amount.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="border-t border-slate-100 pt-2 flex justify-between">
                        <span>Post Tax Deductions</span>
                        <span>₹ 0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Post Tax Retentions</span>
                        <span>₹ 0</span>
                      </div>

                      <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900">
                        <span>Net Amount</span>
                        <span>₹ {selectedInvoiceForDetail.total_amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Settled Amount</span>
                        <span>₹ {(selectedInvoiceForDetail.settled_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Balance Due Container (Screenshot 2) */}
                    <div className="bg-[#fff5f5] border border-rose-100 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Balance Due</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        ₹ {(selectedInvoiceForDetail.balance_due ?? selectedInvoiceForDetail.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Terms & Condition Notch Box (Screenshot 2) */}
                    <div className="border border-slate-200/90 rounded-xl p-3.5 bg-white space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider">TERMS & CONDITION</span>
                        <Settings className="w-4 h-4 text-slate-700" />
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Late payments may result in late payment fees. Please reach out to us in case of any Invoice errors. All disputes are subject to India jurisdiction only
                      </p>
                    </div>

                    {/* Bank Details (Screenshot 2) */}
                    <div className="pt-2 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">BOOSHNAM ASSOCIATES PVT LTD</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">AC: 922020058090700</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 bg-[#861F41] rounded flex items-center justify-center text-white text-[11px] font-bold">
                          ▲
                        </div>
                        <span className="text-[9px] font-extrabold text-[#861F41] tracking-tight">AXIS BANK</span>
                      </div>
                    </div>

                    {/* Payment In button (Screenshot 2) */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const invNum = selectedInvoiceForDetail.invoice_number;
                          setSelectedInvoiceForDetail(null);
                          onNavigateTab?.('transaction');
                          onShowToast?.(`Navigated to Transactions. Settle invoice ${invNum} with Payment In.`);
                        }}
                        className="w-full py-2.5 bg-white border border-slate-200 hover:border-red-500 hover:bg-red-50/20 text-red-600 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Payment In</span>
                      </button>
                    </div>

                    {/* Approved Badge (Screenshot 2 bottom) */}
                    <div className="pt-2 pb-1 flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>APPROVED</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EDIT INVOICE MODAL */}
            {isEditInvoiceModalOpen && selectedInvoiceForDetail && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Edit Sales Invoice #{selectedInvoiceForDetail.invoice_number}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Modify invoice date, client name, and item rates/quantities</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditInvoiceModalOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditedInvoice} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Client Name</label>
                        <input
                          type="text"
                          required
                          value={editInvoiceClientName}
                          onChange={(e) => setEditInvoiceClientName(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Invoice Date</label>
                        <input
                          type="date"
                          required
                          value={editInvoiceDate}
                          onChange={(e) => setEditInvoiceDate(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Line Items</label>
                      {editInvoiceItems.map((item, idx) => (
                        <div key={item.id || idx} className="p-3 border border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                          <div className="font-bold text-slate-800 text-xs truncate">{item.item_name || item.description}</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Quantity</label>
                              <input
                                type="number"
                                min="1"
                                value={item.invoiced_quantity}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 1;
                                  setEditInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, invoiced_quantity: val } : it));
                                }}
                                className="w-full p-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold focus:outline-none focus:border-red-500"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Unit Rate (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={item.unit_rate}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setEditInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_rate: val } : it));
                                }}
                                className="w-full p-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold focus:outline-none focus:border-red-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditInvoiceModalOpen(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* CREATE SALES INVOICE 2-STEP DRAWER (Screenshot 4 & Step 2) */}
            {isCreateInvoiceDrawerOpen && (
              <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
                <div className="bg-white max-w-lg w-full h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200">
                  
                  {/* Step 1: Select Items (Screenshot 4) */}
                  {invoiceStep === 1 && (
                    <div className="flex flex-col h-full justify-between">
                      {/* Header matching Screenshot 4: ✕ SOIL  cancel  Next */}
                      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsCreateInvoiceDrawerOpen(false)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <h3 className="font-bold text-slate-900 text-sm tracking-wide uppercase">
                            {selectedBOQ.title || 'SOIL'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setIsCreateInvoiceDrawerOpen(false)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            cancel
                          </button>
                          <button
                            type="button"
                            disabled={selectedItemIdsForInvoice.length === 0}
                            onClick={() => setInvoiceStep(2)}
                            className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                          >
                            Next
                          </button>
                        </div>
                      </div>

                      {/* Search Bar & + New Item Row (Screenshot 4) */}
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={searchInvoiceItemQuery}
                            onChange={(e) => setSearchInvoiceItemQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-red-500 text-slate-800"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenAddNewItem}
                          className="text-xs font-bold text-red-600 hover:text-red-700 whitespace-nowrap cursor-pointer flex items-center gap-1 hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>New Item</span>
                        </button>
                      </div>

                      {/* Line Items List (Screenshot 4) */}
                      {/* Filter: ONLY items with remaining uninvoiced quantity! */}
                      <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-white">
                        {availableItemsForInvoice.length === 0 ? (
                          <div className="py-12 px-4 text-center">
                            <p className="text-xs text-slate-500 font-medium">
                              {selectedBOQ.items.filter(it => it.type !== 'section').length === 0
                                ? 'No items exist in this BOQ yet.'
                                : 'All items in this BOQ have already been created in Sales Invoices!'}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Click "+ New Item" above to add new items.
                            </p>
                          </div>
                        ) : (
                          availableItemsForInvoice.map((item, idx) => {
                            const isSelected = selectedItemIdsForInvoice.includes(item.id);
                            const remainingQty = Math.max(0, (item.quantity || 1) - (item.billed_quantity || 0));
                            return (
                              <div key={item.id} className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleItemForInvoice(item.id, remainingQty, item.sales_price || item.unit_rate || 2000)}
                                  className="w-4 h-4 mt-3 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                                />
                                <div
                                  onClick={() => handleToggleItemForInvoice(item.id, remainingQty, item.sales_price || item.unit_rate || 2000)}
                                  className={`flex-1 p-3.5 rounded-xl border transition-all cursor-pointer bg-white relative ${
                                    isSelected 
                                      ? 'border-red-600 bg-red-50/20 ring-1 ring-red-600/30' 
                                      : 'border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-xs font-normal text-slate-800 leading-snug flex-1">
                                      <span className="text-slate-400 font-semibold mr-1">{idx + 1}.</span>
                                      {item.description}
                                    </div>
                                    <div className="text-right shrink-0 flex items-start gap-2">
                                      <div>
                                        <div className="text-xs font-bold text-slate-900">
                                          {(item.sales_price || item.unit_rate || 0).toLocaleString('en-IN')}/{item.unit || 'nos'}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          + {item.gst_percent || 0}% GST
                                        </div>
                                      </div>
                                      <MoreVertical className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                                    </div>
                                  </div>

                                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                    <div>
                                      Invoicing Done: <span className="font-semibold text-slate-700">{item.billed_quantity || 0}/{item.quantity || 1} {item.unit || 'nos'}</span>
                                    </div>
                                    <div>
                                      Item Code: <span className="text-slate-600">{item.item_code || '--'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Step 1 Footer */}
                      <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {selectedItemIdsForInvoice.length} item(s) selected
                        </span>
                        <button
                          type="button"
                          disabled={selectedItemIdsForInvoice.length === 0}
                          onClick={() => setInvoiceStep(2)}
                          className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          Next ({selectedItemIdsForInvoice.length} Selected)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Invoice Details Form */}
                  {invoiceStep === 2 && (
                    <form onSubmit={handleSaveInvoice} className="flex flex-col h-full justify-between">
                      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setInvoiceStep(1)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm tracking-wide uppercase">+ SALES INVOICE</h3>
                            <p className="text-[11px] text-slate-500">{selectedBOQ.boq_number}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCreateInvoiceDrawerOpen(false)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                        {/* Header Fields */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">CLIENT NAME *</label>
                            <input
                              type="text"
                              required
                              value={newInvoiceClientName}
                              onChange={(e) => setNewInvoiceClientName(e.target.value)}
                              className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                            />
                          </div>

                          <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">INVOICE NO *</label>
                            <input
                              type="text"
                              required
                              value={newInvoiceNumber}
                              onChange={(e) => setNewInvoiceNumber(e.target.value)}
                              className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">INVOICE DATE *</label>
                          <input
                            type="date"
                            required
                            value={newInvoiceDate}
                            onChange={(e) => setNewInvoiceDate(e.target.value)}
                            className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                          />
                        </div>

                        {/* Selected Items Form */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">INVOICE ITEMS</label>
                          {selectedBOQ.items.filter(it => selectedItemIdsForInvoice.includes(it.id)).map((item) => {
                            const curQty = invoiceQuantities[item.id] || 1;
                            const curRate = invoiceRates[item.id] || item.sales_price || item.unit_rate || 2000;
                            const curSub = curQty * curRate;
                            const curGst = Math.round((curSub * (item.gst_percent || 0)) / 100);
                            const curTot = curSub + curGst;
                            return (
                              <div key={item.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                                <div className="font-bold text-xs text-slate-900">
                                  {item.item_name || item.item_code || item.description.slice(0, 35)}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">INVOICED QTY</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={curQty}
                                      onChange={(e) => setInvoiceQuantities(prev => ({ ...prev, [item.id]: Number(e.target.value) || 1 }))}
                                      className="w-full p-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold focus:outline-none focus:border-red-600"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">RATE (₹)</label>
                                    <input
                                      type="number"
                                      value={curRate}
                                      onChange={(e) => setInvoiceRates(prev => ({ ...prev, [item.id]: Number(e.target.value) || 0 }))}
                                      className="w-full p-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold focus:outline-none focus:border-red-600"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-between items-center text-[11px] pt-1 text-slate-600 border-t border-slate-200">
                                  <span>Sub: ₹{curSub.toLocaleString('en-IN')} {curGst > 0 && `+ GST ₹${curGst.toLocaleString('en-IN')}`}</span>
                                  <span className="font-bold text-slate-900">Total: ₹{curTot.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Calculated Grand Total */}
                        {(() => {
                          let totalSub = 0;
                          let totalGst = 0;
                          selectedBOQ.items.filter(it => selectedItemIdsForInvoice.includes(it.id)).forEach(it => {
                            const q = invoiceQuantities[it.id] || 1;
                            const r = invoiceRates[it.id] || it.sales_price || it.unit_rate || 2000;
                            const sub = q * r;
                            const gst = Math.round((sub * (it.gst_percent || 0)) / 100);
                            totalSub += sub;
                            totalGst += gst;
                          });
                          const grand = totalSub + totalGst;
                          return (
                            <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-1.5">
                              <div className="flex justify-between text-red-900">
                                <span>Item Sub Total:</span>
                                <span className="font-semibold">₹ {totalSub.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between text-red-900">
                                <span>GST:</span>
                                <span className="font-semibold">₹ {totalGst.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="border-t border-red-200 pt-1 flex justify-between font-extrabold text-sm text-red-950">
                                <span>Total Amount:</span>
                                <span>₹ {grand.toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setInvoiceStep(1)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer uppercase active:scale-95"
                        >
                          SAVE
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}


        {/* MODAL: LINK TASK MODAL (Red & White Theme) */}
        {linkTaskTargetItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Link Task to Item #{linkTaskTargetItem.s_no}</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-xs">{linkTaskTargetItem.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLinkTaskTargetItem(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Select WBS Project Task:</label>
                {tasks.length === 0 ? (
                  <div className="p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                    No active tasks found in project. A general task will be linked.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {tasks.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTaskId(t.id)}
                        className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                          selectedTaskId === t.id 
                            ? 'border-red-600 bg-red-50/60 font-semibold text-red-950'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-900">{t.title}</div>
                          <div className="text-[10px] text-slate-400">{t.wbs_code} • {t.progress_percentage}% completed</div>
                        </div>
                        {selectedTaskId === t.id && <Check className="w-4 h-4 text-red-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLinkTaskTargetItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLinkTask}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer active:scale-95 transition-all"
                >
                  Confirm Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IN-PAGE POPUP MODAL: EDIT BOQ DETAILS (Red & White Theme) */}
        {isEditModalOpen && editTargetBOQ && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 relative">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Edit BOQ Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Modify identification, title, client, or date.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditTargetBOQ(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveEditBOQ} className="space-y-4">
                
                {/* Row 1: BOQ NUMBER & BOQ DATE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  
                  {/* BOQ NUMBER */}
                  <div className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                    <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-0.5 pointer-events-none">
                      <span>BOQ NUMBER</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        required
                        autoFocus={activeEditFocus === 'number'}
                        value={editBOQNumber}
                        onChange={(e) => setEditBOQNumber(e.target.value)}
                        className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent tracking-tight"
                      />
                      <SquarePen className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                    </div>
                  </div>

                  {/* BOQ DATE */}
                  <div className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                    <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-0.5 pointer-events-none">
                      <span>BOQ DATE</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                      <input
                        type="date"
                        required
                        autoFocus={activeEditFocus === 'date'}
                        value={editBOQDate}
                        onChange={(e) => setEditBOQDate(e.target.value)}
                        className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent"
                      />
                    </div>
                  </div>

                </div>

                {/* Row 2: CLIENT NAME */}
                <div className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-0.5 pointer-events-none">
                    <span>CLIENT NAME</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      required
                      autoFocus={activeEditFocus === 'client'}
                      value={editClientName}
                      onChange={(e) => setEditClientName(e.target.value)}
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent"
                    />
                    <Search className="w-4 h-4 text-slate-600 shrink-0 pointer-events-none" />
                  </div>
                </div>

                {/* Row 3: BOQ TITLE */}
                <div className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight pointer-events-none">
                    <span>BOQ TITLE</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SOIL, Civil Works, Electrical, etc."
                    autoFocus={activeEditFocus === 'title'}
                    value={editBOQTitle}
                    onChange={(e) => setEditBOQTitle(e.target.value)}
                    className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent"
                  />
                </div>

                {/* Row 4: Select Tax Type */}
                <div className="pt-1">
                  <div className="text-xs font-semibold text-slate-800 mb-2">Select Tax Type:</div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="editTaxType"
                        checked={editTaxType === 'ITEM_LEVEL'}
                        onChange={() => setEditTaxType('ITEM_LEVEL')}
                        className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                      />
                      <span>Item Level Tax</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="editTaxType"
                        checked={editTaxType === 'BILL_LEVEL'}
                        onChange={() => setEditTaxType('BILL_LEVEL')}
                        className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                      />
                      <span>Bill Level Tax</span>
                    </label>
                  </div>
                </div>

                {/* Actions: Cancel & Save Changes (Red & White Theme) */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditTargetBOQ(null);
                    }}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* ADD SECTION MODAL (Red Theme) */}
        {/* ===================================================================== */}
        {isAddSectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Add Section</h2>
              <form onSubmit={handleAddSection} className="space-y-4">
                <div className="relative border border-slate-300 rounded-xl px-3.5 py-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100">
                  <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-slate-500">Section Name</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                    placeholder="e.g. Earthwork / Structural Concrete"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSectionAssignToParent}
                    onChange={(e) => setNewSectionAssignToParent(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                  />
                  <span>Assign to Parent</span>
                </label>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddSectionModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-2xs cursor-pointer active:scale-95"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* ADD / EDIT ITEM DRAWER (Red Theme with Backdrop) */}
        {/* ===================================================================== */}
        {isAddItemModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150"
            onClick={() => {
              setIsAddItemModalOpen(false);
              setEditingItem(null);
            }}
          >
            <div 
              className="relative w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsAddItemModalOpen(false);
                      setEditingItem(null);
                    }} 
                    className="p-1 -ml-1 text-slate-800 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-slate-800" strokeWidth={2.2} />
                  </button>
                  <h2 className="text-base font-bold text-slate-900 tracking-wide uppercase">
                    {editingItem ? 'EDIT ITEM' : 'NEW ITEM'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="px-6 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Save
                </button>
              </div>

              {/* Solid Red Accent Stripe under header */}
              <div className="h-1 bg-red-600 w-full shrink-0" />

              {/* Drawer Form Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-white">
                <form id="add-item-form" onSubmit={handleAddLineItem} className="space-y-5">
                  
                  {/* ITEM NAME (Floating Notched Label) */}
                  <div className="relative border border-slate-200 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                    <label className="absolute -top-2.5 left-4 px-1.5 bg-white text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                      ITEM NAME
                    </label>
                    <input
                      type="text"
                      placeholder="Item Name"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    />
                  </div>

                  {/* ITEM CODE (Floating Notched Label) */}
                  <div className="relative border border-slate-200 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                    <label className="absolute -top-2.5 left-4 px-1.5 bg-white text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                      ITEM CODE
                    </label>
                    <input
                      type="text"
                      placeholder="Item Code"
                      value={newItemCode}
                      onChange={(e) => setNewItemCode(e.target.value)}
                      className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent font-mono"
                    />
                  </div>

                  {/* 2 COLUMNS: UNIT & GST % */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* UNIT */}
                    <div className="relative border border-slate-200 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all flex items-center justify-between">
                      <label className="absolute -top-2.5 left-4 px-1.5 bg-white text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                        UNIT
                      </label>
                      <select
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        className="w-full text-sm text-slate-800 focus:outline-none bg-transparent cursor-pointer appearance-none pr-5 font-normal"
                      >
                        <option value="%">%</option>
                        <option value="nos">nos</option>
                        <option value="RMT">RMT</option>
                        <option value="cum">cum</option>
                        <option value="sqft">sqft</option>
                        <option value="sqm">sqm</option>
                        <option value="MT">MT</option>
                        <option value="kg">kg</option>
                        <option value="lot">lot</option>
                        <option value="hours">hours</option>
                        <option value="days">days</option>
                        <option value="sets">sets</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-700 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* GST % */}
                    <div className="relative border border-slate-200 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all flex items-center justify-between">
                      <label className="absolute -top-2.5 left-4 px-1.5 bg-white text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                        GST %
                      </label>
                      <select
                        value={newItemGST}
                        onChange={(e) => setNewItemGST(Number(e.target.value))}
                        className="w-full text-sm text-slate-800 focus:outline-none bg-transparent cursor-pointer appearance-none pr-5 font-normal"
                      >
                        <option value={18}>18</option>
                        <option value={0}>0</option>
                        <option value={5}>5</option>
                        <option value={12}>12</option>
                        <option value={28}>28</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-700 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* ESTIMATED QTY. (Floating Notched Label) */}
                  <div className="relative border border-slate-200 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                    <label className="absolute -top-2.5 left-4 px-1.5 bg-white text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                      ESTIMATED QTY.
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={newItemQty === 0 ? '0' : (newItemQty || '')}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setNewItemQty(val);
                      }}
                      className="w-full text-sm text-slate-800 focus:outline-none bg-transparent"
                    />
                  </div>

                  {/* Cost Component > card */}
                  <div className="border border-red-200/90 rounded-xl p-3.5 bg-white hover:bg-red-50/20 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setIsCostComponentOpen(!isCostComponentOpen)}
                        className="flex items-center gap-1.5 text-sm font-normal text-slate-800 hover:text-red-600 cursor-pointer"
                      >
                        <span>Cost Component</span>
                        <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isCostComponentOpen ? 'rotate-90' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCostComponentOpen(true);
                          setCostComponentsList(prev => [...prev, { id: `comp-${Date.now()}`, name: '', amount: 0 }]);
                        }}
                        className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>

                    {/* Expandable Cost Component Breakdown */}
                    {isCostComponentOpen && (
                      <div className="mt-3 pt-3 border-t border-red-100 space-y-2.5 animate-in fade-in duration-150">
                        <div className="text-[11px] text-slate-500 font-medium">Cost Component Breakdown:</div>
                        {costComponentsList.map((comp, idx) => (
                          <div key={comp.id} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="e.g. Material / Labour / Plant"
                              value={comp.name}
                              onChange={(e) => {
                                const updated = [...costComponentsList];
                                updated[idx].name = e.target.value;
                                setCostComponentsList(updated);
                              }}
                              className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-red-600"
                            />
                            <input
                              type="number"
                              placeholder="₹ Amount"
                              value={comp.amount === 0 ? '' : comp.amount}
                              onChange={(e) => {
                                const updated = [...costComponentsList];
                                updated[idx].amount = Number(e.target.value);
                                setCostComponentsList(updated);
                                const sum = updated.reduce((acc, c) => acc + (c.amount || 0), 0);
                                setNewItemCostPrice(sum);
                                if (sum > 0) {
                                  const calculated = newItemMarkupType === '%'
                                    ? Math.round(sum * (1 + (newItemMarkup || 0) / 100))
                                    : Math.round(sum + (newItemMarkup || 0));
                                  setNewItemUnitRate(calculated);
                                }
                              }}
                              className="w-24 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-red-600"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = costComponentsList.filter((_, i) => i !== idx);
                                setCostComponentsList(updated);
                                const sum = updated.reduce((acc, c) => acc + (c.amount || 0), 0);
                                setNewItemCostPrice(sum);
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setCostComponentsList(prev => [...prev, { id: `comp-${Date.now()}`, name: '', amount: 0 }])}
                            className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                          >
                            + Add another component
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Unit Cost Price */}
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="text-sm font-normal text-slate-800 whitespace-nowrap">Unit Cost Price</span>
                    <div className="relative border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 w-52 sm:w-60 transition-all">
                      <label className="absolute -top-2.5 left-3.5 px-1.5 bg-white text-[10px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                        AMOUNT
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Amount"
                        value={newItemCostPrice === 0 ? '' : newItemCostPrice}
                        onChange={(e) => {
                          const cp = Number(e.target.value);
                          setNewItemCostPrice(cp);
                          if (cp > 0) {
                            const calculated = newItemMarkupType === '%'
                              ? Math.round(cp * (1 + (newItemMarkup || 0) / 100))
                              : Math.round(cp + (newItemMarkup || 0));
                            setNewItemUnitRate(calculated);
                          }
                        }}
                        className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Mark Up */}
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="text-sm font-normal text-slate-800 whitespace-nowrap">Mark Up</span>
                    <div className="relative border border-red-200/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 w-52 sm:w-60 transition-all flex items-center justify-between">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={newItemMarkup === 0 ? '0' : (newItemMarkup || '')}
                        onChange={(e) => {
                          const mu = e.target.value === '' ? 0 : Number(e.target.value);
                          setNewItemMarkup(mu);
                          if (newItemCostPrice > 0) {
                            const calculated = newItemMarkupType === '%'
                              ? Math.round(newItemCostPrice * (1 + mu / 100))
                              : Math.round(newItemCostPrice + mu);
                            setNewItemUnitRate(calculated);
                          }
                        }}
                        className="w-full text-sm text-slate-800 focus:outline-none bg-transparent"
                      />
                      <div className="flex items-center gap-1 pl-2 border-l border-slate-200 ml-2 shrink-0">
                        <select
                          value={newItemMarkupType}
                          onChange={(e) => {
                            const mType = e.target.value as '%' | '₹';
                            setNewItemMarkupType(mType);
                            if (newItemCostPrice > 0) {
                              const calculated = mType === '%'
                                ? Math.round(newItemCostPrice * (1 + (newItemMarkup || 0) / 100))
                                : Math.round(newItemCostPrice + (newItemMarkup || 0));
                              setNewItemUnitRate(calculated);
                            }
                          }}
                          className="text-xs font-semibold text-red-600 bg-transparent focus:outline-none cursor-pointer appearance-none pr-4"
                        >
                          <option value="%">%</option>
                          <option value="₹">₹</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-red-600 pointer-events-none -ml-4" />
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Separator */}
                  <hr className="border-slate-200 my-4" />

                  {/* Checkbox: Add Supply and Installation Rate */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newItemSupplyAndInstall}
                        onChange={(e) => setNewItemSupplyAndInstall(e.target.checked)}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                      />
                      <span>Add Supply and Installation Rate</span>
                    </label>

                    {/* Expandable Supply & Installation breakdown */}
                    {newItemSupplyAndInstall && (
                      <div className="grid grid-cols-2 gap-3 pl-6 pt-1 animate-in fade-in duration-150">
                        <div className="relative border border-slate-200 rounded-xl px-3 py-2 bg-white focus-within:border-red-600">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Supply Rate (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={newSupplyRate === 0 ? '' : newSupplyRate}
                            onChange={(e) => {
                              const sr = Number(e.target.value);
                              setNewSupplyRate(sr);
                              setNewItemUnitRate(sr + newInstallRate);
                            }}
                            className="w-full text-xs text-slate-800 focus:outline-none font-medium bg-transparent"
                          />
                        </div>
                        <div className="relative border border-slate-200 rounded-xl px-3 py-2 bg-white focus-within:border-red-600">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Installation Rate (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={newInstallRate === 0 ? '' : newInstallRate}
                            onChange={(e) => {
                              const ir = Number(e.target.value);
                              setNewInstallRate(ir);
                              setNewItemUnitRate(newSupplyRate + ir);
                            }}
                            className="w-full text-xs text-slate-800 focus:outline-none font-medium bg-transparent"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Unit Sale Price */}
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="text-sm sm:text-base font-bold text-slate-900 whitespace-nowrap">Unit Sale Price</span>
                    <div className="relative border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 w-52 sm:w-60 transition-all">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Amount"
                        value={newItemUnitRate === 0 ? '' : newItemUnitRate}
                        onChange={(e) => setNewItemUnitRate(Number(e.target.value))}
                        className="w-full text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Horizontal Separator */}
                  <hr className="border-slate-200 my-4" />

                  {/* Sales Price */}
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="text-sm sm:text-base font-bold text-slate-900 whitespace-nowrap">Sales Price</span>
                    <div className="relative border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50/70 w-52 sm:w-60 flex items-center justify-between">
                      <span className={`text-sm ${((Number(newItemUnitRate) || 0) * (Number(newItemQty) || 0)) > 0 ? 'font-bold text-slate-900' : 'text-slate-400 font-normal'}`}>
                        {((Number(newItemUnitRate) || 0) * (Number(newItemQty) || 0)) > 0
                          ? `₹ ${(Math.round((Number(newItemUnitRate) || 0) * (Number(newItemQty) || 0))).toLocaleString()}`
                          : 'Amount'}
                      </span>
                    </div>
                  </div>

                  {/* Add Cost Code > card */}
                  <div className="border border-red-200/90 rounded-xl p-3.5 bg-white hover:bg-red-50/20 transition-colors shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsCostCodeOpen(!isCostCodeOpen)}
                      className="w-full flex items-center justify-between text-sm font-normal text-slate-800 hover:text-red-600 cursor-pointer"
                    >
                      <span>{newItemCostCode ? `Cost Code: ${newItemCostCode}` : 'Add Cost Code'}</span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isCostCodeOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Expandable Cost Code input */}
                    {isCostCodeOpen && (
                      <div className="mt-3 pt-3 border-t border-red-100 space-y-2 animate-in fade-in duration-150">
                        <input
                          type="text"
                          placeholder="Enter Cost Code (e.g. CC-101 Civil / CC-201 MEP)"
                          value={newItemCostCode}
                          onChange={(e) => setNewItemCostCode(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-red-600 font-mono"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {['CC-CIVIL', 'CC-STRUCTURAL', 'CC-FINISHING', 'CC-MEP', 'CC-MOBILIZE'].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setNewItemCostCode(preset)}
                              className="text-[10px] bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 px-2 py-0.5 rounded font-mono cursor-pointer transition-colors"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right-aligned Links: + HSN/SAC & + Description */}
                  <div className="flex flex-col items-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsHsnOpen(!isHsnOpen)}
                      className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      {isHsnOpen ? '- HSN/SAC' : '+ HSN/SAC'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
                      className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      {isDescriptionOpen ? '- Description' : '+ Description'}
                    </button>
                  </div>

                  {/* Expandable HSN / SAC Input */}
                  {isHsnOpen && (
                    <div className="relative border border-slate-200 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all animate-in fade-in duration-150">
                      <label className="absolute -top-2.5 left-4 px-1.5 bg-white text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                        HSN / SAC CODE
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 998334 / 9954"
                        value={newItemHsnSac}
                        onChange={(e) => setNewItemHsnSac(e.target.value)}
                        className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent font-mono"
                      />
                    </div>
                  )}

                  {/* Expandable Description Textarea */}
                  {isDescriptionOpen && (
                    <div className="relative border border-slate-200 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all animate-in fade-in duration-150">
                      <label className="absolute -top-2.5 left-4 px-1.5 bg-white text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                        DESCRIPTION
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Detailed description or technical specifications..."
                        value={newItemDesc}
                        onChange={(e) => setNewItemDesc(e.target.value)}
                        className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent resize-none leading-relaxed"
                      />
                    </div>
                  )}

                  {/* Upload Files Card */}
                  <div>
                    <input
                      type="file"
                      ref={itemFileInputRef}
                      multiple
                      className="hidden"
                      onChange={handleItemFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => itemFileInputRef.current?.click()}
                      className="w-full border border-slate-200 rounded-xl py-3.5 px-4 bg-white hover:bg-red-50/20 hover:border-red-300 flex items-center justify-center gap-2 text-slate-700 text-sm font-normal transition-colors cursor-pointer"
                    >
                      <span>Upload Files</span>
                      <UploadCloud className="w-5 h-5 text-red-600" />
                    </button>

                    {/* Attached files preview chips */}
                    {itemAttachedFiles.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {itemAttachedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setItemAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="hover:text-rose-600 p-0.5 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // VIEW 1: BOQ LIST TABLE VIEW (Red & White Theme)
  // =========================================================================
  return (
    <div className="space-y-2.5 font-sans select-none">
      
      {/* Top Controls: Search Bar on Left, + BOQ Button on Right */}
      <div className="flex items-center justify-between gap-4">
        
        {/* Search Bar: rounded container */}
        <div className="relative w-72 sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 text-xs sm:text-[13px] bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 shadow-2xs transition-colors"
          />
        </div>

        {/* + BOQ Button (Red Theme) */}
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs sm:text-[13px] font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+ BOQ</span>
        </button>

      </div>

      {/* BOQ Data Table (Matching Reference Screenshot UI) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-[#f8f7fd] text-slate-800 font-bold border-b border-slate-200/80 select-none">
              <tr>
                <th className="py-3.5 px-5 font-bold text-slate-800 text-left text-[13px] tracking-wide">S.No.</th>
                <th className="py-3.5 px-5 font-bold text-slate-800 text-left text-[13px] min-w-[140px] tracking-wide">Client Name</th>
                <th className="py-3.5 px-5 font-bold text-slate-800 text-left text-[13px] min-w-[120px] tracking-wide">Boq Title</th>
                <th className="py-3.5 px-5 font-bold text-slate-800 text-left text-[13px] min-w-[100px] tracking-wide">Milestone</th>
                <th className="py-3.5 px-5 font-bold text-slate-800 text-left text-[13px] min-w-[150px] tracking-wide">Physical Progress</th>
                <th className="py-3.5 px-5 font-bold text-slate-800 text-left text-[13px] min-w-[110px] tracking-wide">BOQ Value</th>
                <th className="py-3.5 px-5 font-bold text-slate-800 text-left text-[13px] min-w-[110px] tracking-wide">Billed Value</th>
                <th className="py-3.5 px-3 w-14 text-center border-l border-slate-200/80"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBOQList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No BOQ entries found. Click the "+ BOQ" button to create one.
                  </td>
                </tr>
              ) : (
                filteredBOQList.map((boq) => (
                  <tr 
                    key={boq.id}
                    onClick={() => setSelectedBOQ(boq)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    {/* S.No. (e.g. #Sales-62) */}
                    <td className="py-3.5 px-5 tracking-tight font-bold text-slate-900 group-hover:text-red-600 transition-colors align-middle text-left">
                      {boq.boq_number}
                    </td>

                    {/* Client Name */}
                    <td className="py-3.5 px-5 font-semibold text-slate-800 align-middle text-left">
                      {boq.client_name}
                    </td>

                    {/* Boq Title */}
                    <td className="py-3.5 px-5 font-medium text-slate-800 align-middle text-left">
                      {boq.title}
                    </td>

                    {/* Milestone (e.g. 0 / 0) */}
                    <td className="py-3.5 px-5 font-medium text-slate-800 align-middle text-left tracking-tight">
                      {boq.milestone_completed || 0} / {boq.milestone_total || 0}
                    </td>

                    {/* Physical Progress: percentage + slim progress bar */}
                    <td className="py-3.5 px-5 align-middle text-left">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-800 min-w-[28px]">
                          {boq.physical_progress || 0}%
                        </span>
                        <div className="w-24 sm:w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                          <div 
                            className="h-full bg-red-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, boq.physical_progress || 0)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* BOQ Value - Left aligned to match reference */}
                    <td className="py-3.5 px-5 text-left font-semibold text-slate-900 align-middle whitespace-nowrap">
                      ₹ {boq.boq_value.toLocaleString()}
                    </td>

                    {/* Billed Value - Left aligned to match reference */}
                    <td className="py-3.5 px-5 text-left font-semibold text-slate-900 align-middle whitespace-nowrap">
                      ₹ {boq.billed_value.toLocaleString()}
                    </td>

                    {/* Action 3-dots with vertical separator border and rounded outline button */}
                    <td 
                      className="py-3.5 px-3 text-center align-middle border-l border-slate-200/80 relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openRowMenuId === boq.id) {
                            setOpenRowMenuId(null);
                            setRowMenuPos(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setOpenRowMenuId(boq.id);
                            setRowMenuPos({
                              top: rect.bottom + 4,
                              right: window.innerWidth - rect.right,
                            });
                          }
                        }}
                        className="p-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors inline-flex items-center justify-center"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openRowMenuId === boq.id && rowMenuPos && (
                        <div 
                          ref={rowMenuRef}
                          style={{ top: `${rowMenuPos.top}px`, right: `${rowMenuPos.right}px` }}
                          className="fixed w-32 bg-white rounded-xl shadow-lg border border-slate-200/80 py-1.5 px-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenEditModal(boq, 'title');
                              setOpenRowMenuId(null);
                              setRowMenuPos(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left font-medium transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteBOQ(boq.id);
                              setOpenRowMenuId(null);
                              setRowMenuPos(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left font-medium transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 2: CREATE BOQ MODAL (Red & White Theme) */}
      {/* ===================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">BOQ</h2>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateBOQSubmit} className="space-y-4">
              
              {/* Row 1: BOQ NUMBER * & BOQ DATE * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* BOQ NUMBER * */}
                <div className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-0.5 pointer-events-none">
                    <span>BOQ NUMBER</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      required
                      value={newBOQNumber}
                      onChange={(e) => setNewBOQNumber(e.target.value)}
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent tracking-tight"
                    />
                    <SquarePen className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                  </div>
                </div>

                {/* BOQ DATE * */}
                <div className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-0.5 pointer-events-none">
                    <span>BOQ DATE</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={newBOQDate}
                      onChange={(e) => setNewBOQDate(e.target.value)}
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent"
                    />
                  </div>
                </div>

              </div>

              {/* Row 2: CLIENT NAME * (Searchable Dropdown with Client Parties from Party Tab) */}
              <div ref={clientDropdownRef} className="relative">
                <div 
                  onClick={() => setIsClientDropdownOpen(prev => !prev)}
                  className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all cursor-pointer"
                >
                  <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-0.5 pointer-events-none z-10">
                    <span>CLIENT NAME</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Select or search client from Parties..."
                      value={newClientName}
                      onFocus={() => setIsClientDropdownOpen(true)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsClientDropdownOpen(true);
                      }}
                      onChange={(e) => {
                        setNewClientName(e.target.value);
                        if (!isClientDropdownOpen) setIsClientDropdownOpen(true);
                      }}
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      {newClientName && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewClientName('');
                            setIsClientDropdownOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsClientDropdownOpen(prev => !prev);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                        title="Toggle clients list"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dropdown Menu */}
                {isClientDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Clients ({filteredCreateClients.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">From Party / Project</span>
                    </div>

                    <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                      {filteredCreateClients.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          {availableClients.length === 0 ? (
                            <span>No clients added in Party yet. You can type a client name or add one in the <strong>Party</strong> tab.</span>
                          ) : (
                            <span>No client matches "{newClientName}". Press Enter to use this custom name.</span>
                          )}
                        </div>
                      ) : (
                        filteredCreateClients.map((client) => {
                          const isSelected = newClientName.trim().toLowerCase() === client.name.toLowerCase();
                          return (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => {
                                setNewClientName(client.name);
                                setIsClientDropdownOpen(false);
                              }}
                              className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-red-50/60 transition-colors cursor-pointer group ${
                                isSelected ? 'bg-red-50/80 font-bold' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-full ${client.avatarColor || 'bg-blue-600'} text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs`}>
                                  {client.avatarText || client.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-[13px] font-semibold text-slate-800 truncate group-hover:text-red-700">
                                    {client.name}
                                  </div>
                                  {(client.phone || client.email) && (
                                    <div className="text-[10.5px] text-slate-400 truncate">
                                      {client.phone || client.email}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                                  Client
                                </span>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-red-600 shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: BOQ TITLE */}
              <div className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight pointer-events-none">
                  <span>BOQ TITLE</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SOIL, Civil Works, Electrical, etc."
                  value={newBOQTitle}
                  onChange={(e) => setNewBOQTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent"
                />
              </div>

              {/* Row 4: Select Tax Type */}
              <div className="pt-1">
                <div className="text-xs font-semibold text-slate-800 mb-2">Select Tax Type:</div>
                <div className="flex items-center gap-6">
                  {/* Item Level Tax */}
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="taxType"
                      checked={newTaxType === 'ITEM_LEVEL'}
                      onChange={() => setNewTaxType('ITEM_LEVEL')}
                      className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                    />
                    <span>Item Level Tax</span>
                  </label>

                  {/* Bill Level Tax */}
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="taxType"
                      checked={newTaxType === 'BILL_LEVEL'}
                      onChange={() => setNewTaxType('BILL_LEVEL')}
                      className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                    />
                    <span>Bill Level Tax</span>
                  </label>
                </div>
              </div>

              {/* Row 5: Attach Media Box */}
              <div>
                <label className="border border-slate-200 rounded-xl p-5 flex items-center justify-center gap-2 cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition-all select-none">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const filesArr = Array.from(e.target.files).map(f => ({
                          name: f.name,
                          size: `${(f.size / 1024).toFixed(0)} KB`
                        }));
                        setAttachedFiles(prev => [...prev, ...filesArr]);
                      }
                    }}
                  />
                  <span className="text-xs font-semibold text-slate-600">Attach Media</span>
                  <UploadCloud className="w-5 h-5 text-red-600" />
                </label>

                {/* Display uploaded files */}
                {attachedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                        <span className="truncate text-slate-700 font-medium">{file.name} ({file.size})</span>
                        <button
                          type="button"
                          onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action: Create BOQ Button (Red & White Theme) */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>Create BOQ</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IN-PAGE POPUP MODAL: EDIT BOQ DETAILS (Red & White Theme) */}
      {/* ===================================================================== */}
      {isEditModalOpen && editTargetBOQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Edit BOQ Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">Modify identification, title, client, or date.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditTargetBOQ(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditBOQ} className="space-y-4">
              
              {/* Row 1: BOQ NUMBER & BOQ DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* BOQ NUMBER */}
                <div className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-0.5 pointer-events-none">
                    <span>BOQ NUMBER</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      required
                      autoFocus={activeEditFocus === 'number'}
                      value={editBOQNumber}
                      onChange={(e) => setEditBOQNumber(e.target.value)}
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent tracking-tight"
                    />
                    <SquarePen className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                  </div>
                </div>

                {/* BOQ DATE */}
                <div className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-0.5 pointer-events-none">
                    <span>BOQ DATE</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                    <input
                      type="date"
                      required
                      autoFocus={activeEditFocus === 'date'}
                      value={editBOQDate}
                      onChange={(e) => setEditBOQDate(e.target.value)}
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent"
                    />
                  </div>
                </div>

              </div>

              {/* Row 2: CLIENT NAME (Searchable Dropdown with Client Parties from Party Tab) */}
              <div ref={editClientDropdownRef} className="relative">
                <div 
                  onClick={() => setIsEditClientDropdownOpen(prev => !prev)}
                  className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all cursor-pointer"
                >
                  <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-0.5 pointer-events-none z-10">
                    <span>CLIENT NAME</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      required
                      autoFocus={activeEditFocus === 'client'}
                      placeholder="Select or search client from Parties..."
                      value={editClientName}
                      onFocus={() => setIsEditClientDropdownOpen(true)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditClientDropdownOpen(true);
                      }}
                      onChange={(e) => {
                        setEditClientName(e.target.value);
                        if (!isEditClientDropdownOpen) setIsEditClientDropdownOpen(true);
                      }}
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      {editClientName && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditClientName('');
                            setIsEditClientDropdownOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditClientDropdownOpen(prev => !prev);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                        title="Toggle clients list"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isEditClientDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dropdown Menu */}
                {isEditClientDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Clients ({filteredEditClients.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">From Party / Project</span>
                    </div>

                    <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                      {filteredEditClients.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          {availableClients.length === 0 ? (
                            <span>No clients added in Party yet. You can type a client name or add one in the <strong>Party</strong> tab.</span>
                          ) : (
                            <span>No client matches "{editClientName}". Press Save to use this custom name.</span>
                          )}
                        </div>
                      ) : (
                        filteredEditClients.map((client) => {
                          const isSelected = editClientName.trim().toLowerCase() === client.name.toLowerCase();
                          return (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => {
                                setEditClientName(client.name);
                                setIsEditClientDropdownOpen(false);
                              }}
                              className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-red-50/60 transition-colors cursor-pointer group ${
                                isSelected ? 'bg-red-50/80 font-bold' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-full ${client.avatarColor || 'bg-blue-600'} text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs`}>
                                  {client.avatarText || client.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-[13px] font-semibold text-slate-800 truncate group-hover:text-red-700">
                                    {client.name}
                                  </div>
                                  {(client.phone || client.email) && (
                                    <div className="text-[10.5px] text-slate-400 truncate">
                                      {client.phone || client.email}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                                  Client
                                </span>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-red-600 shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: BOQ TITLE */}
              <div className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight pointer-events-none">
                  <span>BOQ TITLE</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SOIL, Civil Works, Electrical, etc."
                  autoFocus={activeEditFocus === 'title'}
                  value={editBOQTitle}
                  onChange={(e) => setEditBOQTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent"
                />
              </div>

              {/* Row 4: Select Tax Type */}
              <div className="pt-1">
                <div className="text-xs font-semibold text-slate-800 mb-2">Select Tax Type:</div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="editTaxType"
                      checked={editTaxType === 'ITEM_LEVEL'}
                      onChange={() => setEditTaxType('ITEM_LEVEL')}
                      className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                    />
                    <span>Item Level Tax</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="editTaxType"
                      checked={editTaxType === 'BILL_LEVEL'}
                      onChange={() => setEditTaxType('BILL_LEVEL')}
                      className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                    />
                    <span>Bill Level Tax</span>
                  </label>
                </div>
              </div>

              {/* Actions: Cancel & Save Changes (Red & White Theme) */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditTargetBOQ(null);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
