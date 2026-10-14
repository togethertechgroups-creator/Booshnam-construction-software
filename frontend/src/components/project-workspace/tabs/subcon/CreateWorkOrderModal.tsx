import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Calendar, Edit2, UploadCloud, Check, Plus, UserPlus, Phone, Briefcase } from 'lucide-react';
import { SubconWorkOrder } from '../../../../types';
import { getFinanceParties, saveFinanceParties, PartyRecord, ensurePartyExists } from '../../../../lib/financeSyncService';

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newWO: Partial<SubconWorkOrder>) => void;
  nextWoNumber?: string;
}

interface DisplayParty {
  id: string;
  name: string;
  phone?: string;
  role: string;
  avatarText: string;
  avatarBg: string;
}

const DEFAULT_DEMO_PARTIES: DisplayParty[] = [
  {
    id: 'pty-lickson',
    name: 'Lickson',
    phone: '9003232658',
    role: 'Contractor',
    avatarText: 'L',
    avatarBg: 'bg-[#1e293b]'
  },
  {
    id: 'pty-sathish',
    name: 'SATHISH',
    role: 'Contractor',
    avatarText: 'S',
    avatarBg: 'bg-[#1e293b]'
  },
  {
    id: 'pty-prasath',
    name: 'PRASATH',
    role: 'Contractor',
    avatarText: 'P',
    avatarBg: 'bg-[#1e293b]'
  },
  {
    id: 'pty-sculpture',
    name: 'BOOSHNAM SCULPTURE',
    role: 'Investor',
    avatarText: 'BS',
    avatarBg: 'bg-[#0d9488]'
  }
];

