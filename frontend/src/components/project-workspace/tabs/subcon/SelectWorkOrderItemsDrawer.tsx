import React, { useState } from 'react';
import { X, Search, Plus, Check } from 'lucide-react';
import { SubconWorkOrder, SubconWorkOrderItem } from '../../../../types';

interface SelectWorkOrderItemsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: SubconWorkOrder;
  onNext: (selectedItems: SubconWorkOrderItem[]) => void;
  onAddNewItemToWO: (newItem: SubconWorkOrderItem) => void;
}

export const SelectWorkOrderItemsDrawer: React.FC<SelectWorkOrderItemsDrawerProps> = ({
  isOpen,
  onClose,
  workOrder,
  onNext,
  onAddNewItemToWO
}) => {
  const [search, setSearch] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New item quick form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemRate, setNewItemRate] = useState<number>(500);
  const [newItemUnit, setNewItemUnit] = useState('RMT');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemGst, setNewItemGst] = useState<number>(0);

  if (!isOpen) return null;

  const items = workOrder.items || [];
  const filteredItems = items.filter(it => 
    it.item_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNextClick = () => {
    const selected = items.filter(it => selectedItemIds.includes(it.id));
    if (selected.length === 0) {
      alert('Please select at least one work order item to proceed.');
      return;
    }
    onNext(selected);
  };

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const created: SubconWorkOrderItem = {
      id: `wo-item-${Date.now()}`,
      item_name: newItemName.trim(),
      dimensions: '-',
      unit_rate: Number(newItemRate),
      unit: newItemUnit.trim() || 'nos',
      quantity: Number(newItemQty) || 1,
      billed_quantity: 0,
      unbilled_quantity: Number(newItemQty) || 1,
      amount: (Number(newItemRate) || 0) * (Number(newItemQty) || 1),
      gst_percent: Number(newItemGst) || 0
    };

    onAddNewItemToWO(created);
    setSelectedItemIds(prev => [...prev, created.id]);
    setIsAddingNew(false);
    setNewItemName('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Work Order Items</h3>
                <span className="text-xs text-slate-400 font-medium">, WO - {workOrder.wo_number.replace(/^#/, '')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextClick}
              disabled={selectedItemIds.length === 0}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                selectedItemIds.length > 0
                  ? 'bg-[#5b52f9] hover:bg-[#4b42e0] text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Next</span>
            </button>
          </div>

          {/* Search & Add New Toolbar */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsAddingNew(!isAddingNew)}
                className="text-xs font-bold text-[#5b52f9] hover:text-[#4b42e0] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Item</span>
              </button>
            </div>

            {/* Quick Add New Item Form */}
            {isAddingNew && (
              <form onSubmit={handleCreateNewItem} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 animate-in fade-in">
                <div className="text-xs font-bold text-indigo-900">Add New Work Order Item</div>
                <input
                  type="text"
                  required
                  placeholder="Item Name (e.g. Drilling Charges)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-indigo-200 rounded-lg focus:outline-none"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="Rate (₹)"
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(Number(e.target.value))}
                    className="text-xs p-2 bg-white border border-indigo-200 rounded-lg focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Unit (RMT/nos)"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="text-xs p-2 bg-white border border-indigo-200 rounded-lg focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="QTY"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                    className="text-xs p-2 bg-white border border-indigo-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-2.5 py-1 text-[11px] text-slate-600 hover:bg-white rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#5b52f9] text-white text-[11px] font-bold rounded-md hover:bg-[#4b42e0]"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Items Selection List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No items found. Click <span className="font-bold text-indigo-600">+ New Item</span> to add one.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                const unbilled = item.quantity - (item.billed_quantity || 0);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="pt-0.5">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-[#5b52f9] border-[#5b52f9] text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{item.item_name}</h4>
                        <div className="text-xs font-bold text-slate-900 shrink-0">
                          ₹ {item.unit_rate.toLocaleString()} <span className="text-[11px] text-slate-500 font-normal">/{item.unit}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                        <span>
                          Billed : <strong className="text-slate-700">{item.billed_quantity || 0} {item.unit}</strong> | Un-Billed : <strong className={unbilled < 0 ? 'text-amber-600' : 'text-slate-700'}>{unbilled} {item.unit}</strong>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          + {item.gst_percent || 0}% GST
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
