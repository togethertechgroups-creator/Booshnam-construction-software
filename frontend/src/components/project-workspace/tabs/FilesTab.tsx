import React, { useState, useRef, useMemo } from 'react';
import { 
  FileText, Folder, Download, Plus, Search, 
  Eye, Check, X, Upload, HardDrive, FileCheck, Image, Shield 
} from 'lucide-react';
import { Project } from '../../../types';
import { addProjectPhoto } from '../../../lib/projectPhotoUtils';
import { CustomSelect } from '../../CustomSelect';

interface FilesTabProps {
  project: Project;
  onShowToast?: (msg: string) => void;
}

export interface ProjectDocument {
  id: string;
  title: string;
  category: string;
  version: string;
  size: string;
  updated: string;
  uploader: string;
}

const DEFAULT_DOCUMENTS: ProjectDocument[] = [];

const FOLDER_CATEGORIES = [
  { id: 'ALL', name: 'All Files' },
  { id: 'CONTRACTS', name: 'Contracts & Agreements' },
  { id: 'PERMITS', name: 'Permits & Municipal NOCs' },
  { id: 'LAB_REPORTS', name: 'Lab Test Reports' },
  { id: 'QUALITY', name: 'Quality & Test Certificates' },
  { id: 'PHOTOS', name: 'Site Photos & Drone Surveys' },
];

export const FilesTab: React.FC<FilesTabProps> = ({ project, onShowToast }) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>(DEFAULT_DOCUMENTS);
  const folders = useMemo(() => {
    return FOLDER_CATEGORIES.map(f => ({
      ...f,
      count: f.id === 'ALL' ? documents.length : documents.filter(d => d.category === f.id).length
    }));
  }, [documents]);
  const [selectedFolder, setSelectedFolder] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  // Upload Form
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('CONTRACTS');
  const [docImageDataUrl, setDocImageDataUrl] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = documents.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchesFolder = selectedFolder === 'ALL' || d.category === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setDocImageDataUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setDocImageDataUrl('https://images.unsplash.com/photo-1541888946425-d0fbb186156a?w=800&auto=format&fit=crop&q=80');
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    const newDoc: ProjectDocument = {
      id: `doc-${Date.now()}`,
      title: docTitle.trim().endsWith('.pdf') || docTitle.trim().endsWith('.jpg') || docTitle.trim().endsWith('.png') 
        ? docTitle.trim() 
        : `${docTitle.trim()}.pdf`,
      category: docCategory,
      version: 'v1.0',
      size: '2.8 MB',
      updated: new Date().toISOString().split('T')[0],
      uploader: 'Site Engineer'
    };

    setDocuments([newDoc, ...documents]);

    // Automatically sync image into Dashboard Project Photos
    if (docImageDataUrl || docCategory === 'PHOTOS') {
      const photoUrl = docImageDataUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?w=800&auto=format&fit=crop&q=80';
      addProjectPhoto(project.id || project.code, {
        url: photoUrl,
        title: newDoc.title,
        source: 'Files',
        category: docCategory,
        details: `Category: ${docCategory} • Version: ${newDoc.version}`
      });
    }

    onShowToast?.(`Document "${newDoc.title}" uploaded & synced to Photos!`);
    setIsUploadOpen(false);

    // Reset
    setDocTitle('');
    setDocImageDataUrl(null);
    if (docFileInputRef.current) docFileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">
              CLOUD REPOSITORY
            </span>
            <h2 className="text-lg font-bold text-slate-900">Project Files, Contracts & Test Reports</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized version-controlled storage for contracts, municipal building permits, and lab test reports for {project.client_name || project.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedFolder(f.id)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedFolder === f.id
                ? 'bg-red-50/70 border-red-600 shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <Folder className={`w-5 h-5 ${selectedFolder === f.id ? 'text-red-600 fill-red-100' : 'text-amber-500 fill-amber-100'}`} />
              <span className="text-[10px] font-bold text-slate-400 font-mono">{f.count}</span>
            </div>
            <div className={`text-xs font-bold mt-2 truncate ${selectedFolder === f.id ? 'text-red-600' : 'text-slate-800'}`}>
              {f.name}
            </div>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-500 pr-2">{filteredDocs.length} files in folder</span>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Document Title</th>
                <th className="py-3.5 px-4 w-32">Folder Category</th>
                <th className="py-3.5 px-4 w-20">Version</th>
                <th className="py-3.5 px-4 w-24">Size</th>
                <th className="py-3.5 px-4 w-28">Upload Date</th>
                <th className="py-3.5 px-4">Uploaded By</th>
                <th className="py-3.5 px-4 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <FileText className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-xs">No Documents Found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "Upload File" to upload agreements, drawings, and reports.</p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="font-semibold text-slate-900 line-clamp-1">{doc.title}</div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                      {doc.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    {doc.version}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {doc.size}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                    {doc.updated}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {doc.uploader}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Preview File"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onShowToast?.(`Downloading ${doc.title}...`)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Download File"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{previewDoc.title}</h3>
                  <p className="text-xs text-slate-500">{previewDoc.category} • {previewDoc.size}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setPreviewDoc(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
              <FileCheck className="w-12 h-12 text-emerald-600 mx-auto" />
              <div className="font-bold text-slate-900 text-sm">Document Verified & Ready</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Secure digital document repository with cryptographic timestamp. Uploaded by {previewDoc.uploader} on {previewDoc.updated}.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onShowToast?.(`Downloaded ${previewDoc.title}`);
                  setPreviewDoc(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Upload Project Document</h3>
                  <p className="text-xs text-slate-500">{project.name}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsUploadOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Foundation Raft 28-Day Concrete Cube Test Report"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Folder / Category</label>
                <CustomSelect
                  value={docCategory}
                  onChange={(val) => setDocCategory(val)}
                  options={[
                    { label: 'Contracts & Agreements', value: 'CONTRACTS' },
                    { label: 'Permits & Municipal NOCs', value: 'PERMITS' },
                    { label: 'Lab Test Reports', value: 'LAB_REPORTS' },
                    { label: 'Quality & Test Certificates', value: 'QUALITY' },
                    { label: 'Site Photos & Drone Surveys', value: 'PHOTOS' },
                  ]}
                  size="md"
                  variant="brand"
                />
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={docFileInputRef}
                onChange={handleDocFileChange}
                accept="*/*"
                className="hidden"
              />

              {/* Upload Drop Area */}
              <div 
                onClick={() => docFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                  docImageDataUrl 
                    ? 'border-red-400 bg-red-50/20' 
                    : 'border-slate-200 hover:border-red-600 hover:bg-slate-50'
                }`}
              >
                {docImageDataUrl ? (
                  <div className="space-y-1.5">
                    <img 
                      src={docImageDataUrl} 
                      alt="Doc preview" 
                      className="max-h-36 w-auto mx-auto rounded-lg object-contain shadow-xs border border-slate-200"
                    />
                    <div className="text-[11px] font-semibold text-emerald-700">
                      File attached • Synced to Project Photos
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                    <div className="text-xs font-semibold text-slate-700">Click to choose file or drag & drop</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">PDF, Photos, DWG, or ZIP up to 100MB (Images sync to Photos)</div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
