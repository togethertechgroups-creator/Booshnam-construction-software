import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { COLORS, SHADOWS } from '../theme';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { Project, User, TaskItem, WorkerAttendance, MOMItem, MaterialItem, EquipmentItem, SystemModuleId } from '../types';
import { INITIAL_TASKS, INITIAL_WORKERS, INITIAL_MOMS, INITIAL_MATERIALS, INITIAL_EQUIPMENT } from '../mockData';

interface ProjectWorkspaceScreenProps {
  project: Project;
  user: User;
  onBack: () => void;
}

type WorkspaceTab = 'Dashboard' | 'Task' | 'Attendance' | 'Material' | 'Equipment' | 'MOM' | 'Files';

export default function ProjectWorkspaceScreen({ project, user, onBack }: ProjectWorkspaceScreenProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('Dashboard');
  const [dashboardSubTab, setDashboardSubTab] = useState<'operational' | 'financial'>('operational');

  // Interactive Project State
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [workers, setWorkers] = useState<WorkerAttendance[]>(INITIAL_WORKERS);
  const [moms, setMoms] = useState<MOMItem[]>(INITIAL_MOMS);
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);
  const [equipment, setEquipment] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);

  // Modals
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingAttendees, setNewMeetingAttendees] = useState('');
  const [newMeetingDecisions, setNewMeetingDecisions] = useState('');

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDept, setNewTaskDept] = useState('CONSTRUCTION');

  // Handle Add MOM
  const handleSaveMOM = () => {
    if (!newMeetingTitle.trim()) {
      Alert.alert('Required', 'Please enter a meeting title');
      return;
    }
    const newMom: MOMItem = {
      id: `mom-${Date.now()}`,
      title: newMeetingTitle,
      date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      attendees: newMeetingAttendees || `${user.name} (${user.role}), Site Team`,
      decisions: newMeetingDecisions || 'Action items documented and assigned.',
    };
    setMoms([newMom, ...moms]);
    setNewMeetingTitle('');
    setNewMeetingAttendees('');
    setNewMeetingDecisions('');
    setShowAddMeetingModal(false);
    Alert.alert('Success', 'Minutes of Meeting recorded successfully!');
  };

  // Handle Add Task
  const handleSaveTask = () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Required', 'Please enter task title');
      return;
    }
    const newTask: TaskItem = {
      id: `tsk-${Date.now()}`,
      code: `TSK-${tasks.length + 1}`,
      title: newTaskTitle,
      department: newTaskDept,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedTo: user.name,
      dueDate: '10-10-2026',
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setShowAddTaskModal(false);
    Alert.alert('Task Created', 'New site task assigned successfully!');
  };

  // Toggle Task Status
  const toggleTaskStatus = (id: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          const nextStatus = t.status === 'COMPLETED' ? 'NOT_STARTED' : t.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  // Mark Worker Attendance
  const toggleWorkerAttendance = (id: string) => {
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    setWorkers(prev =>
      prev.map(w => {
        if (w.id === id) {
          if (w.status === 'absent') {
            return { ...w, status: 'present', checkIn: now };
          } else if (w.status === 'present') {
            return { ...w, checkOut: now };
          }
          return { ...w, status: 'absent', checkIn: undefined, checkOut: undefined };
        }
        return w;
      })
    );
  };

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const notStartedCount = tasks.filter(t => t.status === 'NOT_STARTED').length;

  const isSuperAdmin = user.role_code === 'SUPER_ADMIN' || user.role_code === 'ADMIN';
  const canCreate = isSuperAdmin || Boolean(user.permissions?.can_create);
  const canEdit = isSuperAdmin || Boolean(user.permissions?.can_edit);

  // Dynamic Tabs based on Role, Department & Allowed Pages
  const ALL_WORKSPACE_TABS: { tab: WorkspaceTab; moduleId: SystemModuleId }[] = [
    { tab: 'Dashboard', moduleId: 'dashboard' },
    { tab: 'Task', moduleId: 'tasks' },
    { tab: 'Attendance', moduleId: 'attendance' },
    { tab: 'Material', moduleId: 'materials' },
    { tab: 'Equipment', moduleId: 'equipment' },
    { tab: 'MOM', moduleId: 'mom' },
    { tab: 'Files', moduleId: 'files' },
  ];

  const allowedTabs = isSuperAdmin
    ? ['Dashboard', 'Task', 'Attendance', 'Material', 'Equipment', 'MOM', 'Files'] as WorkspaceTab[]
    : ALL_WORKSPACE_TABS.filter((t) => user.allowedPages?.includes(t.moduleId)).map((t) => t.tab);

  const TABS: WorkspaceTab[] = allowedTabs.length > 0 ? allowedTabs : ['Dashboard'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Project Bar matching User Web Screenshot */}
      <View style={[styles.topBar, SHADOWS.sm]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#0f172a" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.projectBadge}>
            <Text style={styles.projectBadgeText}>{project.shortName}</Text>
          </View>

          <View style={styles.projectHeaderInfo}>
            <View style={styles.projectNameRow}>
              <Text style={styles.projectNameText} numberOfLines={1}>{project.name}</Text>
              <View style={styles.codePill}>
                <Text style={styles.codePillText}>{project.code}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={11} color="#64748b" strokeWidth={2.2} style={{ marginRight: 3 }} />
                <Text style={styles.metaText}>Site: {project.site_location}</Text>
              </View>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>Client: {project.client_name}</Text>
            </View>
          </View>
        </View>

        {/* Status, Role and Department badges row */}
        <View style={styles.subMetaRow}>
          <View style={styles.ongoingBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.ongoingText}>{project.status}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Role: {user.role}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', marginLeft: 6 }]}>
            <Text style={[styles.roleBadgeText, { color: '#166534' }]}>Dept: {user.department}</Text>
          </View>
        </View>

        {/* Scrollable Horizontal Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab}
                </Text>
                {isActive && <View style={styles.activeUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>

        {/* ---------------- 1. DASHBOARD TAB ---------------- */}
        {activeTab === 'Dashboard' && (
          <View>
            {/* Operational / Financial Toggle Buttons */}
            <View style={styles.toggleRow}>
              <View style={styles.pillGroup}>
                <TouchableOpacity
                  style={[styles.pillBtn, dashboardSubTab === 'operational' && styles.pillBtnActive]}
                  onPress={() => setDashboardSubTab('operational')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, dashboardSubTab === 'operational' && styles.pillTextActive]}>
                    Operational
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillBtn, dashboardSubTab === 'financial' && styles.pillBtnActive]}
                  onPress={() => setDashboardSubTab('financial')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, dashboardSubTab === 'financial' && styles.pillTextActive]}>
                    Financial
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.siteBreadcrumb}>
                Site: {project.site_location}  •  Code: {project.code}
              </Text>
            </View>

            {/* CARD 1: Project Status */}
            <View style={[styles.card, SHADOWS.sm]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Project Status</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{project.status}</Text>
                </View>
              </View>

              <View style={styles.statusBody}>
                {/* Circular Progress Indicator */}
                <View style={styles.circleOuter}>
                  <View style={styles.circleInner}>
                    <Text style={styles.circleLabel}>Project</Text>
                    <Text style={styles.circlePercent}>{project.progress}%</Text>
                  </View>
                </View>

                {/* Values & Personnel */}
                <View style={styles.statusDetails}>
                  <Text style={styles.metricLabel}>Project Value</Text>
                  <Text style={styles.metricValue}>₹ {project.value.toLocaleString('en-IN')}</Text>

                  <Text style={[styles.metricLabel, { marginTop: 12 }]}>Key Personnel</Text>
                  <View style={styles.personnelList}>
                    {project.keyPersonnel.map((person, idx) => (
                      <Text key={idx} style={styles.personnelItem}>• {person}</Text>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* CARD 2: Planned Vs Actual Dates */}
            <View style={[styles.card, SHADOWS.sm]}>
              <Text style={styles.cardTitle}>Planned Vs Actual Dates</Text>

              <View style={styles.dateSection}>
                <Text style={styles.dateSubheader}>Planned Dates</Text>
                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>Start: <Text style={styles.dateVal}>{project.startDate}</Text></Text>
                  <Text style={styles.dateText}>End: <Text style={styles.dateVal}>{project.endDate}</Text></Text>
                </View>
              </View>

              <View style={styles.dateSection}>
                <Text style={styles.dateSubheader}>Actual Dates</Text>
                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>Start: <Text style={styles.dateVal}>{project.actualStartDate}</Text></Text>
                  <Text style={styles.dateText}>End: <Text style={styles.dateVal}>{project.actualEndDate}</Text></Text>
                </View>
              </View>

              <Text style={styles.milestoneNote}>Milestones tracked via WBS Schedule</Text>
            </View>

            {/* CARD 3: MOM (Minutes of Meeting) Card */}
            <View style={[styles.card, SHADOWS.sm]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>MOM</Text>
                <TouchableOpacity onPress={() => setActiveTab('MOM')}>
                  <Text style={styles.viewAllLink}>view all</Text>
                </TouchableOpacity>
              </View>

              {moms.length === 0 ? (
                <View style={styles.emptyMOM}>
                  <Text style={styles.emptyText}>No MOM found</Text>
                </View>
              ) : (
                <View style={styles.momPreviewList}>
                  {moms.slice(0, 2).map((m) => (
                    <View key={m.id} style={styles.momPreviewItem}>
                      <View style={styles.momDateBadge}>
                        <Text style={styles.momDateText}>{m.date}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.momPreviewTitle} numberOfLines={1}>{m.title}</Text>
                        <Text style={styles.momPreviewAttendees} numberOfLines={1}>👥 {m.attendees}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.addMeetingBtn}
                onPress={() => setShowAddMeetingModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.addMeetingBtnText}>+ Add New Meeting</Text>
              </TouchableOpacity>
            </View>

            {/* CARD 4: Month on Month Progress */}
            <View style={[styles.card, SHADOWS.sm]}>
              <Text style={styles.cardTitle}>Month on Month Progress</Text>
              
              {/* Legend matching web screenshot */}
              <View style={styles.legendRow}>
                <Text style={styles.legendItem}>
                  <Text style={{ color: '#f59e0b' }}>●</Text> Not Started {notStartedCount}
                </Text>
                <Text style={styles.legendDivider}>|</Text>
                <Text style={styles.legendItem}>Delayed 0</Text>
                <Text style={styles.legendDivider}>|</Text>
                <Text style={styles.legendItem}>
                  <Text style={{ color: '#3b82f6' }}>●</Text> In Progress {inProgressCount}
                </Text>
                <Text style={styles.legendDivider}>|</Text>
                <Text style={styles.legendItem}>
                  <Text style={{ color: '#16a34a' }}>●</Text> Completed {completedCount}
                </Text>
              </View>

              {/* Progress Bar Visualization */}
              <View style={styles.cumProgressContainer}>
                <Text style={styles.cumLabel}>Cumulative Progress (%)</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
                </View>
                <Text style={styles.progressPercentText}>{project.progress}% Complete</Text>
              </View>
            </View>

            {/* CARD 5: Task Progress */}
            <View style={[styles.card, SHADOWS.sm]}>
              <Text style={styles.cardTitle}>Task progress</Text>
              <View style={styles.taskProgressBody}>
                <Text style={styles.taskBigNumber}>{tasks.length}</Text>
                <Text style={styles.taskTotalLabel}>Total Scheduled Tasks</Text>
                <View style={styles.taskCompletedRow}>
                  <Text style={styles.taskCompletedText}>Completed: <Text style={styles.completedNumber}>{completedCount}</Text></Text>
                  <TouchableOpacity onPress={() => setActiveTab('Task')}>
                    <Text style={styles.viewTasksLink}>Open Tasks Tab ➔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ---------------- 2. TASK TAB ---------------- */}
        {activeTab === 'Task' && (
          <View>
            <View style={styles.tabActionHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>Project Tasks</Text>
                <Text style={styles.sectionHeaderSub}>{tasks.length} WBS schedule items</Text>
              </View>
              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={() => setShowAddTaskModal(true)}
              >
                <Text style={styles.actionPillBtnText}>+ Add Task</Text>
              </TouchableOpacity>
            </View>

            {tasks.map((task) => {
              const isDone = task.status === 'COMPLETED';
              const isInProg = task.status === 'IN_PROGRESS';
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, isDone && styles.taskCardDone]}
                  activeOpacity={0.8}
                  onPress={() => toggleTaskStatus(task.id)}
                >
                  <View style={styles.taskCardTop}>
                    <View style={styles.taskCodeBadge}>
                      <Text style={styles.taskCodeText}>{task.code}</Text>
                    </View>
                    <View style={[
                      styles.priorityBadge,
                      task.priority === 'URGENT' ? styles.urgentBadge : styles.highBadge
                    ]}>
                      <Text style={styles.priorityText}>{task.priority}</Text>
                    </View>
                  </View>

                  <Text style={[styles.taskTitleText, isDone && styles.taskTitleDone]}>
                    {task.title}
                  </Text>
                  <Text style={styles.taskAssigneeText}>
                    🏢 {task.department} • 👤 {task.assignedTo || 'Unassigned'}
                  </Text>

                  <View style={styles.taskFooter}>
                    <Text style={styles.taskDueText}>Due: {task.dueDate}</Text>
                    <View style={[
                      styles.statusIndicator,
                      isDone ? styles.statusDone : isInProg ? styles.statusInProg : styles.statusNotStarted
                    ]}>
                      <Text style={styles.statusIndicatorText}>
                        {isDone ? '✓ Completed' : isInProg ? '● In Progress' : '○ Not Started'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ---------------- 3. ATTENDANCE TAB ---------------- */}
        {activeTab === 'Attendance' && (
          <View>
            <View style={styles.tabActionHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>Site Attendance</Text>
                <Text style={styles.sectionHeaderSub}>Daily workforce roster & check-in</Text>
              </View>
              <View style={styles.attendanceSummaryBadge}>
                <Text style={styles.attendanceSummaryText}>
                  Present: {workers.filter(w => w.status === 'present').length} / {workers.length}
                </Text>
              </View>
            </View>

            {workers.map((worker) => {
              const isPresent = worker.status === 'present';
              return (
                <View key={worker.id} style={styles.workerCard}>
                  <View style={styles.workerInfo}>
                    <Text style={styles.workerName}>{worker.name}</Text>
                    <Text style={styles.workerRole}>{worker.role}</Text>
                    {worker.checkIn && (
                      <Text style={styles.checkInTime}>In: {worker.checkIn} {worker.checkOut ? `• Out: ${worker.checkOut}` : ''}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.markBtn,
                      isPresent ? styles.markBtnPresent : styles.markBtnAbsent
                    ]}
                    onPress={() => toggleWorkerAttendance(worker.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.markBtnText,
                      isPresent ? styles.markBtnTextPresent : styles.markBtnTextAbsent
                    ]}>
                      {isPresent ? 'Marked Present ✓' : 'Mark Check-In'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* ---------------- 4. MATERIAL TAB ---------------- */}
        {activeTab === 'Material' && (
          <View>
            <View style={styles.tabActionHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>Material Requests & GRN</Text>
                <Text style={styles.sectionHeaderSub}>Onsite stock and inward deliveries</Text>
              </View>
            </View>

            {materials.map((mat) => (
              <View key={mat.id} style={styles.materialCard}>
                <View style={styles.materialTop}>
                  <Text style={styles.materialName}>{mat.itemName}</Text>
                  <View style={[
                    styles.matStatusBadge,
                    mat.status === 'RECEIVED' ? styles.matReceived : styles.matApproved
                  ]}>
                    <Text style={styles.matStatusText}>{mat.status}</Text>
                  </View>
                </View>
                <Text style={styles.materialCategory}>Category: {mat.category}</Text>

                <View style={styles.materialQuantities}>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyLabel}>Requested</Text>
                    <Text style={styles.qtyVal}>{mat.quantityRequested} {mat.unit}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyLabel}>Received Onsite</Text>
                    <Text style={[styles.qtyVal, { color: COLORS.success }]}>{mat.quantityReceived} {mat.unit}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ---------------- 5. EQUIPMENT TAB ---------------- */}
        {activeTab === 'Equipment' && (
          <View>
            <View style={styles.tabActionHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>Heavy Machinery & Assets</Text>
                <Text style={styles.sectionHeaderSub}>Live machinery on site</Text>
              </View>
            </View>

            {equipment.map((eq) => (
              <View key={eq.id} style={styles.equipCard}>
                <View style={styles.equipTop}>
                  <Text style={styles.equipName}>🚜 {eq.name}</Text>
                  <View style={styles.equipStatusBadge}>
                    <Text style={styles.equipStatusText}>{eq.status}</Text>
                  </View>
                </View>
                <Text style={styles.equipSub}>Type: {eq.type} • Operator: {eq.operator}</Text>
                <View style={styles.hoursBox}>
                  <Text style={styles.hoursText}>Logged Hours: <Text style={styles.hoursVal}>{eq.hoursWorked} hrs</Text></Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ---------------- 6. MOM TAB ---------------- */}
        {activeTab === 'MOM' && (
          <View>
            <View style={styles.tabActionHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>Minutes of Meeting (MOM)</Text>
                <Text style={styles.sectionHeaderSub}>Stakeholder discussions & decisions</Text>
              </View>
              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={() => setShowAddMeetingModal(true)}
              >
                <Text style={styles.actionPillBtnText}>+ New Meeting</Text>
              </TouchableOpacity>
            </View>

            {moms.map((m) => (
              <View key={m.id} style={styles.momDetailCard}>
                <View style={styles.momHeaderRow}>
                  <Text style={styles.momTitle}>{m.title}</Text>
                  <View style={styles.momDatePill}>
                    <Text style={styles.momDatePillText}>{m.date}</Text>
                  </View>
                </View>
                <Text style={styles.momAttendees}>👥 Attendees: {m.attendees}</Text>
                <View style={styles.decisionsBox}>
                  <Text style={styles.decisionsHeader}>Key Decisions & Action Items:</Text>
                  <Text style={styles.decisionsBody}>{m.decisions}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ---------------- 7. FILES TAB ---------------- */}
        {activeTab === 'Files' && (
          <View>
            <View style={styles.tabActionHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>Drawings & Site Photos</Text>
                <Text style={styles.sectionHeaderSub}>Architectural layouts, DPR logs</Text>
              </View>
            </View>

            <View style={styles.fileItem}>
              <Text style={styles.fileIcon}>📄</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName}>RUNWAY-ARCH-REV-02.dwg</Text>
                <Text style={styles.fileMeta}>Architectural Ground Layout • 12.4 MB</Text>
              </View>
              <TouchableOpacity style={styles.downloadBtn}>
                <Text style={styles.downloadBtnText}>View</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fileItem}>
              <Text style={styles.fileIcon}>📄</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName}>SOIL-BEARING-CAPACITY-REPORT.pdf</Text>
                <Text style={styles.fileMeta}>Geotechnical Lab Dossier • 4.8 MB</Text>
              </View>
              <TouchableOpacity style={styles.downloadBtn}>
                <Text style={styles.downloadBtnText}>View</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* ---------------- MODAL: Add New MOM Meeting ---------------- */}
      <Modal visible={showAddMeetingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>+ Add Minutes of Meeting</Text>

            <Text style={styles.modalLabel}>Meeting Subject / Title</Text>
            <TextInput
              style={styles.modalInput}
              value={newMeetingTitle}
              onChangeText={setNewMeetingTitle}
              placeholder="e.g. Footing Inspection with Client"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.modalLabel}>Attendees</Text>
            <TextInput
              style={styles.modalInput}
              value={newMeetingAttendees}
              onChangeText={setNewMeetingAttendees}
              placeholder="e.g. Velmurugan, Murugan (Site Engineer)"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.modalLabel}>Decisions & Actions</Text>
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              value={newMeetingDecisions}
              onChangeText={setNewMeetingDecisions}
              placeholder="Key agreements and next milestones..."
              placeholderTextColor={COLORS.textMuted}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddMeetingModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveMOM}
              >
                <Text style={styles.saveBtnText}>Save Meeting</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------- MODAL: Add Task ---------------- */}
      <Modal visible={showAddTaskModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>+ Add Site Task</Text>

            <Text style={styles.modalLabel}>Task Title</Text>
            <TextInput
              style={styles.modalInput}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              placeholder="e.g. Check Level & Column Shuttering"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.modalLabel}>Department</Text>
            <TextInput
              style={styles.modalInput}
              value={newTaskDept}
              onChangeText={setNewTaskDept}
              placeholder="e.g. CONSTRUCTION / SURVEY"
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddTaskModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveTask}
              >
                <Text style={styles.saveBtnText}>Create Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 36) : 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  projectBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  projectBadgeText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  projectHeaderInfo: {
    flex: 1,
  },
  projectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  projectNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  codePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  codePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  metaDot: {
    marginHorizontal: 4,
    color: COLORS.textMuted,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  ongoingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginRight: 8,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginRight: 5,
  },
  ongoingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  roleBadge: {
    backgroundColor: COLORS.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'relative',
  },
  tabButtonActive: {},
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    right: 14,
    height: 2.5,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  contentArea: {
    padding: 16,
    paddingBottom: 40,
  },
  toggleRow: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  pillGroup: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  pillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
  },
  pillBtnActive: {
    backgroundColor: COLORS.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: '#ffffff',
  },
  siteBreadcrumb: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusPill: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  statusBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    backgroundColor: '#f8fafc',
  },
  circleInner: {
    alignItems: 'center',
  },
  circleLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  circlePercent: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusDetails: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  personnelList: {
    marginTop: 4,
  },
  personnelItem: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  dateSection: {
    marginBottom: 10,
  },
  dateSubheader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  dateVal: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  milestoneNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyMOM: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  momPreviewList: {
    marginBottom: 12,
  },
  momPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  momDateBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  momDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  momPreviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  momPreviewAttendees: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  addMeetingBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 6,
  },
  addMeetingBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  legendItem: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  legendDivider: {
    marginHorizontal: 6,
    color: '#cbd5e1',
  },
  cumProgressContainer: {
    marginTop: 4,
  },
  cumLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'right',
  },
  taskProgressBody: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  taskBigNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  taskTotalLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: -4,
    marginBottom: 12,
  },
  taskCompletedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  taskCompletedText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  completedNumber: {
    fontWeight: '800',
    color: COLORS.success,
  },
  viewTasksLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Task Tab styles
  tabActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  actionPillBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionPillBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskCardDone: {
    backgroundColor: '#f8fafc',
    opacity: 0.8,
  },
  taskCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  taskCodeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskCodeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  highBadge: {
    backgroundColor: '#fef3c7',
  },
  urgentBadge: {
    backgroundColor: '#fee2e2',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  taskTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  taskAssigneeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  taskDueText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDone: {
    backgroundColor: '#dcfce7',
  },
  statusInProg: {
    backgroundColor: '#dbeafe',
  },
  statusNotStarted: {
    backgroundColor: '#f1f5f9',
  },
  statusIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Attendance styles
  attendanceSummaryBadge: {
    backgroundColor: COLORS.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  attendanceSummaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  workerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  workerRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  checkInTime: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
    marginTop: 3,
  },
  markBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  markBtnPresent: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  markBtnAbsent: {
    backgroundColor: COLORS.primary,
  },
  markBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  markBtnTextPresent: {
    color: '#15803d',
  },
  markBtnTextAbsent: {
    color: '#ffffff',
  },

  // Material & Equipment styles
  materialCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  materialTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  matStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matReceived: {
    backgroundColor: '#dcfce7',
  },
  matApproved: {
    backgroundColor: '#fef3c7',
  },
  matStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  materialCategory: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  materialQuantities: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
  },
  qtyBox: {
    flex: 1,
  },
  qtyLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  qtyVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  equipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  equipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equipName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  equipStatusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  equipStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  equipSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  hoursBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
  },
  hoursText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  hoursVal: {
    fontWeight: '700',
    color: COLORS.primaryDark,
  },

  // MOM styles
  momDetailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  momHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  momTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  momDatePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  momDatePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  momAttendees: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  decisionsBox: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  decisionsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 2,
  },
  decisionsBody: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },

  // Files styles
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  fileMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  downloadBtn: {
    backgroundColor: COLORS.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
