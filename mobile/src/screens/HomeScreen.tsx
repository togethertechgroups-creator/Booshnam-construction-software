import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import {
  Menu,
  Bell,
  LogOut,
  ChevronDown,
  SlidersHorizontal,
  Search,
  Plus,
  Building2,
  Users,
  CreditCard,
  Camera,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Phone,
  Check,
  X,
  ClipboardList,
  User,
  Settings,
  MoreVertical,
  Package,
  HardHat,
  LogIn,
  FileText,
  AlertTriangle,
  Layers,
  Upload,
  RefreshCw,
  ShieldCheck,
  Clock,
  Sparkles,
  RotateCcw,
} from 'lucide-react-native';
import { COLORS, SHADOWS } from '../theme';
import { Project, User as UserType } from '../types';
import { DEMO_PROJECTS } from '../mockData';
import {
  saveMobileAttendancePunch,
  getTodayMobileAttendancePunch,
  getStaffAttendanceHistory,
  resetTodayMobileAttendancePunch,
  MobileAttendancePunch,
  formatTime12h,
  getUserProfilePhoto,
  setUserProfilePhoto,
} from '../services/attendanceService';
import {
  captureSelfiePhoto,
  pickPhotoFromGallery,
  SAMPLE_SELFIE_PHOTOS,
} from '../services/cameraService';

const BOOSHNAM_HEADER_LOGO = require('../assets/booshnam_header_logo.png');

interface HomeScreenProps {
  user: UserType;
  onOpenProject: (project: Project) => void;
  onOpenUserManagement?: () => void;
  onLogout: () => void;
}

type BottomNavTab = 'projects' | 'reports' | 'finance';

