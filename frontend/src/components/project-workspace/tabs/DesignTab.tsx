import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, Plus, Search, ChevronDown, ChevronRight, 
  MoreVertical, ArrowLeft, Upload, Eye, Trash2, X, Check,
  FileText, Image as ImageIcon, Download, ExternalLink, ShieldCheck,
  ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { Project, DesignDrawing } from '../../../types';
import { addProjectPhoto } from '../../../lib/projectPhotoUtils';
import { confirmAction } from '../../../lib/dialogService';
import { CustomSelect } from '../../CustomSelect';

interface DesignTabProps {
  project: Project;
  onShowToast?: (msg: string) => void;
}

export interface DrawingFolder {
  id: string;
  name: string;
  createdAt: string;
}

const DEFAULT_FOLDERS: DrawingFolder[] = [];

const DEFAULT_DRAWINGS: DesignDrawing[] = [];

export const DesignTab: React.FC<DesignTabProps> = ({ project, onShowToast }) => {
  const projectIdKey = project?.id || project?.code || 'default';
  const foldersStorageKey = `siteops_design_folders_v2_${projectIdKey}`;
  const drawingsStorageKey = `siteops_design_drawings_v2_${projectIdKey}`;

  // Folders State (persisted per project)
  const [folders, setFolders] = useState<DrawingFolder[]>(() => {
    try {
      const saved = localStorage.getItem(foldersStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_FOLDERS;
  });

  // Drawings State (persisted per project, default empty for newly created projects)
  const [drawings, setDrawings] = useState<DesignDrawing[]>(() => {
    try {
      const saved = localStorage.getItem(drawingsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((d: DesignDrawing) => d.id !== 'dwg-1' && d.title !== 'logo@2x.png');
        }
      }
    } catch (e) {}
    return DEFAULT_DRAWINGS;
  });

  // Active folder (null = main overview with folders grid and recent drawings)
  const [activeFolder, setActiveFolder] = useState<DrawingFolder | null>(null);

  // Search & Collapsible Sections
  const [search, setSearch] = useState('');
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);
  const [isRecentOpen, setIsRecentOpen] = useState(true);

  // Modals
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDrawingName, setUploadDrawingName] = useState('');
  const [uploadVersion, setUploadVersion] = useState('V1');
  const [uploadFolder, setUploadFolder] = useState('Unassigned');
  const [uploadImageDataUrl, setUploadImageDataUrl] = useState<string | null>(null);
  const [previewDrawing, setPreviewDrawing] = useState<DesignDrawing | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [imageError, setImageError] = useState<boolean>(false);

  // Active 3-dot dropdown menu id
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);
  const [activeMenuDwgId, setActiveMenuDwgId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when project changes
  useEffect(() => {
    try {
      const savedFolders = localStorage.getItem(foldersStorageKey);
      setFolders(savedFolders ? JSON.parse(savedFolders) : DEFAULT_FOLDERS);
      const savedDrawings = localStorage.getItem(drawingsStorageKey);
      if (savedDrawings) {
        const parsed = JSON.parse(savedDrawings);
        if (Array.isArray(parsed)) {
          setDrawings(parsed.filter((d: DesignDrawing) => d.id !== 'dwg-1' && d.title !== 'logo@2x.png'));
        } else {
          setDrawings([]);
        }
      } else {
        setDrawings([]);
      }
    } catch (e) {}
    setActiveFolder(null);
  }, [projectIdKey, foldersStorageKey, drawingsStorageKey]);

  // Persist folders
  const persistFolders = (newFolders: DrawingFolder[]) => {
    setFolders(newFolders);
    try {
      localStorage.setItem(foldersStorageKey, JSON.stringify(newFolders));
    } catch (e) {}
  };

  // Persist drawings
  const persistDrawings = (newDrawings: DesignDrawing[]) => {
    setDrawings(newDrawings);
    try {
      localStorage.setItem(drawingsStorageKey, JSON.stringify(newDrawings));
    } catch (e) {}
  };

  // Create Folder Handler
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolder: DrawingFolder = {
      id: `f-${Date.now()}`,
      name: newFolderName.trim(),
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updated = [...folders, newFolder];
    persistFolders(updated);
    onShowToast?.(`Folder "${newFolder.name}" created successfully!`);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
  };

  // Delete Folder Handler
  const handleDeleteFolder = async (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirmAction({
      title: 'Delete Design Folder',
      message: `Are you sure you want to delete folder "${folderName}" and its organization tags?`,
      confirmText: 'Delete Folder',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;

    const updated = folders.filter(f => f.id !== folderId);
    persistFolders(updated);
    if (activeFolder?.id === folderId) setActiveFolder(null);
    onShowToast?.(`Folder "${folderName}" deleted`);
    setActiveMenuFolderId(null);
  };

  // Handle Image / Document File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadDrawingName) {
      setUploadDrawingName(file.name);
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload Drawing Handler
  const handleUploadDrawing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDrawingName.trim()) return;

    const targetFolder = uploadFolder || (activeFolder ? activeFolder.name : 'Unassigned');
    const photoUrl = uploadImageDataUrl || '';
    const uploadedFile = fileInputRef.current?.files?.[0];
    const fileSizeStr = uploadedFile
      ? `${(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB`
      : '1.4 MB';

    const newDwg: DesignDrawing = {
      id: `dwg-${Date.now()}`,
      number: `DWG-${String(drawings.length + 1).padStart(3, '0')}`,
      title: uploadDrawingName.trim(),
      discipline: 'ARCHITECTURAL',
      version: uploadVersion.trim() || 'V1',
      approved_version: uploadVersion.trim() || 'V1',
      status: 'AFC Approved',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      author: `Uploaded ${uploadVersion.trim() || 'V1'} • ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      folder: targetFolder,
      url: photoUrl,
      file_size: fileSizeStr
    };

    const updated = [newDwg, ...drawings];
    persistDrawings(updated);

    // Synchronize image to Centralized Project Photos on Dashboard if image exists
    if (photoUrl) {
      addProjectPhoto(projectIdKey, {
        url: photoUrl,
        title: `Design: ${newDwg.title}`,
        source: 'Design',
        category: targetFolder,
        details: `Folder: ${targetFolder} • Version: ${newDwg.version}`
      });
    }

    onShowToast?.(`Drawing "${newDwg.title}" uploaded to ${targetFolder}!`);

    // Reset Form
    setUploadDrawingName('');
    setUploadVersion('V1');
    setUploadImageDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploadModalOpen(false);
  };

  // Delete Drawing
  const handleDeleteDrawing = async (drawingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const dwg = drawings.find(d => d.id === drawingId);
    const confirmed = await confirmAction({
      title: 'Delete Drawing',
      message: `Are you sure you want to remove drawing "${dwg?.title || 'this drawing'}"?`,
      confirmText: 'Delete Drawing',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;

    const updated = drawings.filter(d => d.id !== drawingId);
    persistDrawings(updated);
    onShowToast?.('Drawing removed');
    setActiveMenuDwgId(null);
  };

  // Filtered drawings
  const filteredDrawings = drawings.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.folder && d.folder.toLowerCase().includes(search.toLowerCase()))
  );

  // Drawings in currently active folder
  const activeFolderDrawings = activeFolder 
    ? filteredDrawings.filter(d => d.folder === activeFolder.name)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Top Search & Actions Bar (Exact match to Screenshot 2 & 3) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drawings in this project"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:bg-white focus:ring-1 focus:ring-red-100 transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {!activeFolder && (
            <button
              type="button"
              onClick={() => setIsNewFolderModalOpen(true)}
              className="px-4 py-2 bg-white border border-red-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Drawing folder</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setUploadFolder(activeFolder ? activeFolder.name : (folders[0]?.name || 'Unassigned'));
              setIsUploadModalOpen(true);
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-red-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload drawing</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. INSIDE FOLDER VIEW (Screenshot 3)                          */}
      {/* ============================================================== */}
      {activeFolder ? (
        <div className="space-y-4">
          {/* Breadcrumb Header */}
          <div className="flex items-center gap-2 px-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveFolder(null)}
              className="p-1 hover:bg-slate-200/60 rounded-lg text-slate-600 transition-colors cursor-pointer flex items-center gap-1"
              title="Back to all folders"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span 
              onClick={() => setActiveFolder(null)}
              className="text-slate-500 hover:text-slate-900 cursor-pointer font-medium"
            >
              Design
            </span>
            <span className="text-slate-400">›</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{activeFolder.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium ml-1">
              {activeFolderDrawings.length} drawings
            </span>
          </div>

          {/* Folder Contents */}
          {activeFolderDrawings.length === 0 ? (
            /* Empty State matching Screenshot 3 */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
                <Folder className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700">No Design Available</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Upload architectural plans, 2D/3D layouts, or shop drawings to this folder.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadFolder(activeFolder.name);
                  setIsUploadModalOpen(true);
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-100 inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Upload drawing</span>
              </button>
            </div>
          ) : (
            /* Drawings Table in Folder */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                      <th className="py-3 px-4">NAME</th>
                      <th className="py-3 px-4 w-24">VERSION</th>
                      <th className="py-3 px-4 w-24">APPROVED</th>
                      <th className="py-3 px-4">LAST ACTIVITY</th>
                      <th className="py-3 px-4 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {activeFolderDrawings.map((dwg) => (
                      <tr 
                        key={dwg.id} 
                        onClick={() => {
                          setPreviewDrawing(dwg);
                          setZoomLevel(1);
                          setImageError(false);
                        }}
                        className="hover:bg-red-50/20 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-800 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="group-hover:text-red-600 transition-colors">{dwg.title}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                            {dwg.version || 'V1'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {dwg.approved_version || dwg.version || 'V1'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {dwg.author || `Uploaded on ${dwg.date}`}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteDrawing(dwg.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete drawing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* 2. MAIN DESIGN OVERVIEW (Screenshot 2)                        */
        /* ============================================================== */
        <div className="space-y-6">

          {/* Section 1: Drawing Folders (Collapsible) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsFoldersOpen(!isFoldersOpen)}
              className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer select-none"
            >
              {isFoldersOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              <span>Drawing Folders</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded-full text-[10px] font-semibold">
                {folders.length}
              </span>
            </button>

            {isFoldersOpen && (
              folders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-xs">
                  No drawing folders created yet. Click <span className="font-semibold text-slate-600">+ Drawing folder</span> to organize your project drawings.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {folders.map((f) => {
                  const count = drawings.filter(d => d.folder === f.name).length;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setActiveFolder(f)}
                      className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-red-300 transition-all cursor-pointer flex items-center justify-between group relative"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Folder className="w-5 h-5 fill-red-600/20" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate leading-tight group-hover:text-red-600 transition-colors">
                            {f.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                            {count} Drawings
                          </p>
                        </div>
                      </div>

                      {/* 3-Dot More Menu */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuFolderId(activeMenuFolderId === f.id ? null : f.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuFolderId === f.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-150 p-1 z-30 animate-in fade-in"
                          >
                            <button
                              type="button"
                              onClick={(e) => handleDeleteFolder(f.id, f.name, e)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-semibold text-left cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete folder</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
          </div>

          {/* Section 2: Recent Drawings (Collapsible) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsRecentOpen(!isRecentOpen)}
              className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer select-none"
            >
              {isRecentOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              <span>Recent drawings</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded-full text-[10px] font-semibold">
                {filteredDrawings.length}
              </span>
            </button>

            {isRecentOpen && (
              <div className="bg-white rounded-[5px] border border-slate-200 overflow-hidden shadow-2xs">
                {filteredDrawings.length === 0 ? (
                  <div className="py-12 px-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-[5px] bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">No drawings uploaded yet</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                        Upload architectural plans, 2D/3D layouts, or shop drawings for this project.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFolder(folders[0]?.name || 'Unassigned');
                        setIsUploadModalOpen(true);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-[5px] text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload drawing</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                          <th className="py-3.5 px-5">NAME</th>
                          <th className="py-3.5 px-4 w-28">VERSION</th>
                          <th className="py-3.5 px-4 w-28">APPROVED</th>
                          <th className="py-3.5 px-4">LAST ACTIVITY</th>
                          <th className="py-3.5 px-4">FOLDER</th>
                          <th className="py-3.5 px-4 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredDrawings.map((dwg) => (
                          <tr
                            key={dwg.id}
                            onClick={() => {
                              setPreviewDrawing(dwg);
                              setZoomLevel(1);
                              setImageError(false);
                            }}
                            className="hover:bg-red-50/20 transition-colors cursor-pointer group"
                          >
                          <td className="py-3.5 px-5 font-semibold text-slate-800 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="group-hover:text-red-600 transition-colors">{dwg.title}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                              {dwg.version || 'V1'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {dwg.approved_version || dwg.version || 'V1'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {dwg.author || `Uploaded on ${dwg.date}`}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">
                              <Folder className="w-3 h-3 fill-red-600/20" />
                              <span>{dwg.folder || 'Unassigned'}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDrawing(dwg.id, e)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete drawing"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* 3. NEW FOLDER MODAL (Exact match to Screenshot 1)             */}
      {/* ============================================================== */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">New folder</h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewFolderModalOpen(false);
                  setNewFolderName('');
                }}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description matching Screenshot 1 */}
            <p className="text-xs text-slate-600 leading-relaxed">
              Folders group drawings the way your set is organised — by discipline, tower, or issue stage.
            </p>

            <form onSubmit={handleCreateFolder} className="space-y-6">
              {/* Floating label input box matching Screenshot 1 */}
              <div className="relative border border-slate-300 rounded-xl px-4 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  FOLDER NAME
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Structural Rebar Plans"
                  className="w-full text-xs text-slate-800 font-medium bg-transparent focus:outline-none placeholder:text-slate-300"
                />
              </div>

              {/* Submit button matching Screenshot 1 */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-200 cursor-pointer"
                >
                  Create folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. UPLOAD DRAWING MODAL (Connected to Device / Gallery)       */}
      {/* ============================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Upload Drawing</h3>
                  <p className="text-xs text-slate-500">{project.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadImageDataUrl(null);
                  setUploadDrawingName('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="hidden"
            />

            <form onSubmit={handleUploadDrawing} className="space-y-3.5">
              {/* Drawing Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Drawing Name / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tower A Floor 4 Structural Rebar Plan.png"
                  value={uploadDrawingName}
                  onChange={(e) => setUploadDrawingName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                />
              </div>

              {/* Target Folder & Version */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign to Folder
                  </label>
                  <CustomSelect
                    value={uploadFolder}
                    onChange={(val) => setUploadFolder(val)}
                    options={[
                      { label: 'Unassigned', value: 'Unassigned' },
                      ...folders.map((f) => ({ label: f.name, value: f.name }))
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    placeholder="V1"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                  />
                </div>
              </div>

              {/* Image Picker Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Choose Image / Drawing File from Device
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                    uploadImageDataUrl 
                      ? 'border-red-400 bg-red-50/20' 
                      : 'border-slate-200 hover:border-red-500 hover:bg-slate-50'
                  }`}
                >
                  {uploadImageDataUrl ? (
                    <div className="space-y-1.5">
                      <img
                        src={uploadImageDataUrl}
                        alt="Drawing preview"
                        className="max-h-36 w-auto mx-auto rounded-lg object-contain shadow-xs border border-slate-200"
                      />
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <span className="text-[11px] font-semibold text-emerald-700">Image attached</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadImageDataUrl(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                        >
                          Change File
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-7 h-7 text-slate-400 mx-auto mb-1" />
                      <div className="text-xs font-semibold text-slate-700">Click to select photo from gallery / computer</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, DWG, PDF up to 25MB (Auto-syncs to Dashboard Photos)</div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setUploadImageDataUrl(null);
                    setUploadDrawingName('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Upload drawing</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. LIGHTBOX / DRAWING PREVIEW MODAL                           */}
      {/* ============================================================== */}
      {previewDrawing && (
        <div
          onClick={() => {
            setPreviewDrawing(null);
            setZoomLevel(1);
            setImageError(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-[5px] max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl border border-slate-800 cursor-default animate-in zoom-in-95 duration-150"
          >
            {/* Top Toolbar */}
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-red-950 text-red-400 border border-red-800/60 uppercase tracking-wider shrink-0">
                  {previewDrawing.folder || 'Unassigned'}
                </span>
                <h4 className="font-bold text-sm text-slate-100 truncate">{previewDrawing.title}</h4>
                <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 shrink-0">
                  {previewDrawing.version || 'V1'}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {previewDrawing.status || 'AFC Approved'}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Zoom Controls */}
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-[5px] p-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(Number((prev - 0.25).toFixed(2)), 0.5))}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-[3px] transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="px-2 py-1 text-[11px] tracking-tight text-slate-300 hover:text-white hover:bg-slate-700 rounded-[3px] transition-colors cursor-pointer"
                    title="Reset to 100%"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(Number((prev + 0.25).toFixed(2)), 3))}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-[3px] transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                {/* Download / Open */}
                {previewDrawing.url && (
                  <a
                    href={previewDrawing.url}
                    download={previewDrawing.title || 'drawing'}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-[5px] transition-colors cursor-pointer"
                    title="Download / Open Full Size"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}

                {/* Close */}
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDrawing(null);
                    setZoomLevel(1);
                    setImageError(false);
                  }}
                  className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-[5px] transition-colors cursor-pointer ml-1"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawing Viewport / Canvas (Guaranteed Minimum Height & No Collapsing) */}
            <div className="relative flex-1 min-h-[440px] md:min-h-[560px] max-h-[72vh] w-full bg-[#070a12] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center p-4 overflow-auto select-none">
              {previewDrawing.url && !imageError ? (
                <img
                  src={previewDrawing.url}
                  alt={previewDrawing.title}
                  onError={() => setImageError(true)}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                  }}
                  className="max-h-[66vh] max-w-full object-contain rounded-[4px] shadow-2xl transition-transform duration-150 pointer-events-auto"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 max-w-md space-y-4">
                  <div className="w-16 h-16 rounded-[5px] bg-slate-800 border border-slate-700 flex items-center justify-center text-red-500 shadow-inner">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">{previewDrawing.title}</h3>
                    <p className="text-xs text-slate-400">
                      Direct preview not available for this CAD/PDF format or offline link.
                    </p>
                  </div>
                  {previewDrawing.url && (
                    <a
                      href={previewDrawing.url}
                      download={previewDrawing.title || 'drawing'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-[5px] flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download / Open File</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-800 text-xs shrink-0">
              <div className="text-slate-400">
                <span className="font-semibold text-slate-300">{previewDrawing.author || `Uploaded on ${previewDrawing.date}`}</span>
                <span className="mx-2 text-slate-600">•</span>
                <span>Project: {project.name}</span>
                {previewDrawing.file_size && (
                  <>
                    <span className="mx-2 text-slate-600">•</span>
                    <span>Size: {previewDrawing.file_size}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDrawing(null);
                    setZoomLevel(1);
                    setImageError(false);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-[5px] border border-slate-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
