import React, { useState, useRef } from 'react';
import { 
  ShoppingCart, Plus, PackageCheck, AlertTriangle, 
  Search, Filter, Check, X, FileText, Truck, ArrowDownRight, Layers,
  Upload, Image as ImageIcon
} from 'lucide-react';
import { Project, MaterialRequest, GoodsReceiptNote, StockItem } from '../../../types';
import { addProjectPhoto } from '../../../lib/projectPhotoUtils';
import { CustomSelect } from '../../CustomSelect';

interface MaterialTabProps {
  project: Project;
  materialRequests?: MaterialRequest[];
  grns?: GoodsReceiptNote[];
  stockItems?: StockItem[];
  onShowToast?: (msg: string) => void;
}

const DEFAULT_STOCK: StockItem[] = [];

const DEFAULT_INDENTS: MaterialRequest[] = [];

const DEFAULT_GRN: GoodsReceiptNote[] = [];

export const MaterialTab: React.FC<MaterialTabProps> = ({
  project,
  materialRequests = DEFAULT_INDENTS,
  grns = DEFAULT_GRN,
  stockItems = DEFAULT_STOCK,
  onShowToast
}) => {
  const stockKey = `booshnam_material_stock_v2_${project?.id || 'default'}`;
  const indentsKey = `booshnam_material_indents_v2_${project?.id || 'default'}`;
  const grnKey = `booshnam_material_grn_v2_${project?.id || 'default'}`;

  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'indents' | 'grn'>('stock');
  const [stock, setStock] = useState<StockItem[]>(() => {
    try {
      const saved = localStorage.getItem(stockKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return stockItems || [];
  });
  const [indents, setIndents] = useState<MaterialRequest[]>(() => {
    try {
      const saved = localStorage.getItem(indentsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return materialRequests || [];
  });
  const [receipts, setReceipts] = useState<GoodsReceiptNote[]>(() => {
    try {
      const saved = localStorage.getItem(grnKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return grns || [];
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(stockKey, JSON.stringify(stock));
      localStorage.setItem(indentsKey, JSON.stringify(indents));
      localStorage.setItem(grnKey, JSON.stringify(receipts));
    } catch (e) {}
  }, [stock, indents, receipts, stockKey, indentsKey, grnKey]);

  const [search, setSearch] = useState('');

  // Modals
  const [isIndentModalOpen, setIsIndentModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);

  // Indent Form State
  const [indentItem, setIndentItem] = useState('');
  const [indentQty, setIndentQty] = useState<number>(100);
  const [indentUnit, setIndentUnit] = useState('Bags');
  const [indentPriority, setIndentPriority] = useState<'URGENT' | 'NORMAL' | 'LOW'>('URGENT');
  const [neededDate, setNeededDate] = useState(new Date(Date.now() + 4*86400000).toISOString().split('T')[0]);
  const [indentNotes, setIndentNotes] = useState('');

  // GRN Form State
  const [grnVendor, setGrnVendor] = useState('');
  const [grnVehicle, setGrnVehicle] = useState('');
  const [grnChallan, setGrnChallan] = useState('');
  const [grnNotes, setGrnNotes] = useState('');
  const [grnPhotoUrl, setGrnPhotoUrl] = useState<string | null>(null);
  const grnPhotoInputRef = useRef<HTMLInputElement>(null);

  const lowStockCount = stock.filter(s => s.is_low_stock).length;

  const handleGrnPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setGrnPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateIndent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indentItem.trim()) return;

    const newIndent: MaterialRequest = {
      id: `mr-${Date.now()}`,
      request_number: `MR-2026-${String(indents.length + 44).padStart(3, '0')}`,
      project_name: project.name,
      needed_by_date: neededDate,
      status: 'SUBMITTED',
      priority: indentPriority,
      total_estimated_cost: indentQty * 450,
      site_notes: indentNotes.trim() || 'Site indent submitted.',
      items: [
        { id: `mri-${Date.now()}`, item_name: indentItem, quantity: Number(indentQty), unit: indentUnit, estimated_rate: 450 }
      ]
    };

    setIndents([newIndent, ...indents]);
    onShowToast?.(`Material Indent ${newIndent.request_number} submitted!`);
    setIsIndentModalOpen(false);

    // Reset
    setIndentItem('');
    setIndentNotes('');
  };

  const handleCreateGRN = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnVendor.trim() || !grnChallan.trim()) return;

    const newGRN: GoodsReceiptNote = {
      id: `grn-${Date.now()}`,
      grn_number: `GRN-2026-${String(receipts.length + 30).padStart(3, '0')}`,
      po_number: `PO-2026-0${receipts.length + 16}`,
      vendor_name: grnVendor.trim(),
      challan_number: grnChallan.trim(),
      vehicle_number: grnVehicle.trim() || 'TN-01-AB-1234',
      receipt_date: new Date().toISOString().split('T')[0],
      status: 'RECEIVED',
      notes: grnNotes.trim() || 'Material verified and inwarded.'
    };

    setReceipts([newGRN, ...receipts]);

    // Automatically sync delivery challan photo to Dashboard Project Photos
    if (grnPhotoUrl) {
      addProjectPhoto(project.id || project.code, {
        url: grnPhotoUrl,
        title: `Material GRN: ${newGRN.vendor_name} (Challan ${newGRN.challan_number})`,
        source: 'Material',
        category: 'Inward Delivery',
        details: `Vehicle: ${newGRN.vehicle_number} • Notes: ${newGRN.notes}`
      });
    }

    onShowToast?.(`Logged Inward GRN ${newGRN.grn_number} & synced to Project Photos!`);
    setIsGrnModalOpen(false);

    // Reset
    setGrnVendor('');
    setGrnChallan('');
    setGrnVehicle('');
    setGrnNotes('');
    setGrnPhotoUrl(null);
    if (grnPhotoInputRef.current) grnPhotoInputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">
              MATERIAL & SUPPLY
            </span>
            <h2 className="text-lg font-bold text-slate-900">Site Materials, Stock & Inward GRN</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Requisitions, site inventory levels, minimum threshold alerts, and delivery challans for {project.client_name || project.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsGrnModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Truck className="w-4 h-4 text-slate-600" />
            <span>Record Inward (GRN)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsIndentModalOpen(true)}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Indent / Request</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Stock SKU Items</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stock.length} Active Materials</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tracked on site yard</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Low Stock Reorders</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{lowStockCount} Items Below Min</div>
          <div className="text-[10px] text-rose-500 font-semibold mt-0.5">Immediate indent required</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Material Receipts (GRN)</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{receipts.length} Inward Loads</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Delivered to site this month</div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('stock')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeSubTab === 'stock' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Site Stock / Inventory ({stock.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('indents')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeSubTab === 'indents' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Material Requests ({indents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('grn')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeSubTab === 'grn' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Inward GRNs ({receipts.length})
          </button>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* SUB-TAB 1: SITE STOCK TABLE */}
      {activeSubTab === 'stock' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Material Name & Spec</th>
                  <th className="py-3.5 px-4 w-28">Category</th>
                  <th className="py-3.5 px-4 text-right w-28">Current Stock</th>
                  <th className="py-3.5 px-4 text-right w-28">Min Threshold</th>
                  <th className="py-3.5 px-4 w-20">Unit</th>
                  <th className="py-3.5 px-4 text-right w-36">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {stock.filter(s => s.item_name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No stock inventory recorded for this project yet.
                    </td>
                  </tr>
                ) : (
                  stock.filter(s => s.item_name.toLowerCase().includes(search.toLowerCase())).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.item_name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right tracking-tight font-bold text-slate-900">
                        {item.current_quantity.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right tracking-tight text-slate-500">
                        {item.minimum_threshold.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 tracking-tight text-slate-600">
                        {item.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {item.is_low_stock ? (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                            Adequate
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MATERIAL INDENTS TABLE */}
      {activeSubTab === 'indents' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-32">Indent #</th>
                  <th className="py-3.5 px-4">Material Items Requested</th>
                  <th className="py-3.5 px-4 w-28">Needed By</th>
                  <th className="py-3.5 px-4 w-24">Priority</th>
                  <th className="py-3.5 px-4 text-right w-32">Est. Cost (₹)</th>
                  <th className="py-3.5 px-4 text-right w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {indents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No material indents or purchase requests created yet.
                    </td>
                  </tr>
                ) : (
                  indents.map((mr) => (
                    <tr key={mr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 tracking-tight font-bold text-slate-900">{mr.request_number}</td>
                      <td className="py-3.5 px-4">
                        {mr.items?.map((item, idx) => (
                          <div key={idx} className="font-semibold text-slate-900">
                            {item.quantity} {item.unit} {item.item_name}
                          </div>
                        ))}
                        <div className="text-[10px] text-slate-400 mt-0.5">{mr.site_notes}</div>
                      </td>
                      <td className="py-3.5 px-4 tracking-tight text-slate-600">{mr.needed_by_date}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          mr.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {mr.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right tracking-tight font-bold text-slate-900">
                        ₹ {mr.total_estimated_cost.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                          {mr.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: GRN INWARD TABLE */}
      {activeSubTab === 'grn' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-32">GRN #</th>
                  <th className="py-3.5 px-4 w-28">Date</th>
                  <th className="py-3.5 px-4">Supplier / Vendor</th>
                  <th className="py-3.5 px-4 w-32">Challan #</th>
                  <th className="py-3.5 px-4 w-36">Vehicle #</th>
                  <th className="py-3.5 px-4">Inspection Remarks</th>
                  <th className="py-3.5 px-4 text-right w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No goods receipt notes (GRN) inwarded yet.
                    </td>
                  </tr>
                ) : (
                  receipts.map((grn) => (
                    <tr key={grn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 tracking-tight font-bold text-slate-900">{grn.grn_number}</td>
                      <td className="py-3.5 px-4 tracking-tight text-slate-500 text-[11px]">{grn.receipt_date}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{grn.vendor_name}</td>
                      <td className="py-3.5 px-4 tracking-tight text-indigo-700 font-bold">{grn.challan_number}</td>
                      <td className="py-3.5 px-4 tracking-tight text-slate-600">{grn.vehicle_number}</td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">{grn.notes}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                          {grn.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE INDENT MODAL */}
      {isIndentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Create Material Indent (MR)</h3>
                  <p className="text-xs text-slate-500">{project.name}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsIndentModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIndent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Material Name & Specification</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ultratech 53-Grade OPC Cement"
                  value={indentItem}
                  onChange={(e) => setIndentItem(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    value={indentQty}
                    onChange={(e) => setIndentQty(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                  <CustomSelect
                    value={indentUnit}
                    onChange={(val) => setIndentUnit(val)}
                    options={['Bags', 'MT', 'CFT', 'Nos', 'Kg']}
                    size="md"
                    variant="brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <CustomSelect
                    value={indentPriority}
                    onChange={(val) => setIndentPriority(val as any)}
                    options={[
                      { label: 'Urgent', value: 'URGENT', dotColor: 'bg-rose-500' },
                      { label: 'Normal', value: 'NORMAL', dotColor: 'bg-emerald-500' },
                      { label: 'Low', value: 'LOW', dotColor: 'bg-slate-400' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Required On Site By</label>
                <input
                  type="date"
                  value={neededDate}
                  onChange={(e) => setNeededDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Site Notes / Activity</label>
                <input
                  type="text"
                  placeholder="Purpose of requirement, target slab pour..."
                  value={indentNotes}
                  onChange={(e) => setIndentNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIndentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Submit Requisition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD GRN MODAL */}
      {isGrnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Record Material Inward (GRN)</h3>
                  <p className="text-xs text-slate-500">{project.name}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsGrnModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGRN} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier / Vendor</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Balaji Steel & Cement Traders"
                  value={grnVendor}
                  onChange={(e) => setGrnVendor(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Challan #</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CH-99142"
                    value={grnChallan}
                    onChange={(e) => setGrnChallan(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Truck / Vehicle #</label>
                  <input
                    type="text"
                    placeholder="e.g. TN-09-5412"
                    value={grnVehicle}
                    onChange={(e) => setGrnVehicle(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Material Inspection & Quantity Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 200 bags OPC cement received, batch manufacturing date verified..."
                  value={grnNotes}
                  onChange={(e) => setGrnNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={grnPhotoInputRef}
                onChange={handleGrnPhotoChange}
                accept="image/*"
                className="hidden"
              />

              {/* Delivery Challan / Material Photo Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attach Delivery Challan / Material Photo (Optional)
                </label>
                <div 
                  onClick={() => grnPhotoInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                    grnPhotoUrl 
                      ? 'border-emerald-400 bg-emerald-50/20' 
                      : 'border-slate-200 hover:border-emerald-500 hover:bg-slate-50'
                  }`}
                >
                  {grnPhotoUrl ? (
                    <div className="space-y-1.5">
                      <img 
                        src={grnPhotoUrl} 
                        alt="Challan preview" 
                        className="max-h-32 w-auto mx-auto rounded-lg object-contain shadow-xs border border-slate-200"
                      />
                      <div className="text-[11px] font-semibold text-emerald-700">
                        Challan photo attached • Synced to Project Photos
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <div className="text-xs font-semibold text-slate-700">Click to attach Challan or Site delivery photo</div>
                      <div className="text-[10px] text-slate-400">Photos will automatically appear in Dashboard Project Photos</div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGrnModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Inward Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
