import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, X, MoreVertical, Check, AlertCircle, 
  Smartphone, Laptop, Truck, Wrench, Shield, CheckCircle2, 
  Building2, User, Users, Calendar, Trash2, Edit2, RotateCcw,
  ArrowUpDown, Filter, Download, Package,
  Maximize2, Minimize2
} from 'lucide-react';
import { Asset, AssetAllocation, Project } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { CustomSelect } from '../components/CustomSelect';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';

export interface EquipmentViewProps {
  project?: Project | null;
  projects?: Project[];
  assets?: Asset[];
  onUpdateAssets?: (assets: Asset[]) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onShowToast?: (msg: string) => void;
}

// Default aggregated assets with detailed handover & allocation history
const INITIAL_ASSETS: Asset[] = [
  {
    id: 'asset-phone',
    asset_code: 'BA-PHN-01',
    serial_no: 'BA11-16',
    name: 'Phone',
    category: 'Electronics',
    asset_type: 'Phone',
    price: 0,
    total_qty: 7,
    available_qty: 0,
    ownership: 'Company Owned',
    hourly_cost_rate: 0,
    assigned_to: '7 Staff Members',
    current_project_name: 'Various Sites & Office',
    status: 'Assigned',
    meter_hours: 0,
    description: 'Smartphones distributed to site supervisors and field engineers.',
    created_at: '2026-03-10',
    allocations: [
      { id: 'alloc-1', assigned_to: 'Ravi Kumar (Site Supervisor)', target_type: 'staff', quantity: 1, assigned_date: '2026-03-10', serial_numbers: ['BA11-11'], remarks: 'Site supervision phone' },
      { id: 'alloc-2', assigned_to: 'Karthik S (Field Engineer)', target_type: 'staff', quantity: 1, assigned_date: '2026-03-12', serial_numbers: ['BA7-7'], remarks: 'Field coordination' },
      { id: 'alloc-3', assigned_to: 'Praveen V (Safety Officer)', target_type: 'staff', quantity: 1, assigned_date: '2026-03-14', serial_numbers: ['BA5-5'], remarks: 'Safety inspection' },
      { id: 'alloc-4', assigned_to: 'Suresh N (Quality Engineer)', target_type: 'staff', quantity: 1, assigned_date: '2026-03-15', serial_numbers: ['BA3-3'], remarks: 'QA/QC inspection' },
      { id: 'alloc-5', assigned_to: 'Meena K (Accounts Executive)', target_type: 'staff', quantity: 1, assigned_date: '2026-03-18', serial_numbers: ['BA2-2'], remarks: 'Accounts verification' },
      { id: 'alloc-6', assigned_to: 'Arun Kumar (Project Manager)', target_type: 'staff', quantity: 1, assigned_date: '2026-03-20', serial_numbers: ['BA1-1'], remarks: 'Metro site operations' },
      { id: 'alloc-7', assigned_to: 'Venkatesh P (Stores Incharge)', target_type: 'staff', quantity: 1, assigned_date: '2026-03-22', serial_numbers: ['BA13-13'], remarks: 'Central warehouse dispatch' },
    ],
  },
  {
    id: 'asset-laptop',
    asset_code: 'BA-LPT-01',
    serial_no: 'BA025-20',
    name: 'Laptop',
    category: 'Computers',
    asset_type: 'Laptop',
    price: 0,
    total_qty: 5,
    available_qty: 4,
    ownership: 'Company Owned',
    hourly_cost_rate: 0,
    assigned_to: 'Priya D (Senior Architect)',
    current_project_name: 'IT Inventory / Yard',
    status: 'Available',
    meter_hours: 0,
    description: 'Workstation laptops (Lenovo ThinkPad / Dell Latitude).',
    created_at: '2026-03-25',
    allocations: [
      { id: 'alloc-8', assigned_to: 'Priya D (Senior Architect)', staff_name: 'Priya D', staff_role: 'Senior Architect', target_type: 'staff', quantity: 1, assigned_date: '2026-03-27', return_date: '2026-10-31', serial_numbers: ['BA022-22'], remarks: 'Head Office Design Cell AutoCAD & Revit' },
    ],
  },
  {
    id: 'asset-excavator',
    asset_code: 'BA-EQ-101',
    serial_no: 'BA-EQ-101',
    name: 'Excavator CAT 320D',
    category: 'Heavy Machinery',
    asset_type: 'Plant & Machinery',
    price: 4500000,
    total_qty: 1,
    available_qty: 0,
    ownership: 'Company Owned',
    hourly_cost_rate: 1850,
    assigned_to: 'Villa Grande Site',
    current_project_name: 'Villa Grande Site',
    status: 'Assigned',
    meter_hours: 1420,
    description: 'Crawler excavator 20-ton class for deep basement excavation.',
    created_at: '2026-01-15',
    allocations: [
      { id: 'alloc-9', assigned_to: 'Villa Grande Site', target_type: 'project', quantity: 1, assigned_date: '2026-01-15', serial_numbers: ['BA-EQ-101'], remarks: 'Basement excavation and earthmoving' },
    ],
  },
  {
    id: 'asset-jcb',
    asset_code: 'BA-EQ-102',
    serial_no: 'BA-EQ-102',
    name: 'JCB 3DX Super Backhoe',
    category: 'Heavy Machinery',
    asset_type: 'Plant & Machinery',
    price: 3250000,
    total_qty: 2,
    available_qty: 1,
    ownership: 'Company Owned',
    hourly_cost_rate: 1200,
    assigned_to: 'Metro Line Extension',
    current_project_name: 'Metro Line Extension',
    status: 'Available',
    meter_hours: 890,
    created_at: '2026-02-01',
    allocations: [
      { id: 'alloc-10', assigned_to: 'Metro Line Extension', target_type: 'project', quantity: 1, assigned_date: '2026-02-01', serial_numbers: ['BA-EQ-102A'], remarks: 'Utility trenching & road works' },
    ],
  },
  {
    id: 'asset-mixer',
    asset_code: 'BA-EQ-103',
    serial_no: 'BA-EQ-103',
    name: 'Transit Concrete Mixer 6m³',
    category: 'Vehicles',
    asset_type: 'Vehicle',
    price: 2800000,
    total_qty: 1,
    available_qty: 1,
    ownership: 'Company Owned',
    hourly_cost_rate: 950,
    assigned_to: '',
    current_project_name: 'Central RMC Depot',
    status: 'Available',
    meter_hours: 640,
    created_at: '2026-02-18',
    allocations: [],
  },
];

