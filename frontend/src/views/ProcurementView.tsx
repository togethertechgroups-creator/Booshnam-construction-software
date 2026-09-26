import React, { useState } from 'react';
import { 
  ShoppingCart, ArrowRight, CheckCircle2, ShieldCheck, 
  PackageCheck, FileText, AlertTriangle, Layers, Plus, 
  DollarSign, Check, X
} from 'lucide-react';
import { MaterialRequest, PurchaseOrder, GoodsReceiptNote, Invoice, StockItem } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';

interface ProcurementViewProps {
  materialRequests: MaterialRequest[];
  purchaseOrders: PurchaseOrder[];
  grns: GoodsReceiptNote[];
  invoices: Invoice[];
  stockItems: StockItem[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  initialTab?: 'flow' | 'orders' | 'invoices' | 'stock';
}

export const ProcurementView: React.FC<ProcurementViewProps> = ({
  materialRequests,
  purchaseOrders,
  grns,
  invoices,
  stockItems,
  isSidebarOpen,
  onToggleSidebar,
  initialTab = 'flow',
}) => {
  const [activeTab, setActiveTab] = useState<'flow' | 'orders' | 'invoices' | 'stock'>(initialTab);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice>(invoices[0]);
  const [matchDone, setMatchDone] = useState<boolean>(true);

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Edge-to-edge Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand text-white text-[10px] font-bold rounded">
                SUPPLY CHAIN
              </span>
              <h1 className="text-xl font-bold text-slate-900">Procurement & Material Operations</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              End-to-End loop: Site Material Request → Approval → PO → GRN → 3-Way Match Invoice → Site Stock.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'flow' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              7-Step Flow
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'orders' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              POs ({purchaseOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'invoices' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              3-Way Match ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'stock' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Warehouse Stock ({stockItems.length})
            </button>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <UserProfileDropdown showBell={true} />
        </div>
      </div>

      {/* Tab 1: 7-Step Interactive Visual Flow */}
      {activeTab === 'flow' && (
        <div className="p-6 space-y-6">
          {/* Step Breadcrumb Graphic */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Procurement Lifecycle Pipeline
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs font-semibold">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-800">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Step 1</div>
                <div className="mt-1">Material Request</div>
                <div className="text-[10px] text-emerald-700 font-normal mt-0.5">MR-0012 Approved</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-800">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Step 2</div>
                <div className="mt-1">Vendor RFQ</div>
                <div className="text-[10px] text-emerald-700 font-normal mt-0.5">Tata Tiscon Selected</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-800">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Step 3</div>
                <div className="mt-1">Purchase Order</div>
                <div className="text-[10px] text-emerald-700 font-normal mt-0.5">PO-0089 Issued</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-800">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Step 4</div>
                <div className="mt-1">Site GRN Receipt</div>
                <div className="text-[10px] text-emerald-700 font-normal mt-0.5">GRN-0045 Inspected</div>
              </div>
              <div className="bg-brand-50 border border-brand-200 p-3 rounded-lg text-brand font-bold">
                <div className="text-[10px] uppercase text-brand">Step 5</div>
                <div className="mt-1">3-Way Match</div>
                <div className="text-[10px] text-brand-dark font-normal mt-0.5">Verified 100%</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-700">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Step 6 & 7</div>
                <div className="mt-1">Payment & Stock</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Ledger Updated</div>
              </div>
            </div>
          </div>

          {/* 3-Way Match Live Verification Widget */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  3-Way Match Audit Screen (PO vs GRN vs Invoice)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated verification prevents site leakage, over-billing, and quantity variances.
                </p>
              </div>

              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full flex items-center gap-1.5 self-start sm:self-auto">
                <Check className="w-4 h-4" /> 3-Way Match Verified
              </span>
            </div>

            {/* The 3 Columns */}
            {!selectedInvoice ? (
              <div className="p-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-slate-200">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No invoices pending 3-Way Match Audit</p>
                <p className="text-xs text-slate-400 mt-1">When Purchase Orders, Goods Receipt Notes, and Vendor Invoices are created, matching verification will appear here.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Doc 1: Purchase Order */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">1. Purchase Order (PO)</span>
                      <span className="font-mono text-xs text-brand font-bold">{selectedInvoice.po_number}</span>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-200/80 text-slate-600">
                      <div>Vendor: <strong>{selectedInvoice.vendor_name}</strong></div>
                      <div>Item: <strong>Consignment Order</strong></div>
                      <div>Total Ordered: <strong>₹{selectedInvoice.total_amount.toLocaleString('en-IN')}</strong></div>
                    </div>
                  </div>

                  {/* Doc 2: GRN Receipt */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">2. Goods Receipt Note</span>
                      <span className="font-mono text-xs text-brand font-bold">{selectedInvoice.grn_number || 'Direct Receipt'}</span>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-200/80 text-slate-600">
                      <div>Received: <strong>Site Delivery Verified</strong></div>
                      <div className="font-bold text-emerald-700 pt-1">Status: Inspected & Verified</div>
                    </div>
                  </div>

                  {/* Doc 3: Vendor Invoice */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">3. Vendor Invoice</span>
                      <span className="font-mono text-xs text-brand font-bold">{selectedInvoice.invoice_number}</span>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-200/80 text-slate-600">
                      <div>Invoice Ref: <strong>{selectedInvoice.vendor_invoice_ref}</strong></div>
                      <div className="font-bold text-slate-900 pt-1">Total Payable: ₹{selectedInvoice.total_amount.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                  <div>
                    <strong>3-Way Matching Result:</strong> Verified with linked Purchase Order and Site Delivery Note. Approved for accounts payout.
                  </div>
                  <button className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold transition-colors">
                    Approve Payment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Purchase Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm">Purchase Orders (PO) Register</h3>
            <button className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Generate PO</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Expected Delivery</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{po.po_number}</td>
                    <td className="py-3 px-4">{po.project_name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{po.vendor_name}</td>
                    <td className="py-3 px-4 text-slate-500">{po.order_date}</td>
                    <td className="py-3 px-4 text-slate-500">{po.expected_delivery_date}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{po.total_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm">Vendor Invoices & 3-Way Match Verification</h3>
          </div>

          <div className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">{inv.invoice_number}</span>
                    <span className="text-slate-400 text-xs">({inv.vendor_invoice_ref})</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                      {inv.match_status}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      inv.payment_status === 'PAID' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inv.payment_status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 mt-1">
                    Vendor: <strong>{inv.vendor_name}</strong> • Linked PO: <strong>{inv.po_number}</strong> • GRN: <strong>{inv.grn_number || 'Direct'}</strong>
                  </div>
                  {inv.match_notes && (
                    <div className="text-[11px] text-emerald-700 mt-1">{inv.match_notes}</div>
                  )}
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-base text-slate-900">
                    ₹{inv.total_amount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400">Due: {inv.due_date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Site Stock & Inventory */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm">Site Yard Stock Levels</h3>
            <button className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Material to Crew</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Material Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Current Balance</th>
                  <th className="py-3 px-4 text-right">Min Threshold</th>
                  <th className="py-3 px-4">Stock Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {stockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.item_name}</td>
                    <td className="py-3 px-4">{item.category}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {item.current_quantity} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {item.minimum_threshold} {item.unit}
                    </td>
                    <td className="py-3 px-4">
                      {item.is_low_stock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 flex items-center gap-1 w-max">
                          <AlertTriangle className="w-3 h-3" /> Low Stock - Reorder
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 w-max">
                          Optimal Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
