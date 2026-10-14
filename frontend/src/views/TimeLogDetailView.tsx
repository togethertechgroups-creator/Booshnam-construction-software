import React, { useState } from 'react';
import { 
  X, Edit2, Download, Trash2,
  FileText, Calendar, Clock, 
  User, Paperclip, Printer, Eye, Timer,
  FolderKanban, ListTodo, MessageSquare, Check,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { TimesheetEntry, formatDisplayDateTime } from '../lib/timesheetService';

interface TimeLogDetailViewProps {
  isOpen?: boolean;
  timesheet: TimesheetEntry | null;
  onClose?: () => void;
  onBack?: () => void;
  onEdit: (entry: TimesheetEntry) => void;
  onDelete: (id: string) => void;
  onShowToast?: (msg: string) => void;
}

export const TimeLogDetailView: React.FC<TimeLogDetailViewProps> = ({
  isOpen = true,
  timesheet,
  onClose,
  onBack,
  onEdit,
  onDelete,
  onShowToast
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const handleClose = onClose || onBack || (() => {});

  if (!isOpen || !timesheet) return null;

  const files = timesheet.files || [];
  const primaryAttachment = files[0];
  const additionalFilesCount = files.length > 1 ? files.length - 1 : 0;

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this timesheet entry?')) {
      onDelete(timesheet.id);
      onShowToast?.('Timesheet deleted successfully.');
      handleClose();
    }
  };

  const handlePrint = () => {
    onShowToast?.('Exporting timesheet voucher to PDF...');
    setTimeout(() => window.print(), 200);
  };

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* SIDE DRAWER OVERLAY & CONTAINER (Slide-in from right)            */}
      {/* ---------------------------------------------------------------- */}
      <div 
        className="fixed inset-0 z-[120] overflow-hidden bg-slate-900/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200"
        onClick={handleClose}
      >
        <div 
          className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Brand Line */}
          <div className="h-1.5 w-full bg-linear-to-r from-red-600 via-rose-500 to-red-600 shrink-0" />

          {/* ---------------------------------------------------------------- */}
          {/* DRAWER HEADER BAR                                                */}
          {/* ---------------------------------------------------------------- */}
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="p-1 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Close drawer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>

              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-wider uppercase">
                  Time Log Details
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Verified
                </span>
                {(timesheet.last_updated_at || timesheet.updated_at) && (
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                    title={`Last Updated: ${timesheet.last_updated_at || formatDisplayDateTime(timesheet.updated_at)}`}
                  >
                    <Clock className="w-3 h-3 text-amber-600" />
                    Updated
                  </span>
                )}
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onEdit(timesheet)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:border-red-600 hover:text-red-600 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Edit Timesheet"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                onClick={handlePrint}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Print or Export PDF"
              >
                <Printer className="w-4 h-4 text-slate-600" />
              </button>

              <button
                onClick={handleDelete}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Delete Timesheet"
              >
                <Trash2 className="w-4 h-4 text-slate-600 hover:text-red-600" />
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* DRAWER SCROLLABLE BODY                                           */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-white">
            
            {/* -------------------------------------------------------------- */}
            {/* COMPACT TIME & DURATION METRIC CARDS                           */}
            {/* Smaller, neat, proportional cards (Start Time | End Time | Dur) */}
            {/* -------------------------------------------------------------- */}
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* Start Time Mini Card */}
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-3 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Start Time
                  </span>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  {timesheet.start_time}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  Site Check-in
                </div>
              </div>

              {/* End Time Mini Card */}
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-3 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    End Time
                  </span>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  {timesheet.end_time}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  Site Checkout
                </div>
              </div>

              {/* Duration Mini Card */}
              <div className="bg-red-50/60 rounded-xl border border-red-200/90 p-3 hover:border-red-300 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                    Duration
                  </span>
                  <Timer className="w-3.5 h-3.5 text-red-600" />
                </div>
                <div className="text-sm sm:text-base font-black text-red-600 tracking-tight">
                  {timesheet.duration}
                </div>
                <div className="text-[10px] text-red-600/90 font-medium mt-0.5 truncate flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  <span>Total Logged</span>
                </div>
              </div>

            </div>

            {/* -------------------------------------------------------------- */}
            {/* ADDITIONAL DETAILS DOSSIER CARD                                */}
            {/* -------------------------------------------------------------- */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              
              {/* Card Header: Red Bar + Title + Entry ID + Last Updated */}
              <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3.5 bg-red-600 rounded-full" />
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                    Additional Details:
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {(timesheet.last_updated_at || timesheet.updated_at) && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50/90 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Updated: {timesheet.last_updated_at || formatDisplayDateTime(timesheet.updated_at)}</span>
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400">
                    Entry ID: <code className="font-mono text-slate-600 font-semibold">{timesheet.id}</code>
                  </span>
                </div>
              </div>

              {/* Details List */}
              <div className="divide-y divide-slate-100 text-xs">
                
                {/* Party */}
                <div className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/40 transition-colors">
                  <span className="w-24 text-slate-400 font-medium shrink-0 flex items-center gap-1.5 pt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Party:</span>
                  </span>
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    <span className="text-slate-900 font-semibold">
                      {timesheet.party_name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Supervisor
                    </span>
                  </div>
                </div>

                {/* Project */}
                <div className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/40 transition-colors">
                  <span className="w-24 text-slate-400 font-medium shrink-0 flex items-center gap-1.5 pt-0.5">
                    <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                    <span>Project:</span>
                  </span>
                  <div className="flex-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-semibold text-xs border border-red-100">
                      <FolderKanban className="w-3 h-3 text-red-500" />
                      {timesheet.project_name}
                    </span>
                  </div>
                </div>

                {/* Task */}
                <div className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/40 transition-colors">
                  <span className="w-24 text-slate-400 font-medium shrink-0 flex items-center gap-1.5 pt-0.5">
                    <ListTodo className="w-3.5 h-3.5 text-slate-400" />
                    <span>Task:</span>
                  </span>
                  <div className="flex-1 text-slate-700 font-medium">
                    {timesheet.task_name || '--'}
                  </div>
                </div>

                {/* Date */}
                <div className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/40 transition-colors">
                  <span className="w-24 text-slate-400 font-medium shrink-0 flex items-center gap-1.5 pt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Date:</span>
                  </span>
                  <div className="flex-1 text-slate-900 font-semibold">
                    {timesheet.display_date || timesheet.date}
                  </div>
                </div>

                {/* Last Updated Date & Time */}
                <div className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50/40 transition-colors ${
                  timesheet.last_updated_at || timesheet.updated_at ? 'bg-amber-50/25' : ''
                }`}>
                  <span className="w-24 text-slate-400 font-medium shrink-0 flex items-center gap-1.5 pt-0.5">
                    <Clock className={`w-3.5 h-3.5 ${timesheet.last_updated_at || timesheet.updated_at ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span>Last Updated:</span>
                  </span>
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    {timesheet.last_updated_at || timesheet.updated_at ? (
                      <>
                        <span className="text-slate-900 font-bold">
                          {timesheet.last_updated_at || formatDisplayDateTime(timesheet.updated_at)}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Auto-recorded
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400 italic">
                        Not updated yet (Created {formatDisplayDateTime(timesheet.created_at) || timesheet.display_date || timesheet.date})
                      </span>
                    )}
                  </div>
                </div>

                {/* Remarks */}
                <div className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/40 transition-colors">
                  <span className="w-24 text-slate-400 font-medium shrink-0 flex items-center gap-1.5 pt-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Remarks:</span>
                  </span>
                  <div className="flex-1">
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-slate-800 text-xs leading-relaxed font-normal">
                      {timesheet.remarks || '--'}
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                <div className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/40 transition-colors">
                  <span className="w-24 text-slate-400 font-medium shrink-0 flex items-center gap-1.5 pt-1">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span>Attachments:</span>
                  </span>
                  <div className="flex-1">
                    {files.length === 0 ? (
                      <span className="text-slate-400 italic text-xs">No attachments uploaded</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        {/* Thumbnail with +count badge and hover eye */}
                        <div 
                          onClick={() => {
                            setActivePhotoIdx(0);
                            setLightboxOpen(true);
                          }}
                          className="relative group cursor-pointer inline-block shrink-0"
                          title="Click to view full attachment"
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-200 group-hover:border-red-600 bg-slate-100 shadow-2xs group-hover:shadow-md transition-all relative">
                            {primaryAttachment?.url ? (
                              <img 
                                src={primaryAttachment.url} 
                                alt={primaryAttachment.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500">
                                <FileText className="w-5 h-5 text-red-500" />
                              </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          </div>

                          {additionalFilesCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-[#2a1b4e] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-sm border border-white">
                              +{additionalFilesCount}
                            </span>
                          )}
                        </div>

                        {/* File summary and Lightbox trigger */}
                        <div className="text-xs space-y-0.5">
                          <div className="font-semibold text-slate-800">
                            {files.length} Site Attachment{files.length > 1 ? 's' : ''}
                          </div>
                          <p className="text-slate-400 text-[11px] truncate max-w-[200px]">
                            {primaryAttachment?.name || 'Inspection photo'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePhotoIdx(0);
                              setLightboxOpen(true);
                            }}
                            className="text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer text-xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View High-Res Photo Lightbox</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* ---------------------------------------------------------------- */}
          {/* DRAWER FOOTER                                                    */}
          {/* ---------------------------------------------------------------- */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Log</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-1.5 border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => onEdit(timesheet)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all hover:shadow cursor-pointer flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Timesheet</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* PHOTO LIGHTBOX MODAL (Click on attachment thumbnail)             */}
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
    </>
  );
};
