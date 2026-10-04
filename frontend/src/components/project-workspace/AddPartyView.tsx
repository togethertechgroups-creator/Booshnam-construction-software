import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Calendar, Edit2, Upload, Building2, Check, ArrowLeft, Users } from 'lucide-react';
import { ProjectTeamMember } from '../../types';
import { getStaffMembers, StaffMember } from '../../lib/staffService';
import { confirmAction, setFormDirty, clearFormDirty, confirmNavigationIfDirty } from '../../lib/dialogService';

interface AddPartyViewProps {
  onSave: (member: ProjectTeamMember) => void;
  onCancel: () => void;
  initialData?: Partial<ProjectTeamMember> | null;
  onShowToast?: (msg: string) => void;
}

export const AddPartyView: React.FC<AddPartyViewProps> = ({
  onSave,
  onCancel,
  initialData,
  onShowToast
}) => {
  // Form Fields matching user's exact uploaded screenshots
  const [partyName, setPartyName] = useState(initialData?.name || '');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [role, setRole] = useState(initialData?.role || 'Staff');

  const registeredStaff = getStaffMembers();

  // Opening Balance Drawer / Expandable state
  const [openingBalance, setOpeningBalance] = useState<string>(
    initialData?.opening_balance !== undefined ? String(initialData.opening_balance) : ''
  );
  const [balanceType, setBalanceType] = useState<'to_pay' | 'to_receive'>('to_receive');
  const [isOpeningBalanceOpen, setIsOpeningBalanceOpen] = useState(false);

  // Bank Account Drawer / Expandable state
  const [bankAccount, setBankAccount] = useState(initialData?.bank_account || '');
  const [bankIfsc, setBankIfsc] = useState(initialData?.bank_ifsc || '');
  const [bankName, setBankName] = useState(initialData?.bank_name || '');
  const [isBankOpen, setIsBankOpen] = useState(false);

  // Address Drawer / Expandable state
  const [address, setAddress] = useState(initialData?.address || '');
  const [isAddressOpen, setIsAddressOpen] = useState(false);

  // Party ID with editable toggle
  const [partyId, setPartyId] = useState(initialData?.party_id || String(Math.floor(1000 + Math.random() * 9000)));
  const [isEditingPartyId, setIsEditingPartyId] = useState(false);

  // Date of Joining
  const [dateOfJoining, setDateOfJoining] = useState(initialData?.date_of_joining || '');
  const [joiningDateType, setJoiningDateType] = useState('text');

  // Aadhaar & PAN with file upload simulations
  const [aadhaarNumber, setAadhaarNumber] = useState(initialData?.aadhaar_number || '');
  const [aadhaarFileName, setAadhaarFileName] = useState<string | null>(null);
  const [panNumber, setPanNumber] = useState(initialData?.pan_number || '');
  const [panFileName, setPanFileName] = useState<string | null>(null);

  // Statutory & Personal Details
  const [uanNumber, setUanNumber] = useState(initialData?.uan_number || '');
  const [pfNumber, setPfNumber] = useState(initialData?.pf_number || '');
  const [esiNumber, setEsiNumber] = useState(initialData?.esi_number || '');
  const [fathersName, setFathersName] = useState(initialData?.fathers_name || '');

  const aadhaarFileRef = useRef<HTMLInputElement>(null);
  const panFileRef = useRef<HTMLInputElement>(null);

  // Dirty state tracking
  useEffect(() => {
    const isDirty = Boolean(
      partyName.trim() ||
      phone.trim() ||
      email.trim() ||
      (openingBalance && openingBalance !== String(initialData?.opening_balance || '')) ||
      (bankAccount && bankAccount !== (initialData?.bank_account || '')) ||
      (address && address !== (initialData?.address || '')) ||
      (aadhaarNumber && aadhaarNumber !== (initialData?.aadhaar_number || '')) ||
      (panNumber && panNumber !== (initialData?.pan_number || ''))
    );
    if (isDirty) {
      setFormDirty(true, 'Party details form');
    } else {
      clearFormDirty();
    }
    return () => {
      clearFormDirty();
    };
  }, [partyName, phone, email, openingBalance, bankAccount, address, aadhaarNumber, panNumber, initialData]);

  const handleCancel = async () => {
    const canLeave = await confirmNavigationIfDirty();
    if (canLeave) {
      clearFormDirty();
      onCancel();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!partyName.trim()) {
      onShowToast?.('Please enter Party Name');
      return;
    }

    if (phone.trim() && phone.trim().length !== 10) {
      onShowToast?.('Phone number must be exactly 10 digits');
      return;
    }

    if (email.trim() && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      onShowToast?.('Your email is not valid. Please enter a valid email (e.g. name@gmail.com or name@domain.in)');
      return;
    }

    const confirmed = await confirmAction({
      title: initialData ? 'Update Party Member' : 'Assign Party Member',
      message: initialData 
        ? `Are you sure you want to update details for "${partyName.trim()}"?`
        : `Are you sure you want to assign "${partyName.trim()}" as ${role}?`,
      confirmText: initialData ? 'Update' : 'Assign Member',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    clearFormDirty();
    const newMember: ProjectTeamMember = {
      id: initialData?.id || `member-${Date.now()}`,
      name: partyName.trim(),
      role: role || 'Staff',
      phone: phone.trim() ? `${countryCode} ${phone.trim()}` : undefined,
      email: email.trim() || undefined,
      opening_balance: openingBalance ? Number(openingBalance) : undefined,
      bank_account: bankAccount.trim() || undefined,
      bank_ifsc: bankIfsc.trim() || undefined,
      bank_name: bankName.trim() || undefined,
      address: address.trim() || undefined,
      party_id: partyId,
      date_of_joining: dateOfJoining || undefined,
      aadhaar_number: aadhaarNumber.trim() || undefined,
      pan_number: panNumber.trim().toUpperCase() || undefined,
      uan_number: uanNumber.trim() || undefined,
      pf_number: pfNumber.trim() || undefined,
      esi_number: esiNumber.trim() || undefined,
      fathers_name: fathersName.trim() || undefined
    };

    onSave(newMember);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden animate-in fade-in duration-150">
      
      {/* Top Bar matching user's screenshot exactly:
          [✕]  ADD PARTY                          Cancel  [Save]
      */}
      <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wider uppercase">
            ADD PARTY
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>

      {/* Red Accent Line */}
      <div className="h-1 bg-red-600 w-full shrink-0" />

      {/* Form Content Area */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-5">
        
        {/* Quick Fill from Registered Staff */}
        {registeredStaff.length > 0 && !initialData && (
          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5 text-indigo-700">
                <Users className="w-3.5 h-3.5" />
                Select from Registered Staff Members
              </span>
              <span className="text-[10px] text-indigo-500 tracking-tight">Auto-fills details</span>
            </div>
            <select
              value=""
              onChange={(e) => {
                const s = registeredStaff.find(st => st.id === e.target.value);
                if (s) {
                  setPartyName(s.name);
                  setPhone(s.phone || '');
                  setEmail(s.email || '');
                  setRole(s.designation || s.role_name || 'Staff');
                  if (s.doj) setDateOfJoining(s.doj);
                  onShowToast?.(`Loaded details for ${s.name} (${s.designation || s.role_name})`);
                }
              }}
              className="w-full h-9 px-3 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">-- Choose from {registeredStaff.length} registered staff members --</option>
              {registeredStaff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.designation || s.role_name} ({s.department})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 1. PARTY (Party Name) */}
        <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
            PARTY
          </label>
          <input
            type="text"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="Party Name"
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal"
            autoFocus
          />
        </div>

        {/* 2. PHONE with Country Flag + Code Selector */}
        <div className="flex gap-3 items-center">
          {/* Country Selector: 🇮🇳 +91 ▼ */}
          <div className="relative border border-slate-200/90 rounded-xl px-3.5 py-3 bg-white flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-300 transition-all shadow-2xs shrink-0 min-w-[95px]">
            <span className="text-base">🇮🇳</span>
            <span className="text-xs font-semibold text-slate-700">{countryCode}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-700 ml-0.5" />
          </div>

          {/* Phone Input with Floating Label */}
          <div className="flex-1 relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
            <div className="absolute -top-2.5 left-3.5 bg-white px-1.5 flex items-center gap-1 z-10">
              <label className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none">
                PHONE (10 DIGITS)
              </label>
              {phone && (
                <span className={`text-[9px] tracking-tight font-bold ${phone.length === 10 ? 'text-green-600' : 'text-amber-600'}`}>
                  {phone.length}/10
                </span>
              )}
            </div>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              onKeyDown={(e) => {
                if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
                if (e.ctrlKey || e.metaKey) return;
                if (!/^[0-9]$/.test(e.key)) e.preventDefault();
              }}
              onPaste={(e) => {
                e.preventDefault();
                const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10);
                setPhone(paste);
              }}
              placeholder="10-digit Phone"
              className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal"
            />
          </div>
        </div>

        {/* 3. EMAIL */}
        <div className={`relative border rounded-xl px-4 py-3 bg-white transition-all shadow-2xs ${
          email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())
            ? 'border-red-500 focus-within:border-red-500 bg-red-50/20'
            : 'border-slate-200/90 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100'
        }`}>
          <div className="absolute -top-2.5 left-3.5 bg-white px-1.5 flex items-center gap-1 z-10">
            <label className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none">
              EMAIL
            </label>
            {email && (
              <span className={`text-[9px] font-semibold ${/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim()) ? 'text-green-600' : 'text-red-600'}`}>
                {/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim()) ? '✓ Valid' : '✕ Invalid'}
              </span>
            )}
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            placeholder="e.g. name@gmail.com or name@domain.in"
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal"
          />
        </div>
        {email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim()) && (
          <p className="-mt-1 text-[10px] text-red-600 font-medium px-1">
            ⚠️ Your email is not valid. (e.g. @gmail.com or .in)
          </p>
        )}

        {/* 4. Role / Category Dropdown (Screenshot shows "Staff ▼") */}
        <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 focus:outline-none font-normal appearance-none pr-7 cursor-pointer"
          >
            <option value="Staff">Staff</option>
            <option value="Project Manager">Project Manager</option>
            <option value="Site Engineer">Site Engineer</option>
            <option value="Site Supervisor">Site Supervisor</option>
            <option value="Safety Officer">Safety Officer</option>
            <option value="Accounts">Accounts</option>
            <option value="Quality Inspector">Quality Inspector</option>
            <option value="Subcontractor">Subcontractor</option>
            <option value="Client">Client</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none absolute right-4 top-3.5" />
        </div>

        {/* 5. Opening Balance Row */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs bg-white transition-all">
          <div
            onClick={() => setIsOpeningBalanceOpen(!isOpeningBalanceOpen)}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-semibold text-sm">₹</span>
              <span className="text-xs sm:text-sm font-medium text-slate-700">Opening Balance</span>
              {openingBalance && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  ₹{Number(openingBalance).toLocaleString()} ({balanceType === 'to_receive' ? 'To Receive' : 'To Pay'})
                </span>
              )}
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpeningBalanceOpen ? 'rotate-90' : ''}`} />
          </div>

          {isOpeningBalanceOpen && (
            <div className="px-4 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Balance Type</label>
                <select
                  value={balanceType}
                  onChange={(e) => setBalanceType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600"
                >
                  <option value="to_receive">To Receive (Debit)</option>
                  <option value="to_pay">To Pay (Credit)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 6. Bank Account Row */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs bg-white transition-all">
          <div
            onClick={() => setIsBankOpen(!isBankOpen)}
            className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-xs sm:text-sm font-medium text-slate-700">Bank Account</div>
                <div className="text-[11px] text-slate-400 tracking-tight">
                  {bankAccount ? `${bankName || 'Bank'} •••• ${bankAccount.slice(-4)}` : '--NA--'}
                </div>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isBankOpen ? 'rotate-90' : ''}`} />
          </div>

          {isBankOpen && (
            <div className="px-4 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="Enter Account Number"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600 tracking-tight"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                  placeholder="HDFC0001234"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600 uppercase tracking-tight"
                />
              </div>
            </div>
          )}
        </div>

        {/* 7. Your Address Row */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs bg-white transition-all">
          <div
            onClick={() => setIsAddressOpen(!isAddressOpen)}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <span className="text-xs sm:text-sm font-medium text-slate-700">
              {address ? address : 'Your Address'}
            </span>
            <span className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer">
              {address ? 'Edit' : '+Add'}
            </span>
          </div>

          {isAddressOpen && (
            <div className="px-4 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100 animate-in fade-in">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Street Address, City & Pincode</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete address..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600 resize-none"
              />
            </div>
          )}
        </div>

        {/* 8. PARTY ID with Edit Icon */}
        <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs flex items-center justify-between">
          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
            PARTY ID
          </label>
          <input
            type="text"
            value={partyId}
            readOnly={!isEditingPartyId}
            onChange={(e) => setPartyId(e.target.value)}
            className={`w-full bg-transparent text-sm text-slate-800 tracking-tight focus:outline-none ${
              !isEditingPartyId ? 'cursor-default' : ''
            }`}
          />
          <button
            type="button"
            onClick={() => setIsEditingPartyId(!isEditingPartyId)}
            className="p-1 text-slate-500 hover:text-red-600 rounded cursor-pointer transition-colors"
            title={isEditingPartyId ? 'Done editing' : 'Edit Party ID'}
          >
            {isEditingPartyId ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Edit2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 9. DATE OF JOINING with Calendar Icon */}
        <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs flex items-center gap-2.5">
          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
            DATE OF JOINING
          </label>
          <Calendar className="w-4 h-4 text-slate-700 shrink-0 pointer-events-none" />
          <input
            type={dateOfJoining ? 'date' : joiningDateType}
            onFocus={() => setJoiningDateType('date')}
            onBlur={() => { if (!dateOfJoining) setJoiningDateType('text'); }}
            value={dateOfJoining}
            onChange={(e) => setDateOfJoining(e.target.value)}
            placeholder="dd/mm/yyyy"
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal cursor-pointer"
          />
        </div>

        {/* 10. AADHAAR with Upload Button */}
        <div className="flex gap-2.5 items-center">
          <div className="flex-1 relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
            <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
              AADHAAR
            </label>
            <input
              type="text"
              maxLength={14}
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value)}
              placeholder="Aadhaar number"
              className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal tracking-tight"
            />
          </div>

          <input
            type="file"
            ref={aadhaarFileRef}
            className="hidden"
            accept="image/*,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setAadhaarFileName(file.name);
                onShowToast?.(`Aadhaar document attached: ${file.name}`);
              }
            }}
          />
          <button
            type="button"
            onClick={() => aadhaarFileRef.current?.click()}
            className={`p-3 border rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer ${
              aadhaarFileName
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200/90 bg-white hover:bg-slate-50 text-red-600'
            }`}
            title={aadhaarFileName ? `Attached: ${aadhaarFileName}` : 'Upload Aadhaar'}
          >
            {aadhaarFileName ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Upload className="w-4 h-4" />}
          </button>
        </div>

        {/* 11. PAN with Upload Button */}
        <div className="flex gap-2.5 items-center">
          <div className="flex-1 relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
            <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
              PAN
            </label>
            <input
              type="text"
              maxLength={10}
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
              placeholder="PAN number"
              className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal uppercase tracking-tight"
            />
          </div>

          <input
            type="file"
            ref={panFileRef}
            className="hidden"
            accept="image/*,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPanFileName(file.name);
                onShowToast?.(`PAN document attached: ${file.name}`);
              }
            }}
          />
          <button
            type="button"
            onClick={() => panFileRef.current?.click()}
            className={`p-3 border rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer ${
              panFileName
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200/90 bg-white hover:bg-slate-50 text-red-600'
            }`}
            title={panFileName ? `Attached: ${panFileName}` : 'Upload PAN'}
          >
            {panFileName ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Upload className="w-4 h-4" />}
          </button>
        </div>

        {/* 12. UAN NUMBER */}
        <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
            UAN NUMBER
          </label>
          <input
            type="text"
            value={uanNumber}
            onChange={(e) => setUanNumber(e.target.value)}
            placeholder="UAN Number"
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal tracking-tight"
          />
        </div>

        {/* 13. PF NUMBER */}
        <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
            PF NUMBER
          </label>
          <input
            type="text"
            value={pfNumber}
            onChange={(e) => setPfNumber(e.target.value)}
            placeholder="PF Number"
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal tracking-tight"
          />
        </div>

        {/* 14. ESI NUMBER */}
        <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
            ESI NUMBER
          </label>
          <input
            type="text"
            value={esiNumber}
            onChange={(e) => setEsiNumber(e.target.value)}
            placeholder="ESI Number"
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal tracking-tight"
          />
        </div>

        {/* 15. FATHER'S NAME */}
        <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
            FATHER'S NAME
          </label>
          <input
            type="text"
            value={fathersName}
            onChange={(e) => setFathersName(e.target.value)}
            placeholder="Father's Name"
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal"
          />
        </div>

      </div>

    </div>
  );
};
