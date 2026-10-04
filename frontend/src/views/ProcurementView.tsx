import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, ArrowRight, CheckCircle2, 
  PackageCheck, FileText, AlertTriangle, Layers, Plus, 
  DollarSign, Check, X, Search, Filter, Calendar, Clock,
  Building2, User, Truck, Upload, Eye, RefreshCw, ChevronRight,
  TrendingDown, TrendingUp, Package, AlertCircle, Sparkles,
  FileCheck, Download, Trash2, ArrowUpRight, ArrowDownRight,
  ClipboardCheck, CheckCircle, HelpCircle, Camera, Image as LucideImage, Maximize2
} from 'lucide-react';
import { MaterialRequest, PurchaseOrder, GoodsReceiptNote, Invoice, StockItem, Project } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { getOrInitializeProjects } from '../lib/departmentService';
import { 
  getLowStockItems, 
  getUnacknowledgedLowStockItems, 
  markLowStockAsViewed, 
  notifyStockChanged 
} from '../lib/stockNotificationService';
import { addNotification } from '../lib/notificationService';

// Extended Interfaces for the End-to-End Procurement Flow
export interface ExtendedMaterialRequest {
  id: string;
  request_number: string;
  project_id?: string;
  project_name: string;
  material_name: string;
  quantity: number;
  unit: string;
  request_date: string;
  reason: string;
  priority: 'NORMAL' | 'URGENT' | 'HIGH';
  requested_by: string;
  status: 'PENDING' | 'APPROVED_FROM_STOCK' | 'PO_CREATED' | 'REJECTED' | 'DELIVERED';
  approved_at?: string;
  approved_by?: string;
  deducted_quantity?: number;
  remaining_stock_after?: number;
  notes?: string;
  attachment_name?: string;
  attachment_url?: string;
}

export interface ExtendedStockItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  current_quantity: number;
  minimum_threshold: number;
  unit_price: number;
  location: string;
  last_updated: string;
  history?: Array<{
    id: string;
    date: string;
    type: 'INWARD' | 'DISPATCH';
    quantity: number;
    reference: string;
    project_name?: string;
    notes?: string;
  }>;
}

export interface ExtendedPurchaseOrder {
  id: string;
  po_number: string;
  project_name: string;
  material_name: string;
  ordered_quantity: number;
  unit: string;
  vendor_name: string;
  quotation_rate: number;
  tax_percentage: number;
  total_amount: number;
  order_date: string;
  expected_delivery_date: string;
  status: 'DRAFT' | 'PO_ISSUED' | 'DISPATCHED' | 'DELIVERED_PENDING_GRN' | 'VERIFIED_AT_SITE';
  linked_request_id?: string;
  site_location: string;
  notes?: string;
}

export interface ExtendedGRN {
  id: string;
  grn_number: string;
  po_number: string;
  project_name: string;
  material_name: string;
  ordered_quantity: number;
  received_quantity: number;
  unit: string;
  vendor_name: string;
  challan_number: string;
  vehicle_number: string;
  receipt_date: string;
  inspected_by: string;
  quality_status: 'PASSED' | 'DEFECTS_NOTED';
  quality_notes: string;
  bill_number?: string;
  bill_amount?: number;
  bill_file_name?: string;
  bill_file_url?: string;
  status: 'INSPECTED' | 'VERIFIED';
}

interface ProcurementViewProps {
  materialRequests?: MaterialRequest[];
  purchaseOrders?: PurchaseOrder[];
  grns?: GoodsReceiptNote[];
  invoices?: Invoice[];
  stockItems?: StockItem[];
  projects?: Project[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  initialTab?: 'requests' | 'stock' | 'orders' | 'grn';
}

// Initial Realistic Stock Data including the User's example (10 Bags Cement)
const INITIAL_STOCK_ITEMS: ExtendedStockItem[] = [
  {
    id: 'stk-1',
    item_name: 'Cement 53 Grade (UltraTech)',
    category: 'Cement & Concrete',
    unit: 'Bags',
    current_quantity: 10,
    minimum_threshold: 5,
    unit_price: 380,
    location: 'Central Yard - Chennai Bay 1',
    last_updated: '2026-09-29',
    history: [
      { id: 'h-1', date: '2026-09-25', type: 'INWARD', quantity: 10, reference: 'INV-UTC-1049', notes: 'Initial delivery from UltraTech' }
    ]
  },
  {
    id: 'stk-2',
    item_name: 'TMT Steel 12mm (Tata Tiscon)',
    category: 'Steel & Rebar',
    unit: 'Tons',
    current_quantity: 4,
    minimum_threshold: 2,
    unit_price: 64000,
    location: 'Central Yard - Steel Staging 3',
    last_updated: '2026-09-28',
    history: [
      { id: 'h-2', date: '2026-09-24', type: 'INWARD', quantity: 4, reference: 'PO-2026-0042', notes: 'Mill batch certified Fe-550D' }
    ]
  },
  {
    id: 'stk-3',
    item_name: 'River Sand (Washed M-Sand)',
    category: 'Aggregates & Sand',
    unit: 'Loads',
    current_quantity: 0,
    minimum_threshold: 3,
    unit_price: 18500,
    location: 'Aggregate Silo 2',
    last_updated: '2026-09-27',
    history: []
  },
  {
    id: 'stk-4',
    item_name: 'Solid Red Clay Bricks',
    category: 'Masonry & Bricks',
    unit: 'Pcs',
    current_quantity: 2500,
    minimum_threshold: 1000,
    unit_price: 12,
    location: 'Yard Bay 4 (Covered)',
    last_updated: '2026-09-26',
    history: [
      { id: 'h-3', date: '2026-09-22', type: 'INWARD', quantity: 3000, reference: 'DC-KILN-881', notes: 'First class kiln burnt bricks' }
    ]
  },
  {
    id: 'stk-5',
    item_name: '20mm Blue Metal Granite Aggregate',
    category: 'Aggregates & Sand',
    unit: 'Tons',
    current_quantity: 18,
    minimum_threshold: 10,
    unit_price: 850,
    location: 'Yard Bay 2',
    last_updated: '2026-09-28',
    history: [
      { id: 'h-4', date: '2026-09-20', type: 'INWARD', quantity: 20, reference: 'INV-QY-551', notes: 'Crusher supply' }
    ]
  }
];

// Initial Realistic Material Request matching the User's exact prompt (7 Bags Cement needed)
const INITIAL_MATERIAL_REQUESTS: ExtendedMaterialRequest[] = [
  {
    id: 'mr-1',
    request_number: 'MR-2026-001',
    project_name: 'RG33 Villa Complex (Pattabiram)',
    material_name: 'Cement 53 Grade (UltraTech)',
    quantity: 7,
    unit: 'Bags',
    request_date: '2026-09-29',
    reason: 'First floor RCC column casting & lintel beam preparation',
    priority: 'HIGH',
    requested_by: 'Er. Senthil Kumar (Site Engineer)',
    status: 'PENDING',
    notes: 'Urgent for morning casting batch'
  },
  {
    id: 'mr-2',
    request_number: 'MR-2026-002',
    project_name: 'Commercial Plaza (OMR)',
    material_name: 'River Sand (Washed M-Sand)',
    quantity: 2,
    unit: 'Loads',
    request_date: '2026-09-28',
    reason: 'Basement masonry mortar and boundary wall plastering',
    priority: 'URGENT',
    requested_by: 'Karthik Raja (Project Manager)',
    status: 'PENDING',
    notes: 'Stock is currently 0 - requires vendor procurement'
  }
];

// Initial Purchase Orders
const INITIAL_PURCHASE_ORDERS: ExtendedPurchaseOrder[] = [
  {
    id: 'po-1',
    po_number: 'PO-2026-0089',
    project_name: 'RG33 Villa Complex (Pattabiram)',
    material_name: 'TMT Steel 12mm (Tata Tiscon)',
    ordered_quantity: 2,
    unit: 'Tons',
    vendor_name: 'Tata Steel Authorized Distributor',
    quotation_rate: 64000,
    tax_percentage: 18,
    total_amount: 151040,
    order_date: '2026-09-27',
    expected_delivery_date: '2026-09-30',
    status: 'PO_ISSUED',
    site_location: 'Plot 42, Pattabiram Main Rd, Chennai',
    notes: 'Deliver directly to Site Gate 1 with mill test certificate.'
  }
];

// Initial GRN Records
const INITIAL_GRNS: ExtendedGRN[] = [
  {
    id: 'grn-1',
    grn_number: 'GRN-2026-0045',
    po_number: 'PO-2026-0085',
    project_name: 'RG33 Villa Complex (Pattabiram)',
    material_name: 'Solid Red Clay Bricks',
    ordered_quantity: 1500,
    received_quantity: 1500,
    unit: 'Pcs',
    vendor_name: 'Sri Krishna Brick Works',
    challan_number: 'DC-8842',
    vehicle_number: 'TN 09 CB 4412',
    receipt_date: '2026-09-28',
    inspected_by: 'Er. Senthil Kumar (Site Engineer)',
    quality_status: 'PASSED',
    quality_notes: '100% Passed. Checked compression strength and sound test. No broken bricks.',
    bill_number: 'INV-SKB-9921',
    bill_amount: 18000,
    bill_file_name: 'Invoice_SKB_9921_Signed.pdf',
    status: 'VERIFIED'
  }
];

export const ProcurementView: React.FC<ProcurementViewProps> = ({
  materialRequests: propMaterialRequests,
  purchaseOrders: propPurchaseOrders,
  grns: propGrns,
  invoices = [],
  stockItems: propStockItems,
  projects: propProjects,
  isSidebarOpen,
  onToggleSidebar,
  initialTab = 'requests',
}) => {
  // Navigation Tabs: 
  // 1. Material Requests ('requests')
  // 2. Stock Management ('stock')
  // 3. Vendor Purchase ('orders')
  // 4. Site Verification & GRN ('grn')
  const [activeTab, setActiveTab] = useState<'requests' | 'stock' | 'orders' | 'grn'>(initialTab);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Available Projects (read from prop or service)
  const availableProjects = React.useMemo(() => {
    if (propProjects && propProjects.length > 0) return propProjects;
    return getOrInitializeProjects();
  }, [propProjects]);

  // ── Persistent State for Material Requests ──
  const [requests, setRequests] = useState<ExtendedMaterialRequest[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_material_requests_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_MATERIAL_REQUESTS;
  });

