import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, Clock, AlertCircle, Plus, Search, Filter, 
  Calendar, Layers, Flag, Check, X, ChevronRight, User, 
  Building2, Sparkles, MessageSquare, Paperclip, Upload, Eye,
  Compass, HardHat, DollarSign, BarChart3, ShieldCheck
} from 'lucide-react';
import { WBSTask, Project, Department } from '../types';
import { MOCK_TASKS, MOCK_PROJECTS, PREDEFINED_TASKS_TEMPLATE } from '../lib/mockData';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { CustomSelect } from '../components/CustomSelect';
import { getStaffMembers } from '../lib/staffService';

interface TasksViewProps {
  tasks?: WBSTask[];
  projects?: Project[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onShowToast?: (msg: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks: propTasks = MOCK_TASKS,
  projects = MOCK_PROJECTS,
  isSidebarOpen,
  onToggleSidebar,
  onShowToast
}) => {
  const [tasks, setTasks] = useState<WBSTask[]>(propTasks);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const staffList = getStaffMembers();
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected task for detail drawer
  const [selectedTask, setSelectedTask] = useState<WBSTask | null>(null);

  // New Task Modal State
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDept, setNewTaskDept] = useState<Department>('CONSTRUCTION');
  const [newTaskPriority, setNewTaskPriority] = useState<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Comments inside task drawer
  const [newComment, setNewComment] = useState('');

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const taskProjId = t.project_id || t.project;
      if (selectedProjectId !== 'All' && taskProjId !== selectedProjectId) return false;
      if (deptFilter !== 'All' && t.department !== deptFilter) return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const taskName = t.name || t.title || '';
        const matchesName = taskName.toLowerCase().includes(q);
        const matchesAssignee = (t.assigned_to || t.assigned_to_name || '').toLowerCase().includes(q);
        const matchesCode = (t.wbs_code || '').toLowerCase().includes(q);
        if (!matchesName && !matchesAssignee && !matchesCode) return false;
      }
      return true;
    });
  }, [tasks, selectedProjectId, deptFilter, statusFilter, priorityFilter, searchQuery]);

  // Handle Status Update
  const handleUpdateStatus = (taskId: string, newStatus: WBSTask['status']) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const progress = newStatus === 'COMPLETED' ? 100 : newStatus === 'IN_PROGRESS' ? 50 : 0;
        const updated = { ...t, status: newStatus, progress_percentage: progress };
        if (selectedTask?.id === taskId) setSelectedTask(updated);
        return updated;
      }
      return t;
    }));
    onShowToast?.(`Task status updated to ${newStatus}`);
  };

  // Handle Add New Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    const projId = selectedProjectId !== 'All' ? selectedProjectId : projects[0]?.id || '';
    const newTask: WBSTask = {
      id: `task-${Date.now()}`,
      project: projId,
      project_id: projId,
      wbs_code: `2.${tasks.length + 1}`,
      title: newTaskName,
      name: newTaskName,
      department: newTaskDept,
      status: 'TODO',
      priority: newTaskPriority,
      start_date: new Date().toISOString().split('T')[0],
      end_date: newTaskDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      planned_start: new Date().toISOString().split('T')[0],
      planned_end: newTaskDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      duration_days: 7,
      progress_percentage: 0,
      assigned_to: newTaskAssignee,
      assigned_to_name: newTaskAssignee,
      description: `Custom operational task created under ${newTaskDept.replace('_', ' ')}.`
    };

    setTasks(prev => [newTask, ...prev]);
    setIsNewTaskModalOpen(false);
    setNewTaskName('');
    onShowToast?.(`Task "${newTask.title}" created successfully!`);
  };

  // Predefined task titles for reference
  const predefinedTitles = useMemo(() => {
    return new Set(PREDEFINED_TASKS_TEMPLATE.map(t => t.title.toLowerCase()));
  }, []);

  const totalCount = tasks.length;
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const pendingCount = tasks.filter(t => t.status === 'TODO' || t.status === 'BLOCKED' || t.status === 'NOT_STARTED').length;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Edge-to-edge Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Task Management Hub
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                11 Predefined Workflows
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive task execution, borehole sampling, drawings, and field tracking across all 5 departments
            </p>
          </div>
        </div>

        {/* Action Buttons & Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsNewTaskModalOpen(true)}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
          <UserProfileDropdown showBell={true} onShowToast={onShowToast} />
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="bg-slate-50/70 border-b border-slate-200 p-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <div className="text-[11px] font-semibold text-slate-500">Total System Tasks</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{totalCount}</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <div className="text-[11px] font-semibold text-blue-600">In Progress</div>
          <div className="text-xl font-bold text-blue-700 mt-0.5">{inProgressCount}</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <div className="text-[11px] font-semibold text-emerald-600">Completed</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{completedCount}</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <div className="text-[11px] font-semibold text-amber-600">Pending / To Do</div>
          <div className="text-xl font-bold text-amber-700 mt-0.5">{pendingCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:px-6 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Filter dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          {/* Project Filter */}
          <div className="w-48 sm:w-56">
            <CustomSelect
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              options={[
                { label: 'All Projects', value: 'All' },
                ...projects.map(p => ({
                  label: `${p.code} - ${p.name.length > 22 ? p.name.slice(0, 22) + '...' : p.name}`,
                  value: p.id,
                }))
              ]}
              size="sm"
              variant="brand"
              searchable={true}
            />
          </div>

          {/* Department Filter */}
          <div className="w-40 sm:w-44">
            <CustomSelect
              value={deptFilter}
              onChange={(val) => setDeptFilter(val)}
              options={[
                { label: 'All Departments', value: 'All' },
                { label: 'Soil Investigation', value: 'SOIL_INVESTIGATION' },
                { label: 'Architecture', value: 'ARCHITECTURE' },
                { label: 'Marketing', value: 'MARKETING' },
                { label: 'Construction', value: 'CONSTRUCTION' },
                { label: 'Accounts', value: 'ACCOUNTS' },
              ]}
              size="sm"
              variant="brand"
            />
          </div>

          {/* Status Filter */}
          <div className="w-36 sm:w-40">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { label: 'All Statuses', value: 'All' },
                { label: 'Not Started', value: 'NOT_STARTED', dotColor: 'bg-slate-400' },
                { label: 'In Progress', value: 'IN_PROGRESS', dotColor: 'bg-amber-500' },
                { label: 'Completed', value: 'COMPLETED', dotColor: 'bg-emerald-500' },
                { label: 'Blocked', value: 'BLOCKED', dotColor: 'bg-rose-500' },
              ]}
              size="sm"
              variant="brand"
            />
          </div>

          {/* Priority Filter */}
          <div className="w-36 sm:w-40">
            <CustomSelect
              value={priorityFilter}
              onChange={(val) => setPriorityFilter(val)}
              options={[
                { label: 'All Priorities', value: 'All' },
                { label: 'Urgent', value: 'URGENT', dotColor: 'bg-rose-500' },
                { label: 'High', value: 'HIGH', dotColor: 'bg-amber-500' },
                { label: 'Medium', value: 'MEDIUM', dotColor: 'bg-sky-500' },
                { label: 'Low', value: 'LOW', dotColor: 'bg-slate-400' },
              ]}
              size="sm"
              variant="brand"
            />
          </div>
        </div>

        {/* Right: Search Input */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, assignee, WBS..."
            className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-600"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2 pointer-events-none" />
        </div>
      </div>

      {/* Main Tasks Table */}
      <div className="p-4 sm:p-6 flex-1 bg-white overflow-x-auto">
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4 w-20">WBS</th>
                <th className="py-3 px-4">Task Name & Details</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center w-32">Progress</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No tasks match the active filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(t => {
                  const taskTitle = t.name || t.title || 'Untitled Task';
                  const isPredefined = predefinedTitles.has(taskTitle.toLowerCase());
                  const deptColors: Record<string, string> = {
                    SOIL_INVESTIGATION: 'bg-amber-100 text-amber-800 border-amber-200',
                    ARCHITECTURE: 'bg-red-100 text-red-800 border-red-200',
                    MARKETING: 'bg-sky-100 text-sky-800 border-sky-200',
                    CONSTRUCTION: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    ACCOUNTS: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                  };

                  return (
                    <tr 
                      key={t.id} 
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => setSelectedTask(t)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{t.wbs_code}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 hover:text-red-600 transition">
                            {taskTitle}
                          </span>
                          {isPredefined && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              Predefined
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{t.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${deptColors[t.department || 'CONSTRUCTION'] || 'bg-slate-100 text-slate-700'}`}>
                          {(t.department || 'CONSTRUCTION').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.assigned_to || t.assigned_to_name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                          t.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                          t.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {t.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono text-[11px] font-bold text-slate-700">{t.progress_percentage || 0}%</span>
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${t.progress_percentage || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                          t.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                          t.status === 'BLOCKED' ? 'bg-rose-50 text-rose-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status !== 'COMPLETED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(t.id, 'COMPLETED')}
                              className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition cursor-pointer"
                              title="Mark as Completed"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedTask(t)}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
                            title="View Task Details Drawer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Details Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col p-6 space-y-5 overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs text-slate-400 font-bold">{selectedTask.wbs_code}</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedTask.name || selectedTask.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {(selectedTask.department || 'CONSTRUCTION').replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedTask.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                    selectedTask.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedTask.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1 text-xs">
              <span className="font-semibold text-slate-700">Scope Description:</span>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-xl leading-relaxed">
                {selectedTask.description || 'No detailed scope notes provided for this task.'}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">Assigned Lead</span>
                <span className="font-bold text-slate-800">{selectedTask.assigned_to || selectedTask.assigned_to_name || 'Unassigned'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">Priority</span>
                <span className="font-bold text-red-600">{selectedTask.priority || 'MEDIUM'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">Planned Start</span>
                <span className="font-medium text-slate-700">{selectedTask.planned_start || selectedTask.start_date}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">Planned End</span>
                <span className="font-medium text-slate-700">{selectedTask.planned_end || selectedTask.end_date}</span>
              </div>
            </div>

            {/* Quick Status Changers */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-700">Update Task Status:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedTask.id, 'TODO')}
                  className={`py-2 rounded-lg font-semibold border transition cursor-pointer ${
                    selectedTask.status === 'TODO' ? 'bg-slate-800 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  To Do
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedTask.id, 'IN_PROGRESS')}
                  className={`py-2 rounded-lg font-semibold border transition cursor-pointer ${
                    selectedTask.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedTask.id, 'COMPLETED')}
                  className={`py-2 rounded-lg font-semibold border transition cursor-pointer ${
                    selectedTask.status === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Attached Field Evidence / Files</span>
                <button 
                  type="button"
                  onClick={() => onShowToast?.('Upload media / screenshot dialog ready...')}
                  className="text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Attach File</span>
                </button>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700 font-medium">Site_Investigation_Borehole_01.jpg</span>
                </div>
                <span className="text-[10px] text-slate-400">2.4 MB</span>
              </div>
            </div>

            {/* Discussion Comments */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-100 flex-1 flex flex-col justify-between">
              <span className="font-semibold text-slate-700">Task Discussion & Notes:</span>
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500 italic text-[11px]">
                "Borehole core extracted at 4.5m depth. Lab testing booked with Geotechnical Consultant."
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Post an internal site note..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newComment.trim()) return;
                    onShowToast?.('Note added to task log');
                    setNewComment('');
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create New Project Task</h3>
              <button 
                onClick={() => setIsNewTaskModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="e.g. Geotechnical Lab Sample Re-check"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Department</label>
                  <CustomSelect
                    value={newTaskDept}
                    onChange={(val) => setNewTaskDept(val as any)}
                    options={[
                      { label: 'Soil Investigation', value: 'SOIL_INVESTIGATION' },
                      { label: 'Architecture', value: 'ARCHITECTURE' },
                      { label: 'Marketing', value: 'MARKETING' },
                      { label: 'Construction', value: 'CONSTRUCTION' },
                      { label: 'Accounts', value: 'ACCOUNTS' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Priority</label>
                  <CustomSelect
                    value={newTaskPriority}
                    onChange={(val) => setNewTaskPriority(val as any)}
                    options={[
                      { label: 'Urgent', value: 'URGENT', dotColor: 'bg-rose-500' },
                      { label: 'High', value: 'HIGH', dotColor: 'bg-amber-500' },
                      { label: 'Medium', value: 'MEDIUM', dotColor: 'bg-sky-500' },
                      { label: 'Low', value: 'LOW', dotColor: 'bg-slate-400' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Person</label>
                  <input
                    type="text"
                    list="staff-tasks-assignees"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    placeholder="Select staff (e.g. Madhu)..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                  <datalist id="staff-tasks-assignees">
                    {staffList.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.designation || s.role_name})
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <CustomDatePicker
                    value={newTaskDueDate}
                    onChange={(d) => setNewTaskDueDate(d)}
                    inputClassName="py-2 px-3 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TasksView;
