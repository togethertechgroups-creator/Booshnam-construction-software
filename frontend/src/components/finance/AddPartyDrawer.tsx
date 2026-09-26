import React, { useState } from 'react';
import { X, Calendar, Upload, Edit2, ChevronDown, Check, Plus, Trash2, MapPin } from 'lucide-react';

export interface PartyFormData {
  id?: string;
  name: string;
  phone: string;
  countryCode: string;
  email: string;
  partyType: 'Client' | 'Staff' | 'Vendor' | 'Subcontractor' | 'Supplier' | 'Consultant';
  address: string;
  partyId: string;
  dateOfJoining: string;
  aadhaarNumber: string;
  aadhaarFile?: string;
  panNumber: string;
  panFile?: string;
  openingBalance: number;
  status: 'To Receive' | 'To Pay' | 'Settled' | 'Advance Paid' | 'Advance Received';
}

interface AddPartyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveParty: (party: PartyFormData) => void;
  nextPartyId?: string;
}

export const AddPartyDrawer: React.FC<AddPartyDrawerProps> = ({
  isOpen,
  onClose,
  onSaveParty,
  nextPartyId = '1641'
}) => {
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [partyType, setPartyType] = useState<'Client' | 'Staff' | 'Vendor' | 'Subcontractor' | 'Supplier' | 'Consultant'>('Client');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  
  // Address fields
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('Chennai');
  const [state, setState] = useState('Tamil Nadu');
  const [pincode, setPincode] = useState('');
  
  // Party ID & Joining
  const [partyId, setPartyId] = useState(nextPartyId);
  const [isPartyIdEditable, setIsPartyIdEditable] = useState(false);
  const [dateOfJoining, setDateOfJoining] = useState(() => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  });

  // KYC
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarFileName, setAadhaarFileName] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [panFileName, setPanFileName] = useState('');

  // Opening Balance & Status
  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [status, setStatus] = useState<'To Receive' | 'To Pay' | 'Settled' | 'Advance Paid' | 'Advance Received'>('Settled');

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const handleAadhaarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAadhaarFileName(e.target.files[0].name);
    }
  };

  const handlePanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPanFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Party name is required';
    }

    if (phone.trim() && phone.replace(/\D/g, '').length !== 10) {
      newErrors.phone = 'Please enter a 10-digit phone number';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Compose address
    const fullAddress = [addressLine, city, state, pincode].filter(Boolean).join(', ');

    const parsedBalance = parseFloat(openingBalance) || 0;
    let computedStatus = status;
    if (parsedBalance > 0 && status === 'Settled') {
      computedStatus = partyType === 'Client' ? 'To Receive' : 'To Pay';
    }

    const newParty: PartyFormData = {
      name: name.trim(),
      phone: phone.trim(),
      countryCode,
      email: email.trim(),
      partyType,
      address: fullAddress,
      partyId: partyId.trim() || nextPartyId,
      dateOfJoining: dateOfJoining || new Date().toLocaleDateString('en-GB'),
      aadhaarNumber: aadhaarNumber.trim(),
      aadhaarFile: aadhaarFileName,
      panNumber: panNumber.trim(),
      panFile: panFileName,
      openingBalance: parsedBalance,
      status: computedStatus
    };

    onSaveParty(newParty);
    onClose();
  };

  const partyTypes: Array<'Client' | 'Staff' | 'Vendor' | 'Subcontractor' | 'Supplier' | 'Consultant'> = [
    'Client',
    'Staff',
    'Vendor',
    'Subcontractor',
    'Supplier',
    'Consultant'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-md bg-white shadow-2xl z-10 flex flex-col h-full transform transition-transform duration-200 ease-out border-l border-slate-200">
        
        {/* Top Header matching Image 2 */}
        <div className="px-5 py-3.5 bg-white flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900 p-1 -ml-1 rounded-md transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase select-none">
              ADD PARTY
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>

        {/* Purple Accent Bar right below header */}
        <div className="h-1 bg-red-600 w-full shrink-0" />

        {/* Form Body with Notched Floating Outlines */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

          {/* 1. PARTY NAME */}
          <div className="relative border border-slate-300 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white">
            <span className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
              PARTY
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
              placeholder="Party Name"
              className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
          </div>
          {errors.name && <p className="text-[11px] text-red-500 -mt-2.5 pl-2">{errors.name}</p>}

          {/* 2. PHONE NUMBER with Country Selector */}
          <div className="grid grid-cols-12 gap-3">
            {/* Country code box */}
            <div className="col-span-4 border border-slate-300 rounded-xl px-2.5 py-2.5 flex items-center justify-between bg-white text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">🇮🇳</span>
                <span className="text-xs font-semibold text-slate-800">{countryCode}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </div>

            {/* Phone input box */}
            <div className="col-span-8 relative border border-slate-300 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white">
              <span className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
                PHONE
              </span>
              <input
                type="tel"
                value={phone}
                onChange={e => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                }}
                placeholder="Phone"
                className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />
            </div>
          </div>
          {errors.phone && <p className="text-[11px] text-red-500 -mt-2.5 pl-2">{errors.phone}</p>}

          {/* 3. EMAIL */}
          <div className="relative border border-slate-300 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white">
            <span className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
              EMAIL
            </span>
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
              }}
              placeholder="Email"
              className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
          </div>
          {errors.email && <p className="text-[11px] text-red-500 -mt-2.5 pl-2">{errors.email}</p>}

          {/* 4. SELECT PARTY TYPE */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-3 text-left flex items-center justify-between text-xs text-slate-700 bg-white hover:border-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500 transition-all cursor-pointer"
            >
              <span className={partyType ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                {partyType || 'Select Party Type'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {isTypeDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                {partyTypes.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setPartyType(t);
                      setIsTypeDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-red-50 transition-colors ${
                      partyType === t ? 'text-red-600 font-bold bg-red-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{t}</span>
                    {partyType === t && <Check className="w-3.5 h-3.5 text-red-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5. YOUR ADDRESS (+Add) */}
          <div className="border border-slate-300 rounded-xl p-3 bg-white transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Your Address</span>
              <button
                type="button"
                onClick={() => setIsAddressExpanded(!isAddressExpanded)}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5 cursor-pointer"
              >
                {isAddressExpanded ? 'Done' : '+Add'}
              </button>
            </div>

            {/* Address fields if expanded */}
            {isAddressExpanded ? (
              <div className="mt-3 space-y-2.5 pt-2.5 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Street / Building / Plot No."
                  value={addressLine}
                  onChange={e => setAddressLine(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-600"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-600"
                  />
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={pincode}
                    onChange={e => setPincode(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>
            ) : (
              addressLine && (
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {addressLine}, {city} {pincode}
                </p>
              )
            )}
          </div>

          {/* 6. PARTY ID */}
          <div className="relative border border-slate-300 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white flex items-center justify-between">
            <span className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
              PARTY ID
            </span>
            <input
              type="text"
              value={partyId}
              readOnly={!isPartyIdEditable}
              onChange={e => setPartyId(e.target.value)}
              className={`w-full text-xs font-semibold focus:outline-none bg-transparent ${
                isPartyIdEditable ? 'text-red-600' : 'text-slate-800'
              }`}
            />
            <button
              type="button"
              onClick={() => setIsPartyIdEditable(!isPartyIdEditable)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              title="Edit Party ID"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {/* 7. DATE OF JOINING */}
          <div className="relative border border-slate-300 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white flex items-center gap-2">
            <span className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
              DATE OF JOINING
            </span>
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              value={dateOfJoining}
              onChange={e => setDateOfJoining(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
          </div>

          {/* 8. AADHAAR */}
          <div className="relative border border-slate-300 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white flex items-center justify-between gap-2">
            <span className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
              AADHAAR
            </span>
            <input
              type="text"
              value={aadhaarNumber}
              onChange={e => setAadhaarNumber(e.target.value)}
              placeholder="Aadhaar number"
              className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
            <label className="border border-red-200 bg-red-50/50 hover:bg-red-100 text-red-600 p-2 rounded-lg cursor-pointer transition-colors shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleAadhaarUpload}
              />
            </label>
          </div>
          {aadhaarFileName && (
            <p className="text-[10px] text-emerald-600 font-semibold -mt-2.5 pl-2 truncate">
              ✓ Attached: {aadhaarFileName}
            </p>
          )}

          {/* 9. PAN */}
          <div className="relative border border-slate-300 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white flex items-center justify-between gap-2">
            <span className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
              PAN
            </span>
            <input
              type="text"
              value={panNumber}
              onChange={e => setPanNumber(e.target.value.toUpperCase())}
              placeholder="PAN number"
              className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent uppercase"
            />
            <label className="border border-red-200 bg-red-50/50 hover:bg-red-100 text-red-600 p-2 rounded-lg cursor-pointer transition-colors shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handlePanUpload}
              />
            </label>
          </div>
          {panFileName && (
            <p className="text-[10px] text-emerald-600 font-semibold -mt-2.5 pl-2 truncate">
              ✓ Attached: {panFileName}
            </p>
          )}

          {/* 10. OPENING BALANCE & STATUS */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Initial Ledger Balance (Optional)
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-600 font-medium block mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-600 font-medium block mb-1">Initial Status</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
                >
                  <option value="Settled">Settled</option>
                  <option value="To Receive">To Receive</option>
                  <option value="To Pay">To Pay</option>
                  <option value="Advance Paid">Advance Paid</option>
                  <option value="Advance Received">Advance Received</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 pb-6">
            <button
              type="submit"
              className="w-full py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Party</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
