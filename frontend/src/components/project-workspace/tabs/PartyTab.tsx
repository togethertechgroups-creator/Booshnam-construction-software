import React, { useState } from 'react';
import { 
  Users, Plus, Phone, Mail, Search, Filter, 
  Building2, ArrowDownRight, ArrowUpRight, Check, X, FileText 
} from 'lucide-react';
import { Project, Party } from '../../../types';
import { CustomSelect } from '../../CustomSelect';

interface PartyTabProps {
  project: Project;
  onShowToast?: (msg: string) => void;
}

const DEFAULT_PARTIES: Party[] = [];

export const PartyTab: React.FC<PartyTabProps> = ({ project, onShowToast }) => {
  const [parties, setParties] = useState<Party[]>(DEFAULT_PARTIES);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  // New Party Form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'CLIENT' | 'SUBCONTRACTOR' | 'SUPPLIER' | 'CONSULTANT'>('SUPPLIER');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newBalanceType, setNewBalanceType] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE');
  const [newBalance, setNewBalance] = useState<number>(0);

  const totalReceivables = parties
    .filter(p => p.balance_type === 'RECEIVABLE')
    .reduce((sum, p) => sum + p.current_balance, 0);

  const totalPayables = parties
    .filter(p => p.balance_type === 'PAYABLE')
    .reduce((sum, p) => sum + p.current_balance, 0);

  const filteredParties = parties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.contact_person.toLowerCase().includes(search.toLowerCase()) ||
                          p.phone.includes(search);
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAddParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    if (newPhone && newPhone.length !== 10) {
      onShowToast?.('Phone number must be exactly 10 digits');
      return;
    }

    if (newEmail && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newEmail.trim())) {
      onShowToast?.('Your email is not valid. Please enter a valid email (e.g. name@gmail.com or name@domain.in)');
      return;
    }

    const newPty: Party = {
      id: `pty-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      contact_person: newContact.trim() || newName.trim(),
      phone: newPhone.trim() || '+91 98000 00000',
      email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      gstin: newGstin.trim() || '33AAAAA0000A1Z5',
      balance_type: newBalanceType,
      current_balance: Number(newBalance) || 0,
      city: 'Chennai',
      notes: 'New party added to project directory.'
    };

    setParties([...parties, newPty]);
    onShowToast?.(`Party "${newPty.name}" added successfully!`);
    setIsAddOpen(false);

    // Reset
    setNewName('');
    setNewContact('');
    setNewPhone('');
    setNewEmail('');
    setNewGstin('');
    setNewBalance(0);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">
              DIRECTORY
            </span>
            <h2 className="text-lg font-bold text-slate-900">Project Parties & Stakeholders</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Directory of Clients, Subcontractors, Material Suppliers, and Consultants with balances for {project.client_name || project.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Party</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Stakeholders</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{parties.length} Parties</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Clients, subcons, suppliers</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Receivable (Client)</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-700 mt-1">₹ {totalReceivables.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Outstanding to collect</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Payable (Vendors/Subcons)</div>
          <div className="text-2xl font-bold tracking-tight text-rose-600 mt-1">₹ {totalPayables.toLocaleString()}</div>
          <div className="text-[10px] text-rose-500 font-semibold mt-0.5">Due to suppliers & labor</div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search party by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'CLIENT', 'SUBCONTRACTOR', 'SUPPLIER', 'CONSULTANT'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Parties Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Party & Company</th>
                <th className="py-3.5 px-4 w-32">Category</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4 w-36">GSTIN / Tax ID</th>
                <th className="py-3.5 px-4 text-right w-36">Balance (₹)</th>
                <th className="py-3.5 px-4 text-right w-28">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No parties, suppliers, or subcontractors recorded for this project yet.
                  </td>
                </tr>
              ) : (
                filteredParties.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500">{p.contact_person}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.category === 'CLIENT' ? 'bg-emerald-100 text-emerald-800' :
                        p.category === 'SUBCONTRACTOR' ? 'bg-indigo-100 text-indigo-800' :
                        p.category === 'SUPPLIER' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{p.phone}</span>
                      </div>
                      {p.email && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{p.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 tracking-tight text-slate-600 text-[11px]">
                      {p.gstin || 'Unregistered'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className={`tracking-tight font-bold text-xs ${
                        p.balance_type === 'RECEIVABLE' ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        ₹ {p.current_balance.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.balance_type === 'RECEIVABLE' ? 'Receivable' : 'Payable'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedParty(p)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Statement
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PARTY STATEMENT MODAL */}
      {selectedParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">{selectedParty.name}</h3>
                  <span className="px-2 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                    {selectedParty.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">GSTIN: {selectedParty.gstin || 'N/A'} • {selectedParty.phone}</p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedParty(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Statement Summary */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Current Balance:</span>
                <div className={`text-base tracking-tight font-black ${
                  selectedParty.balance_type === 'RECEIVABLE' ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  ₹ {selectedParty.current_balance.toLocaleString()} ({selectedParty.balance_type})
                </div>
              </div>
              <button
                type="button"
                onClick={() => onShowToast?.(`Downloaded party statement PDF for ${selectedParty.name}`)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Download Statement
              </button>
            </div>

            {/* Simulated Recent Transactions */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">Recent Transactions History</div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Payment Issued (Voucher #VN-104)</div>
                    <div className="text-[10px] text-slate-400">2026-05-10 • Mode: NEFT</div>
                  </div>
                  <div className="tracking-tight font-bold text-slate-800">₹ 85,000</div>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Invoice Received (Challan #CH-882)</div>
                    <div className="text-[10px] text-slate-400">2026-05-02 • 150 Bags Cement</div>
                  </div>
                  <div className="tracking-tight font-bold text-rose-600">- ₹ 67,500</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedParty(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PARTY MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Add New Party</h3>
                  <p className="text-xs text-slate-500">{project.name}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddParty} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Party Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kaveri ReadyMix Concrete Ltd"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <CustomSelect
                    value={newCategory}
                    onChange={(val) => setNewCategory(val as any)}
                    options={[
                      { label: 'Client', value: 'CLIENT' },
                      { label: 'Subcontractor', value: 'SUBCONTRACTOR' },
                      { label: 'Material Supplier', value: 'SUPPLIER' },
                      { label: 'Consultant / Architect', value: 'CONSULTANT' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Senthil Kumar"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Phone Number</label>
                    {newPhone && (
                      <span className={`text-[10px] tracking-tight font-bold ${newPhone.length === 10 ? 'text-green-600' : 'text-amber-600'}`}>
                        {newPhone.length}/10
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    placeholder="9840122334"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={(e) => {
                      if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
                      if (e.ctrlKey || e.metaKey) return;
                      if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10);
                      setNewPhone(paste);
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                    {newEmail && (
                      <span className={`text-[9px] font-semibold ${/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newEmail.trim()) ? 'text-green-600' : 'text-red-600'}`}>
                        {/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newEmail.trim()) ? '✓ Valid' : '✕ Invalid'}
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    placeholder="contact@gmail.com or info@party.in"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value.trim())}
                    className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none transition-colors ${
                      newEmail && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newEmail.trim())
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                        : 'border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                    }`}
                  />
                  {newEmail && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newEmail.trim()) && (
                    <p className="text-[10px] text-red-600 mt-1 font-medium">
                      ⚠️ Your email is not valid. (e.g. @gmail.com or .in)
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="33AAAAA0000A1Z5"
                    value={newGstin}
                    onChange={(e) => setNewGstin(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    value={newBalance}
                    onChange={(e) => setNewBalance(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Party</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
