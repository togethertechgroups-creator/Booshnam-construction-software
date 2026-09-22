import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Calendar, ChevronDown, Globe, X, ArrowLeft, 
  MoreVertical, MoreHorizontal, Image as ImageIcon, Check, 
  CheckCircle2, Circle, Trash2, Paperclip, Upload, Filter, 
  Clock, User, Send, TrendingUp, ExternalLink, RefreshCw
} from 'lucide-react';
import { Project, ProjectToDo, ToDoComment, ToDoRepeatSettings } from '../../../types';
import { confirmAction } from '../../../lib/dialogService';

interface ToDoTabProps {
  project: Project;
  onShowToast?: (msg: string) => void;
}

const INITIAL_TODOS: ProjectToDo[] = [];

const ASSIGNEE_OPTIONS = [
  'Priya',
  'Likson (Site Eng)',
  'Ranjith (Site Eng)',
  'Ravi Kumar (Supervisor)',
  'Kavitha Selvan (Accounts)',
  'Thangavelu M (Safety)'
];

const TYPE_OPTIONS = [
  'General',
  'Procurement',
  'Quality',
  'Safety',
  'Site Execution',
  'Billing',
  'Client'
];

const TASK_OPTIONS = [
  'NA',
  'Site Clearing & Demolition',
  'Plinth Beam Concrete',
  'Column Starter Layout',
  'Underground Sump RCC',
  'Blockwork & Plastering',
  'Structural Steel Fabrication',
  'Tile Laying & Flooring',
  'Internal Plumbing Lines',
  'Electrical Rough-In Conduit'
];