const ASSET_TYPES = [
  'Phone',
  'Laptop',
  'Plant & Machinery',
  'Vehicle',
  'Survey Tool',
  'Power Tools',
  'Safety Equipment',
  'Office Equipment',
  'Other'
];

export const EquipmentView: React.FC<EquipmentViewProps> = ({ 
  project, 
  projects = [],
  assets: propAssets,
  onUpdateAssets,
  isSidebarOpen,
  onToggleSidebar,
  onShowToast,
}) => {
  // ── State Initialization with Persistence & Aggregation ──
  const [assetList, setAssetList] = useState<Asset[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_assets_inventory');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If saved items are in old un-aggregated format (multiple identical names like Phone/Laptop with total_qty=1 and no allocations)
          const needsMigration = parsed.some((a: any) => a.name === 'Phone' && a.total_qty === 1 && !a.allocations);
          if (needsMigration) {
            localStorage.setItem('booshnam_assets_inventory', JSON.stringify(INITIAL_ASSETS));
            return INITIAL_ASSETS;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved assets:', e);
    }
    return propAssets && propAssets.length > 0 ? propAssets : INITIAL_ASSETS;
  });

  // Sync state changes to localStorage and parent callback
  const updateAssets = (newAssets: Asset[]) => {
    setAssetList(newAssets);
    try {
      localStorage.setItem('booshnam_assets_inventory', JSON.stringify(newAssets));
    } catch (e) {
      console.error('Failed to persist assets:', e);
    }
    if (onUpdateAssets) {
      onUpdateAssets(newAssets);
    }
  };

  // ── Filters & Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');

  // ── Modals State ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAssetForAction, setSelectedAssetForAction] = useState<Asset | null>(null);

  // Active Dropdown Menu in Table
  const [activeMenuAssetId, setActiveMenuAssetId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close table dropdown menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuAssetId(null);
      }
    };
    if (activeMenuAssetId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeMenuAssetId]);

  // ── Form States for New Asset ──
  const [newSerialNo, setNewSerialNo] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Phone');
  const [newPrice, setNewPrice] = useState('0');
  const [newTotalQty, setNewTotalQty] = useState('1');
  const [newAvailableQty, setNewAvailableQty] = useState('1');
  const [newOwnership, setNewOwnership] = useState('Company Owned');
  const [newLocation, setNewLocation] = useState('Central Yard');
  const [newDescription, setNewDescription] = useState('');

  // ── Form States for Assigning Asset ──
  const [assignTargetType, setAssignTargetType] = useState<'project' | 'staff'>('staff');
  const [assignProjectName, setAssignProjectName] = useState(projects[0]?.name || 'Villa Grande Site');
  const [assignStaffName, setAssignStaffName] = useState('');
  const [assignStaffRole, setAssignStaffRole] = useState('');
  const [assignQty, setAssignQty] = useState('1');
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assignReturnDate, setAssignReturnDate] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');

  // ── Filtered Assets ──
  const filteredAssets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return assetList.filter(item => {
      const matchesSearch = !q || 
        (item.serial_no || item.asset_code || '').toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.asset_type || item.category || '').toLowerCase().includes(q) ||
        (item.assigned_to || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.current_project_name || '').toLowerCase().includes(q);

      const matchesType = selectedTypeFilter === 'All' || 
        (item.asset_type || item.category || '').toLowerCase() === selectedTypeFilter.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [assetList, searchQuery, selectedTypeFilter]);

  // ── Helper to Auto-Suggest Next Serial No ──
  const generateNextSerial = () => {
    const count = assetList.length + 1;
    return `BA${count.toString().padStart(2, '0')}-${count}`;
  };

  // ── Open Add Asset Modal ──
  const handleOpenAddModal = () => {
    setNewSerialNo(generateNextSerial());
    setNewName('');
    setNewType('Phone');
    setNewPrice('0');
    setNewTotalQty('1');
    setNewAvailableQty('1');
    setNewOwnership('Company Owned');
    setNewLocation('Central Yard');
    setNewDescription('');
    setIsAddModalOpen(true);
  };

  // ── Save New Asset ──
  const handleSaveNewAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Please enter an asset name');
      return;
    }

    const total = parseInt(newTotalQty, 10) || 1;
    const available = parseInt(newAvailableQty, 10) >= 0 ? parseInt(newAvailableQty, 10) : total;

    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      asset_code: newSerialNo.trim() || generateNextSerial(),
      serial_no: newSerialNo.trim() || generateNextSerial(),
      name: newName.trim(),
      category: newType,
      asset_type: newType,
      price: parseFloat(newPrice) || 0,
      total_qty: total,
      available_qty: Math.min(available, total),
      ownership: newOwnership,
      hourly_cost_rate: 0,
      assigned_to: available === 0 ? 'Assigned' : '',
      current_project_name: newLocation.trim() || 'Central Yard',
      description: newDescription.trim(),
      status: available > 0 ? 'Available' : 'Assigned',
      meter_hours: 0,
      created_at: new Date().toISOString().split('T')[0],
    };

    const updated = [newAsset, ...assetList];
    updateAssets(updated);
    setIsAddModalOpen(false);
    onShowToast?.(`Asset "${newAsset.name}" (${newAsset.serial_no}) registered successfully!`);
  };

  // ── Open Assign Modal ──
  const handleOpenAssign = (asset: Asset) => {
    setSelectedAssetForAction(asset);
    setAssignTargetType('staff');
    setAssignStaffName('');
    setAssignStaffRole('');
    setAssignProjectName(projects[0]?.name || 'Villa Grande Site');
    setAssignQty('1');
    setAssignDate(new Date().toISOString().split('T')[0]);
    setAssignReturnDate('');
    setAssignRemarks('');
    setActiveMenuAssetId(null);
    setIsAssignModalOpen(true);
  };

  // ── Save Assignment ──
  const handleSaveAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForAction) return;

    const qtyToAssign = parseInt(assignQty, 10) || 1;
    const currentAvail = selectedAssetForAction.available_qty ?? 0;

    if (qtyToAssign <= 0 || qtyToAssign > currentAvail) {
      alert(`Invalid quantity. Maximum available to assign is ${currentAvail}`);
      return;
    }

    const assignedTarget = assignTargetType === 'project' 
      ? assignProjectName 
      : (assignStaffRole.trim() 
          ? `${assignStaffName.trim()} (${assignStaffRole.trim()})`
          : (assignStaffName.trim() || 'Staff Member'));

    const newAlloc: AssetAllocation = {
      id: `alloc-${Date.now()}`,
      assigned_to: assignedTarget,
      staff_name: assignTargetType === 'staff' ? assignStaffName.trim() : undefined,
      staff_role: assignTargetType === 'staff' ? assignStaffRole.trim() : undefined,
      target_type: assignTargetType,
      quantity: qtyToAssign,
      assigned_date: assignDate || new Date().toISOString().split('T')[0],
      return_date: assignReturnDate.trim() || undefined,
      remarks: assignRemarks.trim(),
    };

    const nextAvail = Math.max(0, currentAvail - qtyToAssign);
    const existingAllocs = selectedAssetForAction.allocations || [];
    const updatedAllocs = [newAlloc, ...existingAllocs];

    const updatedAsset: Asset = {
      ...selectedAssetForAction,
      available_qty: nextAvail,
      status: nextAvail === 0 ? 'Assigned' : 'Available',
      allocations: updatedAllocs,
      assigned_to: `${updatedAllocs.length} Active Assignment(s)`,
    };

    const updated = assetList.map(a => a.id === selectedAssetForAction.id ? updatedAsset : a);
    updateAssets(updated);
    setSelectedAssetForAction(updatedAsset);
    setAssignStaffName('');
    setAssignStaffRole('');
    setAssignReturnDate('');
    setAssignRemarks('');
    setAssignQty('1');
    onShowToast?.(`Assigned ${qtyToAssign} unit(s) of "${selectedAssetForAction.name}" to ${assignedTarget}!`);
  };

  // ── Return Allocation from Handover list ──
  const handleReturnAllocation = (allocId: string) => {
    if (!selectedAssetForAction) return;
    const currentAllocs = selectedAssetForAction.allocations || [];
    const targetAlloc = currentAllocs.find(a => a.id === allocId);
    if (!targetAlloc) return;

    const returnQty = targetAlloc.quantity || 1;
    const currentAvail = selectedAssetForAction.available_qty ?? 0;
    const total = selectedAssetForAction.total_qty || 1;
    const nextAvail = Math.min(total, currentAvail + returnQty);
    const remainingAllocs = currentAllocs.filter(a => a.id !== allocId);

    const updatedAsset: Asset = {
      ...selectedAssetForAction,
      available_qty: nextAvail,
      status: nextAvail > 0 ? 'Available' : 'Assigned',
      allocations: remainingAllocs,
      assigned_to: remainingAllocs.length > 0 ? `${remainingAllocs.length} Active Assignment(s)` : '',
    };

    const updated = assetList.map(a => a.id === selectedAssetForAction.id ? updatedAsset : a);
    updateAssets(updated);
    setSelectedAssetForAction(updatedAsset);
    onShowToast?.(`Returned ${returnQty} unit(s) from "${targetAlloc.assigned_to}" back to inventory!`);
  };

  // ── Return Asset to Inventory (from dropdown menu) ──
  const handleReturnAsset = (asset: Asset) => {
    const total = asset.total_qty || 1;
    const currentAvail = asset.available_qty ?? 0;
    if (currentAvail >= total) {
      onShowToast?.(`All units of "${asset.name}" are already in available inventory.`);
      setActiveMenuAssetId(null);
      return;
    }

    const currentAllocs = asset.allocations || [];
    let remainingAllocs = currentAllocs;
    let freedQty = 1;
    if (currentAllocs.length > 0) {
      const popped = currentAllocs[0];
      freedQty = popped.quantity || 1;
      remainingAllocs = currentAllocs.slice(1);
    }

    const nextAvail = Math.min(total, currentAvail + freedQty);
    const updated = assetList.map(a => {
      if (a.id === asset.id) {
        return {
          ...a,
          available_qty: nextAvail,
          status: 'Available',
          allocations: remainingAllocs,
          assigned_to: remainingAllocs.length > 0 ? `${remainingAllocs.length} Active Assignment(s)` : '',
        };
      }
      return a;
    });

    updateAssets(updated);
    setActiveMenuAssetId(null);
    onShowToast?.(`Returned ${freedQty} unit(s) of "${asset.name}" to central inventory.`);
  };

  // ── Open Edit Modal ──
  const handleOpenEdit = (asset: Asset) => {
    setSelectedAssetForAction(asset);
    setNewSerialNo(asset.serial_no || asset.asset_code);
    setNewName(asset.name);
    setNewType(asset.asset_type || asset.category || 'Phone');
    setNewPrice((asset.price || 0).toString());
    setNewTotalQty((asset.total_qty || 1).toString());
    setNewAvailableQty((asset.available_qty ?? 0).toString());
    setNewOwnership(asset.ownership || 'Company Owned');
    setNewLocation(asset.current_project_name || 'Central Yard');
    setNewDescription(asset.description || '');
    setActiveMenuAssetId(null);
    setIsEditModalOpen(true);
  };

  // ── Save Edited Asset ──
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForAction) return;

    const total = parseInt(newTotalQty, 10) || 1;
    const avail = parseInt(newAvailableQty, 10) >= 0 ? parseInt(newAvailableQty, 10) : total;

    const updated = assetList.map(a => {
      if (a.id === selectedAssetForAction.id) {
        return {
          ...a,
          serial_no: newSerialNo.trim() || a.serial_no,
          asset_code: newSerialNo.trim() || a.asset_code,
          name: newName.trim() || a.name,
          description: newDescription.trim(),
          category: newType,
          asset_type: newType,
          price: parseFloat(newPrice) || 0,
          total_qty: total,
          available_qty: Math.min(avail, total),
          ownership: newOwnership,
          current_project_name: newLocation.trim() || a.current_project_name,
          status: avail > 0 ? 'Available' : 'Assigned',
        };
      }
      return a;
    });

    updateAssets(updated);
    setIsEditModalOpen(false);
    onShowToast?.(`Asset "${newName}" updated successfully!`);
  };

  // ── Delete Asset ──
  const handleDeleteAsset = (asset: Asset) => {
    if (confirm(`Are you sure you want to delete ${asset.name} (${asset.serial_no || asset.asset_code})?`)) {
      const updated = assetList.filter(a => a.id !== asset.id);
      updateAssets(updated);
      setActiveMenuAssetId(null);
      onShowToast?.(`Asset removed from inventory.`);
    }
  };

  // ── Quick Summary Statistics ──
  const stats = useMemo(() => {
    const totalAssets = assetList.reduce((acc, a) => acc + (a.total_qty || 1), 0);
    const availableUnits = assetList.reduce((acc, a) => acc + (a.available_qty ?? 0), 0);
    const assignedUnits = Math.max(0, totalAssets - availableUnits);
    const totalValue = assetList.reduce((acc, a) => acc + ((a.price || 0) * (a.total_qty || 1)), 0);
    return { totalAssets, availableUnits, assignedUnits, totalValue };
  }, [assetList]);

  // ── Export CSV ──
  const handleExportCSV = () => {
    const headers = ['Serial No', 'Asset Name', 'Price (INR)', 'Asset Type', 'Total Qty', 'Available Qty', 'Ownership', 'Assigned To', 'Location'];
    const rows = filteredAssets.map(a => [
      `"${a.serial_no || a.asset_code}"`,
      `"${a.name}"`,
      a.price || 0,
      `"${a.asset_type || a.category}"`,
      a.total_qty || 1,
      a.available_qty ?? 0,
      `"${a.ownership || 'Company Owned'}"`,
      `"${a.assigned_to || 'Yard'}"`,
      `"${a.current_project_name || 'Central Yard'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Asset_Management_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast?.('Exported asset inventory to CSV!');
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
    <div className={`flex-1 flex flex-col min-w-0 bg-white min-h-screen transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-white ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
    }`}>
      
      {/* ── TOP HEADER (Matching Reference Image Exactly) ── */}
      <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4 bg-white sticky top-0 z-20">
        <h1 className="text-[21px] font-bold text-[#262626] font-heading tracking-tight">
          Asset Management
        </h1>

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
          <UserProfileDropdown showBell={true} onShowToast={onShowToast} />
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER (Matching Reference Image) ── */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-4 flex-1">
        
        {/* ── ACTION CONTROLS BAR (Search Bar on Left, + New Asset on Right as in Reference Image) ── */}
        <div className="flex items-center justify-between gap-4">
          
          {/* Search Bar matching Image */}
          <div className="relative w-64 sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search"
              className="w-full pl-3.5 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500 shadow-2xs transition"
            />
            {searchQuery ? (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>

          {/* Right Action: + New Asset Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Asset</span>
            </button>
          </div>
        </div>

        {/* ── THE ASSET TABLE (Exact Layout & Structure from Image 2) ── */}
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-[#FAFBFD] text-slate-600 font-medium text-xs select-none">
                  <th className="py-3 px-4 w-40">Serial No.</th>
                  <th className="py-3 px-4 min-w-[200px]">Asset Name</th>
                  <th className="py-3 px-4 w-36">Asset Type</th>
                  <th className="py-3 px-4 w-28 text-center">Total Qty</th>
                  <th className="py-3 px-4 w-32 text-center">Available Qty</th>
                  <th className="py-3 px-4 w-36 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <Package className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                        <p className="text-sm font-semibold text-slate-600">No assets found</p>
                        <p className="text-xs text-slate-400">
                          {searchQuery 
                            ? `No records match "${searchQuery}". Clear your search query.` 
                            : 'Click "+ New Asset" above to add equipment or devices to this list.'}
                        </p>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="mt-2 text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                          >
                            Clear Search Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const isAvailable = (asset.available_qty ?? 0) > 0;
                    const isMenuOpen = activeMenuAssetId === asset.id;

                    return (
                      <tr 
                        key={asset.id} 
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* 1. Serial No. */}
                        <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {asset.serial_no || asset.asset_code}
                        </td>

                        {/* 2. Asset Name with Price Below */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 text-xs">
                              {asset.name}
                            </span>
                            {asset.description && (
                              <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {asset.description}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400 tracking-tight mt-0.5">
                              ₹ {asset.price !== undefined ? asset.price.toLocaleString('en-IN') : 0}
                            </span>
                          </div>
                        </td>

                        {/* 3. Asset Type */}
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {asset.asset_type || asset.category}
                        </td>

                        {/* 4. Total Qty */}
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                          {asset.total_qty || 1}
                        </td>

                        {/* 5. Available Qty */}
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                          <span className={`inline-block tracking-tight ${isAvailable ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
                            {asset.available_qty ?? 0}
                          </span>
                        </td>

                        {/* 6. Actions (Assign Button + Three Dots Menu) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Assign Button (Always Active to View Allocations or Handover) */}
                            <button
                              type="button"
                              onClick={() => handleOpenAssign(asset)}
                              className="px-3.5 py-1 text-xs font-semibold rounded-lg bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] hover:bg-[#D4EDDA] active:scale-95 transition cursor-pointer shadow-2xs flex items-center gap-1"
                              title="View allocation breakdown & handover units"
                            >
                              Assign
                            </button>

                            {/* Three Dots More Menu */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuAssetId(isMenuOpen ? null : asset.id);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="More options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu Card */}
                              {isMenuOpen && (
                                <div 
                                  ref={menuRef}
                                  className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 text-xs text-slate-700 z-30 animate-in fade-in zoom-in-95 duration-100"
                                >

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(asset)}
                                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Edit Asset</span>
                                  </button>

                                  <div className="my-1 border-t border-slate-100" />

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAsset(asset)}
                                    className="w-full text-left px-3.5 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer font-medium"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Asset</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Count */}
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredAssets.length}</strong> of <strong className="text-slate-800">{assetList.length}</strong> total assets
            </span>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Green Assign = Available</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                <span>Grey Assign = Fully Allocated</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: ADD NEW ASSET
      ══════════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Asset</h3>
                  <p className="text-[11px] text-slate-500">Register device, plant, or machinery into company inventory</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAsset} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Serial No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSerialNo}
                    onChange={(e) => setNewSerialNo(e.target.value)}
                    placeholder="e.g. BA026-26"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs tracking-tight font-medium focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Asset Type / Category *
                  </label>
                  <CustomSelect
                    value={newType}
                    onChange={(val) => setNewType(val)}
                    options={ASSET_TYPES}
                    size="md"
                    variant="brand"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Asset Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Laptop - Lenovo ThinkPad T14 or Phone - Samsung Galaxy"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Value / Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs tracking-tight focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Qty *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newTotalQty}
                    onChange={(e) => {
                      setNewTotalQty(e.target.value);
                      setNewAvailableQty(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs tracking-tight font-medium focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Available Qty *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={newTotalQty}
                    value={newAvailableQty}
                    onChange={(e) => setNewAvailableQty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs tracking-tight font-medium focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Enter asset description, specifications, or notes..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-red-600 resize-none transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm cursor-pointer"
                >
                  Create Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: ASSIGN ASSET (TO PROJECT SITE OR STAFF MEMBER)
      ══════════════════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: ASSIGN ASSET & DETAILED ALLOCATION BREAKDOWN
      ══════════════════════════════════════════════════════════════════════ */}
      {isAssignModalOpen && selectedAssetForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Asset Allocation & Handover Details
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedAssetForAction.name} • <span className="tracking-tight">{selectedAssetForAction.serial_no || selectedAssetForAction.asset_code}</span> • {selectedAssetForAction.asset_type || selectedAssetForAction.category}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              
              {/* Overall Quantity Summary Bar */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block tracking-wider">
                    Total Quantity
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {selectedAssetForAction.total_qty || 1} <span className="text-[11px] font-normal text-slate-400">units</span>
                  </span>
                </div>

                <div className="text-center sm:text-left border-x border-slate-200/80 px-2 sm:px-3">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block tracking-wider">
                    Currently Assigned
                  </span>
                  <span className="text-base font-bold text-blue-600">
                    {((selectedAssetForAction.total_qty || 1) - (selectedAssetForAction.available_qty ?? 0))} <span className="text-[11px] font-normal text-slate-400">units</span>
                  </span>
                </div>

                <div className="text-center sm:text-left">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block tracking-wider">
                    Available in Yard
                  </span>
                  <span className={`text-base font-bold ${(selectedAssetForAction.available_qty ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {selectedAssetForAction.available_qty ?? 0} <span className="text-[11px] font-normal text-slate-400">units</span>
                  </span>
                </div>
              </div>

              {/* SECTION 1: Active Handover Records (Who all have received it & quantities) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Allocations & Handover Breakdown</span>
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      {(selectedAssetForAction.allocations || []).length}
                    </span>
                  </h4>
                </div>

                {(!selectedAssetForAction.allocations || selectedAssetForAction.allocations.length === 0) ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 bg-slate-50/50">
                    <p className="font-medium text-slate-600">No active assignments</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      All {selectedAssetForAction.total_qty || 1} unit(s) are currently in central inventory yard.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-100">
                    <div className="bg-slate-50/80 px-3 py-2 text-[11px] font-semibold text-slate-500 grid grid-cols-12 gap-2">
                      <div className="col-span-3">Staff Name</div>
                      <div className="col-span-2">Role</div>
                      <div className="col-span-1 text-center">Quantity</div>
                      <div className="col-span-2">Handover Date</div>
                      <div className="col-span-2">Return Date</div>
                      <div className="col-span-2 text-right">Action</div>
                    </div>
                    {selectedAssetForAction.allocations.map((alloc) => (
                      <div key={alloc.id} className="px-3 py-2.5 grid grid-cols-12 gap-2 items-center hover:bg-slate-50/60 transition">
                        <div className="col-span-3">
                          <p className="font-semibold text-slate-900 leading-tight">
                            {alloc.staff_name || alloc.assigned_to}
                          </p>
                          {alloc.remarks && (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {alloc.remarks}
                            </p>
                          )}
                          {alloc.serial_numbers && alloc.serial_numbers.length > 0 && (
                            <span className="text-[9px] tracking-tight bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              S/N: {alloc.serial_numbers.join(', ')}
                            </span>
                          )}
                        </div>

                        <div className="col-span-2">
                          {alloc.staff_role ? (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                              {alloc.staff_role}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </div>

                        <div className="col-span-1 text-center font-bold tracking-tight text-slate-800 text-[11px]">
                          {alloc.quantity} {alloc.quantity === 1 ? 'unit' : 'units'}
                        </div>

                        <div className="col-span-2 text-slate-600 text-[11px]">
                          {alloc.assigned_date}
                        </div>

                        <div className="col-span-2 text-slate-600 text-[11px]">
                          {alloc.return_date ? (
                            <span className="font-medium text-slate-700">{alloc.return_date}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </div>

                        <div className="col-span-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleReturnAllocation(alloc.id)}
                            className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-[10px] border border-amber-200 transition cursor-pointer flex items-center gap-1 ml-auto"
                            title="Return this unit to yard inventory"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Return</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: Issue New Handover Form */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Issue New Assignment / Handover</span>
                  </h4>
                  {(selectedAssetForAction.available_qty ?? 0) > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                      {selectedAssetForAction.available_qty} unit(s) available to assign
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">
                      0 units available
                    </span>
                  )}
                </div>

                {(selectedAssetForAction.available_qty ?? 0) <= 0 ? (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      All units are currently assigned. Click <strong>Return</strong> on an allocation above to return units back to yard before assigning.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveAssign} className="space-y-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80">
                    {/* Handover Target: Staff Details */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Staff Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={assignStaffName}
                          onChange={(e) => setAssignStaffName(e.target.value)}
                          placeholder="e.g. Ravi Kumar"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Role / Designation *
                        </label>
                        <input
                          type="text"
                          required
                          value={assignStaffRole}
                          onChange={(e) => setAssignStaffRole(e.target.value)}
                          placeholder="e.g. Site Supervisor"
                          list="staff-role-options"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                        <datalist id="staff-role-options">
                          <option value="Site Supervisor" />
                          <option value="Project Manager" />
                          <option value="Senior Architect" />
                          <option value="Civil Engineer" />
                          <option value="Safety Officer" />
                          <option value="Electrical Engineer" />
                          <option value="Foreman" />
                          <option value="Quantity Surveyor" />
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Quantity to Handover *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max={selectedAssetForAction.available_qty || 1}
                          value={assignQty}
                          onChange={(e) => setAssignQty(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs tracking-tight font-medium focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Handover Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={assignDate}
                          onChange={(e) => setAssignDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Return Date
                        </label>
                        <input
                          type="date"
                          value={assignReturnDate}
                          min={assignDate}
                          onChange={(e) => setAssignReturnDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Remarks / Condition Note
                      </label>
                      <input
                        type="text"
                        value={assignRemarks}
                        onChange={(e) => setAssignRemarks(e.target.value)}
                        placeholder="e.g. Device issued in good condition with accessories"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm cursor-pointer"
                      >
                        Confirm Handover
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 flex justify-end border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: EDIT ASSET DETAILS
      ══════════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && selectedAssetForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Asset</h3>
                  <p className="text-[11px] text-slate-500">Update specifications and quantities</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serial No. *</label>
                  <input
                    type="text"
                    required
                    value={newSerialNo}
                    onChange={(e) => setNewSerialNo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs tracking-tight font-medium focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asset Type *</label>
                  <CustomSelect
                    value={newType}
                    onChange={(val) => setNewType(val)}
                    options={ASSET_TYPES}
                    size="md"
                    variant="brand"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price / Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs tracking-tight focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Qty *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newTotalQty}
                    onChange={(e) => setNewTotalQty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs tracking-tight focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Available Qty *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={newTotalQty}
                    value={newAvailableQty}
                    onChange={(e) => setNewAvailableQty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs tracking-tight focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Enter asset description, specifications, or notes..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-red-600 resize-none transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm cursor-pointer flex items-center gap-1.5"
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

export default EquipmentView;
