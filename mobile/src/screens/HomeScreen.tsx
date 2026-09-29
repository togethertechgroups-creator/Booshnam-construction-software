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
} from 'react-native';
import { COLORS, SHADOWS } from '../theme';
import { Project, User } from '../types';
import { DEMO_PROJECTS } from '../mockData';

const BOOSHNAM_ICON = require('../assets/booshnam_icon.png');

interface HomeScreenProps {
  user: User;
  onOpenProject: (project: Project) => void;
  onOpenUserManagement?: () => void;
  onLogout: () => void;
}

type BottomNavTab = 'crm' | 'projects' | 'tasks' | 'finance' | 'chats';

// ── Vector Monochrome Black Navbar Icons ──
const NavCrmIcon = ({ active }: { active: boolean }) => {
  const color = '#000000';
  const opacity = active ? 1 : 0.42;
  return (
    <View style={[styles.navIconBox, { opacity }]}>
      <View style={[styles.crmIconBody, { borderColor: color }]}>
        <View style={[styles.crmIconClip, { backgroundColor: color }]} />
        <View style={[styles.crmIconLine, { width: 9, backgroundColor: color }]} />
        <View style={[styles.crmIconLine, { width: 9, backgroundColor: color }]} />
        <View style={[styles.crmIconLine, { width: 6, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const NavProjectsIcon = ({ active }: { active: boolean }) => {
  const color = '#000000';
  const opacity = active ? 1 : 0.42;
  return (
    <View style={[styles.navIconBox, { opacity }]}>
      <View style={styles.projectsIconRow}>
        <View style={[styles.projectsMainTower, { borderColor: color }]}>
          <View style={styles.projectsWindowRow}>
            <View style={[styles.projectsWindow, { backgroundColor: color }]} />
            <View style={[styles.projectsWindow, { backgroundColor: color }]} />
          </View>
          <View style={styles.projectsWindowRow}>
            <View style={[styles.projectsWindow, { backgroundColor: color }]} />
            <View style={[styles.projectsWindow, { backgroundColor: color }]} />
          </View>
          <View style={[styles.projectsDoor, { backgroundColor: color }]} />
        </View>
        <View style={[styles.projectsSideWing, { borderColor: color }]}>
          <View style={[styles.projectsWindow, { backgroundColor: color, marginTop: 2 }]} />
          <View style={[styles.projectsWindow, { backgroundColor: color, marginTop: 2 }]} />
        </View>
      </View>
    </View>
  );
};

const NavTasksIcon = ({ active }: { active: boolean }) => {
  const color = '#000000';
  const opacity = active ? 1 : 0.42;
  return (
    <View style={[styles.navIconBox, { opacity }]}>
      <View style={[styles.tasksIconBox, { borderColor: color }]}>
        <Text style={[styles.tasksIconCheck, { color }]}>✓</Text>
      </View>
    </View>
  );
};

const NavFinanceIcon = ({ active }: { active: boolean }) => {
  const color = '#000000';
  const opacity = active ? 1 : 0.42;
  return (
    <View style={[styles.navIconBox, { opacity }]}>
      <View style={[styles.financeIconCard, { borderColor: color }]}>
        <View style={[styles.financeIconStripe, { backgroundColor: color }]} />
        <View style={styles.financeIconBottomRow}>
          <View style={[styles.financeIconChip, { borderColor: color }]} />
          <Text style={[styles.financeRupeeText, { color }]}>₹</Text>
        </View>
      </View>
    </View>
  );
};

const NavChatsIcon = ({ active }: { active: boolean }) => {
  const color = '#000000';
  const opacity = active ? 1 : 0.42;
  return (
    <View style={[styles.navIconBox, { opacity }]}>
      <View style={[styles.chatsIconBubble, { borderColor: color }]}>
        <View style={styles.chatsIconDotsRow}>
          <View style={[styles.chatsIconDot, { backgroundColor: color }]} />
          <View style={[styles.chatsIconDot, { backgroundColor: color }]} />
          <View style={[styles.chatsIconDot, { backgroundColor: color }]} />
        </View>
        <View style={[styles.chatsIconTail, { borderTopColor: color }]} />
      </View>
    </View>
  );
};

// ── Vector Header Icons ──
const HeaderBellIcon = ({ color = '#0f172a' }: { color?: string }) => (
  <View style={styles.headerBellWrap}>
    <View style={[styles.headerBellTopRing, { borderColor: color }]} />
    <View style={[styles.headerBellBody, { borderColor: color }]} />
    <View style={[styles.headerBellClapper, { backgroundColor: color }]} />
  </View>
);

const HeaderPcIcon = ({ color = '#0f172a' }: { color?: string }) => (
  <View style={styles.headerPcWrap}>
    <View style={[styles.headerPcScreen, { borderColor: color }]} />
    <View style={[styles.headerPcNeck, { backgroundColor: color }]} />
    <View style={[styles.headerPcBase, { backgroundColor: color }]} />
  </View>
);

const HeaderLogoutIcon = ({ color = '#0f172a' }: { color?: string }) => (
  <View style={styles.headerLogoutWrap}>
    <View style={[styles.headerLogoutFrame, { borderColor: color }]} />
    <View style={styles.headerLogoutArrowRow}>
      <View style={[styles.headerLogoutArrowLine, { backgroundColor: color }]} />
      <View style={[styles.headerLogoutArrowHead, { borderTopColor: color, borderRightColor: color }]} />
    </View>
  </View>
);

// ── Vector Quick Action Icons ──
const QuickDprIcon = ({ color = '#0284c7' }: { color?: string }) => (
  <View style={styles.quickIconWrap}>
    <View style={[styles.quickDprBody, { borderColor: color }]}>
      <View style={[styles.quickDprClip, { backgroundColor: color }]} />
      <View style={[styles.quickDprLine, { width: 10, backgroundColor: color }]} />
      <View style={[styles.quickDprLine, { width: 10, backgroundColor: color }]} />
      <View style={[styles.quickDprLine, { width: 6, backgroundColor: color }]} />
    </View>
  </View>
);

const QuickClockIcon = ({ color = '#0284c7' }: { color?: string }) => (
  <View style={styles.quickIconWrap}>
    <View style={[styles.quickClockCircle, { borderColor: color }]}>
      <View style={[styles.quickClockHourHand, { backgroundColor: color }]} />
      <View style={[styles.quickClockMinHand, { backgroundColor: color }]} />
      <View style={[styles.quickClockCenterDot, { backgroundColor: color }]} />
    </View>
  </View>
);

const QuickWalletIcon = ({ color = '#7c3aed' }: { color?: string }) => (
  <View style={styles.quickIconWrap}>
    <View style={[styles.quickWalletBody, { borderColor: color }]}>
      <View style={[styles.quickWalletFlap, { borderColor: color }]} />
      <View style={[styles.quickWalletDot, { backgroundColor: color }]} />
    </View>
  </View>
);

const QuickPlayIcon = ({ color = '#e11d48' }: { color?: string }) => (
  <View style={styles.quickIconWrap}>
    <View style={[styles.quickPlayTriangle, { borderLeftColor: color }]} />
  </View>
);

export default function HomeScreen({
  user,
  onOpenProject,
  onOpenUserManagement,
  onLogout,
}: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<BottomNavTab>('projects');
  const [crmSubTab, setCrmSubTab] = useState<'lead' | 'quotation'>('lead');

  const isAdmin =
    user.role_code === 'SUPER_ADMIN' ||
    user.role_code === 'ADMIN' ||
    user.allowedPages?.includes('users_admin');

  // Interactive Task List State
  const [myTasks, setMyTasks] = useState([
    { id: 't1', title: 'Site Boundary & SBC Soil Report Verification', project: 'Cumbum, Theni', status: 'Pending', priority: 'High', due: 'Today' },
    { id: 't2', title: 'Inspect TMT 12mm Rebar Steel Delivery & Mill Test Cert', project: 'Metro Viaduct', status: 'Pending', priority: 'Urgent', due: 'Tomorrow' },
    { id: 't3', title: 'Submit Daily Progress Report (DPR) for Pier P14', project: 'Metro Viaduct', status: 'Pending', priority: 'Medium', due: '29 Sep' },
    { id: 't4', title: 'Cast Column Starter 1:1.5:3 Concrete Pour', project: 'Greenfield Villa', status: 'Completed', priority: 'Normal', due: 'Done' },
  ]);

  const toggleTask = (id: string) => {
    setMyTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t))
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Top Header Bar (Booshnam Logo + Company + Vector Icons) ── */}
      <View style={[styles.header, SHADOWS.sm]}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity style={styles.hamburgerBtn} activeOpacity={0.7}>
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>

          <Image
            source={BOOSHNAM_ICON}
            style={styles.headerLogoImg}
            resizeMode="contain"
          />

          <View style={styles.companyTitleWrap}>
            <Text style={styles.brandTitle} numberOfLines={1}>
              Booshnam Associates
            </Text>
            <View style={styles.companyBadge}>
              <Text style={styles.companyBadgeText}>PRO</Text>
            </View>
            <Text style={styles.switchChevron}>▾</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Notifications', 'You have 99+ pending site alerts & DPR updates.')}
          >
            <HeaderBellIcon color="#0f172a" />
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>99+</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.desktopBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Desktop Web Sync', 'Live synchronized with Booshnam Web Platform on port 5173.')}
          >
            <HeaderPcIcon color="#0f172a" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <HeaderLogoutIcon color="#0f172a" />
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

        {/* ── Action Quick Circles Row ── */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionItem}
            activeOpacity={0.75}
            onPress={() => setActiveTab('projects')}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: '#e0f2fe' }]}>
              <QuickDprIcon color="#0284c7" />
            </View>
            <Text style={styles.quickActionText}>DPR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            activeOpacity={0.75}
            onPress={() => setActiveTab('tasks')}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: '#e0f2fe' }]}>
              <QuickClockIcon color="#0284c7" />
            </View>
            <Text style={styles.quickActionText}>Timesheet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            activeOpacity={0.75}
            onPress={() => setActiveTab('finance')}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: '#f3e8ff' }]}>
              <QuickWalletIcon color="#7c3aed" />
            </View>
            <Text style={styles.quickActionText}>My Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            activeOpacity={0.75}
            onPress={() => Alert.alert('Help & Guidance', 'Booshnam Mobile App Tutorial & Workflow Guides.')}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: '#ffe4e6' }]}>
              <QuickPlayIcon color="#e11d48" />
            </View>
            <Text style={styles.quickActionText}>Help Videos</Text>
          </TouchableOpacity>
        </View>

        {/* ── Filter / Search / Action Toolbar ── */}
        <View style={styles.filterBarRow}>
          <View style={styles.filterDropdownPill}>
            <Text style={styles.filterDropdownText}>All ({DEMO_PROJECTS.length}) ▾</Text>
          </View>
          <TouchableOpacity
            style={styles.filterIconBtn}
            onPress={() => Alert.alert('Filters', 'Filtering active projects and department scopes.')}
          >
            <Text style={styles.filterBtnEmoji}>🎛️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterIconBtn}
            onPress={() => Alert.alert('Search', 'Search projects, tasks, materials, or ledgers.')}
          >
            <Text style={styles.filterBtnEmoji}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addProjectBtn}
            onPress={() => Alert.alert('New Project', 'Provision new site workspace (Admin / PM privilege).')}
          >
            <Text style={styles.addProjectBtnText}>+ Project</Text>
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
                    <Text style={styles.adminIconText}>👥</Text>
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
                  <Text style={styles.adminManageBtnText}>Manage Users & Permissions  ⚙️</Text>
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
                      <Text style={styles.clientText}>👤 {proj.client_name}</Text>
                    </View>
                  </View>

                  <View style={styles.statusPill}>
                    <View style={styles.greenDot} />
                    <Text style={styles.statusText}>{proj.status}</Text>
                  </View>
                </View>

                {/* Location & Value row */}
                <View style={styles.locRow}>
                  <Text style={styles.locText}>📍 {proj.site_location}</Text>
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
                  <Text style={styles.tasksText}>
                    📋{' '}
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
                  <View style={styles.enterButton}>
                    <Text style={styles.enterButtonText}>Open Workspace ➔</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Dynamic Tab View: CRM ── */}
        {activeTab === 'crm' && (
          <View style={styles.crmContainer}>
            {/* Sub-tabs: Lead / Quotation */}
            <View style={styles.crmSubTabsRow}>
              <TouchableOpacity
                style={[
                  styles.crmSubTabBtn,
                  crmSubTab === 'lead' && styles.crmSubTabBtnActive,
                ]}
                onPress={() => setCrmSubTab('lead')}
              >
                <Text
                  style={[
                    styles.crmSubTabText,
                    crmSubTab === 'lead' && styles.crmSubTabTextActive,
                  ]}
                >
                  Lead
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.crmSubTabBtn,
                  crmSubTab === 'quotation' && styles.crmSubTabBtnActive,
                ]}
                onPress={() => setCrmSubTab('quotation')}
              >
                <Text
                  style={[
                    styles.crmSubTabText,
                    crmSubTab === 'quotation' && styles.crmSubTabTextActive,
                  ]}
                >
                  Quotation
                </Text>
              </TouchableOpacity>
            </View>

            {/* Lead Cards (from reference screenshot) */}
            <View style={[styles.crmCard, SHADOWS.sm]}>
              <View style={styles.crmCardTop}>
                <View>
                  <Text style={styles.crmLeadCategory}>BUILDER - SOIL TESTING</Text>
                  <Text style={styles.crmAssigned}>Assigned: Sathish</Text>
                </View>
              </View>
              <View style={styles.crmClientRow}>
                <Text style={styles.crmClientIcon}>🏢</Text>
                <Text style={styles.crmClientName}>ISWARYA CONSTRUCTION</Text>
              </View>
              <View style={styles.crmCardBottomRow}>
                <View style={styles.crmPriorityPill}>
                  <Text style={styles.crmPriorityText}>Medium ▾</Text>
                </View>
                <View style={styles.crmStatusPill}>
                  <Text style={styles.crmStatusText}>Status: Proposal Stage ▾</Text>
                </View>
                <TouchableOpacity
                  style={styles.crmCallBtn}
                  onPress={() => Alert.alert('Contact Client', 'Calling Iswarya Construction site lead...')}
                >
                  <Text style={styles.crmCallIcon}>📞</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.crmCard, SHADOWS.sm]}>
              <View style={styles.crmCardTop}>
                <View>
                  <Text style={styles.crmLeadCategory}>BUILDER - SOIL TESTING</Text>
                  <Text style={styles.crmAssigned}>Assigned: Sathish</Text>
                </View>
              </View>
              <View style={styles.crmClientRow}>
                <Text style={styles.crmClientIcon}>🏢</Text>
                <Text style={styles.crmClientName}>India builders</Text>
              </View>
              <View style={styles.crmCardBottomRow}>
                <View style={styles.crmPriorityPill}>
                  <Text style={styles.crmPriorityText}>Medium ▾</Text>
                </View>
                <View style={[styles.crmStatusPill, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                  <Text style={[styles.crmStatusText, { color: '#991b1b' }]}>Status: No Response ▾</Text>
                </View>
                <TouchableOpacity
                  style={styles.crmCallBtn}
                  onPress={() => Alert.alert('Contact Client', 'Calling India Builders site lead...')}
                >
                  <Text style={styles.crmCallIcon}>📞</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.crmCard, SHADOWS.sm]}>
              <View style={styles.crmCardTop}>
                <View>
                  <Text style={styles.crmLeadCategory}>BUILDER - SOIL TESTING</Text>
                  <Text style={styles.crmAssigned}>Assigned: Sathish</Text>
                </View>
              </View>
              <View style={styles.crmClientRow}>
                <Text style={styles.crmClientIcon}>🏢</Text>
                <Text style={styles.crmClientName}>HARI HARE BUILDERS</Text>
              </View>
              <View style={styles.crmCardBottomRow}>
                <View style={styles.crmPriorityPill}>
                  <Text style={styles.crmPriorityText}>Medium ▾</Text>
                </View>
                <View style={styles.crmStatusPill}>
                  <Text style={styles.crmStatusText}>Status: Proposal Stage ▾</Text>
                </View>
                <TouchableOpacity
                  style={styles.crmCallBtn}
                  onPress={() => Alert.alert('Contact Client', 'Calling Hari Hare Builders...')}
                >
                  <Text style={styles.crmCallIcon}>📞</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Dynamic Tab View: MY TASK ── */}
        {activeTab === 'tasks' && (
          <View style={styles.tasksContainer}>
            <View style={styles.tasksHeaderRow}>
              <Text style={styles.tasksSectionTitle}>My Assigned Tasks</Text>
              <View style={styles.tasksCountBadge}>
                <Text style={styles.tasksCountBadgeText}>{myTasks.filter(t => t.status === 'Pending').length} Pending</Text>
              </View>
            </View>

            {myTasks.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.taskCard,
                  t.status === 'Completed' && styles.taskCardCompleted,
                  SHADOWS.sm,
                ]}
                activeOpacity={0.8}
                onPress={() => toggleTask(t.id)}
              >
                <TouchableOpacity
                  style={[
                    styles.taskCheckbox,
                    t.status === 'Completed' && styles.taskCheckboxChecked,
                  ]}
                  onPress={() => toggleTask(t.id)}
                >
                  {t.status === 'Completed' && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>

                <View style={styles.taskInfo}>
                  <Text
                    style={[
                      styles.taskTitle,
                      t.status === 'Completed' && styles.taskTitleDone,
                    ]}
                  >
                    {t.title}
                  </Text>
                  <View style={styles.taskMetaRow}>
                    <Text style={styles.taskProject}>📍 {t.project}</Text>
                    <View
                      style={[
                        styles.taskPriorityTag,
                        t.priority === 'Urgent'
                          ? { backgroundColor: '#fee2e2' }
                          : t.priority === 'High'
                          ? { backgroundColor: '#fef3c7' }
                          : { backgroundColor: '#f1f5f9' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.taskPriorityText,
                          t.priority === 'Urgent'
                            ? { color: '#dc2626' }
                            : t.priority === 'High'
                            ? { color: '#d97706' }
                            : { color: '#475569' },
                        ]}
                      >
                        {t.priority}
                      </Text>
                    </View>
                    <Text style={styles.taskDue}>Due: {t.due}</Text>
                  </View>
                </View>
              </TouchableOpacity>
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
                <Text style={styles.bankMenuDots}>⋮</Text>
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
                <Text style={styles.bankMenuDots}>⋮</Text>
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
                <Text style={styles.bankMenuDots}>⋮</Text>
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
              <Text style={styles.newAccountBtnText}>+ NEW ACCOUNT</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Dynamic Tab View: CHATS ── */}
        {activeTab === 'chats' && (
          <View style={styles.chatsContainer}>
            <View style={styles.tasksHeaderRow}>
              <Text style={styles.tasksSectionTitle}>Site Communications</Text>
            </View>

            <TouchableOpacity
              style={[styles.chatChannelCard, SHADOWS.sm]}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Chat Channel', 'Opening Cumbum Runway site team channel.')}
            >
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>CR</Text>
              </View>
              <View style={styles.chatContent}>
                <View style={styles.chatTopLine}>
                  <Text style={styles.chatName}>Cumbum Runway Site Team</Text>
                  <Text style={styles.chatTime}>10:15 AM</Text>
                </View>
                <Text style={styles.chatLastMsg} numberOfLines={1}>
                  Murugan: Today concrete pour stage 1 completed successfully.
                </Text>
              </View>
              <View style={styles.chatUnreadBadge}>
                <Text style={styles.chatUnreadText}>3</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chatChannelCard, SHADOWS.sm]}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Chat Channel', 'Opening Bangalore Metro site channel.')}
            >
              <View style={[styles.chatAvatar, { backgroundColor: '#7c3aed' }]}>
                <Text style={styles.chatAvatarText}>MV</Text>
              </View>
              <View style={styles.chatContent}>
                <View style={styles.chatTopLine}>
                  <Text style={styles.chatName}>Metro Viaduct Pier Ops</Text>
                  <Text style={styles.chatTime}>09:42 AM</Text>
                </View>
                <Text style={styles.chatLastMsg} numberOfLines={1}>
                  Arun Verma: Rebar steel batch certificate verified by BMRCL.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chatChannelCard, SHADOWS.sm]}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Chat Channel', 'Opening Material Requests & Indents channel.')}
            >
              <View style={[styles.chatAvatar, { backgroundColor: '#ea580c' }]}>
                <Text style={styles.chatAvatarText}>📦</Text>
              </View>
              <View style={styles.chatContent}>
                <View style={styles.chatTopLine}>
                  <Text style={styles.chatName}>Material Requests & Approvals</Text>
                  <Text style={styles.chatTime}>Yesterday</Text>
                </View>
                <Text style={styles.chatLastMsg} numberOfLines={1}>
                  Store: 500 bags UltraTech OPC 53 received at site store.
                </Text>
              </View>
              <View style={styles.chatUnreadBadge}>
                <Text style={styles.chatUnreadText}>1</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── The Navigation Bar ("The Nar Bar") ── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('crm')}
        >
          <NavCrmIcon active={activeTab === 'crm'} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'crm' && styles.navLabelActive,
            ]}
          >
            CRM
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('projects')}
        >
          <NavProjectsIcon active={activeTab === 'projects'} />
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
          onPress={() => setActiveTab('tasks')}
        >
          <NavTasksIcon active={activeTab === 'tasks'} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'tasks' && styles.navLabelActive,
            ]}
          >
            My Task
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('finance')}
        >
          <NavFinanceIcon active={activeTab === 'finance'} />
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
          onPress={() => setActiveTab('chats')}
        >
          <NavChatsIcon active={activeTab === 'chats'} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'chats' && styles.navLabelActive,
            ]}
          >
            Chats
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  headerLogoImg: {
    width: 28,
    height: 28,
    marginRight: 8,
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
  bellBtn: {
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
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
  desktopBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerPcWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPcScreen: {
    width: 17,
    height: 11,
    borderWidth: 1.8,
    borderRadius: 2,
  },
  headerPcNeck: {
    width: 2.2,
    height: 2.5,
  },
  headerPcBase: {
    width: 9,
    height: 1.6,
    borderRadius: 0.8,
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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

  // ── Action Circles Row ──
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  quickIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDprBody: {
    width: 15,
    height: 18,
    borderWidth: 1.8,
    borderRadius: 2.5,
    paddingTop: 3.5,
    paddingHorizontal: 2,
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingBottom: 2,
  },
  quickDprClip: {
    position: 'absolute',
    top: -2.2,
    left: 4,
    width: 5,
    height: 2.5,
    borderRadius: 1,
  },
  quickDprLine: {
    height: 1.5,
    borderRadius: 0.8,
    marginVertical: 0.6,
  },
  quickClockCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickClockHourHand: {
    position: 'absolute',
    width: 1.6,
    height: 5,
    top: 3.5,
    borderRadius: 0.8,
  },
  quickClockMinHand: {
    position: 'absolute',
    width: 5,
    height: 1.6,
    right: 3.5,
    borderRadius: 0.8,
  },
  quickClockCenterDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
  },
  quickWalletBody: {
    width: 18,
    height: 14,
    borderWidth: 1.8,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  quickWalletFlap: {
    position: 'absolute',
    right: 0,
    width: 6,
    height: 7,
    borderWidth: 1.4,
    borderRightWidth: 0,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    backgroundColor: '#ffffff',
  },
  quickWalletDot: {
    position: 'absolute',
    right: 3.5,
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  quickPlayTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },

  // ── Filter Toolbar Row ──
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  filterDropdownPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterDropdownText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  filterIconBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnEmoji: {
    fontSize: 15,
  },
  addProjectBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#5850EC',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProjectBtnText: {
    color: '#5850EC',
    fontSize: 13,
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
    alignItems: 'center',
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
    alignItems: 'center',
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
    fontSize: 10.5,
    fontWeight: '600',
    color: '#000000',
    opacity: 0.45,
    marginTop: 1,
  },
  navLabelActive: {
    color: '#000000',
    fontWeight: '800',
    opacity: 1,
  },

  // CRM Icon
  crmIconBody: {
    width: 17,
    height: 20,
    borderWidth: 1.8,
    borderRadius: 2.5,
    paddingTop: 4,
    paddingHorizontal: 2.5,
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingBottom: 2.5,
  },
  crmIconClip: {
    position: 'absolute',
    top: -2.5,
    left: 4.5,
    width: 6,
    height: 3,
    borderRadius: 1,
  },
  crmIconLine: {
    height: 1.6,
    borderRadius: 1,
    marginVertical: 0.8,
  },

  // Projects Icon
  projectsIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
  },
  projectsMainTower: {
    width: 12,
    height: 20,
    borderWidth: 1.8,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    paddingTop: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  projectsWindowRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 1.8,
  },
  projectsWindow: {
    width: 2,
    height: 2,
    borderRadius: 0.5,
  },
  projectsDoor: {
    width: 4,
    height: 3.5,
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  projectsSideWing: {
    width: 7,
    height: 13,
    borderWidth: 1.8,
    borderLeftWidth: 0,
    borderTopRightRadius: 2,
    alignItems: 'center',
  },

  // Tasks Icon
  tasksIconBox: {
    width: 18,
    height: 18,
    borderWidth: 1.8,
    borderRadius: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasksIconCheck: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: -2.5,
    includeFontPadding: false,
  },

  // Finance Icon
  financeIconCard: {
    width: 21,
    height: 15,
    borderWidth: 1.8,
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  financeIconStripe: {
    width: '100%',
    height: 3,
    marginTop: 2,
  },
  financeIconBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2.5,
    paddingBottom: 2,
  },
  financeIconChip: {
    width: 4,
    height: 3,
    borderWidth: 1,
    borderRadius: 0.8,
  },
  financeRupeeText: {
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 9,
    includeFontPadding: false,
  },

  // Chats Icon
  chatsIconBubble: {
    width: 20,
    height: 15,
    borderWidth: 1.8,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chatsIconDotsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  chatsIconDot: {
    width: 2.2,
    height: 2.2,
    borderRadius: 1.1,
  },
  chatsIconTail: {
    position: 'absolute',
    bottom: -4,
    left: 4,
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderRightColor: 'transparent',
  },
});
