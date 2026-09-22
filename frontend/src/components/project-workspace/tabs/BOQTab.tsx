import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, ArrowLeft, SquarePen, MoreVertical, 
  Download, UploadCloud, Calendar, Check, X, FileSpreadsheet,
  Layers, CheckCircle2, ChevronDown, DollarSign, Eye, Trash2, Copy
} from 'lucide-react';
import { Project, WBSTask, BOQRecord, BOQItem } from '../../../types';
import { CustomSelect } from '../../CustomSelect';
import { confirmAction, setFormDirty, clearFormDirty, confirmNavigationIfDirty } from '../../../lib/dialogService';

interface BOQTabProps {
  project: Project;
  tasks?: WBSTask[];
  onShowToast?: (msg: string) => void;
}

// Seed line items matching Image 3 for project p-2479 (Soil investigation BOQ)
const SEED_SOIL_ITEMS: BOQItem[] = [];

export const BOQTab: React.FC<BOQTabProps> = ({
  project,
  tasks = [],
  onShowToast
}) => {
  const storageKey = `siteops_boq_records_v2_${project?.id || 'default'}`;

  // State: List of BOQs
  const [boqList, setBOQList] = useState<BOQRecord[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
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

  // Selected BOQ for Detail View (Image 3)
  const [selectedBOQ, setSelectedBOQ] = useState<BOQRecord | null>(null);

  // Search filter for List view (Image 1)
  const [searchQuery, setSearchQuery] = useState('');

  // Search filter for Items view (Image 3)
  const [itemSearch, setItemSearch] = useState('');

  // Active Detail Sub-Tab: Items | Budget | Milestone | Invoices
  const [activeDetailTab, setActiveDetailTab] = useState<'items' | 'budget' | 'milestone' | 'invoices'>('items');

  // Modal State: Create BOQ Modal (Image 2)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State: Create BOQ Modal
  const [newBOQNumber, setNewBOQNumber] = useState('#BOQ1873');
  const [newBOQDate, setNewBOQDate] = useState('2026-09-17');
  const [newClientName, setNewClientName] = useState(project.client_name || 'Shanthi Sathya');
  const [newBOQTitle, setNewBOQTitle] = useState('');
  const [newTaxType, setNewTaxType] = useState<'ITEM_LEVEL' | 'BILL_LEVEL'>('ITEM_LEVEL');
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: string }>>([]);

  // Modal State: In-Page Edit BOQ Modal (No browser prompt)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTargetBOQ, setEditTargetBOQ] = useState<BOQRecord | null>(null);
  const [editBOQNumber, setEditBOQNumber] = useState('');
  const [editBOQDate, setEditBOQDate] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editBOQTitle, setEditBOQTitle] = useState('');
  const [editTaxType, setEditTaxType] = useState<'ITEM_LEVEL' | 'BILL_LEVEL'>('ITEM_LEVEL');
  const [activeEditFocus, setActiveEditFocus] = useState<'number' | 'date' | 'client' | 'title'>('title');

  // Modal State: Add Line Item to Selected BOQ
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemRate, setNewItemRate] = useState<number>(0);
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnit, setNewItemUnit] = useState('nos');
  const [newItemDimensions, setNewItemDimensions] = useState('-');

  // Modal State: Link Task Modal
  const [linkTaskTargetItem, setLinkTaskTargetItem] = useState<BOQItem | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  // Action Menu state for List rows
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  // Open Create Modal with auto-incremented BOQ number
  const handleOpenCreateModal = () => {
    const nextSeq = 1871 + boqList.length;
    setNewBOQNumber(`#BOQ${nextSeq}`);
    setNewBOQDate(new Date().toISOString().split('T')[0]);
    setNewClientName(project.client_name || 'Shanthi Sathya');
    setNewBOQTitle('');
    setNewTaxType('ITEM_LEVEL');
    setAttachedFiles([]);
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

    setBOQList(prev => prev.map(b => b.id === updated.id ? updated : b));
    if (selectedBOQ?.id === updated.id) {
      setSelectedBOQ(updated);
    }
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

    const updated = [createdRecord, ...boqList];
    setBOQList(updated);
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

  // Add Item to currently selected BOQ
  const handleAddLineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBOQ || !newItemDesc.trim()) return;

    const confirmed = await confirmAction({
      title: 'Add BOQ Line Item',
      message: `Are you sure you want to add item "${newItemDesc.trim()}" (Qty: ${newItemQty} ${newItemUnit}) to ${selectedBOQ.boq_number}?`,
      confirmText: 'Add Item',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    const calculatedPrice = Number(newItemRate) * Number(newItemQty);
    const newItem: BOQItem = {
      id: `item-${Date.now()}`,
      s_no: selectedBOQ.items.length + 1,
      description: newItemDesc.trim(),
      dimensions: newItemDimensions.trim() || '-',
      unit_rate: Number(newItemRate),
      quantity: Number(newItemQty),
      unit: newItemUnit,
      progress_percentage: 0,
      billed_quantity: 0,
      sales_price: calculatedPrice
    };

    const updatedItems = [...selectedBOQ.items, newItem];
    const newBOQValue = updatedItems.reduce((acc, i) => acc + i.sales_price, 0);

    const updatedBOQ: BOQRecord = {
      ...selectedBOQ,
      items: updatedItems,
      boq_value: newBOQValue
    };

    setSelectedBOQ(updatedBOQ);
    setBOQList(boqList.map(b => b.id === updatedBOQ.id ? updatedBOQ : b));
    setIsAddItemModalOpen(false);
    setNewItemDesc('');
    setNewItemRate(0);
    setNewItemQty(1);
    onShowToast?.(`Added item #${newItem.s_no} to ${selectedBOQ.boq_number}`);
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

  // Filter items in detail view
  const filteredDetailItems = selectedBOQ 
    ? selectedBOQ.items.filter(item => 
        item.description.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.unit.toLowerCase().includes(itemSearch.toLowerCase())
      )
    : [];

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
                <div className="text-xs sm:text-[13px] font-bold text-slate-800 font-mono leading-tight mt-0.5">
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
              <div className="text-sm sm:text-[15px] font-bold text-slate-900 font-mono mt-0.5">
                ₹ {selectedBOQ.boq_value.toLocaleString()}
              </div>
            </div>

            {/* KPI 2: Progress */}
            <div className="px-3.5 py-1.5 rounded-xl bg-[#eaf7f2] border border-emerald-100 shadow-2xs min-w-[95px]">
              <div className="text-[10px] font-medium text-emerald-800">Progress</div>
              <div className="text-sm sm:text-[15px] font-bold text-emerald-900 font-mono mt-0.5">
                {selectedBOQ.physical_progress}%
              </div>
            </div>

            {/* KPI 3: Billed */}
            <div className="px-3.5 py-1.5 rounded-xl bg-[#fff5f5] border border-red-100 shadow-2xs min-w-[105px]">
              <div className="text-[10px] font-medium text-red-600">Billed</div>
              <div className="text-sm sm:text-[15px] font-bold text-red-950 font-mono mt-0.5">
                ₹ {selectedBOQ.billed_value.toLocaleString()}
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

          {/* Right Toolbar: Search, Download, Edit, 3 Dots, + Add Item */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Search Pill */}
            <div className="relative w-48 sm:w-56">
              <input
                type="text"
                placeholder="search"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pr-8 pl-3.5 py-1.5 text-xs bg-white border border-slate-200/90 rounded-full text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600 shadow-2xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            {/* Download Icon */}
            <button
              type="button"
              onClick={() => onShowToast?.(`Exporting ${selectedBOQ.boq_number} items...`)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              title="Download BOQ"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Edit Icon */}
            <button
              type="button"
              onClick={() => handleOpenEditModal(selectedBOQ, 'title')}
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer border border-transparent hover:border-red-200"
              title="Edit BOQ Details"
            >
              <SquarePen className="w-4 h-4" />
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

            {/* + Add Item Button (Red & White Theme) */}
            <button
              type="button"
              onClick={() => setIsAddItemModalOpen(true)}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-full flex items-center gap-1 shadow-xs transition-colors cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

        </div>

        {/* SUBTAB 1: Items Table (Red & White Theme) */}
        {activeDetailTab === 'items' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f8f9fc] text-slate-600 font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4 w-14 text-slate-600">S.No</th>
                    <th className="py-3 px-4 min-w-[340px] text-slate-600">Item</th>
                    <th className="py-3 px-4 w-28 text-center text-slate-600">N x L x W x H</th>
                    <th className="py-3 px-4 w-28 text-right text-slate-600">Unit rate (₹)</th>
                    <th className="py-3 px-4 w-28 text-right text-slate-600">QTY</th>
                    <th className="py-3 px-4 w-28 text-center text-slate-600">Progress</th>
                    <th className="py-3 px-4 w-28 text-right text-slate-600">Billed Qty</th>
                    <th className="py-3 px-4 w-32 text-right text-slate-600">Sales Price (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDetailItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No line items found. Click "+ Add Item" above to add items to this BOQ.
                      </td>
                    </tr>
                  ) : (
                    filteredDetailItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* S.No */}
                        <td className="py-3.5 px-4 font-medium text-slate-800 align-top">
                          {idx + 1}
                        </td>

                        {/* Item Description */}
                        <td className="py-3.5 px-4 text-slate-800 leading-relaxed align-top">
                          <div className="max-w-2xl font-normal text-[12.5px] text-slate-800">
                            {item.description}
                          </div>
                          {item.linked_task_name && (
                            <div className="mt-1 text-[10px] text-red-600 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Linked: {item.linked_task_name}</span>
                            </div>
                          )}
                        </td>

                        {/* N x L x W x H */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-500 align-top">
                          {item.dimensions || '-'}
                        </td>

                        {/* Unit rate */}
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800 align-top">
                          {item.unit_rate ? item.unit_rate.toLocaleString() : '0'}
                        </td>

                        {/* QTY */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-800 align-top">
                          {item.quantity} <span className="text-slate-600 text-[11px]">{item.unit}</span>
                        </td>

                        {/* Progress Button: Link Task (Red & White Theme) */}
                        <td className="py-3.5 px-4 text-center align-top">
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
                        </td>

                        {/* Billed Qty */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-800 align-top">
                          {item.billed_quantity} <span className="text-slate-600 text-[11px]">{item.unit}</span>
                        </td>

                        {/* Sales Price */}
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 align-top">
                          {item.sales_price ? item.sales_price.toLocaleString() : '0'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Totals */}
            <div className="bg-[#f8f9fc] border-t border-slate-200/80 px-4 py-3 flex items-center justify-between text-xs font-medium text-slate-600">
              <div>Total {filteredDetailItems.length} line items</div>
              <div className="flex items-center gap-6 font-mono font-bold text-slate-800">
                <div>
                  Total BOQ: <span className="text-slate-900">₹ {selectedBOQ.boq_value.toLocaleString()}</span>
                </div>
                <div>
                  Total Billed: <span className="text-red-600">₹ {selectedBOQ.billed_value.toLocaleString()}</span>
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
                <div className="text-lg font-bold font-mono text-slate-900 mt-1">₹ {selectedBOQ.boq_value.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">From BOQ Line Items</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Billed to Client</div>
                <div className="text-lg font-bold font-mono text-red-600 mt-1">₹ {selectedBOQ.billed_value.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">RA Bills raised</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Budget Utilization</div>
                <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
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

        {/* SUBTAB 4: Invoices View */}
        {activeDetailTab === 'invoices' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Invoices & RA Bills</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tax invoices generated against {selectedBOQ.boq_number}.</p>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Invoice No.</th>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Taxable</th>
                    <th className="py-2.5 px-4 font-semibold text-right">GST (18%)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Total (₹)</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">RA-BILL-01</td>
                    <td className="py-3 px-4 text-slate-600">16 Sep, 2026</td>
                    <td className="py-3 px-4 text-right font-mono">₹ 14,745</td>
                    <td className="py-3 px-4 text-right font-mono">₹ 2,655</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹ 17,400</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">Paid</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: ADD ITEM TO BOQ (Red & White Theme) */}
        {isAddItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">Add Item to {selectedBOQ.boq_number}</h3>
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddLineItem} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Item Description *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Specification of the material, labor, or soil investigation work..."
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Rate (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newItemRate}
                      onChange={(e) => setNewItemRate(Number(e.target.value))}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(Number(e.target.value))}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measurement</label>
                    <CustomSelect
                      value={newItemUnit}
                      onChange={(val) => setNewItemUnit(val)}
                      options={['lumpsum', 'nos', 'RMT', 'Cu.m', 'Sq.m', 'Sq.ft', 'MT']}
                      size="md"
                      variant="brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">N x L x W x H</label>
                    <input
                      type="text"
                      placeholder="e.g. 1 x 10 x 2 x 1"
                      value={newItemDimensions}
                      onChange={(e) => setNewItemDimensions(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-500">Calculated Sales Price:</span>
                  <span className="font-bold font-mono text-slate-900">
                    ₹ {(newItemRate * newItemQty).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddItemModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line Item</span>
                  </button>
                </div>
              </form>
            </div>
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
                        className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent font-mono"
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

      </div>
    );
  }

  // =========================================================================
  // VIEW 1: BOQ LIST TABLE VIEW (Red & White Theme)
  // =========================================================================
  return (
    <div className="space-y-4 font-sans select-none">
      
      {/* Top Controls: Search Bar on Left, + BOQ Button on Right */}
      <div className="flex items-center justify-between gap-4">
        
        {/* Search Bar: rounded pill container with search icon */}
        <div className="relative w-72 sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200/90 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600 shadow-2xs transition-colors"
          />
        </div>

        {/* + BOQ Button (Red & White Theme) */}
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ BOQ</span>
        </button>

      </div>

      {/* BOQ Data Table (Red & White Theme) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#f8f9fc] text-slate-500 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-5 font-semibold text-slate-500 w-32">S.No.</th>
                <th className="py-3.5 px-5 font-semibold text-slate-500">Client Name</th>
                <th className="py-3.5 px-5 font-semibold text-slate-500">Boq Title</th>
                <th className="py-3.5 px-5 font-semibold text-slate-500 text-center w-28">Milestone</th>
                <th className="py-3.5 px-5 font-semibold text-slate-500 w-52">Physical Progress</th>
                <th className="py-3.5 px-5 font-semibold text-slate-500 text-right w-36">BOQ Value</th>
                <th className="py-3.5 px-5 font-semibold text-slate-500 text-right w-36">Billed Value</th>
                <th className="py-3.5 px-4 w-12 text-center"></th>
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
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* S.No. (e.g. #BOQ1870) */}
                    <td className="py-4 px-5 font-mono font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                      {boq.boq_number}
                    </td>

                    {/* Client Name */}
                    <td className="py-4 px-5 font-medium text-slate-800">
                      {boq.client_name}
                    </td>

                    {/* Boq Title */}
                    <td className="py-4 px-5 font-semibold text-slate-800 uppercase">
                      {boq.title}
                    </td>

                    {/* Milestone (e.g. 0 / 0) */}
                    <td className="py-4 px-5 font-semibold text-slate-800 text-center font-mono">
                      {boq.milestone_completed || 0} / {boq.milestone_total || 0}
                    </td>

                    {/* Physical Progress: percentage + slim progress bar */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-800 min-w-[28px]">
                          {boq.physical_progress || 0}%
                        </span>
                        <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                          <div 
                            className="h-full bg-red-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, boq.physical_progress || 0)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* BOQ Value */}
                    <td className="py-4 px-5 text-right font-mono font-bold text-slate-900">
                      ₹ {boq.boq_value.toLocaleString()}
                    </td>

                    {/* Billed Value */}
                    <td className="py-4 px-5 text-right font-mono font-bold text-slate-900">
                      ₹ {boq.billed_value.toLocaleString()}
                    </td>

                    {/* Action 3-dots */}
                    <td 
                      className="py-4 px-4 text-center relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenRowMenuId(openRowMenuId === boq.id ? null : boq.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openRowMenuId === boq.id && (
                        <div className="absolute right-3 top-10 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBOQ(boq);
                              setOpenRowMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenEditModal(boq, 'title');
                              setOpenRowMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                          >
                            <SquarePen className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteBOQ(boq.id);
                              setOpenRowMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete BOQ</span>
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
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent font-mono"
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

              {/* Row 2: CLIENT NAME * */}
              <div className="relative border border-slate-300/90 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10.5px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-0.5 pointer-events-none">
                  <span>CLIENT NAME</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    required
                    placeholder="Search or enter client name"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
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
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent font-mono"
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

    </div>
  );
};
