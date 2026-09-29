import React, { useState } from 'react';
import { 
  Truck, Plus, Search, Filter, AlertTriangle, 
  Check, X, Gauge, Fuel, Wrench, Clock, ShieldCheck 
} from 'lucide-react';
import { Project, Asset } from '../../../types';
import { CustomSelect } from '../../CustomSelect';

interface EquipmentTabProps {
  project: Project;
  assets?: Asset[];
  onShowToast?: (msg: string) => void;
}

const DEFAULT_ASSETS: Asset[] = [];

export const EquipmentTab: React.FC<EquipmentTabProps> = ({ project, assets = DEFAULT_ASSETS, onShowToast }) => {
  const storageKey = `booshnam_equipment_v2_${project?.id || 'default'}`;
  const [equipmentList, setEquipmentList] = useState<Asset[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return assets && assets.length > 0 ? assets.filter(a => !a.project_id || a.project_id === project?.id) : [];
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(equipmentList));
    } catch (e) {}
  }, [equipmentList, storageKey]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Deploy Form State
  const [assetName, setAssetName] = useState('');
  const [assetCode, setAssetCode] = useState('');
  const [category, setCategory] = useState('Earthmoving');
  const [ownership, setOwnership] = useState('RENTED');
  const [vendorName, setVendorName] = useState('');
  const [rate, setRate] = useState<number>(850);

  // Log Form State
  const [hoursToAdd, setHoursToAdd] = useState<number>(8);
  const [fuelLiters, setFuelLiters] = useState<number>(25);

  const totalMachines = equipmentList.length;
  const operationalCount = equipmentList.filter(e => e.status === 'OPERATIONAL').length;
  const maintenanceCount = equipmentList.filter(e => e.status === 'MAINTENANCE').length;

  const filteredAssets = equipmentList.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
                          e.asset_code.toLowerCase().includes(search.toLowerCase()) ||
                          e.category.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim() || !assetCode.trim()) return;

    const newAsset: Asset = {
      id: `eq-${Date.now()}`,
      asset_code: assetCode.trim(),
      name: assetName.trim(),
      category,
      ownership,
      rental_vendor_name: ownership === 'RENTED' ? vendorName.trim() || 'Rental Partner' : undefined,
      hourly_cost_rate: Number(rate),
      current_project_name: project.name,
      status: 'OPERATIONAL',
      meter_hours: 0
    };

    setEquipmentList([...equipmentList, newAsset]);
    onShowToast?.(`Equipment "${newAsset.name}" deployed to site!`);
    setIsDeployOpen(false);

    // Reset
    setAssetName('');
    setAssetCode('');
  };

  const handleLogUsage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setEquipmentList(prev => prev.map(a => {
      if (a.id === selectedAsset.id) {
        return { ...a, meter_hours: a.meter_hours + Number(hoursToAdd) };
      }
      return a;
    }));

    onShowToast?.(`Logged ${hoursToAdd}h & ${fuelLiters}L fuel for ${selectedAsset.name}`);
    setIsLogOpen(false);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">
              FLEET & MACHINERY
            </span>
            <h2 className="text-lg font-bold text-slate-900">Equipment, Heavy Machinery & Fleet</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track site machinery, meter running hours, diesel consumption logs, and rental rates for {project.client_name || project.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDeployOpen(true)}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Deploy Machinery to Site</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Equipment</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalMachines} Assets On Site</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Heavy vehicles & fabrication tools</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Operational & Active</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{operationalCount} Running</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">100% field ready</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Under Maintenance</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{maintenanceCount} Servicing</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Preventive maintenance</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search machinery or asset code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'OPERATIONAL', 'MAINTENANCE'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All Assets' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-32">Asset Code</th>
                <th className="py-3.5 px-4">Equipment & Model</th>
                <th className="py-3.5 px-4 w-32">Category</th>
                <th className="py-3.5 px-4 w-28">Ownership</th>
                <th className="py-3.5 px-4 text-right w-28">Rate (₹/hr)</th>
                <th className="py-3.5 px-4 text-right w-28">Meter Hours</th>
                <th className="py-3.5 px-4 w-28">Status</th>
                <th className="py-3.5 px-4 text-right w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <Wrench className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-xs">No Equipment or Machinery Logged</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Deploy Equipment" to add machinery to this site.</p>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {asset.asset_code}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{asset.name}</div>
                    {asset.rental_vendor_name && (
                      <div className="text-[10px] text-slate-400">Vendor: {asset.rental_vendor_name}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                      {asset.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      asset.ownership === 'OWNED' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {asset.ownership}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-800">
                    ₹ {asset.hourly_cost_rate}/hr
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    {asset.meter_hours.toLocaleString()} hrs
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      asset.status === 'OPERATIONAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setIsLogOpen(true);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Log Hours
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG HOURS & FUEL MODAL */}
      {isLogOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Log Run Hours & Fuel</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedAsset.name} ({selectedAsset.asset_code})</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsLogOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogUsage} className="space-y-3.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Current Meter Reading:</span>
                  <span className="font-bold font-mono text-slate-900">{selectedAsset.meter_hours} hrs</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Standard Rate:</span>
                  <span className="font-bold font-mono text-slate-900">₹ {selectedAsset.hourly_cost_rate} / hr</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hours Operated Today</label>
                  <input
                    type="number"
                    required
                    value={hoursToAdd}
                    onChange={(e) => setHoursToAdd(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Diesel Consumed (Liters)</label>
                  <input
                    type="number"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLogOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Reading</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPLOY MACHINERY MODAL */}
      {isDeployOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Deploy Machinery to Site</h3>
                  <p className="text-xs text-slate-500">{project.name}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsDeployOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeploy} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EQ-CRN-04"
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <CustomSelect
                    value={category}
                    onChange={(val) => setCategory(val)}
                    options={[
                      { label: 'Earthmoving (JCB/Excavator)', value: 'Earthmoving' },
                      { label: 'Concreting (Mixer/Pump)', value: 'Concreting' },
                      { label: 'Lifting & Tower Cranes', value: 'Lifting & Cranes' },
                      { label: 'Power (Generator)', value: 'Power Supply' },
                      { label: 'Steel Cutting & Bending', value: 'Steel Fabrication' },
                      { label: 'Surveying Equipment', value: 'Surveying' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Equipment Model & Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Potain Tower Crane TC-5040"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ownership</label>
                  <CustomSelect
                    value={ownership}
                    onChange={(val) => setOwnership(val)}
                    options={[
                      { label: 'Rented / Leased', value: 'RENTED' },
                      { label: 'Company Owned', value: 'OWNED' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hourly Cost Rate (₹)</label>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 font-mono font-bold"
                  />
                </div>
              </div>

              {ownership === 'RENTED' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rental Supplier / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Sri Krishna Earthmovers"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeployOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Deploy to Site</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
