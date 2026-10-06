import React, { useState, useEffect } from 'react';
import { FileText, Folder, Download, Plus, Search, Maximize2, Minimize2 } from 'lucide-react';
import { Project } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';

interface DocumentsViewProps {
  project: Project | null;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ 
  project,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const folders = [
    { name: 'Contracts & Agreements', count: 0 },
    { name: 'Regulatory Approvals & Permits', count: 0 },
    { name: 'Structural & Architectural CAD', count: 0 },
    { name: 'Daily Progress Reports (DPR Archives)', count: 0 },
    { name: 'Safety & Quality Audits', count: 0 },
  ];

  const documents: Array<{ title: string; category: string; version: string; size: string; updated: string }> = [];

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
            <h1 className="text-[21px] font-bold text-[#262626] font-heading tracking-tight">Project Drawings & Contracts</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-3.5 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
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

      <div className="p-6 space-y-6">
      {/* Document Folders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {folders.map((folder, idx) => (
          <div key={idx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-brand group-hover:scale-105 transition-transform shadow-2xs">
              <Folder className="w-5 h-5 fill-brand/10 text-brand" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 mt-3 leading-snug line-clamp-1">{folder.name}</h4>
            <div className="text-[11px] text-slate-400 mt-1">{folder.count} files</div>
          </div>
        ))}
      </div>

      {/* File Registry List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm">Recent Uploaded Documents</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {documents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="font-semibold text-slate-700">No documents uploaded yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload agreements, approvals, and CAD drawings to build your repository.</p>
            </div>
          ) : (
            documents.map((doc, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-brand flex items-center justify-center font-bold text-xs shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800">{doc.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Category: {doc.category} • Version: {doc.version} • Size: {doc.size} • Uploaded: {doc.updated}
                    </div>
                  </div>
                </div>

                <button className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
