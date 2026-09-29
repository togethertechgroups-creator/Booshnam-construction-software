import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical, 
  X, 
  Trash2, 
  Edit3, 
  UserCheck, 
  Menu,
  CheckCircle2,
  RotateCcw,
  User,
  Wrench,
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Package,
  Layers,
  Calendar,
  Gift
} from 'lucide-react';
import { Asset, Project } from '../types';
import { MOCK_ASSETS } from '../lib/mockData';
import { UserProfileDropdown } from '../components/UserProfileDropdown';

interface EquipmentViewProps {
  project: Project | null;
  assets?: Asset[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const STORAGE_KEY = 'booshnam_assets_inventory_v1';

const ASSET_TYPES = [
  'Phone',
  'Laptop',
  'Desktop / Workstation',
  'Tablet',
  'Machinery',
  'Vehicle',
  'Power Tools',
  'Survey Equipment',
  'Safety Gear',
  'Office & Furniture',
  'Other'
];

export const EquipmentView: React.FC<EquipmentViewProps> = ({ 
  project, 
  assets: propAssets,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  // ----------------------------------------------------
  // Persistent State
  // ----------------------------------------------------
  const [assetList, setAssetList] = useState<Asset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to read assets from localStorage', e);
    }
    return [
      {
        id: 'ast-ba6-6',
        asset_code: 'BA6-6',
        serial_number: 'BA6-6',
        code_prefix: 'BA6',
        code_number: '6',
        name: 'Phone',
        category: 'Phone',
        asset_type: 'Phone',
        ownership: 'Company Owned',
        hourly_cost_rate: 0,
        unit_rate: 0,
        total_qty: 1,
        available_qty: 0,
        in_repair_qty: 0,
        damaged_qty: 0,
        status: 'Assigned',
        meter_hours: 0,
        description: 'Field mobile device for site inspections',
        current_project_name: 'OVERHEADS',
        assigned_to: 'Department Head Ashwini',
        assigned_date: '2026-04-10',
        timeline: [
          {
            id: 'tl-1',
            date: '10 Apr 26',
            time: '11:49 AM',
            action: 'Assigned 1 Qty',
            project: 'OVERHEADS',
            assigned_to: 'Department Head Ashwini'
          }
        ]
      },
      {
        id: 'ast-ba021-21',
        asset_code: 'BA021-21',
        serial_number: 'BA021-21',
        code_prefix: 'BA021',
        code_number: '21',
        name: 'Laptop',
        category: 'Laptop',
        asset_type: 'Laptop',
        ownership: 'Company Owned',
        hourly_cost_rate: 0,
        unit_rate: 0,
        total_qty: 1,
        available_qty: 0,
        in_repair_qty: 0,
        damaged_qty: 0,
        status: 'Assigned',
        meter_hours: 0,
        description: 'Engineer laptop',
        current_project_name: 'Main Office',
        assigned_to: 'Project Manager Rajesh',
        assigned_date: '2026-04-08',
        timeline: [
          {
            id: 'tl-2',
            date: '08 Apr 26',
            time: '10:15 AM',
            action: 'Assigned 1 Qty',
            project: 'Main Office',
            assigned_to: 'Project Manager Rajesh'
          }
        ]
      },
      {
        id: 'ast-ba003-3',
        asset_code: 'BA003-3',
        serial_number: 'BA003-3',
        code_prefix: 'BA003',
        code_number: '3',
        name: 'Laptop',
        category: 'Laptop',
        asset_type: 'Laptop',
        ownership: 'Company Owned',
        hourly_cost_rate: 0,
        unit_rate: 0,
        total_qty: 1,
        available_qty: 0,
        in_repair_qty: 0,
        damaged_qty: 0,
        status: 'Assigned',
        meter_hours: 0,
        description: 'Billing workstation laptop',
        current_project_name: 'Site Office',
        assigned_to: 'Accountant Priya',
        assigned_date: '2026-04-05',
        timeline: [
          {
            id: 'tl-3',
            date: '05 Apr 26',
            time: '02:30 PM',
            action: 'Assigned 1 Qty',
            project: 'Site Office',
            assigned_to: 'Accountant Priya'
          }
        ]
      }
    ];
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assetList));
    } catch (e) {
      console.error('Failed to save assets to localStorage', e);
    }
  }, [assetList]);

  // ----------------------------------------------------
  // UI & Search State
  // ----------------------------------------------------
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Active Detail Asset ID (when set, displays the split Master-Detail view from the screenshot)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // ----------------------------------------------------
  // Slide Drawer State (Image 2: New / Edit Asset)
  // ----------------------------------------------------
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  // Form Fields for New/Edit Asset
  const [assetCodePrefix, setAssetCodePrefix] = useState('BA6');
  const [assetCodeNumber, setAssetCodeNumber] = useState('7');
  const [assetName, setAssetName] = useState('');
  const [assetUnitRate, setAssetUnitRate] = useState('0');
  const [totalCount, setTotalCount] = useState('1');
  const [assetType, setAssetType] = useState('Phone');
  const [description, setDescription] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // Assign Drawer State
  // ----------------------------------------------------
  const [isAssignDrawerOpen, setIsAssignDrawerOpen] = useState(false);
  const [assigningAsset, setAssigningAsset] = useState<Asset | null>(null);
  const [assignedToPerson, setAssignedToPerson] = useState('');
  const [assignedProject, setAssignedProject] = useState('');
  const [assignedQty, setAssignedQty] = useState('1');
  const [assignedDate, setAssignedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assignedRemarks, setAssignedRemarks] = useState('');

  // ----------------------------------------------------
  // Transfer Drawer State
  // ----------------------------------------------------
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = useState(false);
  const [transferToPerson, setTransferToPerson] = useState('');
  const [transferProject, setTransferProject] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);

  // ----------------------------------------------------
  // Delete Alert State
  // ----------------------------------------------------
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  // Close 3-dots dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.asset-actions-menu')) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Compute next code number based on prefix
  const getNextCodeNumber = (prefix: string) => {
    const matchingNumbers = assetList
      .filter(a => (a.code_prefix || a.asset_code?.split('-')[0]) === prefix)
      .map(a => {
        const numPart = a.code_number || a.asset_code?.split('-')[1];
        return parseInt(numPart || '0', 10);
      })
      .filter(n => !isNaN(n));

    if (matchingNumbers.length > 0) {
      return (Math.max(...matchingNumbers) + 1).toString();
    }
    return '7';
  };

  // Open Drawer in Create Mode
  const handleOpenCreateDrawer = () => {
    setDrawerMode('create');
    setEditingAssetId(null);
    setAssetCodePrefix('BA6');
    setAssetCodeNumber(getNextCodeNumber('BA6'));
    setAssetName('');
    setAssetUnitRate('0');
    setTotalCount('1');
    setAssetType('Phone');
    setDescription('');
    setPreviewImage(null);
    setFormError(null);
    setIsDrawerOpen(true);
  };

  // Open Drawer in Edit Mode
  const handleOpenEditDrawer = (asset: Asset) => {
    setDrawerMode('edit');
    setEditingAssetId(asset.id);
    setAssetCodePrefix(asset.code_prefix || asset.asset_code?.split('-')[0] || 'BA6');
    setAssetCodeNumber(asset.code_number || asset.asset_code?.split('-')[1] || '1');
    setAssetName(asset.name || '');
    setAssetUnitRate(asset.unit_rate !== undefined ? asset.unit_rate.toString() : '0');
    setTotalCount(asset.total_qty !== undefined ? asset.total_qty.toString() : '1');
    setAssetType(asset.asset_type || asset.category || 'Phone');
    setDescription(asset.description || '');
    setPreviewImage(asset.image_url || null);
    setFormError(null);
    setIsDrawerOpen(true);
    setOpenMenuId(null);
  };

  // Image Upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Save Asset Handler
  const handleSaveAsset = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!assetName.trim()) {
      setFormError('Asset Name is required');
      return;
    }

    const prefix = assetCodePrefix.trim() || 'BA6';
    const num = assetCodeNumber.trim() || '1';
    const serial = `${prefix}-${num}`;
    const totCount = Math.max(1, parseInt(totalCount, 10) || 1);
    const unitRateNum = Math.max(0, parseFloat(assetUnitRate) || 0);

    if (drawerMode === 'create') {
      const newAsset: Asset = {
        id: `ast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        asset_code: serial,
        serial_number: serial,
        code_prefix: prefix,
        code_number: num,
        name: assetName.trim(),
        category: assetType,
        asset_type: assetType,
        ownership: 'Company Owned',
        hourly_cost_rate: 0,
        unit_rate: unitRateNum,
        total_qty: totCount,
        available_qty: 0,
        in_repair_qty: 0,
        damaged_qty: 0,
        status: 'Assigned',
        meter_hours: 0,
        description: description.trim(),
        image_url: previewImage || undefined,
        current_project_name: project?.name || 'Yard',
        timeline: [
          {
            id: `tl-${Date.now()}`,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            action: 'Asset Created',
            project: project?.name || 'Yard'
          }
        ]
      };

      setAssetList(prev => [newAsset, ...prev]);
      triggerToast(`Asset ${serial} added successfully!`);
    } else if (editingAssetId) {
      setAssetList(prev => prev.map(item => {
        if (item.id === editingAssetId) {
          return {
            ...item,
            asset_code: serial,
            serial_number: serial,
            code_prefix: prefix,
            code_number: num,
            name: assetName.trim(),
            category: assetType,
            asset_type: assetType,
            unit_rate: unitRateNum,
            total_qty: totCount,
            description: description.trim(),
            image_url: previewImage || item.image_url
          };
        }
        return item;
      }));
      triggerToast(`Asset ${serial} updated successfully!`);
    }

    setIsDrawerOpen(false);
  };

  // Open Delete Confirmation Alert
  const handleDeleteAsset = (id: string, name: string) => {
    setOpenMenuId(null);
    setAssetToDelete({ id, name });
  };

  // Confirm Asset Deletion
  const handleConfirmDeleteAsset = () => {
    if (!assetToDelete) return;
    setAssetList(prev => prev.filter(a => a.id !== assetToDelete.id));
    if (selectedAssetId === assetToDelete.id) {
      setSelectedAssetId(null);
    }
    triggerToast(`Asset "${assetToDelete.name}" deleted.`);
    setAssetToDelete(null);
  };

  // Open Assign Drawer
  const handleOpenAssignDrawer = (asset: Asset) => {
    setAssigningAsset(asset);
    setAssignedToPerson(asset.assigned_to || '');
    setAssignedProject(asset.current_project_name || project?.name || 'Site Office');
    setAssignedQty('1');
    setAssignedDate(asset.assigned_date || new Date().toISOString().split('T')[0]);
    setAssignedRemarks('');
    setIsAssignDrawerOpen(true);
    setOpenMenuId(null);
  };

  // Confirm Assignment
  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAsset) return;

    if (!assignedToPerson.trim()) {
      triggerToast('Please specify whom this asset is assigned to.');
      return;
    }

    const qty = parseInt(assignedQty, 10) || 1;
    const currentAvail = assigningAsset.available_qty ?? 0;
    const newAvail = Math.max(0, currentAvail > 0 ? currentAvail - qty : 0);

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newTimelineEvent = {
      id: `tl-${Date.now()}`,
      date: dateFormatted,
      time: timeFormatted,
      action: `Assigned ${qty} Qty`,
      project: assignedProject.trim() || 'Site Office',
      assigned_to: assignedToPerson.trim()
    };

    setAssetList(prev => prev.map(a => {
      if (a.id === assigningAsset.id) {
        return {
          ...a,
          assigned_to: assignedToPerson.trim(),
          current_project_name: assignedProject.trim() || 'Site Office',
          assigned_date: assignedDate,
          available_qty: newAvail,
          status: 'Assigned',
          timeline: [newTimelineEvent, ...(a.timeline || [])]
        };
      }
      return a;
    }));

    setIsAssignDrawerOpen(false);
    triggerToast(`Assigned ${assigningAsset.name} to ${assignedToPerson.trim()}.`);
  };

  // Return Asset / Mark Available
  const handleReturnAsset = (asset: Asset) => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newTimelineEvent = {
      id: `tl-${Date.now()}`,
      date: dateFormatted,
      time: timeFormatted,
      action: 'Returned 1 Qty',
      project: 'Inventory Yard'
    };

    setAssetList(prev => prev.map(a => {
      if (a.id === asset.id) {
        const newAvail = (a.available_qty ?? 0) + 1;
        const allAvailable = newAvail >= (a.total_qty ?? 1);
        return {
          ...a,
          available_qty: newAvail,
          status: allAvailable ? 'Available' : a.status,
          assigned_to: allAvailable ? undefined : a.assigned_to,
          timeline: [newTimelineEvent, ...(a.timeline || [])]
        };
      }
      return a;
    }));

    triggerToast(`Returned 1 Qty of ${asset.name} to available inventory.`);
  };

  // Open Transfer Drawer
  const handleOpenTransferDrawer = (asset: Asset) => {
    setAssigningAsset(asset);
    setTransferToPerson('');
    setTransferProject(asset.current_project_name || 'Main Site');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setIsTransferDrawerOpen(true);
  };

  // Confirm Transfer
  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAsset || !transferToPerson.trim()) {
      triggerToast('Please provide the new assignee name.');
      return;
    }

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newTimelineEvent = {
      id: `tl-${Date.now()}`,
      date: dateFormatted,
      time: timeFormatted,
      action: `Transferred 1 Qty to ${transferToPerson.trim()}`,
      project: transferProject.trim() || 'Site Office',
      assigned_to: transferToPerson.trim()
    };

    setAssetList(prev => prev.map(a => {
      if (a.id === assigningAsset.id) {
        return {
          ...a,
          assigned_to: transferToPerson.trim(),
          current_project_name: transferProject.trim() || 'Site Office',
          timeline: [newTimelineEvent, ...(a.timeline || [])]
        };
      }
      return a;
    }));

    setIsTransferDrawerOpen(false);
    triggerToast(`Transferred asset to ${transferToPerson.trim()}.`);
  };

  // Filtered List
  const filteredAssets = assetList.filter(asset => {
    const q = searchTerm.toLowerCase();
    const serial = (asset.serial_number || asset.asset_code || '').toLowerCase();
    const name = (asset.name || '').toLowerCase();
    const type = (asset.asset_type || asset.category || '').toLowerCase();
    const desc = (asset.description || '').toLowerCase();
    return serial.includes(q) || name.includes(q) || type.includes(q) || desc.includes(q);
  });

  // Currently viewed detail asset (when in Split Master-Detail layout)
  const activeDetailAsset = selectedAssetId 
    ? assetList.find(a => a.id === selectedAssetId) || assetList[0] 
    : null;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white min-h-screen relative font-sans">
      {/* Toast Alert */}
      {showToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{showToast}</span>
        </div>
      )}

      {/* ==================================================== */}
      {/* CASE A: SPLIT MASTER-DETAIL VIEW (Selected Asset Mode) */}
      {/* ==================================================== */}
      {activeDetailAsset ? (
        <div className="flex-1 flex flex-col md:flex-row min-w-0 min-h-screen">
          {/* -------------------------------------------------- */}
          {/* LEFT MASTER COLUMN (List of Assets) */}
          {/* -------------------------------------------------- */}
          <div className="w-full md:w-[320px] lg:w-[360px] border-r border-slate-200 flex flex-col bg-white shrink-0">
            {/* Top Bar Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Asset Management
              </h1>
            </div>

            {/* Search + New Asset Row */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ borderRadius: '10px' }}
                  className="w-full pl-3.5 pr-8 py-2 text-xs text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all placeholder:text-slate-400"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={handleOpenCreateDrawer}
                style={{ borderRadius: '8px' }}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Asset</span>
              </button>
            </div>

            {/* Master List of Assets */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredAssets.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No assets found
                </div>
              ) : (
                filteredAssets.map(asset => {
                  const isSelected = asset.id === activeDetailAsset.id;
                  const unitRate = asset.unit_rate ?? asset.hourly_cost_rate ?? 0;

                  return (
                    <div
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`px-5 py-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-red-50/50 border-l-4 border-l-red-600' 
                          : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className={`text-sm font-bold truncate ${isSelected ? 'text-red-700' : 'text-slate-900'}`}>
                          {asset.name}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          ₹ {unitRate}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAssetId(asset.id);
                        }}
                        style={{ borderRadius: '9999px' }}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white'
                        }`}
                      >
                        Assign
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* RIGHT DETAIL PANEL (The Exact Assign Workspace) */}
          {/* -------------------------------------------------- */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Top Header of Detail Panel */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={() => setSelectedAssetId(null)}
                  className="p-1.5 -ml-1 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Back to All Assets"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
                </button>

                {/* Asset Icon Box */}
                <div 
                  style={{ borderRadius: '12px' }}
                  className="w-11 h-11 bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0 overflow-hidden"
                >
                  {activeDetailAsset.image_url ? (
                    <img 
                      src={activeDetailAsset.image_url} 
                      alt={activeDetailAsset.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Package className="w-6 h-6 stroke-[1.8]" />
                  )}
                </div>

                {/* Asset Title & Meta */}
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {activeDetailAsset.name}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                    {activeDetailAsset.serial_number || activeDetailAsset.asset_code}, {activeDetailAsset.asset_type || activeDetailAsset.category} | ₹ {activeDetailAsset.unit_rate ?? 0} | Total Count: {activeDetailAsset.total_qty ?? 1}
                  </p>
                </div>
              </div>

              {/* 3-dots Menu */}
              <div className="relative asset-actions-menu">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === activeDetailAsset.id ? null : activeDetailAsset.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {openMenuId === activeDetailAsset.id && (
                  <div 
                    style={{ borderRadius: '8px' }}
                    className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <button
                      onClick={() => handleOpenEditDrawer(activeDetailAsset)}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-red-600" />
                      <span>Edit Asset</span>
                    </button>
                    <button
                      onClick={() => handleReturnAsset(activeDetailAsset)}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                      <span>Mark Available</span>
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button
                      onClick={() => handleDeleteAsset(activeDetailAsset.id, activeDetailAsset.name)}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Asset</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Horizontal KPI Status Bar (Available, Assigned, In Repair, Damaged, Edit) */}
            <div className="px-8 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-8 sm:gap-14">
                {/* 1. Available */}
                <div>
                  <div className="text-xs text-slate-500 font-medium">Available</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {activeDetailAsset.available_qty ?? 0}
                  </div>
                </div>

                {/* 2. Assigned */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Assigned</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {Math.max(0, (activeDetailAsset.total_qty ?? 1) - (activeDetailAsset.available_qty ?? 0))}
                    </div>
                  </div>
                </div>

                {/* 3. In Repair */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Wrench className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">In Repair</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {activeDetailAsset.in_repair_qty ?? 0}
                    </div>
                  </div>
                </div>

                {/* 4. Damaged */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Damaged</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {activeDetailAsset.damaged_qty ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Icon */}
              <button
                onClick={() => handleOpenEditDrawer(activeDetailAsset)}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Asset Details"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            {/* Detail Body (Assignment Card + Timeline) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {/* Assignment Card */}
              <div 
                style={{ borderRadius: '12px' }}
                className="bg-white border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Card Header: Assignee Info */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <button 
                      onClick={() => handleOpenAssignDrawer(activeDetailAsset)}
                      className="text-sm font-bold text-slate-900 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>{activeDetailAsset.assigned_to || 'Department Head Ashwini'}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div 
                      style={{ borderRadius: '8px' }}
                      className="px-3 py-1 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
                    >
                      Current Assigned Qty: {Math.max(0, (activeDetailAsset.total_qty ?? 1) - (activeDetailAsset.available_qty ?? 0))}
                    </div>

                    <button
                      onClick={() => handleOpenAssignDrawer(activeDetailAsset)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                      title="Assignment details"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Body: Timeline */}
                <div className="px-6 py-5">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Asset Timeline
                  </h4>

                  <div className="space-y-4">
                    {(activeDetailAsset.timeline && activeDetailAsset.timeline.length > 0) ? (
                      activeDetailAsset.timeline.map((item, idx) => (
                        <div key={item.id || idx} className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            {/* Date & Time */}
                            <div className="text-left w-20 shrink-0">
                              <div className="text-xs font-bold text-slate-800">{item.date}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{item.time}</div>
                            </div>

                            {/* Timeline Dashed Line & Content */}
                            <div className="relative pl-6 border-l-2 border-dashed border-slate-200 pb-2">
                              <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-red-600" />
                              <div className="text-xs font-bold text-slate-900">{item.action}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                Project : <span className="font-semibold text-slate-700">{item.project}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons for this assignment entry */}
                          {idx === 0 && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleReturnAsset(activeDetailAsset)}
                                style={{ borderRadius: '8px' }}
                                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                              >
                                Return
                              </button>
                              <button
                                onClick={() => handleOpenTransferDrawer(activeDetailAsset)}
                                style={{ borderRadius: '8px' }}
                                className="px-4 py-1.5 border border-red-600 text-red-600 hover:bg-red-50 active:scale-[0.98] text-xs font-bold transition-all cursor-pointer"
                              >
                                Transfer
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="text-left w-20 shrink-0">
                            <div className="text-xs font-bold text-slate-800">10 Apr 26</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">11:49 AM</div>
                          </div>
                          <div className="relative pl-6 border-l-2 border-dashed border-slate-200 pb-2">
                            <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-red-600" />
                            <div className="text-xs font-bold text-slate-900">Assigned 1 Qty</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                              Project : <span className="font-semibold text-slate-700">OVERHEADS</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleReturnAsset(activeDetailAsset)}
                            style={{ borderRadius: '8px' }}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            Return
                          </button>
                          <button
                            onClick={() => handleOpenTransferDrawer(activeDetailAsset)}
                            style={{ borderRadius: '8px' }}
                            className="px-4 py-1.5 border border-red-600 text-red-600 hover:bg-red-50 active:scale-[0.98] text-xs font-bold transition-all cursor-pointer"
                          >
                            Transfer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Floating Assign Button Bar */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-center sticky bottom-0">
              <button
                onClick={() => handleOpenAssignDrawer(activeDetailAsset)}
                style={{ borderRadius: '8px' }}
                className="w-full max-w-sm py-2.5 px-6 bg-slate-100 hover:bg-red-600 hover:text-white text-slate-600 font-semibold text-xs border border-slate-200 hover:border-red-600 shadow-xs transition-all cursor-pointer text-center"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ==================================================== */
        /* CASE B: FULL TABLE VIEW (Standard Mode)              */
        /* ==================================================== */
        <>
          {/* Top Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white sticky top-0 z-20">
            <div className="flex items-center gap-3">
              {onToggleSidebar && (
                <button 
                  onClick={onToggleSidebar}
                  className="p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden"
                  title="Toggle Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Asset Management
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <UserProfileDropdown showBell={true} />
            </div>
          </div>

          {/* Search + New Asset Filter Bar */}
          <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ borderRadius: '10px' }}
                className="w-full pl-4 pr-10 py-2.5 text-xs text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={handleOpenCreateDrawer}
              style={{ borderRadius: '8px' }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Asset</span>
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto px-6 pb-12">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#f8fafc] border-y border-slate-200 text-slate-500 text-xs">
                  <th className="py-3 px-6 font-semibold text-slate-500">Serial No.</th>
                  <th className="py-3 px-6 font-semibold text-slate-500">Asset Name</th>
                  <th className="py-3 px-6 font-semibold text-slate-500">Asset Type</th>
                  <th className="py-3 px-6 font-semibold text-slate-500 text-center">Total Qty</th>
                  <th className="py-3 px-6 font-semibold text-slate-500 text-center">Available Qty</th>
                  <th className="py-3 px-6 font-semibold text-slate-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      No assets found matching "{searchTerm}". Click <b>New Asset</b> to add one.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const serial = asset.serial_number || asset.asset_code;
                    const unitRate = asset.unit_rate ?? asset.hourly_cost_rate ?? 0;
                    const type = asset.asset_type || asset.category || 'Asset';
                    const total = asset.total_qty ?? 1;
                    const available = asset.available_qty ?? 0;

                    return (
                      <tr 
                        key={asset.id} 
                        onClick={() => setSelectedAssetId(asset.id)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6 font-semibold text-slate-900 text-sm">
                          {serial}
                        </td>

                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 text-sm group-hover:text-red-600 transition-colors">
                            {asset.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 font-medium">
                            ₹ {unitRate}
                          </div>
                        </td>

                        <td className="py-4 px-6 font-medium text-slate-700 text-sm">
                          {type}
                        </td>

                        <td className="py-4 px-6 text-center font-medium text-slate-800 text-sm">
                          {total}
                        </td>

                        <td className="py-4 px-6 text-center font-medium text-slate-800 text-sm">
                          {available}
                        </td>

                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => setSelectedAssetId(asset.id)}
                              style={{ borderRadius: '9999px' }}
                              className="px-4 py-1 text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                            >
                              Assign
                            </button>

                            <div className="relative asset-actions-menu">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === asset.id ? null : asset.id);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                                title="More actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openMenuId === asset.id && (
                                <div 
                                  style={{ borderRadius: '8px' }}
                                  className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <button
                                    onClick={() => setSelectedAssetId(asset.id)}
                                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 text-red-600" />
                                    <span>Assign Asset</span>
                                  </button>
                                  <button
                                    onClick={() => handleReturnAsset(asset)}
                                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                                    <span>Mark Available</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditDrawer(asset)}
                                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-red-600" />
                                    <span>Edit Asset</span>
                                  </button>
                                  <div className="h-px bg-slate-100 my-1" />
                                  <button
                                    onClick={() => handleDeleteAsset(asset.id, asset.name)}
                                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
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
        </>
      )}

      {/* ---------------------------------------------------- */}
      {/* RIGHT-SIDE SLIDE DRAWER: NEW ASSETS / EDIT ASSET */}
      {/* ---------------------------------------------------- */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
          />

          {/* Drawer Content */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-[500px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 -ml-1 text-slate-700 hover:text-red-600 transition-colors cursor-pointer"
                    title="Back"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <h2 className="text-base font-bold text-slate-800 tracking-wide uppercase">
                    {drawerMode === 'create' ? 'NEW ASSETS' : 'EDIT ASSET'}
                  </h2>
                </div>

                <button
                  onClick={handleSaveAsset}
                  style={{ borderRadius: '8px' }}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>

              {/* Red Horizontal Accent Line */}
              <div className="h-[3.5px] bg-red-600 w-full" />

              {/* Drawer Body Form */}
              <form 
                onSubmit={handleSaveAsset} 
                className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
              >
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg">
                    {formError}
                  </div>
                )}

                {/* 1. Dashed Image Upload Box */}
                <div className="flex justify-center pt-2 pb-2">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ borderRadius: '14px' }}
                    className="w-28 h-28 border-2 border-dashed border-slate-300 hover:border-red-600 hover:bg-red-50/30 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group bg-slate-50/30"
                    title="Upload photo from device"
                  >
                    {previewImage ? (
                      <>
                        <img 
                          src={previewImage} 
                          alt="Asset preview" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                          Change
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(null);
                          }}
                          className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black text-white p-1 rounded-full text-xs"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center text-slate-300 group-hover:text-red-600 group-hover:border-red-600 transition-colors">
                        <Plus className="w-5 h-5 stroke-[2]" />
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>
                </div>

                {/* 2. Row 1: ASSET CODE PREFIX & ASSET CODE NUMBER */}
                <div className="grid grid-cols-2 gap-4">
                  {/* ASSET CODE PREFIX */}
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                      ASSET CODE PREFIX
                    </label>
                    <input
                      type="text"
                      value={assetCodePrefix}
                      onChange={(e) => setAssetCodePrefix(e.target.value)}
                      style={{ borderRadius: '10px' }}
                      className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                    />
                  </div>

                  {/* ASSET CODE NUMBER */}
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                      ASSET CODE NUMBER
                    </label>
                    <input
                      type="text"
                      value={assetCodeNumber}
                      onChange={(e) => setAssetCodeNumber(e.target.value)}
                      style={{ borderRadius: '10px' }}
                      className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                {/* 3. Row 2: ASSET NAME * */}
                <div className="relative">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                    ASSET NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={assetName}
                    onChange={(e) => {
                      setAssetName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    style={{ borderRadius: '10px' }}
                    className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                  />
                </div>

                {/* 4. Row 3: ASSET UNIT RATE & TOTAL COUNT */}
                <div className="grid grid-cols-2 gap-4">
                  {/* ASSET UNIT RATE */}
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                      ASSET UNIT RATE
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={assetUnitRate}
                      onChange={(e) => setAssetUnitRate(e.target.value)}
                      style={{ borderRadius: '10px' }}
                      className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                    />
                  </div>

                  {/* TOTAL COUNT */}
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                      TOTAL COUNT
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={totalCount}
                      onChange={(e) => setTotalCount(e.target.value)}
                      style={{ borderRadius: '10px' }}
                      className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                {/* 5. Row 4: ASSET TYPE with right chevron */}
                <div className="relative">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                    ASSET TYPE
                  </label>
                  <div className="relative">
                    <select
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value)}
                      style={{ borderRadius: '10px' }}
                      className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white appearance-none cursor-pointer transition-all pr-10 font-medium"
                    >
                      {ASSET_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-700">
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                {/* 6. Row 5: DESCRIPTION */}
                <div className="relative">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                    DESCRIPTION
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ borderRadius: '10px' }}
                    className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all resize-none font-medium"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* RIGHT-SIDE SLIDE DRAWER: ASSIGN ASSET */}
      {/* ---------------------------------------------------- */}
      {isAssignDrawerOpen && assigningAsset && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            onClick={() => setIsAssignDrawerOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-[500px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsAssignDrawerOpen(false)}
                    className="p-1 -ml-1 text-slate-700 hover:text-red-600 transition-colors cursor-pointer"
                    title="Back"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <h2 className="text-base font-bold text-slate-800 tracking-wide uppercase">
                    ASSIGN ASSET
                  </h2>
                </div>

                <button
                  type="submit"
                  form="assign-asset-drawer-form"
                  style={{ borderRadius: '8px' }}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>

              {/* Red Stripe */}
              <div className="h-[3.5px] bg-red-600 w-full" />

              {/* Form */}
              <form 
                id="assign-asset-drawer-form"
                onSubmit={handleConfirmAssignment} 
                className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
              >
                {/* Summary */}
                <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center font-bold text-xs uppercase">
                      {(assigningAsset.asset_type || assigningAsset.category || 'AS').slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{assigningAsset.name}</div>
                      <div className="text-xs font-mono font-semibold text-slate-500">
                        {assigningAsset.serial_number || assigningAsset.asset_code}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      (assigningAsset.available_qty ?? 0) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {(assigningAsset.available_qty ?? 0) > 0 ? 'Available' : 'Assigned'}
                    </span>
                    <div className="text-xs text-slate-500 mt-1 font-medium">
                      Avail: <span className="font-bold text-slate-900">{assigningAsset.available_qty ?? 0}</span> / {assigningAsset.total_qty ?? 1}
                    </div>
                  </div>
                </div>

                {/* Field 1: Person */}
                <div className="relative">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                    ASSIGN TO (PERSON / EMPLOYEE) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe / Site Supervisor"
                    value={assignedToPerson}
                    onChange={(e) => setAssignedToPerson(e.target.value)}
                    style={{ borderRadius: '10px' }}
                    className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                  />
                </div>

                {/* Field 2: Site/Project */}
                <div className="relative">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                    SITE / PROJECT
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Site / Office"
                    value={assignedProject}
                    onChange={(e) => setAssignedProject(e.target.value)}
                    style={{ borderRadius: '10px' }}
                    className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                  />
                </div>

                {/* Field 3: Qty & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                      QUANTITY
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={assigningAsset.total_qty || 1}
                      value={assignedQty}
                      onChange={(e) => setAssignedQty(e.target.value)}
                      style={{ borderRadius: '10px' }}
                      className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                    />
                  </div>

                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                      ASSIGNMENT DATE
                    </label>
                    <input
                      type="date"
                      value={assignedDate}
                      onChange={(e) => setAssignedDate(e.target.value)}
                      style={{ borderRadius: '10px' }}
                      className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Field 4: Remarks */}
                <div className="relative">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                    REMARKS / NOTES
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter any handover conditions or notes..."
                    value={assignedRemarks}
                    onChange={(e) => setAssignedRemarks(e.target.value)}
                    style={{ borderRadius: '10px' }}
                    className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all resize-none font-medium"
                  />
                </div>
              </form>

              {/* Action Footer */}
              <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignDrawerOpen(false)}
                  style={{ borderRadius: '8px' }}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="assign-asset-drawer-form"
                  style={{ borderRadius: '8px' }}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* RIGHT-SIDE SLIDE DRAWER: TRANSFER ASSET */}
      {/* ---------------------------------------------------- */}
      {isTransferDrawerOpen && assigningAsset && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            onClick={() => setIsTransferDrawerOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-[480px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsTransferDrawerOpen(false)}
                    className="p-1 -ml-1 text-slate-700 hover:text-red-600 transition-colors cursor-pointer"
                    title="Back"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <h2 className="text-base font-bold text-slate-800 tracking-wide uppercase">
                    TRANSFER ASSET
                  </h2>
                </div>

                <button
                  type="submit"
                  form="transfer-asset-form"
                  style={{ borderRadius: '8px' }}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Transfer
                </button>
              </div>

              <div className="h-[3.5px] bg-red-600 w-full" />

              <form 
                id="transfer-asset-form"
                onSubmit={handleConfirmTransfer} 
                className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
              >
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs text-slate-400 uppercase font-semibold">Asset to Transfer</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{assigningAsset.name}</div>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">{assigningAsset.serial_number || assigningAsset.asset_code}</div>
                  <div className="text-xs text-slate-600 mt-2 font-medium">
                    Currently Assigned To: <span className="font-bold text-slate-900">{assigningAsset.assigned_to || 'None'}</span>
                  </div>
                </div>

                <div className="relative">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                    TRANSFER TO (NEW PERSON / EMPLOYEE) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar / Site Engineer"
                    value={transferToPerson}
                    onChange={(e) => setTransferToPerson(e.target.value)}
                    style={{ borderRadius: '10px' }}
                    className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                  />
                </div>

                <div className="relative">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                    NEW SITE / PROJECT
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. South Block Site"
                    value={transferProject}
                    onChange={(e) => setTransferProject(e.target.value)}
                    style={{ borderRadius: '10px' }}
                    className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                  />
                </div>

                <div className="relative">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase z-10 select-none pointer-events-none">
                    TRANSFER DATE
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    style={{ borderRadius: '10px' }}
                    className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white transition-all font-medium"
                  />
                </div>
              </form>

              <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTransferDrawerOpen(false)}
                  style={{ borderRadius: '8px' }}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="transfer-asset-form"
                  style={{ borderRadius: '8px' }}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* DELETE CONFIRMATION ALERT POPUP */}
      {/* ---------------------------------------------------- */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            style={{ borderRadius: '14px' }}
            className="bg-white w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Red Accent Stripe */}
            <div className="h-1 bg-red-600 w-full" />

            <div className="p-6">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <Trash2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Delete Asset</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Are you sure you want to delete <span className="font-bold text-slate-900">"{assetToDelete.name}"</span>?
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssetToDelete(null)}
                  style={{ borderRadius: '8px' }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAsset}
                  style={{ borderRadius: '8px' }}
                  className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
