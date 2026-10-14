import React, { useState, useMemo } from 'react';
import { X, Edit2, ChevronDown, ChevronRight, Plus, Minus, Tag, ShieldCheck } from 'lucide-react';
import { SubconWorkOrder, SubconWorkOrderItem, SubconBill, SubconBillItem } from '../../../../types';

interface SubcontractorExpenseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: SubconWorkOrder;
  selectedItems: SubconWorkOrderItem[];
  onSaveBill: (bill: SubconBill) => void;
}

export const SubcontractorExpenseDrawer: React.FC<SubcontractorExpenseDrawerProps> = ({
  isOpen,
  onClose,
  workOrder,
  selectedItems,
  onSaveBill
}) => {
  // Line items state
  const [billItems, setBillItems] = useState<{
    item: SubconWorkOrderItem;
    unit_rate: number;
    invoice_qty: number;
  }[]>(() => {
    return selectedItems.map(it => ({
      item: it,
      unit_rate: it.unit_rate,
      invoice_qty: it.unbilled_quantity && it.unbilled_quantity > 0 ? it.unbilled_quantity : 1
    }));
  });

  // Re-sync if selectedItems changes
  React.useEffect(() => {
    setBillItems(selectedItems.map(it => ({
      item: it,
      unit_rate: it.unit_rate,
      invoice_qty: it.unbilled_quantity && it.unbilled_quantity > 0 ? it.unbilled_quantity : 1
    })));
  }, [selectedItems]);

  const [itemLevelTax, setItemLevelTax] = useState(false);
  const [voucherNo, setVoucherNo] = useState(() => `#${Math.floor(60 + Math.random() * 40)}`);
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isEditingHeader, setIsEditingHeader] = useState(false);

  // Financial fields
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  
  const [showDeduction, setShowDeduction] = useState(false);
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [showRetention, setShowRetention] = useState(false);
  const [retentionPercent, setRetentionPercent] = useState<number>(5);

  const [roundOff, setRoundOff] = useState(false);
  const [showCostCode, setShowCostCode] = useState(false);
  const [costCode, setCostCode] = useState('CC-SUBCON-01');

  if (!isOpen) return null;

  const handleRemoveItem = (itemId: string) => {
    setBillItems(prev => prev.filter(bi => bi.item.id !== itemId));
  };

  const handleUpdateQty = (itemId: string, qty: number) => {
    setBillItems(prev => prev.map(bi => 
      bi.item.id === itemId ? { ...bi, invoice_qty: Math.max(0, qty) } : bi
    ));
  };

  const handleUpdateRate = (itemId: string, rate: number) => {
    setBillItems(prev => prev.map(bi => 
      bi.item.id === itemId ? { ...bi, unit_rate: Math.max(0, rate) } : bi
    ));
  };

  // Calculations
  const itemSubtotal = billItems.reduce((sum, bi) => sum + (bi.unit_rate * bi.invoice_qty), 0);
  const taxAmount = (itemSubtotal * (Number(taxPercent) || 0)) / 100;
  const grossTotal = Math.max(0, itemSubtotal + taxAmount - Number(discountAmount || 0) + Number(additionalCharges || 0));
  
  const retentionAmount = (grossTotal * (Number(retentionPercent) || 0)) / 100;
  let netAmount = Math.max(0, grossTotal - Number(deductionAmount || 0) - (showRetention ? retentionAmount : 0));
  if (roundOff) {
    netAmount = Math.round(netAmount);
  }

  const handleSave = () => {
    if (billItems.length === 0) {
      alert('Please include at least one item in the expense.');
      return;
    }

    const compiledItems: SubconBillItem[] = billItems.map(bi => ({
      item_id: bi.item.id,
      item_name: bi.item.item_name,
      unit_rate: bi.unit_rate,
      unit: bi.item.unit,
      billed_qty: bi.item.billed_quantity || 0,
      unbilled_qty: bi.item.quantity - (bi.item.billed_quantity || 0),
      invoice_qty: bi.invoice_qty,
      amount: bi.unit_rate * bi.invoice_qty
    }));

    const newBill: SubconBill = {
      id: `bill-${Date.now()}`,
      bill_number: voucherNo,
      voucher_no: voucherNo,
      work_order_id: workOrder.id,
      work_order_number: workOrder.wo_number,
      vendor_name: workOrder.subcon_name,
      invoice_date: billDate,
      items: compiledItems,
      item_level_tax: itemLevelTax,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      subtotal: itemSubtotal,
      discount: Number(discountAmount || 0),
      additional_charges: Number(additionalCharges || 0),
      total_amount: grossTotal,
      deduction: Number(deductionAmount || 0),
      retention_percent: showRetention ? Number(retentionPercent || 0) : 0,
      retention_amount: showRetention ? retentionAmount : 0,
      net_amount: netAmount,
      round_off: roundOff,
      cost_code: costCode,
      status: 'APPROVED',
      created_at: new Date().toISOString()
    };

    onSaveBill(newBill);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200">
          
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
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                SUB-CONTRACTOR EXPENSE
              </h3>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 bg-[#5b52f9] hover:bg-[#4b42e0] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <span>Save</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* Item Level Tax Switch */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold text-slate-700">Item Level Tax</span>
              <button
                type="button"
                onClick={() => setItemLevelTax(!itemLevelTax)}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  itemLevelTax ? 'bg-[#5b52f9]' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  itemLevelTax ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Vendor Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vendor</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">{workOrder.subcon_name}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    {new Date(billDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} {voucherNo}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingHeader(!isEditingHeader)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {isEditingHeader && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 mt-2">
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Voucher #"
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value)}
                    className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              )}
            </div>

            {/* Select Work Order Items Section */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-indigo-900 tracking-wide">
                Select Work Order Items
              </div>

              {billItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No items selected.
                </div>
              ) : (
                billItems.map(({ item, unit_rate, invoice_qty }) => {
                  const lineAmount = unit_rate * invoice_qty;
                  const unbilled = item.quantity - (item.billed_quantity || 0);

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5 relative"
                    >
                      {/* Top bar with close button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{item.item_name}</h4>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Billed : {item.billed_quantity || 0} {item.unit} | Un-Billed : {unbilled} {item.unit}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs font-bold text-slate-900">
                          ₹ {lineAmount.toLocaleString()}
                        </div>
                      </div>

                      {/* Inputs Row */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            UNIT RATE (₹)
                          </label>
                          <input
                            type="number"
                            value={unit_rate}
                            onChange={(e) => handleUpdateRate(item.id, Number(e.target.value))}
                            className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            INVOICE QTY. ({item.unit})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={invoice_qty || ''}
                            placeholder="0"
                            onChange={(e) => handleUpdateQty(item.id, Number(e.target.value))}
                            className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Calculations Box */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs font-medium">
              
              {/* Item Subtotal */}
              <div className="flex items-center justify-between text-slate-800">
                <span className="font-semibold">Item Subtotal</span>
                <span className="font-bold">₹ {itemSubtotal.toLocaleString()}</span>
              </div>

              {/* Tax selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Tax</span>
                  <select
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="p-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none font-semibold"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <span className="font-bold text-slate-800">₹ {taxAmount.toLocaleString()}</span>
              </div>

              {/* Discount toggle & input */}
              <div>
                {!showDiscount ? (
                  <button
                    type="button"
                    onClick={() => setShowDiscount(true)}
                    className="text-[#5b52f9] hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    + Discount
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-600">Discount (₹)</span>
                    <input
                      type="number"
                      value={discountAmount || ''}
                      placeholder="0"
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="w-24 text-xs p-1 text-right border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Additional Charges toggle & input */}
              <div>
                {!showAdditionalCharges ? (
                  <button
                    type="button"
                    onClick={() => setShowAdditionalCharges(true)}
                    className="text-[#5b52f9] hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    + Additional Charges
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-600">Additional Charges (₹)</span>
                    <input
                      type="number"
                      value={additionalCharges || ''}
                      placeholder="0"
                      onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                      className="w-24 text-xs p-1 text-right border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Total Amount */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>Total Amount</span>
                <span>₹ {grossTotal.toLocaleString()}</span>
              </div>

              {/* Deduction toggle */}
              <div>
                {!showDeduction ? (
                  <button
                    type="button"
                    onClick={() => setShowDeduction(true)}
                    className="text-[#5b52f9] hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    + Deduction
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-600">Deduction (₹)</span>
                    <input
                      type="number"
                      value={deductionAmount || ''}
                      placeholder="0"
                      onChange={(e) => setDeductionAmount(Number(e.target.value))}
                      className="w-24 text-xs p-1 text-right border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Retention toggle */}
              <div>
                {!showRetention ? (
                  <button
                    type="button"
                    onClick={() => setShowRetention(true)}
                    className="text-[#5b52f9] hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    + Retention
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-600">Retention (%)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={retentionPercent || ''}
                        placeholder="5"
                        onChange={(e) => setRetentionPercent(Number(e.target.value))}
                        className="w-16 text-xs p-1 text-right border border-slate-200 rounded-lg bg-white"
                      />
                      <span className="text-slate-500 font-bold">₹ {retentionAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Net Amount section */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-indigo-900">
                  <div className="flex items-center gap-1.5">
                    <span>Net Amount</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                  <span>₹ {netAmount.toLocaleString()}</span>
                </div>

                {/* Round Off checkbox */}
                <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roundOff}
                    onChange={(e) => setRoundOff(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Round Off</span>
                </label>
              </div>

              {/* Cost Code Accordion */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowCostCode(!showCostCode)}
                  className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-600" />
                    <span>Add Cost Code</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showCostCode ? 'rotate-90' : ''}`} />
                </button>

                {showCostCode && (
                  <div className="p-3 bg-slate-50 border border-t-0 border-slate-200 rounded-b-xl space-y-2 animate-in fade-in">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Budget / Expense Cost Code
                    </label>
                    <input
                      type="text"
                      value={costCode}
                      onChange={(e) => setCostCode(e.target.value)}
                      placeholder="e.g. CC-SUBCON-01"
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