export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  nextWoNumber = '#WO--63'
}) => {
  const [woNumber, setWoNumber] = useState(nextWoNumber);
  const [isEditingWoNo, setIsEditingWoNo] = useState(false);
  const [woDate, setWoDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Selected party state
  const [selectedParty, setSelectedParty] = useState<DisplayParty | null>(null);
  const [isPartySearchOpen, setIsPartySearchOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState('');

  // Tax and media state
  const [taxType, setTaxType] = useState<'ITEM_LEVEL' | 'BILL_LEVEL'>('ITEM_LEVEL');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  // Create new party inline modal state
  const [isCreatePartyModalOpen, setIsCreatePartyModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyRole, setNewPartyRole] = useState<'Contractor' | 'Investor' | 'Supplier' | 'Client'>('Contractor');

  // Search input ref to focus when opened
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load finance parties merged with default demo parties
  const allParties = useMemo<DisplayParty[]>(() => {
    const finParties = getFinanceParties();
    const result: DisplayParty[] = [...DEFAULT_DEMO_PARTIES];

    finParties.forEach(p => {
      if (!result.some(r => r.name.toLowerCase().trim() === p.name.toLowerCase().trim())) {
        const role = p.type === 'Subcontractor' || p.type === 'Vendor' ? 'Contractor' :
                     p.type === 'Supplier' ? 'Supplier' :
                     p.type === 'Client' ? 'Client' : 'Investor';
        const initials = p.name.slice(0, 2).toUpperCase();
        result.push({
          id: p.id,
          name: p.name,
          phone: p.phone,
          role,
          avatarText: initials,
          avatarBg: role === 'Investor' ? 'bg-[#0d9488]' : 'bg-[#1e293b]'
        });
      }
    });

    return result;
  }, [isCreatePartyModalOpen]);

  // Filtered parties based on query
  const filteredParties = useMemo(() => {
    if (!partySearchQuery.trim()) return allParties;
    const q = partySearchQuery.toLowerCase().trim();
    return allParties.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q)) ||
      p.role.toLowerCase().includes(q)
    );
  }, [allParties, partySearchQuery]);

  useEffect(() => {
    if (isPartySearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isPartySearchOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileNames = Array.from(e.target.files).map(f => f.name);
      setUploadedFiles(prev => [...prev, ...fileNames]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const partyNameToUse = selectedParty?.name || partySearchQuery.trim();
    if (!partyNameToUse) {
      setIsPartySearchOpen(true);
      return;
    }

    onSubmit({
      wo_number: woNumber.trim() || nextWoNumber,
      work_order_date: woDate,
      subcon_name: partyNameToUse,
      work_order_title: '--',
      trade_scope: 'General Subcontract Scope',
      tax_type: taxType,
      media_urls: uploadedFiles,
      contract_amount: 0,
      work_completed_percent: 0,
      billed_amount: 0,
      approval_status: 'Approved',
      status: 'ACTIVE',
      items: [],
      milestones: [],
      bills: [],
      materials: []
    });
    onClose();
  };

  const handleSelectParty = (p: DisplayParty) => {
    setSelectedParty(p);
    setIsPartySearchOpen(false);
    setPartySearchQuery('');
  };

  const handleSaveNewParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) return;

    const trimmed = newPartyName.trim();
    const roleType = newPartyRole === 'Contractor' ? 'Subcontractor' :
                     newPartyRole === 'Supplier' ? 'Supplier' :
                     newPartyRole === 'Investor' ? 'Client' : 'Client';

    const created = ensurePartyExists(trimmed, undefined, roleType as any);
    if (newPartyPhone.trim()) {
      created.phone = newPartyPhone.trim();
      const parties = getFinanceParties();
      const updated = parties.map(p => p.id === created.id ? created : p);
      saveFinanceParties(updated);
    }

    const initials = trimmed.slice(0, 2).toUpperCase();
    const newDisplay: DisplayParty = {
      id: created.id,
      name: trimmed,
      phone: newPartyPhone.trim() || undefined,
      role: newPartyRole,
      avatarText: initials,
      avatarBg: newPartyRole === 'Investor' ? 'bg-[#0d9488]' : 'bg-[#1e293b]'
    };

    setSelectedParty(newDisplay);
    setIsCreatePartyModalOpen(false);
    setIsPartySearchOpen(false);
    setNewPartyName('');
    setNewPartyPhone('');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base">Sub-Con Workorder</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Workorder Number & Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Workorder Number */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  WORKORDER NUMBER <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:border-indigo-500">
                  <input
                    type="text"
                    required
                    value={woNumber}
                    onChange={(e) => setWoNumber(e.target.value)}
                    readOnly={!isEditingWoNo}
                    className="w-full text-xs font-semibold text-slate-900 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingWoNo(!isEditingWoNo)}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Edit WO #"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Workorder Date */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  WORKORDER DATE <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-white focus-within:border-indigo-500">
                  <Calendar className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="date"
                    required
                    value={woDate}
                    onChange={(e) => setWoDate(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

            </div>

            {/* PARTY SELECTION SECTION (Matches user's screenshot exactly!) */}
            <div className="space-y-1 relative">
              
              {/* Selected Party View (When not searching) */}
              {!isPartySearchOpen && selectedParty ? (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    PARTY NAME
                  </label>
                  <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2.5 bg-white hover:border-indigo-400 transition-colors">
                    <span className="text-xs font-bold text-slate-900 tracking-wide">
                      {selectedParty.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPartySearchOpen(true);
                        setPartySearchQuery('');
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="Change Party"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Search / Dropdown View (Active when user clicks or types 'S') */
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    PARTY NAME <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Search Input with Clear Button */}
                  <div className="relative flex items-center border border-slate-300 rounded-xl px-3 py-2 bg-white focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search Contractor or Party..."
                      value={partySearchQuery}
                      onChange={(e) => setPartySearchQuery(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-900 bg-transparent focus:outline-none"
                    />
                    {partySearchQuery ? (
                      <button
                        type="button"
                        onClick={() => setPartySearchQuery('')}
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : selectedParty ? (
                      <button
                        type="button"
                        onClick={() => setIsPartySearchOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {/* Dropdown Card Container */}
                  <div className="border border-slate-200 rounded-xl shadow-lg bg-white overflow-hidden divide-y divide-slate-100 max-h-64 flex flex-col">
                    
                    {/* Scrollable Party Items List */}
                    <div className="overflow-y-auto max-h-48 divide-y divide-slate-50">
                      {filteredParties.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No matching parties found for "{partySearchQuery}".
                        </div>
                      ) : (
                        filteredParties.map((party) => (
                          <div
                            key={party.id}
                            onClick={() => handleSelectParty(party)}
                            className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
                          >
                            {/* Avatar & Name Info */}
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${party.avatarBg} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                                {party.avatarText}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {party.name}
                                </div>
                                {party.phone && (
                                  <div className="text-[11px] text-slate-500 font-medium">
                                    {party.phone}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Role Label */}
                            <div className="text-xs text-slate-500 font-medium">
                              {party.role}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Bottom: Dashed Purple + Create Party Button (Matches Screenshot) */}
                    <div className="p-2.5 bg-slate-50/50">
                      <button
                        type="button"
                        onClick={() => {
                          setNewPartyName(partySearchQuery.trim());
                          setIsCreatePartyModalOpen(true);
                        }}
                        className="w-full py-2.5 border border-dashed border-[#5b52f9] text-[#5b52f9] bg-white hover:bg-indigo-50/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-99"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Create Party</span>
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Select Tax Type */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-700">
                Select Tax Type:
              </label>
              <div className="flex items-center gap-6 text-xs text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="taxType"
                    value="ITEM_LEVEL"
                    checked={taxType === 'ITEM_LEVEL'}
                    onChange={() => setTaxType('ITEM_LEVEL')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Item Level Tax</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="taxType"
                    value="BILL_LEVEL"
                    checked={taxType === 'BILL_LEVEL'}
                    onChange={() => setTaxType('BILL_LEVEL')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Bill Level Tax</span>
                </label>
              </div>
            </div>

            {/* Attach Media */}
            <div className="space-y-1.5 pt-1">
              <label className="relative flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/20 transition-colors cursor-pointer group">
                <UploadCloud className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform mb-1" />
                <span className="text-xs font-semibold text-slate-700">Attach Media</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Upload contract, drawings, or quotes (PDF, PNG, JPG)</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {uploadedFiles.map((fn, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-md font-medium border border-indigo-200">
                      {fn}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Create Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-[#5b52f9] hover:bg-[#4b42e0] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <span>Create Workorder</span>
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* CREATE NEW PARTY MODAL (When clicking + Create Party) */}
      {isCreatePartyModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Create New Party</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatePartyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewParty} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Party / Contractor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lickson Earthworks"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="tel"
                    placeholder="e.g. 9003232658"
                    value={newPartyPhone}
                    onChange={(e) => setNewPartyPhone(e.target.value)}
                    className="w-full text-xs bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Party Role / Category</label>
                <select
                  value={newPartyRole}
                  onChange={(e) => setNewPartyRole(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none font-medium"
                >
                  <option value="Contractor">Contractor (Subcontractor)</option>
                  <option value="Supplier">Supplier / Vendor</option>
                  <option value="Investor">Investor</option>
                  <option value="Client">Client</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatePartyModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#5b52f9] hover:bg-[#4b42e0] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
