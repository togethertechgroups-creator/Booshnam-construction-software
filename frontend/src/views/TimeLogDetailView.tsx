import React, { useState } from 'react';
import { 
  ArrowLeft, Edit2, MoreVertical, X, 
  ChevronLeft, ChevronRight, Download, Trash2,
  FileText, ExternalLink, Calendar, Clock, Building2, 
  User, CheckCircle2, Paperclip, Printer, Eye, Timer,
  FolderKanban, ListTodo, MessageSquare, Check
} from 'lucide-react';
import { TimesheetEntry } from '../lib/timesheetService';

interface TimeLogDetailViewProps {
  timesheet: TimesheetEntry;
  onBack: () => void;
  onEdit: (entry: TimesheetEntry) => void;
  onDelete: (id: string) => void;
  onShowToast?: (msg: string) => void;
}

export const TimeLogDetailView: React.FC<TimeLogDetailViewProps> = ({
  timesheet,
  onBack,
  onEdit,
  onDelete,
  onShowToast
}) => {
  const [activeMenuOpen, setActiveMenuOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const files = timesheet.files || [];
  const primaryAttachment = files[0];
  const additionalFilesCount = files.length > 1 ? files.length - 1 : 0;

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this timesheet entry?')) {
      onDelete(timesheet.id);
      onShowToast?.('Timesheet deleted successfully.');
      onBack();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col animate-in fade-in duration-150">
      
      {/* ---------------------------------------------------------------- */}
      {/* Top Header Bar (Modern Red & White Enterprise Brand Header) */}
      {/* ---------------------------------------------------------------- */}
      <header className="px-6 py-3.5 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-2xs flex items-center justify-between w-full">
          
          {/* Left: Back button & Breadcrumb Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
              title="Back to Timesheets"
              aria-label="Back to Timesheets"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Schedule & Timesheet</span>
              <span className="text-xs text-slate-300">/</span>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Time Log View</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Log
                </span>
              </h1>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => onEdit(timesheet)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-red-600 hover:text-red-600 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Edit Timesheet"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => {
                onShowToast?.('Exporting timesheet voucher to PDF...');
                setTimeout(() => window.print(), 300);
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer hidden sm:flex"
              title="Print or Export PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={() => setActiveMenuOpen(!activeMenuOpen)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="More Options"
            >
              <MoreVertical className="w-4 h-4 text-slate-600" />
            </button>

            {/* Dropdown menu */}
            {activeMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-44 text-xs animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setActiveMenuOpen(false);
                    onEdit(timesheet);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Log</span>
                </button>
                <button
                  onClick={() => {
                    setActiveMenuOpen(false);
                    handlePrint();
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download / Print</span>
                </button>
                <button
                  onClick={() => {
                    setActiveMenuOpen(false);
                    handleDelete();
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer border-t border-slate-100"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Main Content Area (Polished Red & White Theme Card Layout) */}
      {/* ---------------------------------------------------------------- */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 lg:px-10 py-8 space-y-6">
        
        {/* Top Summary Metrics Cards (Start Time | End Time | Duration) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Start Time Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Start Time
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight group-hover:text-red-600 transition-colors">
              {timesheet.start_time}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Recorded Site Check-in
            </div>
          </div>

          {/* End Time Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                End Time
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {timesheet.end_time}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Recorded Site Checkout
            </div>
          </div>

          {/* Duration Card */}
          <div className="bg-white rounded-2xl border border-red-200/80 bg-linear-to-br from-white via-red-50/20 to-red-50/40 p-5 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
                Duration
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                <Timer className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-red-600 tracking-tight">
              {timesheet.duration}
            </div>
            <div className="text-xs text-red-500/90 font-medium mt-1 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Total Logged Hours</span>
            </div>
          </div>

        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Additional Details Dossier Card */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          
          {/* Card Header */}
          <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 bg-red-600 rounded-full" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Additional Details:
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Entry ID: <code className="font-mono text-slate-600">{timesheet.id}</code>
            </span>
          </div>

          {/* Details Table Rows with crisp dividers */}
          <div className="divide-y divide-slate-100 text-sm">
            
            {/* Party: */}
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 transition-colors">
              <span className="w-36 text-slate-500 font-medium shrink-0 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Party:</span>
              </span>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-slate-900 font-semibold">
                  {timesheet.party_name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Supervisor
                </span>
              </div>
            </div>

            {/* Project: */}
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 transition-colors">
              <span className="w-36 text-slate-500 font-medium shrink-0 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>Project:</span>
              </span>
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 text-red-700 font-semibold text-xs border border-red-100">
                  <FolderKanban className="w-3.5 h-3.5 text-red-500" />
                  {timesheet.project_name}
                </span>
              </div>
            </div>

            {/* Task: */}
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 transition-colors">
              <span className="w-36 text-slate-500 font-medium shrink-0 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-slate-400" />
                <span>Task:</span>
              </span>
              <div className="flex-1 text-slate-700 font-medium">
                {timesheet.task_name || '--'}
              </div>
            </div>

            {/* Date: */}
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 transition-colors">
              <span className="w-36 text-slate-500 font-medium shrink-0 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Date:</span>
              </span>
              <div className="flex-1 text-slate-900 font-semibold">
                {timesheet.display_date || timesheet.date}
              </div>
            </div>

            {/* Remarks: */}
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2 hover:bg-slate-50/50 transition-colors">
              <span className="w-36 text-slate-500 font-medium shrink-0 flex items-center gap-2 pt-1">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <span>Remarks:</span>
              </span>
              <div className="flex-1">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-xs sm:text-sm leading-relaxed font-normal">
                  {timesheet.remarks || '--'}
                </div>
              </div>
            </div>

            {/* Attachments: (Square Thumbnail + "+1" Badge matching screenshot) */}
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2 hover:bg-slate-50/50 transition-colors">
              <span className="w-36 text-slate-500 font-medium shrink-0 flex items-center gap-2 pt-2">
                <Paperclip className="w-4 h-4 text-slate-400" />
                <span>Attachments:</span>
              </span>
              
              <div className="flex-1">
                {files.length === 0 ? (
                  <span className="text-slate-400 italic text-xs">No attachments uploaded</span>
                ) : (
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={() => {
                        setActivePhotoIdx(0);
                        setLightboxOpen(true);
                      }}
                      className="relative group cursor-pointer inline-block"
                      title="Click to view full attachment"
                    >
                      {/* Thumbnail Container */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-200 group-hover:border-red-600 bg-slate-100 shadow-2xs group-hover:shadow-md transition-all relative">
                        {primaryAttachment?.url ? (
                          <img 
                            src={primaryAttachment.url} 
                            alt={primaryAttachment.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500">
                            <FileText className="w-6 h-6 text-red-500" />
                          </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white drop-shadow" />
                        </div>
                      </div>

                      {/* "+1" Badge if multiple files (matching screenshot) */}
                      {additionalFilesCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-[#2a1b4e] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white">
                          +{additionalFilesCount}
                        </span>
                      )}
                    </div>

                    {/* Secondary attachment details & lightbox trigger */}
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-slate-800">
                        {files.length} Site Attachment{files.length > 1 ? 's' : ''}
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        {primaryAttachment?.name || 'Inspection photo'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePhotoIdx(0);
                          setLightboxOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View High-Res Photo Lightbox</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* ---------------------------------------------------------------- */}
      {/* PHOTO LIGHTBOX MODAL (Click on attachment thumbnail) */}
      {/* ---------------------------------------------------------------- */}
      {lightboxOpen && files.length > 0 && (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative max-w-4xl w-full bg-slate-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-800 animate-in zoom-in-95">
            
            {/* Lightbox Header */}
            <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {files[activePhotoIdx]?.name || 'Site Attachment Photo'}
                </span>
                <span className="text-slate-400">
                  ({activePhotoIdx + 1} of {files.length})
                </span>
              </div>

              <div className="flex items-center gap-3">
                {files[activePhotoIdx]?.url && (
                  <a
                    href={files[activePhotoIdx].url}
                    download={files[activePhotoIdx].name}
                    className="p-1 text-slate-300 hover:text-white rounded transition-colors"
                    title="Download Image"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Preview */}
            <div className="p-6 flex items-center justify-center bg-black min-h-[400px] max-h-[70vh] overflow-hidden relative">
              {files[activePhotoIdx]?.url ? (
                <img
                  src={files[activePhotoIdx].url}
                  alt={files[activePhotoIdx].name}
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center text-slate-400 py-12">
                  <FileText className="w-16 h-16 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold">{files[activePhotoIdx]?.name}</p>
                  <p className="text-xs text-slate-500 mt-1">File preview not available</p>
                </div>
              )}

              {/* Prev / Next Buttons if multiple files */}
              {files.length > 1 && (
                <>
                  <button
                    onClick={() => setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : files.length - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-colors cursor-pointer shadow-md"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActivePhotoIdx((prev) => (prev < files.length - 1 ? prev + 1 : 0))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-colors cursor-pointer shadow-md"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Footer Thumbnails strip */}
            {files.length > 1 && (
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-2">
                {files.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                      activePhotoIdx === idx ? 'border-red-500 ring-2 ring-red-500/40' : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {file.url ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-[10px]">
                        FILE
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
