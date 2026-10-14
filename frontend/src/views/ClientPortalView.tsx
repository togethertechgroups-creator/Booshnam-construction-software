import React, { useState, useEffect } from 'react';
import { 
  Building2, CheckCircle2, Clock, AlertCircle, FileText, 
  Download, Eye, MessageSquare, Image as ImageIcon, Video, ShieldCheck, 
  CreditCard, Send, Check, X, Sparkles, Layers, ChevronRight,
  Maximize2, Minimize2
} from 'lucide-react';
import { Project, ArchitecturalDrawing } from '../types';
import { MOCK_PROJECTS, MOCK_ARCHITECTURAL_DRAWINGS } from '../lib/mockData';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';

interface ClientPortalViewProps {
  project?: Project | null;
  projects?: Project[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onShowToast?: (msg: string) => void;
}

interface MilestonePayment {
  id: string;
  milestone_name: string;
  percentage: number;
  amount: number;
  due_date: string;
  status: 'PAID' | 'DUE' | 'UPCOMING';
  receipt_no?: string;
}

const MOCK_CLIENT_MILESTONES: MilestonePayment[] = [];

const MOCK_SITE_MEDIA: Array<{ id: string; type: string; title: string; date: string; tag: string; url: string }> = [];

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  project = MOCK_PROJECTS[0] || null,
  projects = MOCK_PROJECTS,
  isSidebarOpen,
  onToggleSidebar,
  onShowToast
}) => {
  const [activeProject, setActiveProject] = useState<Project | null>(project || projects[0] || null);
  const [activeTab, setActiveTab] = useState<'overview' | 'drawings' | 'media' | 'payments' | 'contact'>('overview');
  const [drawings, setDrawings] = useState<ArchitecturalDrawing[]>(MOCK_ARCHITECTURAL_DRAWINGS);
  const [milestones, setMilestones] = useState<MilestonePayment[]>(MOCK_CLIENT_MILESTONES);
  
  // Revision Request Modal State
  const [revisionModalDwg, setRevisionModalDwg] = useState<ArchitecturalDrawing | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  
  // Contact Message State
  const [clientMessage, setClientMessage] = useState('');

  // Fullscreen State & Toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsub = addFullscreenChangeListener((fs) => { setIsFullscreen(fs); });
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => { unsub(); window.removeEventListener('keydown', handleKeyDown); };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    setIsFullscreen(prev => !prev);
    try { await toggleBrowserFullscreen(); } catch (e) {}
  };

  // Handle Client Drawing Approval
  const handleClientApprove = (dwgId: string) => {
    setDrawings(prev => prev.map(d => {
      if (d.id === dwgId) {
        return {
          ...d,
          approval_status: 'APPROVED',
          client_feedback: 'Approved by Client via Client Portal.'
        };
      }
      return d;
    }));
    onShowToast?.('Design approved! Notified Architect & Project Lead.');
  };

  // Handle Client Request Revision
  const handleSubmitRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionModalDwg || !revisionNotes.trim()) return;

    setDrawings(prev => prev.map(d => {
      if (d.id === revisionModalDwg.id) {
        return {
          ...d,
          approval_status: 'REVISION_REQUESTED',
          client_feedback: revisionNotes
        };
      }
      return d;
    }));

    onShowToast?.(`Revision request submitted for ${revisionModalDwg.title}`);
    setRevisionModalDwg(null);
    setRevisionNotes('');
  };

  // Handle Pay Milestone
  const handlePayMilestone = (milestoneId: string) => {
    setMilestones(prev => prev.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status: 'PAID',
          receipt_no: `RCP-2026-0${Math.floor(100 + Math.random() * 900)}`
        };
      }
      return m;
    }));
    onShowToast?.('Payment successful! Official receipt generated.');
  };

  // Handle Send Message to PM
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientMessage.trim()) return;
    onShowToast?.('Your message was sent to the Project Lead! They will respond shortly.');
    setClientMessage('');
  };

  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h1 className="text-[26px] font-bold text-[#262626] font-heading tracking-tight">Client Portal</h1>
          </div>
          <UserProfileDropdown showBell={true} onShowToast={onShowToast} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Projects Available</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Create or select a project in the workspace to view the client-facing transparent portal.
          </p>
        </div>
      </div>
    );
  }

  const totalBudget = activeProject.estimated_budget || 0;
  const paidAmount = milestones.filter(m => m.status === 'PAID').reduce((sum, m) => sum + m.amount, 0);
  const progressPercent = activeProject.progress_percentage || 0;

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-white transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-white ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
    }`}>
      {/* Edge-to-edge Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[26px] font-bold text-[#262626] font-heading tracking-tight">
              Client Portal
            </h1>
          </div>
        </div>

        {/* Project Badge & Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <Building2 className="w-4 h-4 text-slate-400" />
            <div className="font-semibold text-slate-800">{activeProject.name}</div>
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isFullscreen ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-red-600" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <UserProfileDropdown showBell={true} onShowToast={onShowToast} />
        </div>
      </div>

      {/* Client Navigation Tabs */}
      <div className="bg-slate-50/70 border-b border-slate-200 px-4 sm:px-6 pt-3 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'overview', label: 'Project Progress', icon: Building2 },
          { id: 'drawings', label: 'Drawings & 3D Models', icon: Layers, badge: `${drawings.length} Designs` },
          { id: 'media', label: 'Site Photos & Videos', icon: ImageIcon, badge: `${MOCK_SITE_MEDIA.length} Updates` },
          { id: 'payments', label: 'Payment Schedule', icon: CreditCard, badge: 'Milestones' },
          { id: 'contact', label: 'Direct PM Support', icon: MessageSquare },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-xs rounded-t-lg transition whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'border-red-600 text-red-600 bg-white font-bold shadow-xs' 
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-600'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-6 space-y-6 flex-1 bg-white">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top KPI Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 font-semibold mb-1">Current Project Stage</div>
                <div className="text-lg font-bold text-slate-900">{activeProject.stage || 'Structure Execution'}</div>
                <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">● On Schedule (Pattabiram Site)</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 font-semibold mb-1">Overall Construction Progress</div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">{progressPercent}%</div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 font-semibold mb-1">Contract Value</div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">₹ {(totalBudget / 100000).toFixed(1)} L</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Fixed Lum-Sum Agreement</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 font-semibold mb-1">Total Paid to Date</div>
                <div className="text-2xl font-bold text-emerald-700 tracking-tight">₹ {(paidAmount / 100000).toFixed(1)} L</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{((paidAmount / totalBudget) * 100).toFixed(0)}% of total paid</div>
              </div>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Architectural Drawing Requiring Review */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-red-50/40 to-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-red-600" />
                    <h3 className="text-sm font-bold text-slate-900">Latest Architectural Plan</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                    Version V2
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Ground floor plan updated with expanded wardrobe and revised utility alcove according to your suggestions.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('drawings')}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>View Drawings & 3D Walkthrough</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card 2: Next Milestone Payment */}
              {(() => {
                const nextMilestone = milestones.find(m => m.status === 'DUE') || milestones.find(m => m.status === 'UPCOMING');
                return (
                  <div className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50/40 to-white space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-amber-600" />
                        <h3 className="text-sm font-bold text-slate-900">Next Due Milestone</h3>
                      </div>
                      {nextMilestone && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Due {nextMilestone.due_date}
                        </span>
                      )}
                    </div>
                    {nextMilestone ? (
                      <div>
                        <div className="text-xs text-slate-500 font-medium">{nextMilestone.milestone_name} ({nextMilestone.percentage}%)</div>
                        <div className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">₹ {nextMilestone.amount.toLocaleString('en-IN')}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs text-slate-500 font-medium">No pending payment milestones</div>
                        <div className="text-sm font-semibold text-slate-700 mt-1">Schedule is clear</div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab('payments')}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>View Payment Schedule</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 2: DRAWINGS & 3D MODELS */}
        {activeTab === 'drawings' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Client Design Review & Approval Hub: </span>
                Review official architectural floor plans, sections, and 3D perspectives. You can either approve designs to proceed with site work, or request revisions with specific notes.
              </div>
            </div>

            {drawings.length === 0 ? (
              <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl p-8 bg-slate-50/50">
                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">No Architectural Drawings Available</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Architectural blueprints and 3D renders will be accessible here once uploaded by the design team.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {drawings.map(d => (
                  <div key={d.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="tracking-tight text-xs font-bold text-red-900 bg-red-50 px-2 py-0.5 rounded">
                          {d.drawing_no} • {d.current_version}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          d.approval_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          d.approval_status === 'REVISION_REQUESTED' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {d.approval_status.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">{d.title}</h3>
                      <p className="text-xs text-slate-500">Lead Architect: {d.architect_name}</p>

                      {d.client_feedback && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                          <span className="font-semibold">Your Feedback: </span>
                          {d.client_feedback}
                        </div>
                      )}
                    </div>

                    {/* 3D Preview Placeholder */}
                    <div className="h-44 rounded-xl bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden group">
                      <Layers className="w-10 h-10 text-red-400 group-hover:scale-110 transition duration-300" />
                      <div className="text-xs font-semibold mt-2">Interactive 3D Viewport</div>
                      <div className="text-[10px] text-slate-400">Click to rotate, zoom, and inspect dimensions</div>
                      <button
                        type="button"
                        onClick={() => onShowToast?.(`Opening interactive 3D model for ${d.title}...`)}
                        className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center font-bold text-xs text-white"
                      >
                        Launch 3D Viewer
                      </button>
                    </div>

                    {/* Client Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onShowToast?.(`Downloading official CAD/PDF sheet for ${d.drawing_no}...`)}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRevisionModalDwg(d);
                            setRevisionNotes(d.client_feedback || '');
                          }}
                          className="px-3 py-1.5 border border-amber-300 hover:bg-amber-50 text-amber-800 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Request Revision
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClientApprove(d.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Design</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SITE PHOTOS & VIDEOS */}
        {activeTab === 'media' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live Field Photo & Video Feed</h3>
                <p className="text-xs text-slate-500">Verified progress captures uploaded daily by Site Engineers</p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                Geofence GPS Verified
              </span>
            </div>

            {MOCK_SITE_MEDIA.length === 0 ? (
              <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl p-8 bg-slate-50/50">
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">No Site Photos or Drone Captures</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Field progress photos and 360° drone captures uploaded by site engineers will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {MOCK_SITE_MEDIA.map(item => (
                  <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs group">
                    <div className="relative h-44 bg-slate-100 overflow-hidden">
                      <img 
                        src={item.url} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                        {item.tag}
                      </span>
                      {item.type === 'VIDEO' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30">
                          <Video className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white space-y-1">
                      <div className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PAYMENT SCHEDULE & MILESTONES */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-emerald-900">Transparent Billing: </span>
                <span className="text-emerald-800">
                  Payments are linked directly to construction milestones verified on site.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onShowToast?.('Downloading full Payment Schedule statement...')}
                className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-900 font-bold shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Account Statement</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Milestone</th>
                      <th className="py-3 px-4">Share (%)</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {milestones.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-slate-400">
                          <CreditCard className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-700 text-xs">No Payment Milestones Scheduled</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Agreed contract milestones and payment receipts will appear here.</p>
                        </td>
                      </tr>
                    ) : (
                      milestones.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{m.milestone_name}</td>
                        <td className="py-3.5 px-4 tracking-tight text-slate-600">{m.percentage}%</td>
                        <td className="py-3.5 px-4 tracking-tight font-bold text-slate-900">
                          ₹ {m.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{m.due_date}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            m.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                            m.status === 'DUE' ? 'bg-rose-50 text-rose-700 font-extrabold animate-pulse' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {m.status === 'PAID' && (
                            <button
                              type="button"
                              onClick={() => onShowToast?.(`Downloading receipt ${m.receipt_no}...`)}
                              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>
                          )}
                          {m.status === 'DUE' && (
                            <button
                              type="button"
                              onClick={() => handlePayMilestone(m.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-xs transition cursor-pointer"
                            >
                              Pay Now
                            </button>
                          )}
                          {m.status === 'UPCOMING' && (
                            <span className="text-[11px] text-slate-400">Scheduled</span>
                          )}
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DIRECT PM CONTACT & SUPPORT */}
        {activeTab === 'contact' && (
          <div className="max-w-2xl mx-auto border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Direct Message to Project Manager</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Have questions regarding construction progress, schedule, or drawings? Send a message directly to your lead manager.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-sm">
                AV
              </div>
              <div>
                <div className="font-bold text-slate-900">Arun Verma (Project Manager)</div>
                <div className="text-[11px] text-slate-500">Phone: +91 98401 23456 • arun@siteops.io</div>
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Your Query / Inquiry</label>
                <textarea
                  value={clientMessage}
                  onChange={(e) => setClientMessage(e.target.value)}
                  rows={4}
                  placeholder="Type your question or request here..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 transition"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message to PM</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Revision Request Modal */}
      {revisionModalDwg && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Request Revision for {revisionModalDwg.drawing_no}
              </h3>
              <button 
                onClick={() => setRevisionModalDwg(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRevision} className="space-y-3.5 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Please describe the modifications or room dimension adjustments you would like the architecture team to implement for the next revision.
              </p>

              <div>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  rows={4}
                  placeholder="e.g. Please increase the living room balcony width by 2 feet and shift the electrical distribution box..."
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRevisionModalDwg(null)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Submit Revision Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientPortalView;