export const ToDoTab: React.FC<ToDoTabProps> = ({ project, onShowToast }) => {
  // Persistence key
  const storageKey = `booshnam_todos_v2_${project?.id || 'default'}`;

  const [todos, setTodos] = useState<ProjectToDo[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_TODOS;
  });

  // Save to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(todos));
    } catch {
      // ignore
    }
  }, [todos, storageKey]);

  // Main View Mode: 'list' (Image 1) or 'detail' (Image 4)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  // Filters (Image 1)
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'COMPLETED' | 'ALL'>('PENDING');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [dueDateFilter, setDueDateFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown menus for filter pills
  const [openFilterDropdown, setOpenFilterDropdown] = useState<'status' | 'type' | 'assignee' | 'dueDate' | null>(null);

  // Modals
  const [isNewTodoModalOpen, setIsNewTodoModalOpen] = useState(false);
  const [isRepeatModalOpen, setIsRepeatModalOpen] = useState(false);

  // New To-Do Form State (Image 2)
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('2026-09-17');
  const [newType, setNewType] = useState('General');
  const [newProjectName, setNewProjectName] = useState(project.name || 'Demo');
  const [newTaskName, setNewTaskName] = useState('NA');
  const [newUrl, setNewUrl] = useState('');
  const [newAssignee, setNewAssignee] = useState('Priya');
  const [newRepeatSettings, setNewRepeatSettings] = useState<ToDoRepeatSettings | undefined>(undefined);
  const [newMediaFiles, setNewMediaFiles] = useState<Array<{ name: string; url?: string; size?: string }>>([]);

  // Form field dropdown states in New To-Do Modal
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);

  // Repeat Settings Form State (Image 3)
  const [repeatFrequency, setRepeatFrequency] = useState<'WEEK_DAYS' | 'EVERYDAY' | 'MONTH_DAYS'>('WEEK_DAYS');
  const [repeatWeekDays, setRepeatWeekDays] = useState<string[]>(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  const [repeatEndType, setRepeatEndType] = useState<'6_MONTHS' | 'CUSTOM_DATE'>('6_MONTHS');
  const [repeatEndDate, setRepeatEndDate] = useState('2027-03-17');

  // Detail View: Comments input (Image 4)
  const [commentInput, setCommentInput] = useState('');
  const [commentAttachedImage, setCommentAttachedImage] = useState<string | null>(null);
  const [showDetailActionMenu, setShowDetailActionMenu] = useState(false);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentImageInputRef = useRef<HTMLInputElement>(null);

  // Helper date formatters
  const formatDateShort = (dStr: string) => {
    try {
      const date = new Date(dStr);
      if (isNaN(date.getTime())) return dStr;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const formatDateLong = (dStr: string) => {
    try {
      const date = new Date(dStr);
      if (isNaN(date.getTime())) return dStr;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const formatDateCard = (dStr: string) => {
    try {
      const date = new Date(dStr);
      if (isNaN(date.getTime())) return dStr;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dStr;
    }
  };

  // Filtered To-Dos for Table
  const filteredTodos = todos.filter((item) => {
    // Status
    if (statusFilter === 'PENDING' && item.is_completed) return false;
    if (statusFilter === 'COMPLETED' && !item.is_completed) return false;

    // Type
    if (typeFilter !== 'ALL' && item.todo_type !== typeFilter && item.category !== typeFilter) return false;

    // Assignee
    if (assigneeFilter !== 'ALL' && !item.assignee_name.toLowerCase().includes(assigneeFilter.toLowerCase())) return false;

    // Due Date
    if (dueDateFilter === 'Today') {
      const today = new Date().toISOString().split('T')[0];
      if (item.due_date !== today) return false;
    } else if (dueDateFilter === 'Overdue') {
      const today = new Date().toISOString().split('T')[0];
      if (item.due_date >= today || item.is_completed) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchAssignee = item.assignee_name.toLowerCase().includes(q);
      const matchTask = item.task_name?.toLowerCase().includes(q) || false;
      const matchType = item.todo_type?.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      if (!matchTitle && !matchAssignee && !matchTask && !matchType) return false;
    }

    return true;
  });

  // Selected item for Overview (Image 4)
  const selectedTodo = todos.find((t) => t.id === selectedTodoId) || todos[0] || null;

  // Handler: Open Detail View
  const handleOpenDetail = (id: string) => {
    setSelectedTodoId(id);
    setViewMode('detail');
  };

  // Handler: Toggle complete status
  const handleToggleComplete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTodos((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.is_completed;
          onShowToast?.(nextState ? `Marked as completed: "${item.title}"` : `Reopened: "${item.title}"`);
          return {
            ...item,
            is_completed: nextState,
            completed_at: nextState ? new Date().toISOString() : undefined
          };
        }
        return item;
      })
    );
  };

  // Handler: Delete To-Do
  const handleDeleteTodo = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const todoItem = todos.find(t => t.id === id);
    const confirmed = await confirmAction({
      title: 'Delete To-Do Item',
      message: `Are you sure you want to delete "${todoItem?.title || 'this to-do item'}"?`,
      confirmText: 'Delete To-Do',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;

    setTodos((prev) => prev.filter((item) => item.id !== id));
    if (selectedTodoId === id) {
      const remaining = todos.filter((item) => item.id !== id);
      if (remaining.length > 0) {
        setSelectedTodoId(remaining[0].id);
      } else {
        setViewMode('list');
      }
    }
    onShowToast?.('To-Do deleted');
  };

  // Handler: Reset / Seed demo items
  const handleResetDemoData = () => {
    setTodos(INITIAL_TODOS);
    onShowToast?.('Reset demo To-Do items');
  };

  // Handler: Open New To-Do Modal (Image 2)
  const handleOpenCreateModal = () => {
    setNewTitle('');
    setNewDueDate(new Date().toISOString().split('T')[0]);
    setNewType('General');
    setNewProjectName(project.name || 'Demo');
    setNewTaskName('NA');
    setNewUrl('');
    setNewAssignee('Priya');
    setNewRepeatSettings(undefined);
    setNewMediaFiles([]);
    setIsNewTodoModalOpen(true);
  };

  // Handler: Save New To-Do Form
  const handleSaveNewTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      onShowToast?.('Please enter a Title');
      return;
    }

    const created: ProjectToDo = {
      id: `td-${Date.now()}`,
      title: newTitle.trim(),
      description: '',
      priority: 'HIGH',
      category: (newType as any) || 'General',
      todo_type: newType,
      assignee_name: newAssignee || 'Priya',
      due_date: newDueDate || '2026-09-17',
      project_name: newProjectName || project.name || 'Demo',
      task_name: newTaskName || 'NA',
      url: newUrl.trim(),
      repeat_settings: newRepeatSettings,
      media_files: newMediaFiles,
      comments: [],
      is_completed: false,
      created_at: new Date().toISOString().split('T')[0]
    };

    setTodos([created, ...todos]);
    setIsNewTodoModalOpen(false);
    onShowToast?.(`To-Do created: "${created.title}"`);
  };

  // Handler: Save Repeat Settings (Image 3)
  const handleSaveRepeatSettings = () => {
    setNewRepeatSettings({
      frequency: repeatFrequency,
      weekDays: repeatFrequency === 'WEEK_DAYS' ? repeatWeekDays : undefined,
      endType: repeatEndType,
      endDate: repeatEndType === 'CUSTOM_DATE' ? repeatEndDate : undefined
    });
    setIsRepeatModalOpen(false);
    onShowToast?.('Repeat settings applied');
  };

  // Handler: Toggle week day in repeat modal
  const handleToggleDay = (dayChar: string, index: number) => {
    const key = `${dayChar}-${index}`;
    const exists = repeatWeekDays.includes(key) || repeatWeekDays.includes(dayChar);
    if (exists) {
      setRepeatWeekDays((prev) => prev.filter((d) => d !== dayChar && d !== key));
    } else {
      setRepeatWeekDays((prev) => [...prev, dayChar]);
    }
  };

  // Handler: Add Comment in Detail View (Image 4)
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() && !commentAttachedImage) return;
    if (!selectedTodo) return;

    const newComment: ToDoComment = {
      id: `c-${Date.now()}`,
      author: 'Priya',
      text: commentInput.trim(),
      created_at: new Date().toISOString(),
      image_url: commentAttachedImage || undefined
    };

    setTodos((prev) =>
      prev.map((item) => {
        if (item.id === selectedTodo.id) {
          return {
            ...item,
            comments: [...(item.comments || []), newComment]
          };
        }
        return item;
      })
    );

    setCommentInput('');
    setCommentAttachedImage(null);
    onShowToast?.('Comment added');
  };

  // Handler: File Upload mock in Image 2
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files).map((f) => ({
        name: f.name,
        size: `${Math.round(f.size / 1024)} KB`,
        url: URL.createObjectURL(f)
      }));
      setNewMediaFiles((prev) => [...prev, ...fileList]);
      onShowToast?.(`${files.length} file(s) attached`);
    }
  };

  // Repeat Summary Text
  const getRepeatSummaryText = () => {
    if (!newRepeatSettings) return 'Add Repeat Todo';
    if (newRepeatSettings.frequency === 'EVERYDAY') {
      return 'Repeats Everyday';
    }
    if (newRepeatSettings.frequency === 'MONTH_DAYS') {
      return 'Repeats Monthly';
    }
    if (newRepeatSettings.frequency === 'WEEK_DAYS') {
      const count = newRepeatSettings.weekDays?.length || 0;
      return `Repeats on Week Days (${count} days)`;
    }
    return 'Add Repeat Todo';
  };

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setOpenFilterDropdown(null);
        setIsTypeDropdownOpen(false);
        setIsTaskDropdownOpen(false);
        setIsAssigneeDropdownOpen(false);
        setShowDetailActionMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* VIEW 1: MAIN TO-DO LIST & TABLE (IMAGE 1)                                */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Top Filter & Action Toolbar (Image 1) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Filter Pills Group */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* 1. Status Pill: PENDING ▾ */}
              <div className="relative" data-dropdown>
                <button
                  type="button"
                  onClick={() => setOpenFilterDropdown(openFilterDropdown === 'status' ? null : 'status')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    statusFilter === 'PENDING'
                      ? 'bg-red-50 text-red-600 border border-red-300'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="uppercase">{statusFilter}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {openFilterDropdown === 'status' && (
                  <div className="absolute left-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-100">
                    {(['PENDING', 'COMPLETED', 'ALL'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setStatusFilter(st);
                          setOpenFilterDropdown(null);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                          statusFilter === st ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Type Pill: TYPE ▾ */}
              <div className="relative" data-dropdown>
                <button
                  type="button"
                  onClick={() => setOpenFilterDropdown(openFilterDropdown === 'type' ? null : 'type')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    typeFilter !== 'ALL'
                      ? 'bg-red-50 text-red-600 border border-red-300'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{typeFilter === 'ALL' ? 'TYPE' : typeFilter}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {openFilterDropdown === 'type' && (
                  <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setTypeFilter('ALL');
                        setOpenFilterDropdown(null);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                        typeFilter === 'ALL' ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      All Types
                    </button>
                    {TYPE_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTypeFilter(t);
                          setOpenFilterDropdown(null);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                          typeFilter === t ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Assignee Pill: ASSIGNEE ▾ */}
              <div className="relative" data-dropdown>
                <button
                  type="button"
                  onClick={() => setOpenFilterDropdown(openFilterDropdown === 'assignee' ? null : 'assignee')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    assigneeFilter !== 'ALL'
                      ? 'bg-red-50 text-red-600 border border-red-300'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{assigneeFilter === 'ALL' ? 'ASSIGNEE' : assigneeFilter}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {openFilterDropdown === 'assignee' && (
                  <div className="absolute left-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setAssigneeFilter('ALL');
                        setOpenFilterDropdown(null);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                        assigneeFilter === 'ALL' ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      All Assignees
                    </button>
                    {ASSIGNEE_OPTIONS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => {
                          setAssigneeFilter(a);
                          setOpenFilterDropdown(null);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                          assigneeFilter === a ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Due Date Pill: DUE DATE ▾ */}
              <div className="relative" data-dropdown>
                <button
                  type="button"
                  onClick={() => setOpenFilterDropdown(openFilterDropdown === 'dueDate' ? null : 'dueDate')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    dueDateFilter !== 'ALL'
                      ? 'bg-red-50 text-red-600 border border-red-300'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{dueDateFilter === 'ALL' ? 'DUE DATE' : dueDateFilter}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {openFilterDropdown === 'dueDate' && (
                  <div className="absolute left-0 top-full mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-100">
                    {['ALL', 'Today', 'Overdue'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDueDateFilter(d);
                          setOpenFilterDropdown(null);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                          dueDateFilter === d ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {d === 'ALL' ? 'All Dates' : d}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Bar with Magnifying Glass */}
              <div className="relative w-56 sm:w-64">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 text-slate-900 placeholder-slate-400"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Right Action: + New To Do Button (Image 1) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New To Do</span>
              </button>
            </div>
          </div>

          {/* Table Container (Image 1) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Header (Image 1) */}
            <div className="grid grid-cols-12 px-6 py-3.5 bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <div className="col-span-4 sm:col-span-3">Item Name</div>
              <div className="col-span-2 sm:col-span-2 text-center">Due Date</div>
              <div className="col-span-2 sm:col-span-2 text-center">Assigned</div>
              <div className="col-span-2 sm:col-span-2 text-center">Task</div>
              <div className="col-span-1 sm:col-span-2 text-center">Type</div>
              <div className="col-span-1 sm:col-span-1 text-right">Action</div>
            </div>

            {/* Table Body */}
            {filteredTodos.length === 0 ? (
              /* Empty State (Image 1 exact match) */
              <div className="py-32 flex flex-col items-center justify-center text-center px-4">
                <p className="text-sm font-medium text-slate-600">No To Do Available</p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Create First To Do
                  </button>
                </div>
              </div>
            ) : (
              /* Rows */
              <div className="divide-y divide-slate-100">
                {filteredTodos.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(item.id)}
                    className="grid grid-cols-12 px-6 py-3.5 items-center text-xs hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Item Name */}
                    <div className="col-span-4 sm:col-span-3 flex items-center gap-2.5 min-w-0 pr-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleComplete(item.id, e)}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                          item.is_completed
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-300 hover:border-red-600'
                        }`}
                        title={item.is_completed ? 'Completed (click to reopen)' : 'Mark as completed'}
                      >
                        {item.is_completed && <Check className="w-2.5 h-2.5" />}
                      </button>
                      <span
                        className={`truncate font-medium group-hover:text-red-600 transition-colors ${
                          item.is_completed ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>

                    {/* Due Date */}
                    <div className="col-span-2 sm:col-span-2 text-center text-slate-600">
                      {formatDateShort(item.due_date)}
                    </div>

                    {/* Assigned */}
                    <div className="col-span-2 sm:col-span-2 text-center text-slate-700 font-medium">
                      {item.assignee_name}
                    </div>

                    {/* Task */}
                    <div className="col-span-2 sm:col-span-2 text-center text-slate-500 truncate px-1">
                      {item.task_name || 'NA'}
                    </div>

                    {/* Type */}
                    <div className="col-span-1 sm:col-span-2 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-md">
                        {item.todo_type || item.category || 'General'}
                      </span>
                    </div>

                    {/* Action */}
                    <div className="col-span-1 sm:col-span-1 text-right flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTodo(item.id, e)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete To-Do"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: TO-DO ITEM OVERVIEW & COMMENTS VIEW (IMAGE 4)                     */}
      {/* ========================================================================= */}
      {viewMode === 'detail' && selectedTodo && (
        <div className="space-y-3">
          {/* Top Bar (Image 4): Back arrow + Status button + 3-dots */}
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2 text-slate-700 hover:text-red-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                title="Back to list"
                aria-label="Back to list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Status toggle action */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Status:</span>
                <button
                  type="button"
                  onClick={() => handleToggleComplete(selectedTodo.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                    selectedTodo.is_completed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  }`}
                >
                  {selectedTodo.is_completed ? 'Completed' : 'Mark as Completed'}
                </button>
              </div>

              {/* 3-Dots Menu */}
              <div className="relative" data-dropdown>
                <button
                  type="button"
                  onClick={() => setShowDetailActionMenu(!showDetailActionMenu)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showDetailActionMenu && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailActionMenu(false);
                        handleDeleteTodo(selectedTodo.id);
                      }}
                      className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Item</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Split Content: Left To-Do list, Right Details (Image 4) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left Column: List of items (Image 4) */}
            <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col max-h-[750px]">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  To Do Items ({todos.length})
                </span>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="p-1 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                  title="New To-Do"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                {todos.map((item) => {
                  const isSelected = item.id === selectedTodo.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedTodoId(item.id)}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-red-50/40 border-l-4 border-red-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleComplete(item.id, e)}
                          className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                            item.is_completed
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 hover:border-red-600'
                          }`}
                        >
                          {item.is_completed && <Check className="w-2.5 h-2.5" />}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              item.is_completed ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatDateCard(item.due_date)} | {item.assignee_name}
                          </p>
                        </div>
                      </div>

                      <span className="text-slate-400 hover:text-slate-600 text-xs">···</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Detail Card & Comments (Image 4) */}
            <div className="md:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col">
              {/* Item Overview Header */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {selectedTodo.title}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl shrink-0">
                    <span className="font-bold text-slate-700">{selectedTodo.media_files?.length || 0}</span>
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Metadata Fields (Image 4) */}
                <div className="mt-5 space-y-2.5 text-xs">
                  <div className="flex items-center gap-6">
                    <span className="w-32 text-slate-500 font-medium">Assignee Name:</span>
                    <span className="text-slate-900 font-semibold">{selectedTodo.assignee_name}</span>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="w-32 text-slate-500 font-medium">Due Date:</span>
                    <span className="text-slate-900 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatDateLong(selectedTodo.due_date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="w-32 text-slate-500 font-medium">Task Name:</span>
                    <span className="text-slate-900 font-medium">{selectedTodo.task_name || 'NA'}</span>
                  </div>

                  {selectedTodo.todo_type && (
                    <div className="flex items-center gap-6">
                      <span className="w-32 text-slate-500 font-medium">Type:</span>
                      <span className="text-slate-900 font-medium">{selectedTodo.todo_type}</span>
                    </div>
                  )}

                  {selectedTodo.url && (
                    <div className="flex items-center gap-6">
                      <span className="w-32 text-slate-500 font-medium">URL:</span>
                      <a
                        href={selectedTodo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span className="truncate max-w-sm">{selectedTodo.url}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {selectedTodo.repeat_settings && (
                    <div className="flex items-center gap-6">
                      <span className="w-32 text-slate-500 font-medium">Repeat:</span>
                      <span className="text-slate-700 font-medium">
                        {selectedTodo.repeat_settings.frequency === 'EVERYDAY'
                          ? 'Everyday'
                          : selectedTodo.repeat_settings.frequency === 'MONTH_DAYS'
                          ? 'Month Days'
                          : `Week Days (${selectedTodo.repeat_settings.weekDays?.join(', ') || 'All'})`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tab: Comment (Image 4) */}
                <div className="mt-8 border-b border-slate-200">
                  <div className="inline-block border-b-2 border-red-600 pb-2 px-1 text-xs font-bold text-red-600">
                    Comment
                  </div>
                </div>
              </div>

              {/* Comments Body & Empty State (Image 4) */}
              <div className="p-6 flex-1 flex flex-col justify-between min-h-[300px]">
                {/* Empty or comments list */}
                {(!selectedTodo.comments || selectedTodo.comments.length === 0) ? (
                  /* Exact Empty State vector & text from Image 4 */
                  <div className="flex-1 flex flex-col items-center justify-center py-12">
                    <svg
                      className="w-16 h-16 text-slate-800"
                      viewBox="0 0 48 48"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        d="M10 34L22 22L30 28L40 14M40 14H30M40 14V24"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="text-xs font-medium text-slate-600 mt-2">No Comment To View</p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-4 overflow-y-auto max-h-[360px]">
                    {selectedTodo.comments.map((c) => (
                      <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-900">{c.author}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{c.text}</p>
                        {c.image_url && (
                          <div className="mt-2">
                            <img
                              src={c.image_url}
                              alt="Comment attachment"
                              className="max-h-40 rounded-lg border border-slate-200 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom Comment Input Bar (Image 4) */}
                <form onSubmit={handleAddComment} className="mt-auto pt-4">
                  {commentAttachedImage && (
                    <div className="mb-2 relative inline-block">
                      <img
                        src={commentAttachedImage}
                        alt="Attached preview"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setCommentAttachedImage(null)}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="relative flex items-center border border-slate-200 rounded-xl bg-white p-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600 transition-all">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-transparent focus:outline-none pr-16"
                    />

                    {/* Image Attachment Button */}
                    <button
                      type="button"
                      onClick={() => commentImageInputRef.current?.click()}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors mr-1.5"
                      title="Attach Photo"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    <input
                      type="file"
                      ref={commentImageInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCommentAttachedImage(URL.createObjectURL(file));
                        }
                      }}
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!commentInput.trim() && !commentAttachedImage}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NEW TO DO (IMAGE 2)                                              */}
      {/* ========================================================================= */}
      {isNewTodoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header (Image 2): ✕ NEW TO DO (left), Save button (right) */}
            <div className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTodoModalOpen(false)}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-slate-900 tracking-wide">NEW TO DO</span>
              </div>

              {/* Red Save Button */}
              <button
                type="button"
                onClick={handleSaveNewTodo}
                className="px-5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                Save
              </button>
            </div>

            {/* Accent Red Stripe under Header */}
            <div className="h-1 bg-red-600 w-full" />

            {/* Form Fields (Image 2) */}
            <form onSubmit={handleSaveNewTodo} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* 1. TITLE */}
              <div className="relative border border-slate-300 rounded-xl p-3 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600 transition-all bg-white">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  TITLE
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
                />
              </div>

              {/* 2. DUE DATE */}
              <div className="relative border border-slate-300 rounded-xl p-3 bg-white">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  DUE DATE
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-900 font-medium">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span>{formatDateShort(newDueDate)}</span>
                  </div>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                  <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* 3. REPEAT TODO (Triggers Modal 2 / Image 3) */}
              <div
                onClick={() => setIsRepeatModalOpen(true)}
                className="relative border border-slate-300 rounded-xl p-3 bg-white cursor-pointer hover:border-red-600 transition-colors"
              >
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  REPEAT TODO
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-800 font-medium">{getRepeatSummaryText()}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* 4. TYPE */}
              <div className="relative" data-dropdown>
                <div
                  onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                  className="relative border border-slate-300 rounded-xl p-3 bg-white cursor-pointer hover:border-red-600 transition-colors"
                >
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    TYPE
                  </label>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-800 font-medium">
                      {newType ? `${newType}` : 'Add Todo Type'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {isTypeDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                    {TYPE_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setNewType(t);
                          setIsTypeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 font-medium transition-colors ${
                          newType === t ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. PROJECT NAME */}
              <div className="relative border border-slate-300 rounded-xl p-3 bg-white">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  PROJECT NAME
                </label>
                <div className="flex items-center justify-between text-xs text-slate-800 font-medium">
                  <span>{newProjectName}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* 6. TASK NAME */}
              <div className="relative" data-dropdown>
                <div
                  onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
                  className="relative border border-slate-300 rounded-xl p-3 bg-white cursor-pointer hover:border-red-600 transition-colors"
                >
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    TASK NAME
                  </label>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-800 font-medium">
                      {newTaskName ? `${newTaskName}` : 'Add Task'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {isTaskDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                    {TASK_OPTIONS.map((tsk) => (
                      <button
                        key={tsk}
                        type="button"
                        onClick={() => {
                          setNewTaskName(tsk);
                          setIsTaskDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 font-medium transition-colors ${
                          newTaskName === tsk ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {tsk}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. URL */}
              <div className="relative border border-slate-300 rounded-xl p-3 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600 transition-all bg-white">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  URL
                </label>
                <div className="flex items-center justify-between">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full text-xs text-slate-900 bg-transparent focus:outline-none pr-2 placeholder-slate-400"
                  />
                  <Globe className="w-4 h-4 text-slate-600 shrink-0" />
                </div>
              </div>

              {/* 8. Assignee Section */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900">Assignee</div>
                <div className="relative" data-dropdown>
                  <div
                    onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                    className="relative border border-slate-300 rounded-xl p-3 bg-white cursor-pointer hover:border-red-600 transition-colors"
                  >
                    <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      ASSIGNEE NAME
                    </label>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-800 font-medium">
                        {newAssignee ? `${newAssignee}` : '+Add Assignee'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {isAssigneeDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                      {ASSIGNEE_OPTIONS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => {
                            setNewAssignee(a);
                            setIsAssigneeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 font-medium transition-colors ${
                            newAssignee === a ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 9. Upload Files */}
              <div className="space-y-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-red-400 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5 text-xs text-slate-600">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="font-semibold text-slate-700">Upload Files</span>
                    <span className="text-[11px] text-slate-400">Click to attach photos, specs, or documents</span>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {newMediaFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {newMediaFiles.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                      >
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[150px]">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setNewMediaFiles(newMediaFiles.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REPEAT SETTINGS (IMAGE 3)                                        */}
      {/* ========================================================================= */}
      {isRepeatModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header (Image 3): Repeat Settings + ✕ */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Repeat Settings</h3>
              <button
                type="button"
                onClick={() => setIsRepeatModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Frequency Radio Group (Image 3) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="repeat_freq"
                    checked={repeatFrequency === 'WEEK_DAYS'}
                    onChange={() => setRepeatFrequency('WEEK_DAYS')}
                    className="w-4 h-4 text-red-600 focus:ring-red-500 accent-red-600"
                  />
                  <span className="text-xs font-semibold text-slate-800">Week Days</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="repeat_freq"
                    checked={repeatFrequency === 'EVERYDAY'}
                    onChange={() => setRepeatFrequency('EVERYDAY')}
                    className="w-4 h-4 text-red-600 focus:ring-red-500 accent-red-600"
                  />
                  <span className="text-xs font-semibold text-slate-800">Everyday</span>
                </label>
              </div>

              {/* Week Days Selector (Image 3): S M T W T F S */}
              {repeatFrequency === 'WEEK_DAYS' && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs text-slate-600 font-medium">Week Days</div>
                  <div className="flex items-center justify-between gap-1.5">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                      const isSelected = repeatWeekDays.includes(day);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleDay(day, idx)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-red-100 text-red-700 border border-red-300 shadow-2xs'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Month Days Radio (Image 3) */}
              <div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="repeat_freq"
                    checked={repeatFrequency === 'MONTH_DAYS'}
                    onChange={() => setRepeatFrequency('MONTH_DAYS')}
                    className="w-4 h-4 text-red-600 focus:ring-red-500 accent-red-600"
                  />
                  <span className="text-xs font-semibold text-slate-800">Month Days</span>
                </label>
              </div>
            </div>

            {/* Ends Section (Image 3) */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-900">Ends</div>

              {/* Option 1: End In 6 Months */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="repeat_ends"
                  checked={repeatEndType === '6_MONTHS'}
                  onChange={() => setRepeatEndType('6_MONTHS')}
                  className="w-4 h-4 text-red-600 focus:ring-red-500 accent-red-600"
                />
                <span className="text-xs font-medium text-slate-800">End In 6 Months</span>
              </label>

              {/* Option 2: End till + Date picker */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="repeat_ends"
                    checked={repeatEndType === 'CUSTOM_DATE'}
                    onChange={() => setRepeatEndType('CUSTOM_DATE')}
                    className="w-4 h-4 text-red-600 focus:ring-red-500 accent-red-600"
                  />
                  <span className="text-xs font-medium text-slate-800">End till</span>
                </label>

                <div className="relative border border-slate-300 rounded-xl px-3 py-2 flex items-center gap-2 bg-white flex-1">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => {
                      setRepeatEndDate(e.target.value);
                      setRepeatEndType('CUSTOM_DATE');
                    }}
                    className="text-xs text-slate-800 bg-transparent focus:outline-none w-full"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons (Image 3) */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRepeatModalOpen(false)}
                className="px-5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRepeatSettings}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