export default function HomeScreen({
  user,
  onOpenProject,
  onOpenUserManagement,
  onLogout,
}: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<BottomNavTab>('projects');
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddDprModal, setShowAddDprModal] = useState(false);

  // Role check: Site Staff (Site Engineer / Supervisor) vs Office Staff
  const isSiteStaff =
    user.role_code === 'SITE_ENGINEER' ||
    user.role_code === 'SUPERVISOR' ||
    (user.role && (user.role.toLowerCase().includes('site') || user.role.toLowerCase().includes('supervisor')));

  // Site name assigned
  const assignedSiteName = isSiteStaff 
    ? 'Cumbum Runway Site (Theni)' 
    : 'Booshnam Head Office (Plot No. 8, LIC Colony, 6th St, Pammal, Chennai - 600075)';

  // Unique key for the currently logged-in user
  const userKey = String(user.id || user.username || '1');

  // Profile photo state (initialized from profile store or user.avatar)
  const [userProfilePhoto, setUserProfilePhotoState] = useState<string>(() => {
    return (
      getUserProfilePhoto(userKey) ||
      user.avatar ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop'
    );
  });

  // Attendance & Live Photo State - strictly per logged-in user
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [punchType, setPunchType] = useState<'IN' | 'OUT'>('IN');
  const [livePhotoUri, setLivePhotoUri] = useState<string>(userProfilePhoto);
  const [todayPunch, setTodayPunch] = useState<MobileAttendancePunch | undefined>(() =>
    getTodayMobileAttendancePunch(userKey)
  );
  const [punchNotes, setPunchNotes] = useState('');

  const openAttendanceModal = (targetType?: 'IN' | 'OUT') => {
    if (targetType) {
      setPunchType(targetType);
    } else if (todayPunch?.punchType === 'IN') {
      setPunchType('OUT');
    } else {
      setPunchType('IN');
    }
    setAttendanceModalVisible(true);
  };

  const handleCaptureLiveSelfie = () => {
    const list = SAMPLE_SELFIE_PHOTOS;
    const nextPhoto = list[(list.indexOf(livePhotoUri) + 1) % list.length];
    setLivePhotoUri(nextPhoto);
  };

  const handleOpenCamera = async () => {
    try {
      const res = await captureSelfiePhoto();
      if (res.success && res.uri) {
        setLivePhotoUri(res.uri);
      } else if (res.error && !res.cancelled) {
        handleCaptureLiveSelfie();
      }
    } catch {
      handleCaptureLiveSelfie();
    }
  };

  const handleUploadGallery = async () => {
    try {
      const res = await pickPhotoFromGallery();
      if (res.success && res.uri) {
        setLivePhotoUri(res.uri);
      } else if (res.error && !res.cancelled) {
        handleCaptureLiveSelfie();
      }
    } catch {
      handleCaptureLiveSelfie();
    }
  };

  const handleResetAttendance = () => {
    resetTodayMobileAttendancePunch(userKey);
    setTodayPunch(undefined);
    setShowHistoryModal(false);
    Alert.alert(
      'Attendance Reset',
      'Today’s attendance reset to pending (Blank state). You can now test Punch IN again.'
    );
  };

  const handleChangeProfilePhoto = () => {
    const list = SAMPLE_SELFIE_PHOTOS;
    const nextPhoto = list[(list.indexOf(userProfilePhoto) + 1) % list.length];
    setUserProfilePhotoState(nextPhoto);
    setLivePhotoUri(nextPhoto);
    setUserProfilePhoto(userKey, nextPhoto);
    Alert.alert('Profile Photo Updated', 'Profile picture updated to your new photo.');
  };

  const handlePunchSubmit = () => {
    const rec = saveMobileAttendancePunch({
      staffId: userKey,
      staffName: user.name || 'Velmurugan',
      staffCode: user.id || userKey,
      department: user.department || (isSiteStaff ? 'Civil Engineering' : 'Office Administration'),
      role: user.role || (isSiteStaff ? 'Site Engineer' : 'Office Staff'),
      photo: livePhotoUri,
      punchType: punchType,
      locationName: assignedSiteName,
      distanceMeters: isSiteStaff ? 12.4 : 0,
    });
    // First time or update profile photo with this photo
    setUserProfilePhotoState(livePhotoUri);
    setUserProfilePhoto(userKey, livePhotoUri);
    setTodayPunch(rec);
    setAttendanceModalVisible(false);

    const isPunchOut = punchType === 'OUT';
    Alert.alert(
      isPunchOut ? 'Punch OUT Recorded!' : 'Punch IN Recorded!',
      isPunchOut
        ? `Shift completed at ${rec.clockOutTime || formatTime12h()}.\n\nStaff: ${user.name}\nSite: ${assignedSiteName}\nStatus changed to Red (Shift Ended).`
        : `Successfully punched in at ${rec.clockInTime || formatTime12h()}.\n\nStaff: ${user.name}\nSite: ${assignedSiteName}\nLive selfie & GPS verified.\nStatus is now Green (On Duty).`,
      [{ text: 'OK' }]
    );
  };

  const isAdmin =
    user.role_code === 'SUPER_ADMIN' ||
    user.role_code === 'ADMIN' ||
    user.allowedPages?.includes('users_admin');



  // DPR Reports State (Daily Progress Reports from Web App)
  const [dprList, setDprList] = useState([
    {
      id: 'dpr-1',
      date: '30-09-2026',
      shift: 'Day Shift (08:00 AM - 05:30 PM)',
      weather: '☀️ Sunny (32°C)',
      completed: 'Concreting of Column C1 to C6 completed with 12 cu.m M25 mix. Boundary pegs verified.',
      inProgress: 'First floor beam rebar tying. Plumbing sleeve installations in beam junctions.',
      tomorrow: 'Pour concrete for balance 4 columns in East quadrant.',
      labourCount: 24,
      status: 'Submitted',
      siteName: assignedSiteName,
    },
    {
      id: 'dpr-2',
      date: '29-09-2026',
      shift: 'Day Shift (08:00 AM - 05:00 PM)',
      weather: '⛅ Cloudy (29°C)',
      completed: 'Plinth beam water ponding curing monitored. Formwork stripping on south wall.',
      inProgress: 'Excavation for storm water drain pit along grid 1.',
      tomorrow: 'Column reinforcement checks & rebar inspection.',
      labourCount: 22,
      status: 'Approved',
      pmRemarks: 'Verified on site. Plinth levels match structural drawing.',
      siteName: assignedSiteName,
    },
  ]);

  const [dprForm, setDprForm] = useState({
    completed: '',
    inProgress: '',
    tomorrow: '',
    labourCount: '24',
    weather: 'Sunny (32°C)',
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Top Header Bar (Booshnam Logo + Company + Lucide Icons) ── */}
      <View style={[styles.header, SHADOWS.sm]}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity style={styles.hamburgerBtn} activeOpacity={0.7}>
            <Menu size={22} color="#0f172a" strokeWidth={2.2} />
          </TouchableOpacity>

          <Image
            source={BOOSHNAM_HEADER_LOGO}
            style={styles.headerFullLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Notifications', 'You have 99+ pending site alerts & DPR updates.')}
          >
            <Bell size={18} color="#0f172a" strokeWidth={2.2} />
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>99+</Text>
            </View>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <LogOut size={18} color="#0f172a" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable Body ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Quick Pending Metrics Strip (from reference screen) ── */}
        <View style={styles.pendingStrip}>
          <View style={[styles.pendingCard, SHADOWS.sm]}>
            <Text style={styles.pendingCardHeader}>APPROVALS</Text>
            <View style={styles.pendingCardBottom}>
              <Text style={styles.pendingCardSub}>PENDING ↗</Text>
              <Text style={styles.pendingCardNum}>0</Text>
            </View>
          </View>

          <View style={[styles.pendingCard, SHADOWS.sm]}>
            <Text style={styles.pendingCardHeader}>MATERIAL</Text>
            <View style={styles.pendingCardBottom}>
              <Text style={styles.pendingCardSub}>PENDING ↗</Text>
              <Text style={styles.pendingCardNum}>0</Text>
            </View>
          </View>

          <View style={[styles.pendingCard, SHADOWS.sm]}>
            <Text style={styles.pendingCardHeader}>TO DO</Text>
            <View style={styles.pendingCardBottom}>
              <Text style={styles.pendingCardSub}>PENDING ↗</Text>
              <Text style={styles.pendingCardNum}>8</Text>
            </View>
          </View>
        </View>

        {/* ── Attendance Card (Only visible if attendance not yet marked today) ── */}
        {/* ── Attendance Card (Red & White Theme with Live Color Transitions) ── */}
        <View style={[
          styles.attendanceCard,
          SHADOWS.sm,
          todayPunch?.punchType === 'IN' && styles.attendanceCardIn,
          todayPunch?.punchType === 'OUT' && styles.attendanceCardOut,
        ]}>
          <View style={styles.attendanceCardTop}>
            <View style={styles.attendanceStatusRow}>
              <View style={[
                styles.attendanceStatusBadge,
                !todayPunch && styles.attendanceStatusBadgePending,
                todayPunch?.punchType === 'IN' && styles.attendanceStatusBadgeIn,
                todayPunch?.punchType === 'OUT' && styles.attendanceStatusBadgeOut,
              ]}>
                <View style={[
                  styles.attendanceStatusDot,
                  !todayPunch && styles.attendanceStatusDotPending,
                  todayPunch?.punchType === 'IN' && styles.attendanceStatusDotIn,
                  todayPunch?.punchType === 'OUT' && styles.attendanceStatusDotOut,
                ]} />
                <Text style={[
                  styles.attendanceStatusText,
                  !todayPunch && styles.attendanceStatusTextPending,
                  todayPunch?.punchType === 'IN' && styles.attendanceStatusTextIn,
                  todayPunch?.punchType === 'OUT' && styles.attendanceStatusTextOut,
                ]}>
                  {!todayPunch && 'Daily Attendance Pending • Ready to Punch In'}
                  {todayPunch?.punchType === 'IN' && `Punched IN: ${todayPunch.clockInTime} • GPS Site Verified`}
                  {todayPunch?.punchType === 'OUT' && `Punched OUT: ${todayPunch.clockOutTime} (In: ${todayPunch.clockInTime})`}
                </Text>
              </View>

              <View style={[
                styles.attendancePillTag,
                !todayPunch && styles.attendancePillTagPending,
                todayPunch?.punchType === 'IN' && styles.attendancePillTagIn,
                todayPunch?.punchType === 'OUT' && styles.attendancePillTagOut,
              ]}>
                <Text style={[
                  styles.attendancePillTagText,
                  !todayPunch && styles.attendancePillTagTextPending,
                  todayPunch?.punchType === 'IN' && styles.attendancePillTagTextIn,
                  todayPunch?.punchType === 'OUT' && styles.attendancePillTagTextOut,
                ]}>
                  {!todayPunch && 'Pending'}
                  {todayPunch?.punchType === 'IN' && '🟢 On Duty'}
                  {todayPunch?.punchType === 'OUT' && '🔴 Completed'}
                </Text>
              </View>
            </View>

            <View style={styles.attendanceProfileRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleChangeProfilePhoto}
                style={styles.avatarTouchable}
              >
                <Image
                  source={{ uri: userProfilePhoto }}
                  style={styles.attendanceAvatarImg}
                />
                <View style={styles.avatarEditBadge}>
                  <Camera size={10} color="#ffffff" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>

              <View style={styles.attendanceProfileInfo}>
                <Text style={styles.attendanceStaffName}>{user.name || 'Velmurugan'}</Text>
                <Text style={styles.attendanceStaffRole}>
                  {user.role || (isSiteStaff ? 'Site Engineer' : 'Office Staff')}
                </Text>
                <View style={styles.metaInline}>
                  {isSiteStaff ? (
                    <MapPin size={12} color="#dc2626" strokeWidth={2.2} style={{ marginRight: 4 }} />
                  ) : (
                    <Building2 size={12} color="#475569" strokeWidth={2.2} style={{ marginRight: 4 }} />
                  )}
                  <Text style={styles.attendanceSiteLocation}>{assignedSiteName}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[
                  styles.attendancePunchBtn,
                  !todayPunch && styles.attendancePunchBtnPending,
                  todayPunch?.punchType === 'IN' && styles.attendancePunchBtnIn,
                  todayPunch?.punchType === 'OUT' && styles.attendancePunchBtnOut,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  if (!todayPunch) {
                    openAttendanceModal('IN');
                  } else if (todayPunch.punchType === 'IN') {
                    openAttendanceModal('OUT');
                  } else {
                    setShowHistoryModal(true);
                  }
                }}
              >
                {!todayPunch && (
                  <>
                    <LogIn size={16} color="#ffffff" strokeWidth={2.4} style={{ marginRight: 6 }} />
                    <Text style={styles.attendancePunchBtnText}>Mark Attendance</Text>
                  </>
                )}
                {todayPunch?.punchType === 'IN' && (
                  <>
                    <LogOut size={16} color="#ffffff" strokeWidth={2.4} style={{ marginRight: 6 }} />
                    <Text style={styles.attendancePunchBtnText}>Punch OUT (Shift End)</Text>
                  </>
                )}
                {todayPunch?.punchType === 'OUT' && (
                  <>
                    <CheckCircle2 size={16} color="#dc2626" strokeWidth={2.4} style={{ marginRight: 6 }} />
                    <Text style={[styles.attendancePunchBtnText, { color: '#dc2626' }]}>Attendance Completed</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attendanceLogIconBtn}
                activeOpacity={0.8}
                onPress={() => setShowHistoryModal(true)}
              >
                <ClipboardList size={18} color="#dc2626" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Filter / Search / Action Toolbar (Lucide Icons) ── */}
        <View style={styles.filterBarRow}>
          <TouchableOpacity
            style={styles.filterDropdownPill}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Filter Scope', 'Switch between All, Active, and Completed project sites.')}
          >
            <Text style={styles.filterDropdownText}>All ({DEMO_PROJECTS.length})</Text>
            <ChevronDown size={14} color="#0f172a" strokeWidth={2.5} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterIconBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Filters', 'Filtering active projects and department scopes.')}
          >
            <SlidersHorizontal size={18} color="#0f172a" strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterIconBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Search', 'Search projects, tasks, materials, or ledgers.')}
          >
            <Search size={18} color="#0f172a" strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addProjectBtn}
            activeOpacity={0.75}
            onPress={() => Alert.alert('New Project', 'Provision new site workspace (Admin / PM privilege).')}
          >
            <Plus size={16} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 4 }} />
            <Text style={styles.addProjectBtnText}>Project</Text>
          </TouchableOpacity>
        </View>

        {/* ── Dynamic Tab View: PROJECTS ── */}
        {activeTab === 'projects' && (
          <>
            {/* Admin Management Shortcut (Visible only to Admin / Super Admin) */}
            {isAdmin && onOpenUserManagement && (
              <View style={[styles.adminBannerCard, SHADOWS.sm]}>
                <View style={styles.adminBannerTop}>
                  <View style={styles.adminIconBox}>
                    <Users size={22} color="#dc2626" strokeWidth={2.2} />
                  </View>
                  <View style={styles.adminBannerInfo}>
                    <View style={styles.adminTitleRow}>
                      <Text style={styles.adminBannerTitle}>User & Role Management</Text>
                      <View style={styles.adminControlBadge}>
                        <Text style={styles.adminControlBadgeText}>ADMIN CONTROL</Text>
                      </View>
                    </View>
                    <Text style={styles.adminBannerSubtitle}>
                      Define users, assign roles, departments & permissions
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.adminManageBtn, SHADOWS.sm]}
                  activeOpacity={0.88}
                  onPress={onOpenUserManagement}
                >
                  <Text style={styles.adminManageBtnText}>Manage Users & Permissions</Text>
                  <Settings size={14} color="#ffffff" strokeWidth={2.2} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}

            {/* Projects List */}
            {DEMO_PROJECTS.map((proj) => (
              <TouchableOpacity
                key={proj.id}
                style={[styles.projectCard, SHADOWS.sm]}
                activeOpacity={0.85}
                onPress={() => onOpenProject(proj)}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.initialBadge}>
                    <Text style={styles.initialText}>
                      {proj.name.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.projectTitle} numberOfLines={1}>
                      {proj.name}
                    </Text>
                    <View style={styles.codeRow}>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeText}>{proj.code}</Text>
                      </View>
                      <View style={styles.metaInline}>
                        <User size={12} color="#0284c7" strokeWidth={2.2} style={{ marginRight: 3 }} />
                        <Text style={styles.clientText}>{proj.client_name}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statusPill}>
                    <View style={styles.greenDot} />
                    <Text style={styles.statusText}>{proj.status}</Text>
                  </View>
                </View>

                {/* Location & Value row */}
                <View style={styles.locRow}>
                  <View style={styles.metaInline}>
                    <MapPin size={13} color="#dc2626" strokeWidth={2.2} style={{ marginRight: 3 }} />
                    <Text style={styles.locText}>{proj.site_location}</Text>
                  </View>
                  <Text style={styles.valueText}>
                    ₹ {proj.value.toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Progress Section */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressLabel}>Overall Completion</Text>
                    <Text style={styles.progressPercentage}>{proj.progress}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${proj.progress}%` }]}
                    />
                  </View>
                </View>

                {/* Tasks Summary & Open Button */}
                <View style={styles.cardFooter}>
                  <View style={styles.metaInline}>
                    <ClipboardList size={14} color="#64748b" strokeWidth={2.2} style={{ marginRight: 4 }} />
                    <Text style={styles.tasksText}>
                      <Text
                        style={{
                          fontWeight: '700',
                          color: COLORS.textPrimary,
                        }}
                      >
                        {proj.scheduledTasks} Tasks
                      </Text>{' '}
                      ({proj.completedTasks} completed)
                    </Text>
                  </View>
                  <View style={styles.enterButton}>
                    <Text style={styles.enterButtonText}>Open Workspace</Text>
                    <ArrowRight size={13} color="#dc2626" strokeWidth={2.5} style={{ marginLeft: 4 }} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Dynamic Tab View: CRM ── */}
        {/* ── Dynamic Tab View: REPORTS (DPR) ── */}
        {activeTab === 'reports' && (
          <View style={styles.tasksContainer}>
            <View style={styles.tasksHeaderRow}>
              <View>
                <Text style={styles.tasksSectionTitle}>Daily Site Reports (DPR)</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Site progress reports submitted to PM & Management
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addDprPillBtn}
                activeOpacity={0.8}
                onPress={() => setShowAddDprModal(true)}
              >
                <Plus size={14} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 4 }} />
                <Text style={styles.addDprPillBtnText}>New DPR</Text>
              </TouchableOpacity>
            </View>

            {dprList.map((dpr) => (
              <View key={dpr.id} style={[styles.dprCardBox, SHADOWS.sm]}>
                <View style={styles.dprCardTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <FileText size={16} color="#dc2626" strokeWidth={2.2} />
                    <Text style={styles.dprCardDate}>{dpr.date}</Text>
                  </View>
                  <View
                    style={[
                      styles.dprStatusBadge,
                      dpr.status === 'Approved'
                        ? { backgroundColor: '#dcfce7', borderColor: '#86efac' }
                        : { backgroundColor: '#fef3c7', borderColor: '#fde047' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dprStatusBadgeText,
                        dpr.status === 'Approved' ? { color: '#15803d' } : { color: '#b45309' },
                      ]}
                    >
                      {dpr.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.dprCardShift}>{dpr.shift} • {dpr.weather}</Text>

                <View style={styles.dprSectionBlock}>
                  <Text style={styles.dprSectionHeading}>Work Completed:</Text>
                  <Text style={styles.dprSectionBody}>{dpr.completed}</Text>
                </View>

                <View style={styles.dprSectionBlock}>
                  <Text style={styles.dprSectionHeading}>Work In Progress:</Text>
                  <Text style={styles.dprSectionBody}>{dpr.inProgress}</Text>
                </View>

                {dpr.tomorrow ? (
                  <View style={styles.dprSectionBlock}>
                    <Text style={styles.dprSectionHeading}>Tomorrow Plan:</Text>
                    <Text style={styles.dprSectionBody}>{dpr.tomorrow}</Text>
                  </View>
                ) : null}

                {dpr.pmRemarks ? (
                  <View style={styles.dprRemarksBanner}>
                    <Text style={styles.dprRemarksHeading}>PM Signoff Remarks:</Text>
                    <Text style={styles.dprRemarksBody}>{dpr.pmRemarks}</Text>
                  </View>
                ) : null}

                <View style={styles.dprFooterRow}>
                  <View style={styles.metaInline}>
                    <Users size={12} color="#475569" strokeWidth={2.2} style={{ marginRight: 4 }} />
                    <Text style={styles.dprLabourText}>Labour: {dpr.labourCount} Workers</Text>
                  </View>
                  <View style={styles.metaInline}>
                    <MapPin size={12} color="#dc2626" strokeWidth={2.2} style={{ marginRight: 4 }} />
                    <Text style={styles.dprSiteText}>{dpr.siteName}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}



        {/* ── Dynamic Tab View: FINANCE ── */}
        {activeTab === 'finance' && (
          <View style={styles.financeContainer}>
            <View style={styles.financeHeaderRow}>
              <Text style={styles.tasksSectionTitle}>Bank Accounts & Cashbook</Text>
            </View>

            {/* Indian Bank */}
            <View style={[styles.bankCard, SHADOWS.sm]}>
              <View style={styles.bankTopRow}>
                <View style={styles.bankBrandRow}>
                  <View style={[styles.bankLogoBox, { backgroundColor: '#0284c7' }]}>
                    <Text style={styles.bankLogoText}>IB</Text>
                  </View>
                  <View>
                    <Text style={styles.bankTitle}>Indian Bank</Text>
                    <Text style={styles.bankHolder}>NIVEDHITHA ARUMUGAM</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => Alert.alert('Bank Account', 'Account options for Indian Bank')}>
                  <MoreVertical size={18} color="#94a3b8" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
              <View style={styles.bankDetailsBox}>
                <Text style={styles.bankMeta}>AC: 6256900879</Text>
                <Text style={styles.bankMeta}>IFSC Code: IDIB000P180</Text>
                <Text style={styles.bankMeta}>UPI: Enabled</Text>
                <Text style={styles.bankBalance}>Opening Balance: ₹ 0</Text>
              </View>
            </View>

            {/* Axis Bank */}
            <View style={[styles.bankCard, SHADOWS.sm]}>
              <View style={styles.bankTopRow}>
                <View style={styles.bankBrandRow}>
                  <View style={[styles.bankLogoBox, { backgroundColor: '#9f1239' }]}>
                    <Text style={styles.bankLogoText}>AB</Text>
                  </View>
                  <View>
                    <Text style={styles.bankTitle}>Axis Bank</Text>
                    <Text style={styles.bankHolder}>NIVEDHITHA ARUMUGAM</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => Alert.alert('Bank Account', 'Account options for Axis Bank')}>
                  <MoreVertical size={18} color="#94a3b8" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
              <View style={styles.bankDetailsBox}>
                <Text style={styles.bankMeta}>AC: 923010009777959</Text>
                <Text style={styles.bankMeta}>IFSC Code: UTIB0000851</Text>
                <Text style={styles.bankMeta}>UPI: Enabled</Text>
                <Text style={styles.bankBalance}>Opening Balance: ₹ 0</Text>
              </View>
            </View>

            {/* IDBI */}
            <View style={[styles.bankCard, SHADOWS.sm]}>
              <View style={styles.bankTopRow}>
                <View style={styles.bankBrandRow}>
                  <View style={[styles.bankLogoBox, { backgroundColor: '#0f766e' }]}>
                    <Text style={styles.bankLogoText}>ID</Text>
                  </View>
                  <View>
                    <Text style={styles.bankTitle}>IDBI</Text>
                    <Text style={styles.bankHolder}>BOOSHNAM ASSOCIATES PVT LTD</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => Alert.alert('Bank Account', 'Account options for IDBI')}>
                  <MoreVertical size={18} color="#94a3b8" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
              <View style={styles.bankDetailsBox}>
                <Text style={styles.bankMeta}>AC: 0779102000015905</Text>
                <Text style={styles.bankMeta}>IFSC Code: IBKL0000779</Text>
                <Text style={styles.bankBalance}>Opening Balance: ₹ 0</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.newAccountBtn}
              onPress={() => Alert.alert('New Account', 'Link or create new bank account for Booshnam Associates.')}
            >
              <Plus size={15} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.newAccountBtnText}>NEW ACCOUNT</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* ── The Navigation Bar ("The Nar Bar") ── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('projects')}
        >
          <Building2
            size={22}
            color={activeTab === 'projects' ? '#dc2626' : '#000000'}
            strokeWidth={activeTab === 'projects' ? 2.4 : 1.7}
            opacity={activeTab === 'projects' ? 1 : 0.42}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'projects' && styles.navLabelActive,
            ]}
          >
            Projects
          </Text>
        </TouchableOpacity>



        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('reports')}
        >
          <FileText
            size={22}
            color={activeTab === 'reports' ? '#dc2626' : '#000000'}
            strokeWidth={activeTab === 'reports' ? 2.4 : 1.7}
            opacity={activeTab === 'reports' ? 1 : 0.42}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'reports' && styles.navLabelActive,
            ]}
          >
            Reports (DPR)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('finance')}
        >
          <CreditCard
            size={22}
            color={activeTab === 'finance' ? '#dc2626' : '#000000'}
            strokeWidth={activeTab === 'finance' ? 2.4 : 1.7}
            opacity={activeTab === 'finance' ? 1 : 0.42}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'finance' && styles.navLabelActive,
            ]}
          >
            Finance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => setShowMoreModal(true)}
        >
          <SlidersHorizontal
            size={22}
            color="#000000"
            strokeWidth={1.7}
            opacity={0.42}
          />
          <Text style={styles.navLabel}>
            More
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Live Photo Attendance Punch Modal ── */}
      <Modal
        visible={attendanceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAttendanceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header (Red & White Theme) */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <View style={styles.modalHeaderBadge}>
                  <Text style={styles.modalHeaderBadgeText}>LIVE VERIFICATION</Text>
                </View>
                <Text style={styles.modalTitle}>Mark Attendance</Text>
                <Text style={styles.modalSubTitle}>
                  Live Selfie Proof & GPS Verification
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAttendanceModalVisible(false)}
              >
                <X size={18} color="#dc2626" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollBody}>
              {/* Staff Info Card */}
              <View style={styles.modalStaffCard}>
                <View style={styles.modalStaffIcon}>
                  <HardHat size={22} color="#dc2626" strokeWidth={2.2} />
                </View>
                <View style={styles.modalStaffDetails}>
                  <Text style={styles.modalStaffName}>{user.name || 'Velmurugan'}</Text>
                  <View style={styles.metaInline}>
                    <MapPin size={11} color="#dc2626" strokeWidth={2.2} style={{ marginRight: 4 }} />
                    <Text style={styles.modalStaffSub}>
                      {user.role || (isSiteStaff ? 'Site Engineer' : 'Office Staff')} • {assignedSiteName}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Punch IN / OUT Switcher */}
              <View style={styles.punchTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.punchTypeBtn,
                    punchType === 'IN' && styles.punchTypeBtnInActive,
                  ]}
                  onPress={() => setPunchType('IN')}
                >
                  <LogIn size={15} color={punchType === 'IN' ? '#15803d' : '#64748b'} strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.punchTypeBtnText,
                      punchType === 'IN' && styles.punchTypeBtnTextInActive,
                    ]}
                  >
                    Punch IN (Shift Start)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.punchTypeBtn,
                    punchType === 'OUT' && styles.punchTypeBtnOutActive,
                  ]}
                  onPress={() => setPunchType('OUT')}
                >
                  <LogOut size={15} color={punchType === 'OUT' ? '#b91c1c' : '#64748b'} strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.punchTypeBtnText,
                      punchType === 'OUT' && styles.punchTypeBtnTextOutActive,
                    ]}
                  >
                    Punch OUT (Shift End)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Live Camera Viewport Preview */}
              <View style={styles.cameraBox}>
                <Image
                  source={{ uri: livePhotoUri }}
                  style={styles.cameraPreviewImg}
                />
                <View style={styles.cameraFrameOverlay}>
                  <View style={styles.cameraCornerTL} />
                  <View style={styles.cameraCornerTR} />
                  <View style={styles.cameraCornerBL} />
                  <View style={styles.cameraCornerBR} />
                </View>
                <View style={styles.cameraWatermark}>
                  <View style={[styles.watermarkPulseDot, { backgroundColor: punchType === 'IN' ? '#22c55e' : '#ef4444' }]} />
                  <Text style={styles.cameraWatermarkText}>
                    LIVE PROOF • {formatTime12h()} • {isSiteStaff ? 'GEOFENCED SITE' : 'OFFICE'}
                  </Text>
                </View>
              </View>

              {/* Camera Action Buttons (Open Camera / Upload Photo / Switch) */}
              <View style={styles.cameraActionRow}>
                <TouchableOpacity
                  style={styles.cameraPrimaryBtn}
                  activeOpacity={0.8}
                  onPress={handleOpenCamera}
                >
                  <Camera size={16} color="#ffffff" strokeWidth={2.4} style={{ marginRight: 6 }} />
                  <Text style={styles.cameraPrimaryBtnText}>Open Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cameraSecondaryBtn}
                  activeOpacity={0.8}
                  onPress={handleUploadGallery}
                >
                  <Upload size={15} color="#dc2626" strokeWidth={2.4} style={{ marginRight: 6 }} />
                  <Text style={styles.cameraSecondaryBtnText}>Upload Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cameraCycleBtn}
                  activeOpacity={0.8}
                  onPress={handleCaptureLiveSelfie}
                >
                  <RefreshCw size={15} color="#dc2626" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              {/* Geofence & Location Telemetry Strip */}
              <View style={styles.telemetryCard}>
                <View style={styles.telemetryRow}>
                  <View style={styles.metaInline}>
                    <MapPin size={13} color="#dc2626" strokeWidth={2.2} style={{ marginRight: 6 }} />
                    <Text style={styles.telemetryLabel}>{isSiteStaff ? 'Site Location:' : 'Office Location:'}</Text>
                  </View>
                  <Text style={styles.telemetryValue}>{assignedSiteName}</Text>
                </View>
                <View style={styles.telemetryRow}>
                  <View style={styles.metaInline}>
                    <CheckCircle2 size={13} color="#16a34a" strokeWidth={2.5} style={{ marginRight: 6 }} />
                    <Text style={styles.telemetryLabel}>GPS Geofence:</Text>
                  </View>
                  <Text style={styles.telemetryValueGreen}>
                    {isSiteStaff ? '12.4m (Site Verified & Geofenced)' : '11.8m • Inside Office Geofence (Pammal)'}
                  </Text>
                </View>
                <View style={styles.telemetryRow}>
                  <View style={styles.metaInline}>
                    <ShieldCheck size={13} color="#dc2626" strokeWidth={2.2} style={{ marginRight: 6 }} />
                    <Text style={styles.telemetryLabel}>Portal Sync:</Text>
                  </View>
                  <Text style={styles.telemetryValue}>Super Admin & Admin Dashboards</Text>
                </View>
              </View>

              {/* Notes Input */}
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>{isSiteStaff ? 'Site Duty Notes (Optional):' : 'Office Notes (Optional):'}</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder={isSiteStaff ? 'e.g. Morning column pour inspection' : 'e.g. Accounts reconciliation & audit'}
                  placeholderTextColor="#94a3b8"
                  value={punchNotes}
                  onChangeText={setPunchNotes}
                />
              </View>

              {/* Submit Punch Button */}
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                activeOpacity={0.85}
                onPress={handlePunchSubmit}
              >
                <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 8 }} />
                <Text style={styles.modalSubmitBtnText}>MARK ATTENDANCE</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add New DPR Modal ── */}
      <Modal
        visible={showAddDprModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddDprModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Submit Daily Progress Report (DPR)</Text>
                <Text style={styles.modalSubTitle}>{assignedSiteName} • Today's Site Log</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowAddDprModal(false)}
              >
                <X size={18} color="#475569" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollBody}>
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Work Completed Today *</Text>
                <TextInput
                  style={[styles.notesInput, { height: 64, textAlignVertical: 'top' }]}
                  placeholder="e.g. Completed concrete casting for grid 4 column pedestals..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  value={dprForm.completed}
                  onChangeText={(val) => setDprForm((prev) => ({ ...prev, completed: val }))}
                />
              </View>

              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Work In Progress *</Text>
                <TextInput
                  style={[styles.notesInput, { height: 64, textAlignVertical: 'top' }]}
                  placeholder="e.g. Shuttering box assembling for eastern beam span..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  value={dprForm.inProgress}
                  onChangeText={(val) => setDprForm((prev) => ({ ...prev, inProgress: val }))}
                />
              </View>

              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Tomorrow Target / Plan</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="e.g. Level check & de-shuttering test cubes..."
                  placeholderTextColor="#94a3b8"
                  value={dprForm.tomorrow}
                  onChangeText={(val) => setDprForm((prev) => ({ ...prev, tomorrow: val }))}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notesLabel}>Labour Count (Workers)</Text>
                  <TextInput
                    style={styles.notesInput}
                    keyboardType="numeric"
                    placeholder="24"
                    placeholderTextColor="#94a3b8"
                    value={dprForm.labourCount}
                    onChangeText={(val) => setDprForm((prev) => ({ ...prev, labourCount: val }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notesLabel}>Weather Condition</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Sunny (32°C)"
                    placeholderTextColor="#94a3b8"
                    value={dprForm.weather}
                    onChangeText={(val) => setDprForm((prev) => ({ ...prev, weather: val }))}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                activeOpacity={0.85}
                onPress={() => {
                  if (!dprForm.completed.trim()) {
                    Alert.alert('Incomplete DPR', 'Please enter work completed today.');
                    return;
                  }
                  const newReport = {
                    id: `dpr-${Date.now()}`,
                    date: 'Today',
                    shift: 'Day Shift (08:00 AM - 05:30 PM)',
                    weather: dprForm.weather || '☀️ Sunny (32°C)',
                    completed: dprForm.completed,
                    inProgress: dprForm.inProgress || 'Civil monitoring & inspection',
                    tomorrow: dprForm.tomorrow || 'Continue site execution plan',
                    labourCount: parseInt(dprForm.labourCount, 10) || 20,
                    status: 'Submitted',
                    siteName: assignedSiteName,
                  };
                  setDprList((prev) => [newReport, ...prev]);
                  setDprForm({ completed: '', inProgress: '', tomorrow: '', labourCount: '24', weather: 'Sunny (32°C)' });
                  setShowAddDprModal(false);
                  Alert.alert('DPR Submitted', 'Daily Progress Report submitted to Project Manager & Super Admin.');
                }}
              >
                <Text style={styles.modalSubmitBtnText}>SUBMIT DPR REPORT</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Attendance Log History Modal (Per-User) ── */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Attendance Punch History</Text>
                <Text style={styles.modalSubTitle}>{user.name} • {user.role || 'Site Engineer'}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowHistoryModal(false)}
              >
                <X size={18} color="#dc2626" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollBody}>
              {getStaffAttendanceHistory(userKey).length === 0 ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <HardHat size={36} color="#94a3b8" strokeWidth={1.5} />
                  <Text style={{ fontSize: 13, color: '#64748b', marginTop: 10, fontWeight: '600' }}>
                    No punches recorded yet for {user.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Tap 'Mark Attendance' to punch in with selfie camera.
                  </Text>
                </View>
              ) : (
                <>
                  {getStaffAttendanceHistory(userKey).map((punch) => (
                    <View key={punch.id} style={styles.historyCard}>
                      <Image source={{ uri: punch.verificationPhoto }} style={styles.historyThumb} />
                      <View style={styles.historyInfo}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.historyDate}>{punch.date}</Text>
                          <View style={[styles.historyTypeBadge, punch.punchType === 'IN' ? styles.badgeIn : styles.badgeOut]}>
                            <Text style={[styles.historyTypeText, punch.punchType === 'IN' ? styles.badgeInText : styles.badgeOutText]}>
                              {punch.punchType === 'IN' ? 'PUNCH IN' : 'PUNCH OUT'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.historyTime}>
                          Clock: {punch.clockInTime} {punch.clockOutTime ? `• Out: ${punch.clockOutTime}` : ''}
                        </Text>
                        <View style={styles.metaInline}>
                          <MapPin size={11} color="#dc2626" strokeWidth={2.2} style={{ marginRight: 3 }} />
                          <Text style={styles.historySite}>
                            {punch.locationName} ({punch.distanceMeters.toFixed(1)}m Inside)
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Reset / Simulate Next Day Action */}
                  <TouchableOpacity
                    style={styles.resetAttendanceBtn}
                    activeOpacity={0.8}
                    onPress={handleResetAttendance}
                  >
                    <RotateCcw size={14} color="#dc2626" strokeWidth={2.2} style={{ marginRight: 6 }} />
                    <Text style={styles.resetAttendanceBtnText}>Simulate Next Day / Reset Attendance</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── More / Governance Sheet Modal ── */}
      <Modal
        visible={showMoreModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Governance & Operations</Text>
                <Text style={styles.modalSubTitle}>Booshnam Construction Management Platform</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowMoreModal(false)}
              >
                <X size={18} color="#475569" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollBody}>
              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreModal(false);
                  Alert.alert('Documents & Drawings', 'Viewing 8 approved blueprint drawings for Runway Site.');
                }}
              >
                <View style={[styles.moreMenuIcon, { backgroundColor: '#eff6ff' }]}>
                  <FileText size={20} color="#2563eb" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moreMenuTitle}>Documents & Drawings</Text>
                  <Text style={styles.moreMenuSub}>CAD drawings, structural vetting specs, soil test reports</Text>
                </View>
                <ArrowRight size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreModal(false);
                  Alert.alert('Approvals & Signoffs', '4 pending client approvals & work order signoffs.');
                }}
              >
                <View style={[styles.moreMenuIcon, { backgroundColor: '#f0fdf4' }]}>
                  <CheckCircle2 size={20} color="#16a34a" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moreMenuTitle}>Approvals</Text>
                  <Text style={styles.moreMenuSub}>Material indent approvals, DPR signoffs, work orders</Text>
                </View>
                <ArrowRight size={16} color="#94a3b8" />
              </TouchableOpacity>



              {isAdmin && onOpenUserManagement && (
                <TouchableOpacity
                  style={styles.moreMenuItem}
                  onPress={() => {
                    setShowMoreModal(false);
                    onOpenUserManagement();
                  }}
                >
                  <View style={[styles.moreMenuIcon, { backgroundColor: '#fef3c7' }]}>
                    <Users size={20} color="#d97706" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.moreMenuTitle}>User & Role Management</Text>
                    <Text style={styles.moreMenuSub}>Manage staff profiles, permissions, passwords</Text>
                  </View>
                  <ArrowRight size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.moreMenuItem, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 14 }]}
                onPress={() => {
                  setShowMoreModal(false);
                  onLogout();
                }}
              >
                <View style={[styles.moreMenuIcon, { backgroundColor: '#fef2f2' }]}>
                  <LogOut size={20} color="#dc2626" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.moreMenuTitle, { color: '#dc2626' }]}>Sign Out</Text>
                  <Text style={styles.moreMenuSub}>Log out of {user.name} ({user.role || 'Site Engineer'})</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Header Bar ──
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 6 : 32) : 12,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hamburgerBtn: {
    paddingRight: 10,
    paddingVertical: 4,
  },
  hamburgerIcon: {
    fontSize: 22,
    color: '#1e293b',
    fontWeight: '700',
  },
  headerFullLogo: {
    height: 32,
    width: 145,
    resizeMode: 'contain',
  },
  companyTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  brandTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
    maxWidth: 160,
  },
  companyBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 6,
  },
  companyBadgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  switchChevron: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 4,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    position: 'relative',
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerBellWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBellTopRing: {
    position: 'absolute',
    top: 0.5,
    alignSelf: 'center',
    width: 5,
    height: 3.5,
    borderWidth: 1.4,
    borderRadius: 2,
  },
  headerBellBody: {
    width: 15,
    height: 12,
    borderWidth: 1.8,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 2.5,
    borderBottomRightRadius: 2.5,
    marginTop: 2.5,
  },
  headerBellClapper: {
    width: 3.5,
    height: 2.5,
    borderRadius: 1.2,
    marginTop: -0.5,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 7.5,
    fontWeight: '900',
  },
  headerMsgWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerMsgBubble: {
    width: 16,
    height: 12,
    borderRadius: 3.5,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerMsgDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.8,
  },
  headerMsgDot: {
    width: 1.8,
    height: 1.8,
    borderRadius: 0.9,
  },
  headerMsgTail: {
    position: 'absolute',
    bottom: -3.8,
    left: 2.5,
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 1.5,
    borderTopWidth: 3.5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  msgBadgeDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#3b82f6',
    borderWidth: 1.2,
    borderColor: '#ffffff',
  },
  headerLogoutWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerLogoutFrame: {
    width: 11,
    height: 15,
    borderWidth: 1.8,
    borderRightWidth: 0,
    borderTopLeftRadius: 2.5,
    borderBottomLeftRadius: 2.5,
    position: 'absolute',
    left: 2,
  },
  headerLogoutArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 2,
  },
  headerLogoutArrowLine: {
    width: 7,
    height: 1.8,
    borderRadius: 1,
  },
  headerLogoutArrowHead: {
    width: 4.5,
    height: 4.5,
    borderTopWidth: 1.8,
    borderRightWidth: 1.8,
    transform: [{ rotate: '45deg' }],
    marginLeft: -2,
  },

  // ── Scroll Content ──
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },

  // ── Pending Strip ──
  pendingStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  pendingCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pendingCardHeader: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.3,
  },
  pendingCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  pendingCardSub: {
    fontSize: 8.5,
    color: '#64748b',
    fontWeight: '600',
  },
  pendingCardNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },

  // ── Attendance Card (Red & White Theme) ──
  attendanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#fee2e2',
  },
  attendanceCardIn: {
    borderColor: '#86efac',
    backgroundColor: '#ffffff',
  },
  attendanceCardOut: {
    borderColor: '#fca5a5',
    backgroundColor: '#ffffff',
  },
  attendanceCardTop: {
    width: '100%',
  },
  attendanceStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginRight: 8,
  },
  attendanceStatusBadgePending: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  attendanceStatusBadgeIn: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  attendanceStatusBadgeOut: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  attendanceStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  attendanceStatusDotPending: {
    backgroundColor: '#ef4444',
  },
  attendanceStatusDotIn: {
    backgroundColor: '#16a34a',
  },
  attendanceStatusDotOut: {
    backgroundColor: '#dc2626',
  },
  attendanceStatusText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  attendanceStatusTextPending: {
    color: '#991b1b',
  },
  attendanceStatusTextIn: {
    color: '#15803d',
    fontWeight: '800',
  },
  attendanceStatusTextOut: {
    color: '#b91c1c',
    fontWeight: '800',
  },
  attendancePillTag: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  attendancePillTagPending: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  attendancePillTagIn: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  attendancePillTagOut: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  attendancePillTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  attendancePillTagTextPending: {
    color: '#64748b',
  },
  attendancePillTagTextIn: {
    color: '#15803d',
  },
  attendancePillTagTextOut: {
    color: '#b91c1c',
  },
  attendanceProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarTouchable: {
    position: 'relative',
    marginRight: 12,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#dc2626',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  attendanceAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#dc2626',
    backgroundColor: '#f1f5f9',
  },
  attendanceProfileInfo: {
    flex: 1,
  },
  attendanceStaffName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  attendanceStaffRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 1,
  },
  attendanceStaffMeta: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  attendanceSiteLocation: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  attendancePunchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 11,
    gap: 8,
  },
  attendancePunchBtnPending: {
    backgroundColor: '#dc2626',
  },
  attendancePunchBtnIn: {
    backgroundColor: '#dc2626',
  },
  attendancePunchBtnOut: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  attendancePunchBtnIcon: {
    fontSize: 14,
  },
  attendancePunchBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ── Vector Monochrome Icons ──
  monoFilterWrap: {
    width: 18,
    height: 18,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  monoFilterTrack: {
    height: 4,
    justifyContent: 'center',
    position: 'relative',
  },
  monoFilterLine: {
    height: 1.8,
    width: '100%',
    borderRadius: 1,
  },
  monoFilterKnob: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
  },
  monoSearchWrap: {
    width: 18,
    height: 18,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monoSearchCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    position: 'absolute',
    top: 1,
    left: 1,
  },
  monoSearchHandle: {
    width: 6,
    height: 2,
    borderRadius: 1,
    position: 'absolute',
    bottom: 2.5,
    right: 1,
    transform: [{ rotate: '45deg' }],
  },

  // ── Filter Toolbar Row (Monochrome Black & White) ──
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  filterDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#0f172a',
  },
  filterDropdownText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  filterIconBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProjectBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#0f172a',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProjectBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ── Live Photo Attendance Modal (Red & White Theme) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
    borderTopWidth: 4,
    borderTopColor: '#dc2626',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
  },
  modalHeaderTitleBox: {
    flex: 1,
    paddingRight: 10,
  },
  modalHeaderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 4,
  },
  modalHeaderBadgeText: {
    color: '#dc2626',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubTitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  modalCloseBtnText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '700',
  },
  modalScrollBody: {
    padding: 16,
  },
  modalStaffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#fee2e2',
  },
  modalStaffIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  modalStaffIconText: {
    fontSize: 20,
  },
  modalStaffDetails: {
    flex: 1,
  },
  modalStaffName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalStaffSub: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  punchTypeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  punchTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  punchTypeBtnInActive: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  punchTypeBtnOutActive: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  punchTypeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  punchTypeBtnTextInActive: {
    color: '#15803d',
    fontWeight: '800',
  },
  punchTypeBtnTextOutActive: {
    color: '#b91c1c',
    fontWeight: '800',
  },
  cameraBox: {
    width: '100%',
    height: 230,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#fee2e2',
  },
  cameraPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cameraFrameOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    pointerEvents: 'none',
  },
  cameraCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderColor: '#dc2626',
  },
  cameraCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderColor: '#dc2626',
  },
  cameraCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderColor: '#dc2626',
  },
  cameraCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderColor: '#dc2626',
  },
  cameraWatermark: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  cameraWatermarkText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cameraActionRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 8,
    alignItems: 'center',
  },
  cameraPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 10,
  },
  cameraPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  cameraSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 10,
  },
  cameraSecondaryBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '800',
  },
  cameraCycleBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#fee2e2',
    gap: 8,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  telemetryValue: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '700',
  },
  telemetryValueGreen: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '800',
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: '#0f172a',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  resetAttendanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 6,
  },
  resetAttendanceBtnText: {
    color: '#dc2626',
    fontSize: 11.5,
    fontWeight: '800',
  },

  // ── Admin Control Banner ──
  adminBannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  adminBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  adminIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  adminIconText: {
    fontSize: 20,
  },
  adminBannerInfo: {
    flex: 1,
  },
  adminTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  adminBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  adminControlBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminControlBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  adminBannerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  adminManageBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminManageBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ── Project Cards ──
  projectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  initialBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  codeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  clientText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  locRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  locText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  valueText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tasksText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  enterButton: {
    backgroundColor: COLORS.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  enterButtonText: {
    color: COLORS.primaryDark,
    fontSize: 11.5,
    fontWeight: '700',
  },

  // ── CRM Tab Styles ──
  crmContainer: {
    marginBottom: 10,
  },
  crmSubTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    marginBottom: 14,
  },
  crmSubTabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginRight: 10,
  },
  crmSubTabBtnActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#5850EC',
  },
  crmSubTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  crmSubTabTextActive: {
    color: '#5850EC',
    fontWeight: '800',
  },
  crmCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  crmCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  crmLeadCategory: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  crmAssigned: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  crmClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  crmClientIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  crmClientName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  crmCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  crmPriorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  crmPriorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },
  crmStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  crmStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  crmCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crmCallIcon: {
    fontSize: 14,
  },

  // ── Tasks Tab Styles ──
  tasksContainer: {
    marginBottom: 10,
  },
  tasksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tasksSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  tasksCountBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tasksCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskCardCompleted: {
    opacity: 0.6,
    backgroundColor: '#f8fafc',
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskCheckboxChecked: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
    flexWrap: 'wrap',
  },
  taskProject: {
    fontSize: 11,
    color: '#64748b',
  },
  taskPriorityTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  taskPriorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  taskDue: {
    fontSize: 10.5,
    color: '#64748b',
  },

  // ── Finance Tab Styles ──
  financeContainer: {
    marginBottom: 10,
  },
  financeHeaderRow: {
    marginBottom: 12,
  },
  bankCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bankTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bankBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bankLogoText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 12,
  },
  bankTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  bankHolder: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  bankMenuDots: {
    fontSize: 18,
    color: '#94a3b8',
  },
  bankDetailsBox: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bankMeta: {
    fontSize: 11.5,
    color: '#475569',
    marginBottom: 2,
  },
  bankBalance: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  newAccountBtn: {
    backgroundColor: '#5850EC',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  newAccountBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Chats Tab Styles ──
  chatsContainer: {
    marginBottom: 10,
  },
  chatChannelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chatAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  chatContent: {
    flex: 1,
  },
  chatTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  chatName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  chatTime: {
    fontSize: 10.5,
    color: '#94a3b8',
  },
  chatLastMsg: {
    fontSize: 12,
    color: '#64748b',
  },
  chatUnreadBadge: {
    backgroundColor: '#5850EC',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chatUnreadText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },

  // ── The Navigation Bar ("Nar Bar") ──
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  navIconBox: {
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
    opacity: 0.45,
    marginTop: 2,
  },
  navLabelActive: {
    color: '#dc2626',
    fontWeight: '800',
    opacity: 1,
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '900',
  },

  // ── Attendance Active State & Icon Btn ──
  attendanceStatusBadgeActive: {
    backgroundColor: '#dcfce7',
  },
  attendanceStatusDotActive: {
    backgroundColor: '#16a34a',
  },
  attendanceStatusTextActive: {
    color: '#15803d',
  },
  attendanceLogIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Task Dept Badge ──
  deptBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deptBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
  },

  // ── DPR Report Styles ──
  addDprPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addDprPillBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  dprCardBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dprCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dprCardDate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  dprStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  dprStatusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  dprCardShift: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 10,
  },
  dprSectionBlock: {
    marginBottom: 8,
  },
  dprSectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 2,
  },
  dprSectionBody: {
    fontSize: 12,
    color: '#0f172a',
    lineHeight: 17,
  },
  dprRemarksBanner: {
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 8,
  },
  dprRemarksHeading: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803d',
    marginBottom: 2,
  },
  dprRemarksBody: {
    fontSize: 11.5,
    color: '#166534',
    fontWeight: '600',
  },
  dprFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dprLabourText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  dprSiteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },

  // ── Attendance History Log Styles ──
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#e2e8f0',
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeIn: {
    backgroundColor: '#dcfce7',
  },
  badgeOut: {
    backgroundColor: '#fee2e2',
  },
  historyTypeText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  badgeInText: {
    color: '#15803d',
  },
  badgeOutText: {
    color: '#b91c1c',
  },
  historyTime: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    fontWeight: '600',
  },
  historySite: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },

  // ── More Governance Menu Item Styles ──
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  moreMenuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moreMenuTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  moreMenuSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