  // ── Persistent State for Warehouse Stock ──
  const [stockList, setStockList] = useState<ExtendedStockItem[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_stock_inventory_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_STOCK_ITEMS;
  });

  // ── Persistent State for Purchase Orders ──
  const [poList, setPoList] = useState<ExtendedPurchaseOrder[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_purchase_orders_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_PURCHASE_ORDERS;
  });

  // ── Persistent State for GRN / Site Verifications ──
  const [grnList, setGrnList] = useState<ExtendedGRN[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_grn_verifications_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_GRNS;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('booshnam_material_requests_v3', JSON.stringify(requests));
    } catch (e) {}
  }, [requests]);

  // Live low stock items
  const lowStockItems = React.useMemo(() => {
    return stockList.filter(s => Number(s.current_quantity) <= Number(s.minimum_threshold));
  }, [stockList]);

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_stock_inventory_v3', JSON.stringify(stockList));
      notifyStockChanged();
    } catch (e) {}
  }, [stockList]);

  // When the user views the Warehouse Stock page/tab, acknowledge low-stock items so the menu notification dot clears
  useEffect(() => {
    if (activeTab === 'stock') {
      const unacknowledged = getUnacknowledgedLowStockItems(stockList);
      if (unacknowledged.length > 0) {
        markLowStockAsViewed(stockList);
      }
    }
  }, [activeTab, stockList]);

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_purchase_orders_v3', JSON.stringify(poList));
    } catch (e) {}
  }, [poList]);

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_grn_verifications_v3', JSON.stringify(grnList));
    } catch (e) {}
  }, [grnList]);

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Search & Filter States
  const [requestSearch, setRequestSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [poSearch, setPoSearch] = useState('');
  const [grnSearch, setGrnSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // ── Modal States ──
  // 1. Add Material Request Modal
  const [showAddRequestModal, setShowAddRequestModal] = useState(false);
  const [newReqProject, setNewReqProject] = useState('');
  const [newReqMaterial, setNewReqMaterial] = useState('Cement 53 Grade (UltraTech)');
  const [newReqCustomMaterial, setNewReqCustomMaterial] = useState('');
  const [newReqQuantity, setNewReqQuantity] = useState('7');
  const [newReqUnit, setNewReqUnit] = useState('Bags');
  const [newReqDate, setNewReqDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newReqReason, setNewReqReason] = useState('');
  const [newReqPriority, setNewReqPriority] = useState<'NORMAL' | 'URGENT' | 'HIGH'>('HIGH');
  const [newReqRequester, setNewReqRequester] = useState('Site Engineer');
  const [newReqAttachmentName, setNewReqAttachmentName] = useState('');
  const [newReqAttachmentUrl, setNewReqAttachmentUrl] = useState<string | null>(null);
  const reqFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // 2. Approve from Stock Confirmation Modal
  const [approvingRequest, setApprovingRequest] = useState<ExtendedMaterialRequest | null>(null);

  // 3. Add Stock Modal
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [newStockName, setNewStockName] = useState('');
  const [newStockCategory, setNewStockCategory] = useState('Cement & Concrete');
  const [newStockQuantity, setNewStockQuantity] = useState('10');
  const [newStockUnit, setNewStockUnit] = useState('Bags');
  const [newStockUnitPrice, setNewStockUnitPrice] = useState('380');
  const [newStockThreshold, setNewStockThreshold] = useState('5');
  const [newStockLocation, setNewStockLocation] = useState('Central Yard - Chennai Bay 1');
  const [newStockNotes, setNewStockNotes] = useState('');

  // 4. Create Vendor PO Modal
  const [showCreatePoModal, setShowCreatePoModal] = useState(false);
  const [poProject, setPoProject] = useState('');
  const [poMaterial, setPoMaterial] = useState('');
  const [poQuantity, setPoQuantity] = useState('');
  const [poUnit, setPoUnit] = useState('Bags');
  const [poVendor, setPoVendor] = useState('UltraTech Cement Ltd');
  const [poRate, setPoRate] = useState('380');
  const [poExpectedDate, setPoExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [poLinkedReqId, setPoLinkedReqId] = useState<string | undefined>();
  const [poSiteLocation, setPoSiteLocation] = useState('');

  // 5. Site Receipt & Quality Inspection Modal
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [selectedPoForInspect, setSelectedPoForInspect] = useState<ExtendedPurchaseOrder | null>(null);
  const [grnReceivedQty, setGrnReceivedQty] = useState('');
  const [grnChallanNo, setGrnChallanNo] = useState('');
  const [grnVehicleNo, setGrnVehicleNo] = useState('');
  const [grnBillNo, setGrnBillNo] = useState('');
  const [grnBillAmount, setGrnBillAmount] = useState('');
  const [grnQualityStatus, setGrnQualityStatus] = useState<'PASSED' | 'DEFECTS_NOTED'>('PASSED');
  const [grnQualityNotes, setGrnQualityNotes] = useState('Packaging intact, test certificate verified, accepted 100%');
  const [grnUploadedFileName, setGrnUploadedFileName] = useState('');
  const [grnUploadedFileUrl, setGrnUploadedFileUrl] = useState<string | null>(null);
  const [grnUploadedFileSize, setGrnUploadedFileSize] = useState<string>('');
  const grnFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Lightbox / Image Preview Modal State
  const [previewImage, setPreviewImage] = useState<{ title: string; url: string; fileName?: string } | null>(null);

  // 6. Stock Movement History Modal
  const [viewingStockItem, setViewingStockItem] = useState<ExtendedStockItem | null>(null);

  // Helper: Find matching stock item for a material request
  const findMatchingStock = (materialName: string): ExtendedStockItem | undefined => {
    const lowerName = materialName.toLowerCase().trim();
    return stockList.find(s => {
      const sLower = s.item_name.toLowerCase().trim();
      return sLower === lowerName || sLower.includes(lowerName) || lowerName.includes(sLower);
    });
  };

  // ── FILE UPLOAD HANDLERS ──
  const handleGrnFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('File size must be under 15MB');
      return;
    }

    setGrnUploadedFileName(file.name);
    const sizeInKb = (file.size / 1024).toFixed(1);
    setGrnUploadedFileSize(file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${sizeInKb} KB`);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setGrnUploadedFileUrl(reader.result);
        showToast(`Document "${file.name}" selected`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGrnFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('File size must be under 15MB');
      return;
    }

    setGrnUploadedFileName(file.name);
    const sizeInKb = (file.size / 1024).toFixed(1);
    setGrnUploadedFileSize(file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${sizeInKb} KB`);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setGrnUploadedFileUrl(reader.result);
        showToast(`Document "${file.name}" uploaded`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReqFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Photo size must be under 10MB');
      return;
    }

    setNewReqAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewReqAttachmentUrl(reader.result);
        showToast(`Photo "${file.name}" selected`);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── ACTION 1: Handle Submit New Material Request ──
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMaterial = newReqMaterial === 'OTHER' ? newReqCustomMaterial.trim() : newReqMaterial;
    if (!finalMaterial) {
      alert('Please specify the material name');
      return;
    }

    const qty = parseFloat(newReqQuantity);
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity greater than zero');
      return;
    }

    const projName = newReqProject || (availableProjects[0]?.name) || 'Main Construction Site';

    const newReq: ExtendedMaterialRequest = {
      id: `mr-${Date.now()}`,
      request_number: `MR-2026-${String(requests.length + 1).padStart(3, '0')}`,
      project_name: projName,
      material_name: finalMaterial,
      quantity: qty,
      unit: newReqUnit,
      request_date: newReqDate,
      reason: newReqReason.trim() || 'Required for ongoing construction works',
      priority: newReqPriority,
      requested_by: newReqRequester,
      status: 'PENDING',
      attachment_name: newReqAttachmentName || undefined,
      attachment_url: newReqAttachmentUrl || undefined,
    };

    setRequests(prev => [newReq, ...prev]);
    setShowAddRequestModal(false);

    // Notify Admin via in-app bell notification and mobile push notification
    addNotification({
      title: 'Material Request Submitted',
      message: `${newReq.requested_by || 'Site Engineer'} requested ${newReq.quantity} ${newReq.unit} of ${newReq.material_name} for "${newReq.project_name}".`,
      type: 'MATERIAL_REQUEST',
      recipient: 'ADMIN',
      sender: newReq.requested_by || 'Site Engineer',
      projectName: newReq.project_name,
      requestCode: newReq.request_number,
      amount: newReq.quantity
    });

    // Reset form
    setNewReqReason('');
    setNewReqAttachmentName('');
    setNewReqAttachmentUrl(null);
    if (reqFileInputRef.current) reqFileInputRef.current.value = '';
    showToast(`Material Request ${newReq.request_number} submitted! Sent to Admin for Stock Review.`);
  };

  // ── ACTION 2: Approve & Automatically Deduct from Stock ──
  // (Fulfills the exact user scenario: e.g. Stock = 10, Request = 7 -> Balance = 3)
  const handleConfirmStockDeduction = () => {
    if (!approvingRequest) return;
    const req = approvingRequest;
    const matchingStock = findMatchingStock(req.material_name);

    if (!matchingStock) {
      alert(`No stock record found for "${req.material_name}". Please add stock or initiate a Vendor Purchase.`);
      return;
    }

    if (matchingStock.current_quantity < req.quantity) {
      alert(`Insufficient stock! Current stock is ${matchingStock.current_quantity} ${matchingStock.unit}, but request is for ${req.quantity} ${req.unit}. Please initiate a Vendor Purchase.`);
      return;
    }

    const newStockQty = matchingStock.current_quantity - req.quantity;

    // 1. Update Stock Inventory & Record Dispatch Log
    const newDispatchEntry = {
      id: `disp-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'DISPATCH' as const,
      quantity: req.quantity,
      reference: req.request_number,
      project_name: req.project_name,
      notes: `Dispatched to ${req.project_name}. Purpose: ${req.reason}`
    };

    setStockList(prev => prev.map(item => {
      if (item.id === matchingStock.id) {
        return {
          ...item,
          current_quantity: newStockQty,
          last_updated: new Date().toISOString().split('T')[0],
          history: [newDispatchEntry, ...(item.history || [])]
        };
      }
      return item;
    }));

    // 2. Update Material Request Status
    setRequests(prev => prev.map(r => {
      if (r.id === req.id) {
        return {
          ...r,
          status: 'APPROVED_FROM_STOCK',
          approved_at: new Date().toISOString().split('T')[0],
          approved_by: 'Admin / Procurement Lead',
          deducted_quantity: req.quantity,
          remaining_stock_after: newStockQty
        };
      }
      return r;
    }));

    setApprovingRequest(null);
    showToast(`Approved! ${req.quantity} ${req.unit} deducted from warehouse. Balance is now ${newStockQty} ${req.unit}.`);
  };

  // ── ACTION 3: Open Vendor Purchase with Prefilled Data from Request ──
  const handleInitiateVendorPurchase = (req: ExtendedMaterialRequest) => {
    setPoProject(req.project_name);
    setPoMaterial(req.material_name);
    setPoQuantity(String(req.quantity));
    setPoUnit(req.unit);
    setPoLinkedReqId(req.id);
    setPoSiteLocation(req.project_name);
    setShowCreatePoModal(true);
  };

  // ── ACTION 4: Add / Restock Warehouse Inventory ──
  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockName.trim()) {
      alert('Please enter material name');
      return;
    }

    const qty = parseFloat(newStockQuantity);
    const price = parseFloat(newStockUnitPrice) || 0;
    const threshold = parseFloat(newStockThreshold) || 5;

    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    // Check if item already exists -> increment stock
    const existing = stockList.find(s => s.item_name.toLowerCase().trim() === newStockName.toLowerCase().trim());

    if (existing) {
      const updatedQty = existing.current_quantity + qty;
      const historyEntry = {
        id: `inw-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: 'INWARD' as const,
        quantity: qty,
        reference: `RESTOCK-${Date.now().toString().slice(-4)}`,
        notes: newStockNotes.trim() || 'Manual stock restock / inward entry'
      };

      setStockList(prev => prev.map(s => {
        if (s.id === existing.id) {
          return {
            ...s,
            current_quantity: updatedQty,
            unit_price: price || s.unit_price,
            minimum_threshold: threshold || s.minimum_threshold,
            location: newStockLocation || s.location,
            last_updated: new Date().toISOString().split('T')[0],
            history: [historyEntry, ...(s.history || [])]
          };
        }
        return s;
      }));

      showToast(`Restocked ${newStockName}! Added +${qty} ${existing.unit}. New balance: ${updatedQty} ${existing.unit}.`);
    } else {
      const newStockItem: ExtendedStockItem = {
        id: `stk-${Date.now()}`,
        item_name: newStockName.trim(),
        category: newStockCategory,
        unit: newStockUnit,
        current_quantity: qty,
        minimum_threshold: threshold,
        unit_price: price,
        location: newStockLocation.trim() || 'Central Yard - Chennai',
        last_updated: new Date().toISOString().split('T')[0],
        history: [
          {
            id: `inw-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'INWARD',
            quantity: qty,
            reference: `INITIAL-${Date.now().toString().slice(-4)}`,
            notes: newStockNotes.trim() || 'Initial inventory intake'
          }
        ]
      };

      setStockList(prev => [newStockItem, ...prev]);
      showToast(`Added ${newStockName} (${qty} ${newStockUnit}) to Warehouse Stock!`);
    }

    setShowAddStockModal(false);
    // Reset form
    setNewStockName('');
    setNewStockNotes('');
  };

  // ── ACTION 5: Create Vendor Purchase Order ──
  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(poQuantity);
    const rate = parseFloat(poRate) || 0;
    if (!poMaterial.trim() || isNaN(qty) || qty <= 0) {
      alert('Please fill in material and valid quantity');
      return;
    }

    const subtotal = qty * rate;
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    const newPo: ExtendedPurchaseOrder = {
      id: `po-${Date.now()}`,
      po_number: `PO-2026-${String(poList.length + 1).padStart(4, '0')}`,
      project_name: poProject || (availableProjects[0]?.name) || 'Project Site',
      material_name: poMaterial,
      ordered_quantity: qty,
      unit: poUnit,
      vendor_name: poVendor,
      quotation_rate: rate,
      tax_percentage: 18,
      total_amount: total,
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: poExpectedDate,
      status: 'PO_ISSUED',
      linked_request_id: poLinkedReqId,
      site_location: poSiteLocation || poProject || 'Project Site'
    };

    setPoList(prev => [newPo, ...prev]);

    // If linked to a material request, update that request's status
    if (poLinkedReqId) {
      setRequests(prev => prev.map(r => {
        if (r.id === poLinkedReqId) {
          return {
            ...r,
            status: 'PO_CREATED',
            notes: `Purchase Order ${newPo.po_number} issued to ${poVendor}`
          };
        }
        return r;
      }));
    }

    setShowCreatePoModal(false);
    showToast(`Purchase Order ${newPo.po_number} created and issued to ${poVendor}!`);
  };

  // ── ACTION 6: Site Engineer Inspects Delivery & Uploads Bill (GRN) ──
  const handleOpenInspectModal = (po: ExtendedPurchaseOrder) => {
    setSelectedPoForInspect(po);
    setGrnReceivedQty(String(po.ordered_quantity));
    setGrnChallanNo(`DC-${Date.now().toString().slice(-4)}`);
    setGrnVehicleNo('TN 09 CB 4412');
    setGrnBillNo(`INV-${Date.now().toString().slice(-4)}`);
    setGrnBillAmount(String(po.total_amount));
    setGrnQualityStatus('PASSED');
    setGrnQualityNotes('Verified packaging condition, batch certificates, accepted 100% for site work.');
    setGrnUploadedFileName('');
    setGrnUploadedFileUrl(null);
    setGrnUploadedFileSize('');
    if (grnFileInputRef.current) grnFileInputRef.current.value = '';
    setShowInspectModal(true);
  };

  const handleConfirmSiteVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoForInspect) return;

    const po = selectedPoForInspect;
    const recQty = parseFloat(grnReceivedQty) || po.ordered_quantity;
    const billAmt = parseFloat(grnBillAmount) || po.total_amount;

    const newGrn: ExtendedGRN = {
      id: `grn-${Date.now()}`,
      grn_number: `GRN-2026-${String(grnList.length + 1).padStart(4, '0')}`,
      po_number: po.po_number,
      project_name: po.project_name,
      material_name: po.material_name,
      ordered_quantity: po.ordered_quantity,
      received_quantity: recQty,
      unit: po.unit,
      vendor_name: po.vendor_name,
      challan_number: grnChallanNo || 'DC-DIRECT',
      vehicle_number: grnVehicleNo || 'SITE-DELIVERY',
      receipt_date: new Date().toISOString().split('T')[0],
      inspected_by: 'Er. Senthil Kumar (Site Engineer)',
      quality_status: grnQualityStatus,
      quality_notes: grnQualityNotes,
      bill_number: grnBillNo,
      bill_amount: billAmt,
      bill_file_name: grnUploadedFileName || `${po.po_number}_Vendor_Invoice.pdf`,
      bill_file_url: grnUploadedFileUrl || undefined,
      status: 'VERIFIED'
    };

    setGrnList(prev => [newGrn, ...prev]);

    // Update PO status to VERIFIED_AT_SITE
    setPoList(prev => prev.map(p => {
      if (p.id === po.id) {
        return { ...p, status: 'VERIFIED_AT_SITE' };
      }
      return p;
    }));

    // If linked request exists, mark as DELIVERED
    if (po.linked_request_id) {
      setRequests(prev => prev.map(r => {
        if (r.id === po.linked_request_id) {
          return { ...r, status: 'DELIVERED', notes: `Delivered & Verified at Site under ${newGrn.grn_number}` };
        }
        return r;
      }));
    }

    setShowInspectModal(false);
    showToast(`Site Delivery Verified! GRN ${newGrn.grn_number} created with attached Bill & Inspection Report.`);
  };

  // KPI Calculations
  const pendingRequestsCount = requests.filter(r => r.status === 'PENDING').length;
  const lowStockCount = stockList.filter(s => s.current_quantity <= s.minimum_threshold).length;
  const totalStockValuation = stockList.reduce((acc, s) => acc + (s.current_quantity * s.unit_price), 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white min-h-screen">
      {/* ── TOP HEADER BAR ── */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-black rounded tracking-wider uppercase">
              SUPPLY CHAIN
            </span>
            <h1 className="text-[21px] font-bold text-[#262626] font-heading tracking-tight">
              Procurement & Material Operations
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Site Material Requests • Warehouse Stock Management & Deduction • Vendor Purchase • Quality Inspection & Bill Upload
          </p>
        </div>

        <div className="flex items-center gap-3">
          <UserProfileDropdown showBell={true} />
        </div>
      </div>

      {/* ── HORIZONTAL WORKFLOW TABS ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 sticky top-[69px] z-10 shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Tab 1: Material Requests */}
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'requests'
                ? 'bg-red-50 text-red-600 font-bold border-red-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent font-medium'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Material Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          {/* Tab 2: Stock Management */}
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'stock'
                ? 'bg-red-50 text-red-600 font-bold border-red-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent font-medium'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Warehouse Stock</span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">
              {stockList.length}
            </span>
            {lowStockItems.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow-2xs">
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>{lowStockItems.length} Low</span>
              </span>
            )}
          </button>

          {/* Tab 3: Vendor Purchase */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'orders'
                ? 'bg-red-50 text-red-600 font-bold border-red-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent font-medium'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Vendor Purchase (PO)</span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">
              {poList.length}
            </span>
          </button>

          {/* Tab 4: Site Verification & Bills */}
          <button
            type="button"
            onClick={() => setActiveTab('grn')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'grn'
                ? 'bg-red-50 text-red-600 font-bold border-red-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent font-medium'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Site Receipt & Quality (GRN)</span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">
              {grnList.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">


        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: MATERIAL REQUESTS (SITE MATERIAL REQUESTS WITH AUTO-DEDUCTION)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'requests' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">Site Material Requests</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Raised by Site Engineers & PMs. Admin reviews warehouse stock availability to approve and auto-deduct or create Vendor Purchase.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRequestModal(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>New Material Request</span>
                </button>
              </div>
            </div>

            {/* Quick Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by project, material, or MR #..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Filter Status:</span>
                {['ALL', 'PENDING', 'APPROVED_FROM_STOCK', 'PO_CREATED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All Requests' : st === 'APPROVED_FROM_STOCK' ? 'Approved & Deducted' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Material Requests Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Request # & Date</th>
                      <th className="py-3.5 px-4">Project & Purpose / Reason</th>
                      <th className="py-3.5 px-4">Material & Qty</th>
                      <th className="py-3.5 px-4">Warehouse Stock Check</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {requests
                      .filter(r => {
                        const q = requestSearch.toLowerCase();
                        const matchQ = !q || r.project_name.toLowerCase().includes(q) || r.material_name.toLowerCase().includes(q) || r.request_number.toLowerCase().includes(q);
                        const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
                        return matchQ && matchStatus;
                      })
                      .map((req) => {
                        const matchingStock = findMatchingStock(req.material_name);
                        const stockQty = matchingStock ? matchingStock.current_quantity : 0;
                        const isStockSufficient = stockQty >= req.quantity;

                        return (
                          <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Request Info */}
                            <td className="py-3.5 px-4">
                              <div className="tracking-tight font-bold text-slate-900">{req.request_number}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{req.request_date}</span>
                              </div>
                            </td>

                            {/* Project & Purpose */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="font-bold text-slate-900 truncate">{req.project_name}</div>
                              <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                                <span className="font-medium text-slate-400">Purpose: </span>
                                {req.reason}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">By: {req.requested_by}</div>
                            </td>

                            {/* Material & Quantity */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{req.material_name}</div>
                              <div className="text-sm tracking-tight font-bold text-red-600 mt-0.5">
                                {req.quantity} <span className="text-xs font-semibold text-slate-600">{req.unit}</span>
                              </div>
                              {req.attachment_url && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage({
                                    title: `${req.material_name} - Photo/Spec`,
                                    url: req.attachment_url!,
                                    fileName: req.attachment_name
                                  })}
                                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                                >
                                  <LucideImage className="w-3 h-3" />
                                  <span>View Photo</span>
                                </button>
                              )}
                            </td>

                            {/* Live Warehouse Stock Check */}
                            <td className="py-3.5 px-4">
                              {matchingStock ? (
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${isStockSufficient ? 'bg-emerald-500' : stockQty > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                    <span className="font-bold text-slate-800">
                                      {stockQty} {matchingStock.unit} in Stock
                                    </span>
                                  </div>
                                  <div className="text-[11px] mt-0.5">
                                    {isStockSufficient ? (
                                      <span className="text-emerald-700 font-semibold">✓ Sufficient Stock Available</span>
                                    ) : stockQty > 0 ? (
                                      <span className="text-amber-700 font-semibold">⚠ Deficit: {req.quantity - stockQty} {req.unit}</span>
                                    ) : (
                                      <span className="text-red-600 font-semibold">✕ Out of Stock (0 available)</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-slate-400 italic">Not tracked in stock</span>
                                  <div className="text-[11px] text-amber-600 font-medium mt-0.5">Vendor PO required</div>
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {req.status === 'PENDING' && (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold rounded-full">
                                  Pending Review
                                </span>
                              )}
                              {req.status === 'APPROVED_FROM_STOCK' && (
                                <div>
                                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-full flex items-center gap-1 w-fit">
                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                    Approved & Deducted
                                  </span>
                                  <div className="text-[10px] text-slate-400 mt-1">
                                    Deducted: -{req.deducted_quantity} {req.unit}
                                  </div>
                                </div>
                              )}
                              {req.status === 'PO_CREATED' && (
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold rounded-full">
                                  Vendor PO Created
                                </span>
                              )}
                              {req.status === 'DELIVERED' && (
                                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold rounded-full">
                                  Delivered to Site
                                </span>
                              )}
                            </td>

                            {/* Admin Action */}
                            <td className="py-3.5 px-4 text-right">
                              {req.status === 'PENDING' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  {isStockSufficient ? (
                                    <button
                                      type="button"
                                      onClick={() => setApprovingRequest(req)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                                      title="Approve and automatically deduct from warehouse stock"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>Approve & Deduct</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleInitiateVendorPurchase(req)}
                                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                                      title="Stock is insufficient - Create Vendor Purchase Order"
                                    >
                                      <ShoppingCart className="w-3.5 h-3.5" />
                                      <span>Vendor Purchase (PO)</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">Processed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: WAREHOUSE STOCK (INVENTORY MANAGEMENT WITH HISTORY)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'stock' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* ── LOW STOCK NOTIFICATION ALERT BANNER (Shown exclusively on Warehouse Stock) ── */}
            {lowStockItems.length > 0 && !isBannerDismissed && (
              <div className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50/30 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-2xs animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-amber-200">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">
                        Low Stock Notification: {lowStockItems.length} {lowStockItems.length === 1 ? 'item has' : 'items have'} reached minimum threshold
                      </h3>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Attention Required
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs">
                      The items below have reached or fallen below minimum safety threshold and require restocking:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {lowStockItems.map(item => (
                        <span key={item.id} className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200 text-slate-800 font-medium shadow-2xs">
                          <span>{item.item_name}:</span>
                          <span className="tracking-tight font-bold text-red-600">{item.current_quantity} {item.unit}</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Min: {item.minimum_threshold} {item.unit})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddStockModal(true);
                    }}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Restock Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBannerDismissed(true)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-amber-100/60 transition cursor-pointer"
                    title="Dismiss Banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Header & KPI Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">Site Yard & Warehouse Stock</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live inventory levels. Stock is automatically subtracted when material requests are approved, and added when inward deliveries are received.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Stock / Restock</span>
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-xs text-slate-500 font-semibold">Total Stock Items</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{stockList.length} Materials</div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-1">Live synchronized inventory</div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-xs text-slate-500 font-semibold">Estimated Inventory Value</div>
                <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  ₹{totalStockValuation.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Across all yard & warehouse bays</div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-xs text-slate-500 font-semibold">Low Stock Alerts</div>
                <div className="text-2xl font-black text-red-600 mt-1">{lowStockCount} Items Below Threshold</div>
                <div className="text-[11px] text-red-600 font-semibold mt-1">Require vendor procurement</div>
              </div>
            </div>

            {/* Stock Inventory Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search material or location..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Showing {stockList.length} materials
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Material Name & Category</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-center">Available Stock</th>
                      <th className="py-3 px-4 text-center">Min Threshold</th>
                      <th className="py-3 px-4">Stock Health</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {stockList
                      .filter(s => !stockSearch || s.item_name.toLowerCase().includes(stockSearch.toLowerCase()) || s.location.toLowerCase().includes(stockSearch.toLowerCase()))
                      .map((item) => {
                        const isLow = item.current_quantity <= item.minimum_threshold;
                        const isOut = item.current_quantity === 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Material & Category */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{item.item_name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{item.category}</div>
                            </td>

                            {/* Location */}
                            <td className="py-3.5 px-4 text-slate-600">
                              {item.location}
                            </td>

                            {/* Unit Price */}
                            <td className="py-3.5 px-4 text-right tracking-tight font-medium text-slate-800">
                              ₹{item.unit_price.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400">/{item.unit}</span>
                            </td>

                            {/* Current Available Stock */}
                            <td className="py-3.5 px-4 text-center">
                              <span className={`text-sm tracking-tight font-black px-3 py-1 rounded-lg ${
                                isOut 
                                  ? 'bg-red-50 text-red-700 border border-red-200' 
                                  : isLow 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {item.current_quantity} {item.unit}
                              </span>
                            </td>

                            {/* Minimum Threshold */}
                            <td className="py-3.5 px-4 text-center tracking-tight text-slate-500">
                              {item.minimum_threshold} {item.unit}
                            </td>

                            {/* Stock Health */}
                            <td className="py-3.5 px-4">
                              {isOut ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 flex items-center gap-1 w-max">
                                  <AlertCircle className="w-3 h-3" /> Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-max">
                                  <AlertTriangle className="w-3 h-3" /> Low Stock
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-max">
                                  <Check className="w-3 h-3" /> Optimal Stock
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingStockItem(item)}
                                  className="px-2.5 py-1 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded hover:bg-slate-100 transition"
                                  title="View Inward & Dispatch History"
                                >
                                  Movement Log
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewStockName(item.item_name);
                                    setNewStockCategory(item.category);
                                    setNewStockUnit(item.unit);
                                    setNewStockUnitPrice(String(item.unit_price));
                                    setNewStockThreshold(String(item.minimum_threshold));
                                    setNewStockLocation(item.location);
                                    setShowAddStockModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded border border-red-200 transition"
                                >
                                  + Restock
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: VENDOR PURCHASE (PO WITH QUOTATIONS & SITE DELIVERY)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">Vendor Purchase Orders (PO)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Procure materials from external vendors with approved quotations. Once issued, consignments are dispatched directly to the site for inspection.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPoLinkedReqId(undefined);
                    setShowCreatePoModal(true);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Vendor PO</span>
                </button>
              </div>
            </div>

            {/* PO List */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">PO Number & Date</th>
                      <th className="py-3.5 px-4">Project & Site Delivery Location</th>
                      <th className="py-3.5 px-4">Vendor & Quotation Rate</th>
                      <th className="py-3.5 px-4">Material & Ordered Qty</th>
                      <th className="py-3.5 px-4 text-right">Total Amount (₹)</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {poList.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="tracking-tight font-bold text-slate-900">{po.po_number}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{po.order_date}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{po.project_name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{po.site_location}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{po.vendor_name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 tracking-tight">
                            ₹{po.quotation_rate.toLocaleString('en-IN')} /{po.unit}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{po.material_name}</div>
                          <div className="tracking-tight text-xs font-bold text-slate-700 mt-0.5">
                            {po.ordered_quantity} {po.unit}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right tracking-tight font-bold text-slate-900">
                          ₹{po.total_amount.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4">
                          {po.status === 'PO_ISSUED' && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold rounded-full">
                              Issued & Dispatched
                            </span>
                          )}
                          {po.status === 'VERIFIED_AT_SITE' && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-full flex items-center gap-1 w-fit">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              Verified at Site
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {po.status !== 'VERIFIED_AT_SITE' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenInspectModal(po)}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer ml-auto"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>Site Verify & Bill</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-semibold">GRN Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4: SITE RECEIPT & QUALITY INSPECTION (GRN & BILL UPLOAD)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'grn' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Site Material Receipt & Quality Inspections (GRN)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Physical deliveries inspected on-site by Site Engineers. Upload vendor bills, delivery challans, and record quality inspection notes.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">GRN # & Date</th>
                      <th className="py-3.5 px-4">Project & Material</th>
                      <th className="py-3.5 px-4">Vendor & Transport</th>
                      <th className="py-3.5 px-4">Quantity Received</th>
                      <th className="py-3.5 px-4">Quality Verification</th>
                      <th className="py-3.5 px-4">Uploaded Bill / Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {grnList.map((grn) => (
                      <tr key={grn.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="tracking-tight font-bold text-slate-900">{grn.grn_number}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 tracking-tight">Linked {grn.po_number}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{grn.receipt_date}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{grn.project_name}</div>
                          <div className="text-slate-600 mt-0.5">{grn.material_name}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{grn.vendor_name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">Challan: {grn.challan_number}</div>
                          <div className="text-[10px] text-slate-400">Vehicle: {grn.vehicle_number}</div>
                        </td>

                        <td className="py-3.5 px-4 tracking-tight font-bold text-slate-900">
                          {grn.received_quantity} {grn.unit}
                          {grn.received_quantity === grn.ordered_quantity ? (
                            <span className="text-[10px] text-emerald-600 font-normal ml-1">(100% Full)</span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-normal ml-1">(Partial)</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            grn.quality_status === 'PASSED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {grn.quality_status === 'PASSED' ? 'Passed Quality Check' : 'Defects Noted'}
                          </span>
                          <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {grn.quality_notes}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">By {grn.inspected_by}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {grn.bill_number ? (
                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                                <FileText className="w-3.5 h-3.5 text-red-600" />
                                <span>{grn.bill_number}</span>
                              </div>
                              {grn.bill_amount && (
                                <div className="text-[11px] tracking-tight text-slate-700">
                                  ₹{grn.bill_amount.toLocaleString('en-IN')}
                                </div>
                              )}
                              <div 
                                onClick={() => {
                                  if (grn.bill_file_url) {
                                    setPreviewImage({
                                      title: `Vendor Bill #${grn.bill_number} (${grn.vendor_name})`,
                                      url: grn.bill_file_url,
                                      fileName: grn.bill_file_name
                                    });
                                  } else {
                                    showToast(`Viewing document: ${grn.bill_file_name || 'Bill_Receipt.pdf'}`);
                                  }
                                }}
                                className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                title="Click to view bill"
                              >
                                {grn.bill_file_url && grn.bill_file_url.startsWith('data:image/') ? (
                                  <LucideImage className="w-3 h-3 text-red-600" />
                                ) : (
                                  <Eye className="w-3 h-3 text-red-600" />
                                )}
                                <span className="truncate max-w-[130px]">{grn.bill_file_name || 'Bill_Receipt.pdf'}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No bill uploaded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: ADD NEW MATERIAL REQUEST (SITE REQUEST FORM)
      ══════════════════════════════════════════════════════════════════════ */}
      {showAddRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">New Site Material Request</h3>
                  <p className="text-[11px] text-slate-500">Submit required materials for project site execution.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRequestModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-xs">
              {/* 1. Project Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={newReqProject}
                  onChange={(e) => setNewReqProject(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:border-red-600"
                  required
                >
                  <option value="">-- Choose Project --</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Material Name Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Material Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={newReqMaterial}
                  onChange={(e) => setNewReqMaterial(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:border-red-600"
                >
                  <option value="Cement 53 Grade (UltraTech)">Cement 53 Grade (UltraTech)</option>
                  <option value="TMT Steel 12mm (Tata Tiscon)">TMT Steel 12mm (Tata Tiscon)</option>
                  <option value="TMT Steel 16mm (Tata Tiscon)">TMT Steel 16mm (Tata Tiscon)</option>
                  <option value="River Sand (Washed M-Sand)">River Sand (Washed M-Sand)</option>
                  <option value="Solid Red Clay Bricks">Solid Red Clay Bricks</option>
                  <option value="20mm Blue Metal Granite Aggregate">20mm Blue Metal Granite Aggregate</option>
                  <option value="Exterior Emulsion Paint (Asian Paints)">Exterior Emulsion Paint (Asian Paints)</option>
                  <option value="PVC Conduit Pipes 25mm">PVC Conduit Pipes 25mm</option>
                  <option value="OTHER">+ Other / Custom Material</option>
                </select>

                {newReqMaterial === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="Enter custom material name..."
                    value={newReqCustomMaterial}
                    onChange={(e) => setNewReqCustomMaterial(e.target.value)}
                    className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-600"
                    required
                  />
                )}
              </div>

              {/* 3. Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    placeholder="e.g. 7"
                    value={newReqQuantity}
                    onChange={(e) => setNewReqQuantity(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg tracking-tight font-bold text-slate-900 focus:outline-none focus:border-red-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={newReqUnit}
                    onChange={(e) => setNewReqUnit(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:border-red-600"
                  >
                    <option value="Bags">Bags</option>
                    <option value="Tons">Tons</option>
                    <option value="Loads">Loads</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Litres">Litres</option>
                    <option value="Kgs">Kgs</option>
                    <option value="Bundles">Bundles</option>
                  </select>
                </div>
              </div>

              {/* 4. Request Date & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Request Date</label>
                  <input
                    type="date"
                    value={newReqDate}
                    onChange={(e) => setNewReqDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-red-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newReqPriority}
                    onChange={(e) => setNewReqPriority(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:border-red-600"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent (Immediate Site Stoppage)</option>
                    <option value="NORMAL">Normal</option>
                  </select>
                </div>
              </div>

              {/* 5. Reason / Purpose */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason / Purpose for Procurement <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Column casting 1st floor, basement footing, plastering..."
                  value={newReqReason}
                  onChange={(e) => setNewReqReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              {/* 6. Site Photo / Material Drawing Attachment (Device Gallery / Camera) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Site Photo / Material Specification <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                </label>
                <input
                  type="file"
                  ref={reqFileInputRef}
                  onChange={handleReqFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />

                {!newReqAttachmentUrl && !newReqAttachmentName ? (
                  <div
                    onClick={() => reqFileInputRef.current?.click()}
                    className="border border-dashed border-slate-300 hover:border-red-400 hover:bg-red-50/20 rounded-xl p-3 text-center bg-slate-50/60 cursor-pointer transition flex items-center justify-center gap-2 group"
                  >
                    <Camera className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-xs text-slate-700">
                      Upload from Device Gallery / Camera
                    </span>
                    <span className="text-[10px] text-slate-400">(JPG, PNG, PDF up to 10MB)</span>
                  </div>
                ) : (
                  <div className="border border-red-200 bg-red-50/20 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {newReqAttachmentUrl && newReqAttachmentUrl.startsWith('data:image/') ? (
                        <img 
                          src={newReqAttachmentUrl} 
                          alt="preview" 
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0" 
                        />
                      ) : (
                        <FileText className="w-7 h-7 text-red-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">{newReqAttachmentName}</div>
                        <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" /> Photo Selected
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {newReqAttachmentUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ title: 'Material Photo / Spec', url: newReqAttachmentUrl, fileName: newReqAttachmentName })}
                          className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setNewReqAttachmentName('');
                          setNewReqAttachmentUrl(null);
                          if (reqFileInputRef.current) reqFileInputRef.current.value = '';
                        }}
                        className="p-1.5 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-100"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRequestModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: CONFIRM APPROVAL & STOCK DEDUCTION (AUTOMATIC SUBTRACTION)
      ══════════════════════════════════════════════════════════════════════ */}
      {approvingRequest && (() => {
        const matchingStock = findMatchingStock(approvingRequest.material_name);
        const currentStockQty = matchingStock ? matchingStock.current_quantity : 0;
        const remainingQty = currentStockQty - approvingRequest.quantity;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs overflow-y-auto flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Approve & Deduct Warehouse Stock</h3>
                    <p className="text-[11px] text-slate-500">Live inventory subtraction confirmation</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setApprovingRequest(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* Request Details Card */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between tracking-tight text-[11px] text-slate-500">
                    <span>{approvingRequest.request_number}</span>
                    <span>{approvingRequest.request_date}</span>
                  </div>
                  <div className="font-bold text-sm text-slate-900">{approvingRequest.project_name}</div>
                  <div className="text-slate-600">
                    <span className="font-semibold text-slate-400">Purpose: </span>
                    {approvingRequest.reason}
                  </div>
                </div>

                {/* Stock Math Breakdown */}
                <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
                  <div className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Automatic Stock Deduction Calculation:</span>
                  </div>

                  <div className="space-y-1.5 tracking-tight text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Current Warehouse Stock:</span>
                      <strong className="text-slate-900">{currentStockQty} {approvingRequest.unit}</strong>
                    </div>
                    <div className="flex items-center justify-between text-red-600">
                      <span>Requested Deduction:</span>
                      <strong>- {approvingRequest.quantity} {approvingRequest.unit}</strong>
                    </div>
                    <div className="h-px bg-emerald-200 my-1" />
                    <div className="flex items-center justify-between text-emerald-800 text-sm font-bold">
                      <span>Remaining Balance in Stock:</span>
                      <span className="px-2 py-0.5 bg-emerald-200/60 rounded">
                        {remainingQty} {approvingRequest.unit}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Confirming this action will immediately mark the request as approved, reduce warehouse balance, and create a dispatch log entry for this project.
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovingRequest(null)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStockDeduction}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirm & Deduct Stock</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: ADD STOCK / RESTOCK INVENTORY
      ══════════════════════════════════════════════════════════════════════ */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Stock / Warehouse Restock</h3>
                  <p className="text-[11px] text-slate-500">Enter incoming consignments or register a new material</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStockModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStock} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Material Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cement 53 Grade (UltraTech)"
                  value={newStockName}
                  onChange={(e) => setNewStockName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newStockCategory}
                    onChange={(e) => setNewStockCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:border-red-600"
                  >
                    <option value="Cement & Concrete">Cement & Concrete</option>
                    <option value="Steel & Rebar">Steel & Rebar</option>
                    <option value="Aggregates & Sand">Aggregates & Sand</option>
                    <option value="Masonry & Bricks">Masonry & Bricks</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Paints & Finishes">Paints & Finishes</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={newStockUnit}
                    onChange={(e) => setNewStockUnit(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:border-red-600"
                  >
                    <option value="Bags">Bags</option>
                    <option value="Tons">Tons</option>
                    <option value="Loads">Loads</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Litres">Litres</option>
                    <option value="Kgs">Kgs</option>
                    <option value="Bundles">Bundles</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Inward Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 10"
                    value={newStockQuantity}
                    onChange={(e) => setNewStockQuantity(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg tracking-tight font-bold text-slate-900 focus:outline-none focus:border-red-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 380"
                    value={newStockUnitPrice}
                    onChange={(e) => setNewStockUnitPrice(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg tracking-tight text-slate-800 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Threshold</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    value={newStockThreshold}
                    onChange={(e) => setNewStockThreshold(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg tracking-tight text-slate-800 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Yard / Storage Location</label>
                <input
                  type="text"
                  placeholder="e.g. Central Yard - Chennai Bay 1"
                  value={newStockLocation}
                  onChange={(e) => setNewStockLocation(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Inward Notes / Supplier Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Received from plant batch #4401"
                  value={newStockNotes}
                  onChange={(e) => setNewStockNotes(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  Save to Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 4: CREATE VENDOR PURCHASE ORDER (PO)
      ══════════════════════════════════════════════════════════════════════ */}
      {showCreatePoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create Vendor Purchase Order</h3>
                  <p className="text-[11px] text-slate-500">Initiate procurement when stock is insufficient</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination Project</label>
                <select
                  value={poProject}
                  onChange={(e) => setPoProject(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:border-red-600"
                  required
                >
                  <option value="">-- Choose Project --</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Material Name</label>
                <input
                  type="text"
                  value={poMaterial}
                  onChange={(e) => setPoMaterial(e.target.value)}
                  placeholder="e.g. Cement 53 Grade / TMT Steel"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={poQuantity}
                    onChange={(e) => setPoQuantity(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg tracking-tight font-bold text-slate-900 focus:outline-none focus:border-red-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={poUnit}
                    onChange={(e) => setPoUnit(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:border-red-600"
                  >
                    <option value="Bags">Bags</option>
                    <option value="Tons">Tons</option>
                    <option value="Loads">Loads</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Litres">Litres</option>
                    <option value="Kgs">Kgs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor / Supplier</label>
                  <input
                    type="text"
                    value={poVendor}
                    onChange={(e) => setPoVendor(e.target.value)}
                    placeholder="e.g. UltraTech Cement Ltd"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-red-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quotation Rate (₹ / Unit)</label>
                  <input
                    type="number"
                    value={poRate}
                    onChange={(e) => setPoRate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg tracking-tight text-slate-800 focus:outline-none focus:border-red-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expected Site Delivery Date</label>
                <input
                  type="date"
                  value={poExpectedDate}
                  onChange={(e) => setPoExpectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePoModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 5: SITE VERIFY QUALITY & UPLOAD BILL (GRN)
      ══════════════════════════════════════════════════════════════════════ */}
      {showInspectModal && selectedPoForInspect && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Site Quality Inspection & Bill Upload</h3>
                  <p className="text-[11px] text-slate-500">Site Engineer sign-off for {selectedPoForInspect.po_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInspectModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSiteVerification} className="p-6 space-y-4 text-xs">
              {/* Order Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between tracking-tight font-bold text-slate-900">
                  <span>{selectedPoForInspect.po_number}</span>
                  <span>{selectedPoForInspect.ordered_quantity} {selectedPoForInspect.unit}</span>
                </div>
                <div className="text-slate-700 font-semibold">{selectedPoForInspect.material_name}</div>
                <div className="text-[11px] text-slate-500">Destination: {selectedPoForInspect.project_name}</div>
              </div>

              {/* Received Qty & Transport */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Received Qty</label>
                  <input
                    type="number"
                    step="any"
                    value={grnReceivedQty}
                    onChange={(e) => setGrnReceivedQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg tracking-tight font-bold text-slate-900 focus:outline-none focus:border-red-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Challan #</label>
                  <input
                    type="text"
                    value={grnChallanNo}
                    onChange={(e) => setGrnChallanNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg tracking-tight text-slate-800 focus:outline-none focus:border-red-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle #</label>
                  <input
                    type="text"
                    value={grnVehicleNo}
                    onChange={(e) => setGrnVehicleNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg tracking-tight text-slate-800 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* Quality Checklist */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quality Inspection Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                    grnQualityStatus === 'PASSED'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="qStatus"
                      checked={grnQualityStatus === 'PASSED'}
                      onChange={() => setGrnQualityStatus('PASSED')}
                      className="accent-emerald-600"
                    />
                    <span>Passed 100% Quality Standards</span>
                  </label>

                  <label className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                    grnQualityStatus === 'DEFECTS_NOTED'
                      ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="qStatus"
                      checked={grnQualityStatus === 'DEFECTS_NOTED'}
                      onChange={() => setGrnQualityStatus('DEFECTS_NOTED')}
                      className="accent-rose-600"
                    />
                    <span>Defects / Variance Noted</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Site Engineer Quality Notes</label>
                <textarea
                  rows={2}
                  value={grnQualityNotes}
                  onChange={(e) => setGrnQualityNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-600"
                  placeholder="e.g. Visual inspection done, cement dry with no lumps, verified manufacturer batch..."
                />
              </div>

              {/* Bill / Invoice Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor Bill / Invoice #</label>
                  <input
                    type="text"
                    value={grnBillNo}
                    onChange={(e) => setGrnBillNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg tracking-tight text-slate-800 focus:outline-none focus:border-red-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bill Amount (₹)</label>
                  <input
                    type="number"
                    value={grnBillAmount}
                    onChange={(e) => setGrnBillAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg tracking-tight font-bold text-slate-900 focus:outline-none focus:border-red-600"
                    required
                  />
                </div>
              </div>

              {/* File Upload Box (Device Gallery / Camera / Document Picker) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Upload Bill / Invoice Document <span className="text-red-500">*</span>
                  </label>
                  {grnUploadedFileName && (
                    <button
                      type="button"
                      onClick={() => grnFileInputRef.current?.click()}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Change File
                    </button>
                  )}
                </div>

                {/* Hidden File Input triggering gallery / files */}
                <input
                  type="file"
                  ref={grnFileInputRef}
                  onChange={handleGrnFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />

                {!grnUploadedFileName && !grnUploadedFileUrl ? (
                  <div
                    onClick={() => grnFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleGrnFileDrop}
                    className="border-2 border-dashed border-red-200 hover:border-red-500 hover:bg-red-50/20 rounded-xl p-4 text-center bg-red-50/10 cursor-pointer transition group"
                  >
                    <div className="w-10 h-10 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-slate-900 text-xs mb-0.5">
                      Click to Open Gallery or Camera
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Select invoice bill photo or PDF document from your device
                    </p>
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Browse Device Gallery / Files</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Supports JPG, PNG, WEBP, PDF up to 15MB</p>
                  </div>
                ) : (
                  <div className="border border-red-200 bg-red-50/20 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {grnUploadedFileUrl && grnUploadedFileUrl.startsWith('data:image/') ? (
                        <div 
                          onClick={() => setPreviewImage({ 
                            title: 'Uploaded Invoice Preview', 
                            url: grnUploadedFileUrl, 
                            fileName: grnUploadedFileName 
                          })}
                          className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 cursor-pointer group shadow-2xs"
                          title="Click to zoom preview"
                        >
                          <img 
                            src={grnUploadedFileUrl} 
                            alt="Uploaded Bill" 
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                            <Eye className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 font-bold">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate" title={grnUploadedFileName}>
                          {grnUploadedFileName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          {grnUploadedFileSize && <span>{grnUploadedFileSize}</span>}
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <Check className="w-3 h-3 stroke-[3]" /> Ready to Save
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {grnUploadedFileUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ 
                            title: 'Uploaded Invoice Preview', 
                            url: grnUploadedFileUrl, 
                            fileName: grnUploadedFileName 
                          })}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer"
                          title="Preview full image"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setGrnUploadedFileName('');
                          setGrnUploadedFileUrl(null);
                          setGrnUploadedFileSize('');
                          if (grnFileInputRef.current) grnFileInputRef.current.value = '';
                        }}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100/50 rounded-lg border border-red-200 transition cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInspectModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Verify Delivery & Save Bill</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 6: STOCK MOVEMENT / HISTORY LOG
      ══════════════════════════════════════════════════════════════════════ */}
      {viewingStockItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{viewingStockItem.item_name}</h3>
                <p className="text-[11px] text-slate-500">Complete Inward & Site Dispatch History</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingStockItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Balance Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Current Stock Balance</div>
                  <div className="text-lg tracking-tight font-bold text-slate-900">
                    {viewingStockItem.current_quantity} {viewingStockItem.unit}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500 font-medium">Yard Location</div>
                  <div className="text-xs font-semibold text-slate-800">{viewingStockItem.location}</div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Transaction Movement Log
                </h4>

                {(!viewingStockItem.history || viewingStockItem.history.length === 0) ? (
                  <div className="py-6 text-center text-slate-400 italic">No movement logs recorded yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {viewingStockItem.history.map((h) => (
                      <div key={h.id} className="p-3 bg-white flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            h.type === 'INWARD'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-red-50 text-red-600'
                          }`}>
                            {h.type === 'INWARD' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {h.type === 'INWARD' ? 'Stock Intake / Inward' : 'Dispatched to Site'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Ref: {h.reference} • {h.date}
                            </div>
                            {h.notes && (
                              <div className="text-[11px] text-slate-600 mt-0.5">{h.notes}</div>
                            )}
                          </div>
                        </div>

                        <div className={`tracking-tight font-bold text-sm ${
                          h.type === 'INWARD' ? 'text-emerald-700' : 'text-red-600'
                        }`}>
                          {h.type === 'INWARD' ? `+${h.quantity}` : `-${h.quantity}`} {viewingStockItem.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingStockItem(null)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  Close Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════════════
          IMAGE / DOCUMENT LIGHTBOX PREVIEW MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <LucideImage className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{previewImage.title}</h4>
                  {previewImage.fileName && (
                    <p className="text-[11px] text-slate-500 tracking-tight truncate max-w-xs">{previewImage.fileName}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  download={previewImage.fileName || 'document'}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-900/5 overflow-auto flex items-center justify-center min-h-[300px] max-h-[calc(90vh-100px)]">
              {previewImage.url.startsWith('data:image/') || previewImage.url.startsWith('http') || previewImage.url.startsWith('blob:') ? (
                <img 
                  src={previewImage.url} 
                  alt={previewImage.title} 
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl shadow-xs border border-slate-200">
                  <FileText className="w-12 h-12 text-red-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">{previewImage.fileName || 'Attached Document'}</p>
                  <p className="text-xs text-slate-500 mt-1">PDF or document format</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
