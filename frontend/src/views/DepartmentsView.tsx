import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Layers, CheckCircle2, Clock, AlertCircle, 
  FileText, Download, Upload, Plus, Eye, Check, X, 
  Search, Filter, ChevronRight, Sparkles, User, Calendar, 
  DollarSign, MapPin, ShieldCheck, ArrowRight, MessageSquare,
  FileCheck, Shield, Award, HardHat, Compass, BarChart3, ChevronDown
} from 'lucide-react';
import { 
  Department, Project, SoilSample, SoilLabTest, 
  SoilInvestigationReport, ArchitecturalDrawing, 
  ProjectPaymentRequest, ProjectTransactionRecord 
} from '../types';
import { 
  MOCK_PROJECTS, MOCK_SOIL_SAMPLES, MOCK_SOIL_LAB_TESTS, 
  MOCK_SOIL_REPORTS, MOCK_ARCHITECTURAL_DRAWINGS, 
  MOCK_PAYMENT_REQUESTS, MOCK_PROJECT_TRANSACTIONS,
  MOCK_LEADS, MOCK_DPR
} from '../lib/mockData';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { CustomSelect } from '../components/CustomSelect';

interface DepartmentsViewProps {
  initialDepartment?: Department;
  projects?: Project[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onShowToast?: (msg: string) => void;
  onDepartmentChange?: (dept: Department) => void;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
  initialDepartment = 'SOIL_INVESTIGATION',
  projects = MOCK_PROJECTS,
  isSidebarOpen,
  onToggleSidebar,
  onShowToast,
  onDepartmentChange
}) => {
  const [activeDept, setActiveDept] = useState<Department>(initialDepartment);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialDepartment) {
      setActiveDept(initialDepartment);
    }
  }, [initialDepartment]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setIsDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDepartment = (dept: Department) => {
    setActiveDept(dept);
    setIsDeptDropdownOpen(false);
    onDepartmentChange?.(dept);
  };
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');

  // Soil Investigation Local States
  const [samples, setSamples] = useState<SoilSample[]>(MOCK_SOIL_SAMPLES);
  const [labTests, setLabTests] = useState<SoilLabTest[]>(MOCK_SOIL_LAB_TESTS);
  const [reports, setReports] = useState<SoilInvestigationReport[]>(MOCK_SOIL_REPORTS);
  const [isAddSampleModalOpen, setIsAddSampleModalOpen] = useState(false);
  const [newSampleBorehole, setNewSampleBorehole] = useState('BH-03');
  const [newSampleDepth, setNewSampleDepth] = useState('3.5');
  const [newSampleType, setNewSampleType] = useState<'Undisturbed' | 'Disturbed' | 'Core'>('Undisturbed');
  const [newSampleDesc, setNewSampleDesc] = useState('Stiff brown clay with coarse sand traces');

  // Architecture Local States
  const [drawings, setDrawings] = useState<ArchitecturalDrawing[]>(MOCK_ARCHITECTURAL_DRAWINGS);
  const [selectedDrawingForHistory, setSelectedDrawingForHistory] = useState<ArchitecturalDrawing | null>(null);
  const [isAddDrawingModalOpen, setIsAddDrawingModalOpen] = useState(false);
  const [newDrawingTitle, setNewDrawingTitle] = useState('');
  const [newDrawingCategory, setNewDrawingCategory] = useState<'FLOOR_PLAN' | 'ELEVATION' | 'SECTION' | 'STRUCTURAL' | 'MEP' | '3D_MODEL'>('FLOOR_PLAN');

  // Accounts Payment Requests Local State
  const [paymentRequests, setPaymentRequests] = useState<ProjectPaymentRequest[]>(MOCK_PAYMENT_REQUESTS);
  const [transactions, setTransactions] = useState<ProjectTransactionRecord[]>(MOCK_PROJECT_TRANSACTIONS);

  // Marketing Leads Local State
  const [marketingLeads, setMarketingLeads] = useState(MOCK_LEADS);

  // Construction DPRs Local State
  const [dprs, setDprs] = useState(MOCK_DPR);

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0] || null;

  // Handler: Add Sample
  const handleAddSample = (e: React.FormEvent) => {
    e.preventDefault();
    const newSmp: SoilSample = {
      id: `smp-${Date.now()}`,
      project_id: selectedProjectId,
      sample_code: `SMP-${newSampleBorehole}-${samples.length + 1}`,
      borehole_no: newSampleBorehole,
      depth_meters: parseFloat(newSampleDepth) || 2.5,
      sample_type: newSampleType,
      collection_date: new Date().toISOString().split('T')[0],
      collected_by: 'K. Balaji (Field Geologist)',
      visual_classification: newSampleDesc,
      status: 'COLLECTED'
    };
    setSamples(prev => [newSmp, ...prev]);
    setIsAddSampleModalOpen(false);
    onShowToast?.(`Soil sample ${newSmp.sample_code} recorded at ${newSampleBorehole}!`);
  };

  // Handler: Sign Soil Report
  const handleSignReport = (repId: string) => {
    setReports(prev => prev.map(r => {
      if (r.id === repId) {
        return {
          ...r,
          signed_by: 'Er. S. Murugesan (Reg. Geotech #GT-4102)',
          signed_date: new Date().toISOString().split('T')[0],
          binding_status: 'SIGNED_AND_STAMPED'
        };
      }
      return r;
    }));
    onShowToast?.('Geotechnical Soil Report digitally signed and certified!');
  };

  // Handler: Add Drawing
  const handleAddDrawing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrawingTitle.trim()) return;
    const nextIdx = drawings.length + 1;
    const newDwg: ArchitecturalDrawing = {
      id: `arc-${Date.now()}`,
      project_id: selectedProjectId,
      drawing_no: `ARC-DWG-0${nextIdx}`,
      title: newDrawingTitle,
      category: newDrawingCategory,
      current_version: 'V1',
      versions: [
        {
          version: 'V1',
          file_name: `${newDrawingTitle.replace(/\s+/g, '_')}_V1.dwg`,
          uploaded_by: 'Ar. Ananya Sen',
          upload_date: new Date().toISOString().split('T')[0],
          change_notes: 'Initial schematic layout submitted for supervisory review.',
          file_size: '4.2 MB',
          status: 'PENDING_REVIEW'
        }
      ],
      architect_name: 'Ar. Ananya Sen (Principal Architect)',
      approval_status: 'PENDING_REVIEW',
      updated_at: new Date().toISOString().split('T')[0]
    };
    setDrawings(prev => [newDwg, ...prev]);
    setIsAddDrawingModalOpen(false);
    setNewDrawingTitle('');
    onShowToast?.(`Drawing "${newDwg.title}" uploaded as V1!`);
  };

  // Handler: Approve Drawing
  const handleApproveDrawing = (dwgId: string) => {
    setDrawings(prev => prev.map(d => {
      if (d.id === dwgId) {
        const updatedVersions = d.versions.map((v, i) => i === d.versions.length - 1 ? { ...v, status: 'SUPERVISOR_APPROVED' as const } : v);
        return {
          ...d,
          approval_status: 'SUPERVISOR_APPROVED',
          versions: updatedVersions
        };
      }
      return d;
    }));
    onShowToast?.('Drawing approved and dispatched to Client Portal for final client sign-off!');
  };

  // Handler: Payment Request Multi-level Approval
  const handlePaymentAction = (reqId: string, action: 'SUPERVISOR_VERIFY' | 'ACCOUNTS_PAY') => {
    setPaymentRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        if (action === 'SUPERVISOR_VERIFY') {
          return {
            ...req,
            status: 'SUPERVISOR_VERIFIED',
            verified_by_supervisor: 'Ravi Kumar (Supervisor)',
            verification_date: new Date().toISOString().split('T')[0]
          };
        } else if (action === 'ACCOUNTS_PAY') {
          return {
            ...req,
            status: 'PAID',
            approved_by_accounts: 'Kavitha Selvan (Accounts Head)',
            approval_date: new Date().toISOString().split('T')[0],
            payment_reference: `TXN-NEFT-${Math.floor(100000 + Math.random() * 900000)}`
          };
        }
      }
      return req;
    }));
    onShowToast?.(action === 'SUPERVISOR_VERIFY' ? 'Payment request verified by supervisor, forwarded to Accounts!' : 'Payment marked as PAID with bank transaction reference!');
  };

  const departmentOptions = [
    { 
      id: 'SOIL_INVESTIGATION' as Department, 
      label: '1. Soil Investigation', 
      shortLabel: 'Soil Investigation',
      icon: Compass, 
      count: `${samples.length} Samples`,
      desc: 'Borehole logging, lab test verification, SBC calculation & geotechnical reports',
    },
    { 
      id: 'ARCHITECTURE' as Department, 
      label: '2. Architecture', 
      shortLabel: 'Architecture',
      icon: Layers, 
      count: `${drawings.length} Drawings`,
      desc: 'Architectural drawings, floor plans, elevations, 3D models & AFC sets',
    },
    { 
      id: 'MARKETING' as Department, 
      label: '3. Marketing', 
      shortLabel: 'Marketing & CRM',
      icon: BarChart3, 
      count: `${marketingLeads.length} Leads`,
      desc: 'Client CRM pipeline, incoming inquiries, site visits & conversions',
    },
    { 
      id: 'CONSTRUCTION' as Department, 
      label: '4. Construction', 
      shortLabel: 'Construction',
      icon: HardHat, 
      count: `${dprs.length} DPRs`,
      desc: 'Daily progress reports (DPR), site activity, manpower, weather & logs',
    },
    { 
      id: 'ACCOUNTS' as Department, 
      label: '5. Accounts', 
      shortLabel: 'Accounts & Finance',
      icon: DollarSign, 
      count: `${paymentRequests.length} Payments`,
      desc: 'Project payment requests, party cashbook, vouchers & disbursements',
    },
  ];

  const currentDeptObj = departmentOptions.find(d => d.id === activeDept) || departmentOptions[0];
  const CurrentIcon = currentDeptObj.icon;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Edge-to-edge Header with Department Dropdown */}
      <div className="px-6 py-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Department Hub</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Coordinated management across Soil Investigation, Architecture, Marketing, Construction, and Accounts
            </p>
          </div>

          {/* Dedicated Department Dropdown Selector */}
          <div className="relative" ref={deptDropdownRef}>
            <button
              type="button"
              onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs transition-all cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-md bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CurrentIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Selected Division</div>
                <div className="font-heading text-xs text-slate-900 font-bold leading-tight mt-0.5 flex items-center gap-1.5">
                  <span>{currentDeptObj.shortLabel}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-red-100 text-red-700">
                    {currentDeptObj.count}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-1.5 transition-transform duration-200 ${isDeptDropdownOpen ? 'rotate-180 text-red-600' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDeptDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Core Department</span>
                  <span className="text-[10px] text-red-600 font-bold">5 Divisions Available</span>
                </div>

                <div className="p-1 space-y-1">
                  {departmentOptions.map((dept) => {
                    const Icon = dept.icon;
                    const isSelected = activeDept === dept.id;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => handleSelectDepartment(dept.id)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start gap-3 cursor-pointer ${
                          isSelected 
                            ? 'bg-red-50/80 border border-red-200 shadow-2xs' 
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`font-heading text-xs ${isSelected ? 'font-bold text-red-700' : 'font-semibold text-slate-800'}`}>
                              {dept.label}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                              isSelected ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {dept.count}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {dept.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Project Selector & Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-56 sm:w-64">
            <CustomSelect
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              options={projects.map(p => ({
                label: `${p.code} - ${p.name.length > 22 ? p.name.slice(0, 22) + '...' : p.name}`,
                value: p.id,
              }))}
              size="sm"
              variant="brand"
              icon={<Building2 className="w-3.5 h-3.5" />}
              searchable={true}
            />
          </div>

          <UserProfileDropdown showBell={true} onShowToast={onShowToast} />
        </div>
      </div>

      {/* Sub-header Navigation / Division Status Bar */}
      <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Department:</span>
          <span className="font-heading font-bold text-slate-900 flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs">
            <CurrentIcon className="w-3.5 h-3.5 text-red-600" />
            <span>{currentDeptObj.shortLabel}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 text-[11px] hidden sm:inline">
            {currentDeptObj.desc}
          </span>
        </div>

        {/* Quick Division Switcher Dropdown Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDeptDropdownOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 hover:text-red-600 transition-colors shadow-2xs cursor-pointer"
          >
            <span>Switch Division</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Department Content Body */}
      <div className="p-4 sm:p-6 space-y-6 flex-1 bg-white">
        
        {/* ========================================== */}
        {/* DEPARTMENT 1: SOIL INVESTIGATION */}
        {/* ========================================== */}
        {activeDept === 'SOIL_INVESTIGATION' && (
          <div className="space-y-6">
            {/* Top KPI Metrics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
                  <span>Soil Core Samples</span>
                  <Compass className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{samples.length}</div>
                <div className="text-[11px] text-amber-700 mt-0.5">Boreholes BH-01, BH-02, BH-03</div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80">
                <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
                  <span>Lab Tests Verified</span>
                  <Award className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {labTests.filter(t => t.status === 'VERIFIED').length} / {labTests.length}
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">SPT N-Value, CBR, Sieve</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
                  <span>Safe Bearing Capacity (SBC)</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700 font-mono">240 kN/m²</div>
                <div className="text-[11px] text-emerald-800 mt-0.5">At 2.0m depth for footings</div>
              </div>

              <div className="p-4 rounded-xl bg-red-50/60 border border-red-200/80">
                <div className="flex items-center justify-between text-xs text-red-800 font-semibold mb-1">
                  <span>Certified Reports</span>
                  <FileCheck className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-900">{reports.length} Bound</div>
                <div className="text-[11px] text-red-700 mt-0.5">Digital & Wet Signatures</div>
              </div>
            </div>

            {/* Section 1: Soil Samples Registry */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Field Soil Samples Collection</span>
                    <span className="text-xs font-normal text-slate-500">(Borehole Logging)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Sample extraction log, soil stratum classification, and depth</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddSampleModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Soil Sample</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Sample Code</th>
                      <th className="py-3 px-4">Borehole</th>
                      <th className="py-3 px-4">Depth</th>
                      <th className="py-3 px-4">Sample Type</th>
                      <th className="py-3 px-4">Visual Stratum Description</th>
                      <th className="py-3 px-4">Date & Collector</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {samples.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-amber-900">{s.sample_code}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{s.borehole_no}</td>
                        <td className="py-3 px-4 font-mono text-slate-700">{s.depth_meters} m</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.sample_type === 'Undisturbed' ? 'bg-red-50 text-red-700 border border-red-200' :
                            s.sample_type === 'Core' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {s.sample_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">{s.visual_classification}</td>
                        <td className="py-3 px-4 text-slate-500">
                          <div>{s.collection_date}</div>
                          <div className="text-[10px] text-slate-400">{s.collected_by}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            s.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                            s.status === 'TESTING' ? 'bg-blue-50 text-blue-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Laboratory Test Results & Reports */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lab Tests Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Certified Laboratory Tests</h3>
                    <p className="text-[11px] text-slate-500">SPT, CBR, Sieve Analysis, Atterberg</p>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                    IS 2720 Certified
                  </span>
                </div>
                <div className="divide-y divide-slate-100 p-2">
                  {labTests.map(t => (
                    <div key={t.id} className="p-3 hover:bg-slate-50 rounded-lg transition space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{t.test_name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' :
                          t.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{t.results_summary}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                        <span>SBC: {t.bearing_capacity_kn_m2} kN/m²</span>
                        <span>{t.tested_by} • {t.test_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Official Report & Signing */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Official Geotechnical Report Dossier</h3>
                      <p className="text-[11px] text-slate-500">Binding status & Licensed Engineer signature</p>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Report #GEO-2483
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {reports.map(r => (
                      <div key={r.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{r.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">Lead Geotech: {r.geotechnical_engineer}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 shrink-0">
                            {r.binding_status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-white rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">Allowable Bearing:</span>
                            <span className="font-bold text-emerald-700">{r.safe_bearing_capacity}</span>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">Water Table Level:</span>
                            <span className="font-medium text-slate-700">{r.water_table_depth}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                          <div className="text-[11px] text-slate-500">
                            Signed by: <span className="font-semibold text-slate-800">{r.signed_by || 'Pending Signature'}</span>
                          </div>
                          {r.signed_by ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Certified
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSignReport(r.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              Sign & Stamp
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Official bound copy ready for municipal clearance</span>
                  <button 
                    onClick={() => onShowToast?.('Downloading full Soil Investigation Report PDF with borehole logs...')}
                    className="flex items-center gap-1.5 text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Dossier PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* DEPARTMENT 2: ARCHITECTURE */}
        {/* ========================================== */}
        {activeDept === 'ARCHITECTURE' && (
          <div className="space-y-6">
            {/* Top Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-red-50/60 border border-red-200/80">
                <div className="flex items-center justify-between text-xs text-red-800 font-semibold mb-1">
                  <span>Architectural Sheets</span>
                  <Layers className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{drawings.length}</div>
                <div className="text-[11px] text-red-700 mt-0.5">Floor plans, elevations, 3D models</div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80">
                <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
                  <span>Drawing Versions</span>
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">V1, V2, V3</div>
                <div className="text-[11px] text-blue-700 mt-0.5">Full revision history maintained</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
                  <span>Client Approved</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  {drawings.filter(d => d.approval_status === 'APPROVED' || d.approval_status === 'SUPERVISOR_APPROVED').length}
                </div>
                <div className="text-[11px] text-emerald-800 mt-0.5">Ready for construction execution</div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
                  <span>Revision Requests</span>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-800">
                  {drawings.filter(d => d.approval_status === 'REVISION_REQUESTED').length}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">Client annotations queued</div>
              </div>
            </div>

            {/* Drawings List & Version Tree */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Drawings & 3D BIM Models</span>
                    <span className="text-xs font-normal text-slate-500">(Version Control)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Architect uploads new drawing versions; supervisors review before client sign-off
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDrawingModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload New Drawing</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Drawing #</th>
                      <th className="py-3 px-4">Title & Scope</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Version</th>
                      <th className="py-3 px-4">Lead Architect</th>
                      <th className="py-3 px-4 text-center">Approval Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drawings.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-red-900">{d.drawing_no}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{d.title}</div>
                          {d.client_feedback && (
                            <div className="text-[11px] text-amber-700 mt-0.5 italic">
                              "{d.client_feedback}"
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {d.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDrawingForHistory(d)}
                            className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-red-100 text-red-800 hover:bg-red-200 transition cursor-pointer"
                            title="View all revision versions"
                          >
                            {d.current_version} ({d.versions.length})
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{d.architect_name}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            d.approval_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                            d.approval_status === 'SUPERVISOR_APPROVED' ? 'bg-blue-50 text-blue-700' :
                            d.approval_status === 'REVISION_REQUESTED' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {d.approval_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {d.approval_status === 'PENDING_REVIEW' && (
                              <button
                                type="button"
                                onClick={() => handleApproveDrawing(d.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                                title="Approve & forward to client"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedDrawingForHistory(d)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Version History & Files"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3D Model Card & Viewer Preview */}
            <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/30 text-red-300 text-xs font-mono font-semibold border border-red-400/30">
                    BIM 3D Model Explorer
                  </span>
                  <span className="text-xs text-slate-400">WebGL / GLTF Viewport</span>
                </div>
                <h3 className="text-lg font-bold text-white">Interactive 3D Architectural Walkthrough</h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Client & site engineer 3D structural model sync. Allows cross-section slicing, room area verification, and foundation depth inspection.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onShowToast?.('Opening 3D model viewport simulator...')}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Launch 3D Model View</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* DEPARTMENT 3: MARKETING */}
        {/* ========================================== */}
        {activeDept === 'MARKETING' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200/80">
                <div className="text-xs text-sky-800 font-semibold mb-1">Total Leads Inquired</div>
                <div className="text-2xl font-bold text-slate-900">{marketingLeads.length}</div>
                <div className="text-[11px] text-sky-700 mt-0.5">Tenders & commercial clients</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <div className="text-xs text-emerald-800 font-semibold mb-1">Won / Converted</div>
                <div className="text-2xl font-bold text-emerald-700">
                  {marketingLeads.filter(l => l.stage === 'WON').length}
                </div>
                <div className="text-[11px] text-emerald-800 mt-0.5">Launched into active projects</div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <div className="text-xs text-amber-800 font-semibold mb-1">Proposals Submitted</div>
                <div className="text-2xl font-bold text-amber-800">
                  {marketingLeads.filter(l => l.stage === 'PROPOSAL').length}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">Awaiting quotation approval</div>
              </div>

              <div className="p-4 rounded-xl bg-red-50/60 border border-red-200/80">
                <div className="text-xs text-red-800 font-semibold mb-1">Site Visits Booked</div>
                <div className="text-2xl font-bold text-red-900">6</div>
                <div className="text-[11px] text-red-700 mt-0.5">Preliminary reconnaissance</div>
              </div>
            </div>

            {/* Leads Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Marketing Pipeline & Prospective Clients</h3>
                  <p className="text-[11px] text-slate-500">Collect client KYC, title deed verification, and quotation issuance</p>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-lg">
                  Conversion Rate: 68%
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Client / Prospect</th>
                      <th className="py-3 px-4">Project Title</th>
                      <th className="py-3 px-4">Estimated Budget</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4 text-center">Stage</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {marketingLeads.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{l.client_name}</div>
                          <div className="text-[11px] text-slate-400">{l.email}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{l.project_title}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                          ₹ {(l.estimated_value / 100000).toFixed(1)} L
                        </td>
                        <td className="py-3 px-4 text-slate-600">{l.source || 'Direct Inquiry'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            l.stage === 'WON' ? 'bg-emerald-50 text-emerald-700' :
                            l.stage === 'PROPOSAL' ? 'bg-blue-50 text-blue-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {l.stage}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onShowToast?.(`Opening quotation review for ${l.client_name}...`)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                          >
                            Quotation Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* DEPARTMENT 4: CONSTRUCTION */}
        {/* ========================================== */}
        {activeDept === 'CONSTRUCTION' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <div className="text-xs text-emerald-800 font-semibold mb-1">Active Site Engineers</div>
                <div className="text-2xl font-bold text-slate-900">4</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Likson, Ranjith, Rajesh, Balaji</div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80">
                <div className="text-xs text-blue-800 font-semibold mb-1">Daily Work Updates (DPR)</div>
                <div className="text-2xl font-bold text-slate-900">{dprs.length}</div>
                <div className="text-[11px] text-blue-700 mt-0.5">Geofenced field reports</div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <div className="text-xs text-amber-800 font-semibold mb-1">Labour On Site Today</div>
                <div className="text-2xl font-bold text-amber-800">42 Men</div>
                <div className="text-[11px] text-amber-700 mt-0.5">Masons, bar benders, helpers</div>
              </div>

              <div className="p-4 rounded-xl bg-red-50/60 border border-red-200/80">
                <div className="text-xs text-red-800 font-semibold mb-1">Site Photos/Videos</div>
                <div className="text-2xl font-bold text-red-900">18</div>
                <div className="text-[11px] text-red-700 mt-0.5">Shared to Client Portal</div>
              </div>
            </div>

            {/* Daily Work Updates List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Daily Work Updates Submitted by Site Engineers</h3>
                  <p className="text-[11px] text-slate-500">Activities, weather conditions, equipment hours, and manpower logs</p>
                </div>
                <button
                  type="button"
                  onClick={() => onShowToast?.('Opening Daily Work Update submission dialog for Site Engineers...')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  + Submit Field Update
                </button>
              </div>

              <div className="divide-y divide-slate-100 p-3 space-y-3">
                {dprs.map(d => (
                  <div key={d.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{d.date}</span>
                        <span className="text-[11px] text-slate-500">• Weather: {d.weather}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {d.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">{d.work_performed || d.work_summary}</p>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500 pt-1">
                      <div>Total Labour: <span className="font-bold text-slate-700">{d.labour_count || (d.manpower_records ? d.manpower_records.reduce((a, m) => a + m.headcount, 0) : 18)} Workers</span></div>
                      <div>Engineers on Site: <span className="font-bold text-slate-700">2</span></div>
                      <div>Safety Compliance: <span className="font-bold text-emerald-700">100% OK</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* DEPARTMENT 5: ACCOUNTS */}
        {/* ========================================== */}
        {activeDept === 'ACCOUNTS' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
                <div className="text-xs text-indigo-800 font-semibold mb-1">Total Invoiced</div>
                <div className="text-2xl font-bold text-slate-900">₹ 42.5 L</div>
                <div className="text-[11px] text-indigo-700 mt-0.5">Milestone billing to clients</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <div className="text-xs text-emerald-800 font-semibold mb-1">Total Received</div>
                <div className="text-2xl font-bold text-emerald-700">₹ 35.0 L</div>
                <div className="text-[11px] text-emerald-800 mt-0.5">82% collection efficiency</div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80">
                <div className="text-xs text-rose-800 font-semibold mb-1">Expenses & Vendor Payouts</div>
                <div className="text-2xl font-bold text-rose-700">₹ 21.8 L</div>
                <div className="text-[11px] text-rose-800 mt-0.5">Material, labor, soil lab fees</div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <div className="text-xs text-amber-800 font-semibold mb-1">Payment Requests Queue</div>
                <div className="text-2xl font-bold text-amber-800">
                  {paymentRequests.filter(p => p.status !== 'PAID').length} Pending
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">Site Engineer requests</div>
              </div>
            </div>

            {/* Payment Request Pipeline (Site Engineer -> Supervisor -> Accounts -> Paid) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>Payment Requests Multi-Level Approval Pipeline</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                      Engineer → Supervisor → Accounts → Paid
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Site Engineers submit field purchase requests; supervisors verify authenticity before Accounts pays
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Req #</th>
                      <th className="py-3 px-4">Requester</th>
                      <th className="py-3 px-4">Vendor & Purpose</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Approval Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-900">{req.request_code}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{req.requested_by}</div>
                          <div className="text-[10px] text-slate-400">{req.request_date}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{req.vendor_name}</div>
                          <div className="text-[11px] text-slate-500">{req.purpose_description}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          ₹ {req.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            req.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                            req.status === 'SUPERVISOR_VERIFIED' ? 'bg-blue-50 text-blue-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {req.status === 'PENDING_SUPERVISOR' && (
                            <button
                              type="button"
                              onClick={() => handlePaymentAction(req.id, 'SUPERVISOR_VERIFY')}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              Verify (Supervisor)
                            </button>
                          )}
                          {req.status === 'SUPERVISOR_VERIFIED' && (
                            <button
                              type="button"
                              onClick={() => handlePaymentAction(req.id, 'ACCOUNTS_PAY')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              Approve & Pay
                            </button>
                          )}
                          {req.status === 'PAID' && (
                            <span className="text-[11px] text-emerald-600 font-semibold font-mono">
                              Paid: {req.payment_reference}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* General Ledger Transactions */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Recent Accounting Ledger Entries</h3>
                  <p className="text-[11px] text-slate-500">Real-time Income (Client receipts) and Expenses (Site operational costs)</p>
                </div>
                <button
                  type="button"
                  onClick={() => onShowToast?.('Opening Record Transaction modal...')}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  + Record Transaction
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Txn #</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Party / Vendor</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{t.transaction_code}</td>
                        <td className="py-2.5 px-4 text-slate-500">{t.transaction_date}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.transaction_type === 'INCOME' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {t.transaction_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 font-medium">{t.category}</td>
                        <td className="py-2.5 px-4 text-slate-600">{t.party_name}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                          t.transaction_type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {t.transaction_type === 'INCOME' ? '+' : '-'} ₹ {t.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Add Soil Sample Modal */}
      {isAddSampleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-600" />
                <span>Log New Soil Core Sample</span>
              </h3>
              <button 
                onClick={() => setIsAddSampleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSample} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Borehole Number</label>
                <input
                  type="text"
                  value={newSampleBorehole}
                  onChange={(e) => setNewSampleBorehole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Depth (Meters)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newSampleDepth}
                    onChange={(e) => setNewSampleDepth(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Sample Type</label>
                  <CustomSelect
                    value={newSampleType}
                    onChange={(val) => setNewSampleType(val as 'Disturbed' | 'Undisturbed' | 'Core')}
                    options={[
                      { label: 'Undisturbed', value: 'Undisturbed' },
                      { label: 'Disturbed', value: 'Disturbed' },
                      { label: 'Core Rock', value: 'Core' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Visual Stratum Classification</label>
                <textarea
                  value={newSampleDesc}
                  onChange={(e) => setNewSampleDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSampleModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Save Sample
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Drawing Modal */}
      {isAddDrawingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-600" />
                <span>Upload Architectural Drawing (V1)</span>
              </h3>
              <button 
                onClick={() => setIsAddDrawingModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDrawing} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Drawing Title</label>
                <input
                  type="text"
                  value={newDrawingTitle}
                  onChange={(e) => setNewDrawingTitle(e.target.value)}
                  placeholder="e.g. First Floor Electrical Layout & Conduits"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Category</label>
                <CustomSelect
                  value={newDrawingCategory}
                  onChange={(val) => setNewDrawingCategory(val as any)}
                  options={[
                    { label: 'Floor Plan', value: 'FLOOR_PLAN' },
                    { label: 'Elevation', value: 'ELEVATION' },
                    { label: 'Cross Section', value: 'SECTION' },
                    { label: 'Structural Details', value: 'STRUCTURAL' },
                    { label: 'MEP (Plumbing/Electrical)', value: 'MEP' },
                    { label: '3D Model / Render', value: '3D_MODEL' },
                  ]}
                  size="md"
                  variant="brand"
                />
              </div>

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-1">
                <Upload className="w-6 h-6 text-red-500 mx-auto" />
                <div className="font-semibold text-slate-700">Attach CAD or PDF File</div>
                <div className="text-[11px] text-slate-400">DWG, DXF, RVT, or PDF up to 50MB</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDrawingModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Upload Drawing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Drawing Version History Drawer/Modal */}
      {selectedDrawingForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedDrawingForHistory.drawing_no} Version History</h3>
                <p className="text-xs text-slate-500">{selectedDrawingForHistory.title}</p>
              </div>
              <button 
                onClick={() => setSelectedDrawingForHistory(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {selectedDrawingForHistory.versions.map((ver) => (
                <div key={ver.version} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-900 font-mono text-sm">{ver.version}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ver.status === 'CLIENT_APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      ver.status === 'REVISION_REQUESTED' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {ver.status}
                    </span>
                  </div>
                  <div className="text-slate-700 font-medium">{ver.file_name} ({ver.file_size})</div>
                  <p className="text-slate-500 text-[11px]">{ver.change_notes}</p>
                  {ver.feedback_notes && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
                      Feedback: {ver.feedback_notes}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                    <span>Uploaded by {ver.uploaded_by}</span>
                    <span>{ver.upload_date}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onShowToast?.(`Downloading all version CAD files for ${selectedDrawingForHistory.drawing_no}...`)}
                className="flex items-center gap-1.5 text-red-700 hover:text-red-800 font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download All Versions (.ZIP)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDrawingForHistory(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentsView;
