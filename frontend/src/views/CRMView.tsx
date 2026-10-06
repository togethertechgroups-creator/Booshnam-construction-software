import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, ArrowRight, CheckCircle2, 
  Phone, Mail, Building, DollarSign,
  Maximize2, Minimize2
} from 'lucide-react';
import { Lead, Project } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';

interface CRMViewProps {
  leads: Lead[];
  onConvertSuccess: (projectName: string, projectData?: Partial<Project>) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const CRMView: React.FC<CRMViewProps> = ({ 
  leads: initialLeads, 
  onConvertSuccess,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [leadsList, setLeadsList] = useState<Lead[]>(initialLeads);

  const handleConvert = (leadId: string) => {
    const lead = leadsList.find(l => l.id === leadId);
    if (!lead) return;

    setLeadsList(prev => prev.map(l => l.id === leadId ? { ...l, stage: 'WON' as const, probability: 100 } : l));
    onConvertSuccess(lead.project_title, {
      client_name: lead.client_name,
      estimated_budget: lead.estimated_value || 0,
      boq_value: lead.estimated_value || 0,
      location: lead.address || 'Chennai'
    });
  };

  const stages = ['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON'];

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

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-white transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-white ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
    }`}>
      {/* Edge-to-edge Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[21px] font-bold text-[#262626] font-heading tracking-tight">CRM & Construction Leads Pipeline</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-3.5 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>New Lead Inquiry</span>
          </button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
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
          <UserProfileDropdown showBell={true} />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stages.map((stage) => {
          const stageLeads = leadsList.filter(l => l.stage === stage);
          return (
            <div key={stage} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {stage}
                </span>
                <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                  {stageLeads.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {stageLeads.map((lead) => (
                  <div key={lead.id} className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm space-y-2 hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="tracking-tight text-[10px] font-bold text-slate-500">{lead.lead_number}</span>
                      <span className="text-[10px] font-bold text-brand">{lead.probability}% Prob</span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 leading-snug">{lead.project_title}</h4>
                    <div className="text-[11px] text-slate-500">{lead.client_name}</div>

                    <div className="tracking-tight font-bold text-xs text-slate-900 pt-1 border-t border-slate-100">
                      ₹{(lead.estimated_value / 10000000).toFixed(2)} Cr
                    </div>

                    {lead.stage !== 'WON' && (
                      <button
                        onClick={() => handleConvert(lead.id)}
                        className="w-full mt-2 py-1 px-2 bg-slate-900 hover:bg-brand text-white rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <span>Convert to Project</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {lead.stage === 'WON' && (
                      <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 pt-1">
                        <CheckCircle2 className="w-3 h-3" /> Project Active
                      </div>
                    )}
                  </div>
                ))}

                {stageLeads.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No leads in {stage.toLowerCase()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};
