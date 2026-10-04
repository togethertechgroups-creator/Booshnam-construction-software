import React, { useState, useRef } from 'react';
import { 
  X, CheckCircle2, MoreVertical, Image as ImageIcon, 
  ChevronRight, ChevronUp, ChevronDown, Check, Edit2, 
  Trash2, Plus, Calendar, Clock, Paperclip, Send, Eye,
  FileText, Download, CheckSquare, Sparkles
} from 'lucide-react';
import { QuotationScheduleTask } from '../../lib/quotationScheduleService';

interface QuotationTaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: QuotationScheduleTask | null;
  onShowToast?: (msg: string) => void;
  onUpdateTask?: (updated: QuotationScheduleTask) => void;
}

export const QuotationTaskDrawer: React.FC<QuotationTaskDrawerProps> = ({
  isOpen,
  onClose,
  task,
  onShowToast,
  onUpdateTask
}) => {
  const [drawerTab, setDrawerTab] = useState<'progress' | 'resources' | 'logs'>('progress');
  const [isDatesExpanded, setIsDatesExpanded] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [messagesList, setMessagesList] = useState<Array<{ text: string; time: string }>>(() => {
    if (task?.messages && task.messages.length > 0) {
      return task.messages.map(m => ({ text: m.text, time: m.time }));
    }
    return [];
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [isAddToDoOpen, setIsAddToDoOpen] = useState(false);
  const [toDos, setToDos] = useState<Array<{ id: string; text: string; done: boolean }>>(() => {
    if (task?.todos && task.todos.length > 0) {
      return task.todos;
    }
    return [
      { id: '1', text: 'Quotation preliminary draft verification', done: true }
    ];
  });
  const [newToDoInput, setNewToDoInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever selected task changes
  React.useEffect(() => {
    if (task) {
      if (task.todos && task.todos.length > 0) {
        setToDos(task.todos);
      }
      if (task.messages && task.messages.length > 0) {
        setMessagesList(task.messages.map(m => ({ text: m.text, time: m.time })));
      }
    }
  }, [task?.id]);

  if (!isOpen || !task) return null;

  // Format date helper: "2026-06-29" -> "29 Jun 26"
  const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return '29 Jun 26';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = String(d.getFullYear()).slice(-2);
      return `${day} ${month} ${year}`;
    } catch {
      return dStr;
    }
  };

  const startDateFormatted = formatDisplayDate(task.start_date);
  const endDateFormatted = formatDisplayDate(task.end_date);
  const actualStart = task.actual_start || startDateFormatted;
  const actualEnd = task.actual_end || endDateFormatted;
  const forecastEnd = task.forecast_end || endDateFormatted;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    const newMsg = { text: messageText.trim(), time: 'Just now' };
    const updatedMsgs = [...messagesList, newMsg];
    setMessagesList(updatedMsgs);
    setMessageText('');
    const updated = {
      ...task,
      messages: updatedMsgs.map((m, idx) => ({ id: `msg-${idx}`, user: task.assignee || 'User', text: m.text, time: m.time }))
    };
    onUpdateTask?.(updated);
    onShowToast?.('Message added to task log.');
  };

  const handleToggleToDo = (id: string) => {
    const updated = toDos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setToDos(updated);
    onUpdateTask?.({ ...task, todos: updated });
  };

  const handleAddToDo = () => {
    if (!newToDoInput.trim()) return;
    const updated = [...toDos, { id: String(Date.now()), text: newToDoInput.trim(), done: false }];
    setToDos(updated);
    setNewToDoInput('');
    onUpdateTask?.({ ...task, todos: updated });
    onShowToast?.('To-Do item added.');
  };

  const handleAddProgress = () => {
    const newProg = prompt('Enter updated progress percentage (0 - 100):', String(task.progress_percentage || 100));
    if (newProg !== null) {
      const num = parseInt(newProg, 10);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const updated = { 
          ...task, 
          progress_percentage: num, 
          status: num === 100 ? ('COMPLETED' as const) : ('IN_PROGRESS' as const),
          progressUpdates: [
            {
              id: `prog-${Date.now()}`,
              user: task.progress_user || task.assignee || 'Staff',
              amount: `${num}%`,
              date: todayStr,
              note: `Progress updated to ${num}%`,
              proof_url: task.image_url
            },
            ...(task.progressUpdates || [])
          ]
        };
        onUpdateTask?.(updated);
        onShowToast?.(`Task progress updated to ${num}%`);
      }
    }
  };

  // The actual photo uploaded in Project -> Tasks, or fallback crane image if present on sample
  const samplePhotoUrl = task.image_url || '/crane-construction.png';

  return (
    <div 
      className="fixed inset-0 z-[120] overflow-hidden bg-slate-900/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Purple/Brand Line matching screenshot */}
        <div className="h-1.5 w-full bg-linear-to-r from-red-600 via-rose-500 to-red-600 shrink-0" />

        {/* ---------------------------------------------------------------- */}
        {/* Header Bar: ✕  ● 1/1 % (Completed)        Completed ⋮           */}
        {/* ---------------------------------------------------------------- */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>

            {/* Status indicator pill matching screenshot: ● 1/1 % (Completed) */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>
                {task.progress_percentage || 1}/{task.progress_percentage || 1} % 
                <span className="text-slate-400 font-normal ml-1">
                  ({task.status === 'COMPLETED' ? 'Completed' : 'In Progress'})
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Status Button */}
            <button
              type="button"
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{task.status === 'COMPLETED' ? 'Completed' : task.status}</span>
            </button>

            {/* Three Dots Menu */}
            <button
              type="button"
              onClick={() => onShowToast?.('Task options')}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Status dropdown */}
            {statusMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-36 text-xs animate-in fade-in zoom-in-95">
                {(['COMPLETED', 'IN_PROGRESS', 'PENDING'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusMenuOpen(false);
                      onUpdateTask?.({ ...task, status: st });
                      onShowToast?.(`Task status changed to ${st}`);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-red-50 hover:text-red-700 cursor-pointer ${
                      task.status === st ? 'font-bold text-red-600 bg-red-50/50' : 'text-slate-700'
                    }`}
                  >
                    {st === 'COMPLETED' ? 'Completed' : st === 'IN_PROGRESS' ? 'In Progress' : 'Pending'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Scrollable Body Content                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-white">
          
          {/* Title Row: Quotation + Photo Icon */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {task.task_name}
            </h1>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 border border-slate-200 hover:border-red-500 hover:text-red-600 rounded-xl transition-colors cursor-pointer text-slate-500 shadow-2xs"
              title="Attach photo or proof"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const url = ev.target?.result as string;
                    onUpdateTask?.({ ...task, image_url: url });
                    onShowToast?.('Task photo attached.');
                  };
                  reader.readAsDataURL(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Project Subtitle if available */}
          {task.project_name && (
            <div className="text-xs text-slate-500 font-medium -mt-3">
              Project: <span className="font-semibold text-slate-700">{task.project_name}</span>
            </div>
          )}

          {/* 6 Attributes Grid matching screenshot */}
          <div className="grid grid-cols-3 gap-y-4 gap-x-2 pt-1 text-xs">
            {/* 1. ASSIGN TO */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                ASSIGN TO
              </span>
              <span className="font-semibold text-slate-800">
                {task.assignee || '—'}
              </span>
            </div>

            {/* 2. DURATION */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                DURATION
              </span>
              <span className="font-semibold text-slate-900">
                {task.duration_days || 1} wd
              </span>
            </div>

            {/* 3. TO DO */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                TO DO
              </span>
              <button
                type="button"
                onClick={() => setIsAddToDoOpen(!isAddToDoOpen)}
                className="font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
              >
                + Add To Do
              </button>
            </div>

            {/* 4. INSPECTION FORM */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                INSPECTION FORM
              </span>
              <button 
                type="button"
                onClick={() => onShowToast?.('No inspection forms attached to this task')}
                className="font-semibold text-slate-800 flex items-center gap-1 hover:text-red-600 cursor-pointer"
              >
                <span>0/0</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* 5. DEPENDENCIES */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                DEPENDENCIES
              </span>
              <button 
                type="button"
                onClick={() => onShowToast?.('0 dependencies configured')}
                className="font-semibold text-slate-800 flex items-center gap-1 hover:text-red-600 cursor-pointer"
              >
                <span>0</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* 6. TAG */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                TAG
              </span>
              <span className="font-semibold text-slate-700">
                {task.tag || '—'}
              </span>
            </div>
          </div>

          {/* Expandable To-Do Section if clicked */}
          {isAddToDoOpen && (
            <div className="p-3 bg-red-50/40 border border-red-100 rounded-xl space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center justify-between font-bold text-red-900">
                <span>Task Checklist</span>
                <button
                  type="button"
                  onClick={() => setIsAddToDoOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-[11px]"
                >
                  Hide
                </button>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {toDos.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => handleToggleToDo(t.id)}
                    className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer"
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${t.done ? 'bg-red-600 border-red-600 text-white' : 'border-slate-300'}`}>
                      {t.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className={t.done ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}>
                      {t.text}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={newToDoInput}
                  onChange={(e) => setNewToDoInput(e.target.value)}
                  placeholder="Add to-do item..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddToDo()}
                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddToDo}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Dates Card: START 29 Jun 26 · END 29 Jun 26   Hide dates ^       */}
          {/* ---------------------------------------------------------------- */}
          <div className="border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/90 flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">START</span>
                <span className="font-extrabold text-slate-900">{startDateFormatted}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">END</span>
                <span className="font-extrabold text-slate-900">{endDateFormatted}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDatesExpanded(!isDatesExpanded)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>{isDatesExpanded ? 'Hide dates' : 'Show dates'}</span>
                {isDatesExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isDatesExpanded && (
              <div className="p-4 space-y-2 text-xs bg-white animate-in fade-in">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Actual start</span>
                  <span className="font-bold text-slate-900">{actualStart}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Actual end</span>
                  <span className="font-bold text-slate-900">{actualEnd}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Forecast end</span>
                  <span className="font-bold text-red-600">{forecastEnd}</span>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Tabs: Progress | Resources | Delay & Status logs                 */}
          {/* ---------------------------------------------------------------- */}
          <div className="border-b border-slate-200">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setDrawerTab('progress')}
                className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                  drawerTab === 'progress'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Progress
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('resources')}
                className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                  drawerTab === 'resources'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Resources
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('logs')}
                className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                  drawerTab === 'logs'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Delay & Status logs
              </button>
            </div>
          </div>

          {/* Tab 1: Progress Content */}
          {drawerTab === 'progress' && (
            <div className="space-y-4 pt-1">
              
              {/* Attached Photo Preview (Matching user's uploaded proof) */}
              {samplePhotoUrl ? (
                <div 
                  onClick={() => setLightboxOpen(true)}
                  className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center cursor-pointer max-h-56 shadow-2xs hover:border-red-400 transition-all"
                  title="Click to view full photo"
                >
                  <img 
                    src={samplePhotoUrl} 
                    alt={task.task_name} 
                    className="w-full max-h-52 object-cover group-hover:scale-105 transition-transform duration-200 opacity-95 group-hover:opacity-100" 
                  />
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-2xs">
                    <Eye className="w-4 h-4" />
                    <span>Click to Preview Full Photo</span>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-red-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-red-50/20 transition-all"
                >
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No inspection / quotation photo uploaded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click here to attach site photo or proof</p>
                </div>
              )}

              {/* User Messages list if any */}
              {messagesList.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Task Discussion & Notes
                  </span>
                  {messagesList.map((m, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center justify-between">
                      <span>{m.text}</span>
                      <span className="text-[10px] text-slate-400">{m.time}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* Tab 2: Resources Content (Real project task resources) */}
          {drawerTab === 'resources' && (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Incharge:</span>
                  <span className="font-bold text-slate-800">{task.assignee || 'Staff'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Project:</span>
                  <span className="font-bold text-slate-800">{task.project_name || 'Project'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Task Scope:</span>
                  <span className="font-bold text-slate-800">{task.task_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tag / Category:</span>
                  <span className="font-bold text-slate-800">{task.tag || 'Quotation'}</span>
                </div>
              </div>

              {/* Materials */}
              {task.materials && task.materials.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Materials ({task.materials.length})
                  </span>
                  <div className="space-y-1.5">
                    {task.materials.map(m => (
                      <div key={m.id} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs flex justify-between">
                        <span className="font-medium text-slate-800">{m.name}</span>
                        <span className="text-slate-700 font-semibold">{m.quantity} {m.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workforce */}
              {task.workforce && task.workforce.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Workforce ({task.workforce.length})
                  </span>
                  <div className="space-y-1.5">
                    {task.workforce.map(w => (
                      <div key={w.id} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs flex justify-between">
                        <span className="font-medium text-slate-800">{w.role}</span>
                        <span className="text-slate-700 font-semibold">{w.count} Persons</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {task.equipment && task.equipment.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Machinery & Equipment ({task.equipment.length})
                  </span>
                  <div className="space-y-1.5">
                    {task.equipment.map(eq => (
                      <div key={eq.id} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs flex justify-between">
                        <span className="font-medium text-slate-800">{eq.name}</span>
                        <span className="text-slate-700 font-semibold">{eq.count} Units</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Delay & Status logs */}
          {drawerTab === 'logs' && (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Scope Initiated:</span>
                  <span>{actualStart}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Completion Sign-off:</span>
                  <span>{actualEnd}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Logged Duration:</span>
                  <span>{task.duration_days || 1} working day(s)</span>
                </div>
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Forecast End:</span>
                  <span>{forecastEnd}</span>
                </div>
              </div>

              {/* Real Status Logs */}
              {task.statusLogs && task.statusLogs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Status History & Audits ({task.statusLogs.length})
                  </span>
                  <div className="space-y-2">
                    {task.statusLogs.map(l => (
                      <div key={l.id} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between items-center text-slate-500 text-[10px]">
                          <span className="font-semibold text-slate-700">{l.user || 'System'}</span>
                          <span>{l.timestamp}</span>
                        </div>
                        <p className="text-slate-800 font-medium">{l.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Bottom Input & Action Bar matching screenshot                    */}
        {/* ---------------------------------------------------------------- */}
        <div className="p-3.5 border-t border-slate-200 bg-white shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            
            {/* "+ Progress" button */}
            <button
              type="button"
              onClick={handleAddProgress}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Progress</span>
            </button>

            {/* "Enter Message" input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Enter Message"
                className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-600 rounded-xl outline-none text-slate-800 transition-colors"
              />
            </div>

            {/* Photo Attachment Icon */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Upload photo"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Send Message Icon (if text entered) */}
            {messageText.trim() && (
              <button
                type="submit"
                className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            )}

            {/* More dots */}
            <button
              type="button"
              onClick={() => onShowToast?.('Additional task actions')}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Lightbox for previewing the task photo in full resolution        */}
      {/* ---------------------------------------------------------------- */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <div 
            className="relative max-w-3xl w-full bg-slate-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white text-xs">
              <span className="font-semibold">{task.task_name} - Inspection Proof</span>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black min-h-[350px] max-h-[70vh] overflow-hidden">
              <img
                src={samplePhotoUrl}
                alt={task.task_name}
                className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
