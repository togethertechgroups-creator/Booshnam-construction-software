import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { COLORS, SHADOWS } from '../theme';
import { User, SystemModuleId, UserPermissions } from '../types';
import { UserService, DEPARTMENTS, SYSTEM_ROLES } from '../services/userService';

interface AdminUserManagementScreenProps {
  currentUser: User;
  onBack: () => void;
  onUserUpdated?: (updated: User) => void;
}

const ALL_MODULES: { id: SystemModuleId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard & KPIs', icon: '📈' },
  { id: 'projects', label: 'Projects Workspace', icon: '🏗️' },
  { id: 'tasks', label: 'Tasks & WBS Schedule', icon: '📋' },
  { id: 'attendance', label: 'Staff & Worker Attendance', icon: '⏱️' },
  { id: 'materials', label: 'Material Requisitions', icon: '🧱' },
  { id: 'equipment', label: 'Equipment & Fleet Logs', icon: '🚜' },
  { id: 'mom', label: 'Minutes of Meeting (MOM)', icon: '📝' },
  { id: 'files', label: 'Project Documents & Vault', icon: '📁' },
  { id: 'finance', label: 'Accounts, Ledger & Invoices', icon: '💰' },
  { id: 'dpr', label: 'Daily Progress Reports (DPR)', icon: '📊' },
  { id: 'users_admin', label: 'User & Access Management', icon: '👥' },
];

export default function AdminUserManagementScreen({
  currentUser,
  onBack,
  onUserUpdated,
}: AdminUserManagementScreenProps) {
  const [users, setUsers] = useState<User[]>(() => UserService.getAllUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Edit / Permission Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoleCode, setEditRoleCode] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editAllowedPages, setEditAllowedPages] = useState<SystemModuleId[]>([]);
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({
    can_view: true,
    can_create: false,
    can_edit: false,
    can_delete: false,
    can_approve: false,
  });

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('SITE_ENGINEER');
  const [newDepartment, setNewDepartment] = useState('Civil Engineering');

  // Subscribe to real-time changes
  useEffect(() => {
    const unsub = UserService.subscribe((all) => {
      setUsers(all);
    });
    return unsub;
  }, []);

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q);

    const matchDept =
      selectedDeptFilter === 'ALL' || u.department.toLowerCase() === selectedDeptFilter.toLowerCase();
    const matchRole =
      selectedRoleFilter === 'ALL' || u.role_code.toLowerCase() === selectedRoleFilter.toLowerCase();

    return matchQuery && matchDept && matchRole;
  });

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const inactiveCount = users.filter((u) => u.status === 'INACTIVE').length;

  // Open Edit User Modal
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone);
    setEditRoleCode(user.role_code);
    setEditDepartment(user.department);
    setEditStatus(user.status);
    setEditAllowedPages([...user.allowedPages]);
    setEditPermissions({ ...user.permissions });
  };

  // Toggle Module in Edit Modal
  const toggleModule = (modId: SystemModuleId) => {
    if (editAllowedPages.includes(modId)) {
      setEditAllowedPages(editAllowedPages.filter((m) => m !== modId));
    } else {
      setEditAllowedPages([...editAllowedPages, modId]);
    }
  };

  // Save Edited User
  const handleSaveEdit = () => {
    if (!editingUser) return;
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid user name.');
      return;
    }

    const roleObj = SYSTEM_ROLES.find((r) => r.code === editRoleCode) || {
      name: editingUser.role,
    };

    const updated: User = {
      ...editingUser,
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      role: roleObj.name,
      role_code: editRoleCode,
      department: editDepartment,
      status: editStatus,
      allowedPages: editAllowedPages,
      permissions: editPermissions,
      is_org_admin: editRoleCode === 'SUPER_ADMIN' || editRoleCode === 'ADMIN',
    };

    UserService.updateUser(updated);
    setEditingUser(null);

    if (onUserUpdated && editingUser.id === currentUser.id) {
      onUserUpdated(updated);
    }

    Alert.alert(
      'User Updated',
      `Permissions and department for "${updated.name}" have been saved and applied across the app.`
    );
  };

  // Quick Toggle Status
  const handleToggleStatus = (u: User) => {
    const updated = UserService.toggleUserStatus(u.id);
    if (updated && onUserUpdated && u.id === currentUser.id) {
      onUserUpdated(updated);
    }
  };

  // Save New User
  const handleSaveNewUser = () => {
    if (!newName.trim() || !newUsername.trim() || !newPhone.trim()) {
      Alert.alert('Validation Error', 'Please fill in Name, Username, and Phone Number.');
      return;
    }

    const roleObj = SYSTEM_ROLES.find((r) => r.code === newRoleCode) || SYSTEM_ROLES[3];

    const newUser = UserService.createUser({
      username: newUsername.trim().toLowerCase(),
      name: newName.trim(),
      email: newEmail.trim() || `${newUsername.trim().toLowerCase()}@booshnam.com`,
      phone: newPhone.trim(),
      role: roleObj.name,
      role_code: newRoleCode,
      department: newDepartment,
      status: 'ACTIVE',
      allowedPages: [...roleObj.defaultModules],
      permissions: { ...roleObj.defaultPermissions },
      is_org_admin: newRoleCode === 'SUPER_ADMIN' || newRoleCode === 'ADMIN',
    });

    setShowAddModal(false);
    setNewName('');
    setNewUsername('');
    setNewEmail('');
    setNewPhone('');

    Alert.alert('User Created', `User "${newUser.name}" has been created and can now log in immediately.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Top Header with Safe Area ── */}
      <View style={[styles.header, SHADOWS.sm]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Admin User Management</Text>
            <Text style={styles.headerSubtitle}>
              Role & Department Access Control ({users.length} Users)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.85}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Metric Badges */}
        <View style={styles.metricRow}>
          <View style={[styles.metricChip, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <View style={[styles.statusDot, { backgroundColor: '#16a34a' }]} />
            <Text style={[styles.metricChipText, { color: '#16a34a' }]}>
              {activeCount} Active Accounts
            </Text>
          </View>
          <View style={[styles.metricChip, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <View style={[styles.statusDot, { backgroundColor: '#dc2626' }]} />
            <Text style={[styles.metricChipText, { color: '#dc2626' }]}>
              {inactiveCount} Deactivated
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, role, department or phone..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Scroll: Department */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedDeptFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setSelectedDeptFilter('ALL')}
          >
            <Text style={[styles.filterChipText, selectedDeptFilter === 'ALL' && styles.filterChipTextActive]}>
              All Departments ({users.length})
            </Text>
          </TouchableOpacity>
          {DEPARTMENTS.map((dept) => {
            const count = users.filter((u) => u.department === dept.name).length;
            const active = selectedDeptFilter.toLowerCase() === dept.name.toLowerCase();
            return (
              <TouchableOpacity
                key={dept.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedDeptFilter(dept.name)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {dept.icon} {dept.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Main Users List ── */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>
          Showing {filteredUsers.length} of {users.length} accounts
        </Text>

        {filteredUsers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No Matching Users Found</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search terms or department filters.</Text>
          </View>
        ) : (
          filteredUsers.map((u) => {
            const isActive = u.status === 'ACTIVE';
            const initials = u.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            const isSuper = u.role_code === 'SUPER_ADMIN';

            return (
              <View key={u.id} style={[styles.userCard, SHADOWS.sm]}>
                {/* Top Row: Avatar + Name + Active Switch */}
                <View style={styles.userCardHeader}>
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: isSuper
                          ? '#fee2e2'
                          : u.role_code.includes('SITE')
                          ? '#e0f2fe'
                          : u.role_code.includes('FINANCE')
                          ? '#fef3c7'
                          : '#f1f5f9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        {
                          color: isSuper
                            ? '#b91c1c'
                            : u.role_code.includes('SITE')
                            ? '#0369a1'
                            : u.role_code.includes('FINANCE')
                            ? '#b45309'
                            : '#334155',
                        },
                      ]}
                    >
                      {initials}
                    </Text>
                  </View>

                  <View style={styles.userInfoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userNameText} numberOfLines={1}>
                        {u.name}
                      </Text>
                      {u.is_org_admin && (
                        <View style={styles.adminPill}>
                          <Text style={styles.adminPillText}>Admin</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.usernameSubText}>
                      @{u.username} • {u.phone}
                    </Text>
                  </View>

                  {/* Active/Inactive Switch */}
                  <View style={styles.statusCol}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isActive ? '#f0fdf4' : '#fef2f2',
                          borderColor: isActive ? '#bbf7d0' : '#fecaca',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isActive ? '#16a34a' : '#dc2626' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isActive ? '#16a34a' : '#dc2626' },
                        ]}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    <Switch
                      value={isActive}
                      onValueChange={() => handleToggleStatus(u)}
                      thumbColor={isActive ? '#16a34a' : '#94a3b8'}
                      trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  </View>
                </View>

                {/* Middle Row: Role & Department Badges */}
                <View style={styles.badgesRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>🎭 {u.role}</Text>
                  </View>
                  <View style={styles.deptBadge}>
                    <Text style={styles.deptBadgeText}>🏢 {u.department}</Text>
                  </View>
                </View>

                {/* Permissions Summary & Edit Button */}
                <View style={styles.cardFooter}>
                  <View style={styles.permsSummary}>
                    <Text style={styles.permsSummaryText}>
                      Access: <Text style={{ fontWeight: '800' }}>{u.allowedPages.length}/11</Text> Pages
                    </Text>
                    <View style={styles.actionTagsRow}>
                      {u.permissions.can_view && <Text style={styles.actionTag}>View</Text>}
                      {u.permissions.can_create && <Text style={styles.actionTag}>+Add</Text>}
                      {u.permissions.can_edit && <Text style={styles.actionTag}>Edit</Text>}
                      {u.permissions.can_approve && <Text style={[styles.actionTag, { color: '#047857', backgroundColor: '#d1fae5' }]}>Approve</Text>}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.configBtn}
                    activeOpacity={0.8}
                    onPress={() => handleOpenEdit(u)}
                  >
                    <Text style={styles.configBtnText}>Configure Access ⚙️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          MODAL: Edit User & Configure Role / Dept Permissions
         ══════════════════════════════════════════════════════ */}
      <Modal
        visible={Boolean(editingUser)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Configure Access & Role</Text>
                <Text style={styles.modalSubtitle}>
                  User: {editingUser?.name} (@{editingUser?.username})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditingUser(null)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* Field: Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. Arun Verma"
                />
              </View>

              {/* Field: Phone & Email */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1.3 }]}>
                  <Text style={styles.inputLabel}>Login Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Field: Department Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assigned Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {DEPARTMENTS.map((dept) => {
                    const selected = editDepartment === dept.name;
                    return (
                      <TouchableOpacity
                        key={dept.id}
                        style={[
                          styles.selectPill,
                          selected && styles.selectPillActive,
                        ]}
                        onPress={() => setEditDepartment(dept.name)}
                      >
                        <Text
                          style={[
                            styles.selectPillText,
                            selected && styles.selectPillTextActive,
                          ]}
                        >
                          {dept.icon} {dept.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Field: Role Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assigned Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {SYSTEM_ROLES.map((r) => {
                    const selected = editRoleCode === r.code;
                    return (
                      <TouchableOpacity
                        key={r.code}
                        style={[
                          styles.selectPill,
                          selected && styles.selectPillActive,
                        ]}
                        onPress={() => {
                          setEditRoleCode(r.code);
                          // Auto apply role default department and pages
                          if (r.defaultDepartment && !editDepartment) {
                            setEditDepartment(r.defaultDepartment);
                          }
                          setEditAllowedPages([...r.defaultModules]);
                          setEditPermissions({ ...r.defaultPermissions });
                        }}
                      >
                        <Text
                          style={[
                            styles.selectPillText,
                            selected && styles.selectPillTextActive,
                          ]}
                        >
                          {r.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Field: Status Toggle */}
              <View style={styles.statusToggleRow}>
                <View>
                  <Text style={styles.statusToggleTitle}>Account Status</Text>
                  <Text style={styles.statusToggleDesc}>
                    {editStatus === 'ACTIVE'
                      ? 'Account is active. User can login and use mobile app.'
                      : 'Account is deactivated. Login is blocked.'}
                  </Text>
                </View>
                <Switch
                  value={editStatus === 'ACTIVE'}
                  onValueChange={(val) => setEditStatus(val ? 'ACTIVE' : 'INACTIVE')}
                  thumbColor={editStatus === 'ACTIVE' ? '#16a34a' : '#94a3b8'}
                  trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
                />
              </View>

              {/* Section: Allowed Pages & Modules Checklist */}
              <View style={styles.checklistSection}>
                <Text style={styles.checklistHeader}>
                  Allowed Pages & Modules ({editAllowedPages.length}/11)
                </Text>
                <Text style={styles.checklistDesc}>
                  Select which pages this user is permitted to access on mobile.
                </Text>

                <View style={styles.checkboxGrid}>
                  {ALL_MODULES.map((m) => {
                    const isChecked = editAllowedPages.includes(m.id);
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.checkboxItem,
                          isChecked && styles.checkboxItemChecked,
                        ]}
                        onPress={() => toggleModule(m.id)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.checkboxBox,
                            isChecked && styles.checkboxBoxChecked,
                          ]}
                        >
                          {isChecked && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text
                          style={[
                            styles.checkboxLabel,
                            isChecked && styles.checkboxLabelChecked,
                          ]}
                        >
                          {m.icon} {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Section: Action Privileges */}
              <View style={styles.checklistSection}>
                <Text style={styles.checklistHeader}>Action Privileges</Text>
                <Text style={styles.checklistDesc}>
                  Define what operations the user can perform within permitted pages.
                </Text>

                <View style={styles.actionsBox}>
                  {[
                    { key: 'can_view', label: 'View Details & Records' },
                    { key: 'can_create', label: 'Add / Create New Items (Tasks, MOM, Requisitions)' },
                    { key: 'can_edit', label: 'Edit & Update Existing Data' },
                    { key: 'can_delete', label: 'Delete Records & Requisitions' },
                    { key: 'can_approve', label: 'Approve Work Orders, Expenses & Requisitions' },
                  ].map((act) => {
                    const key = act.key as keyof UserPermissions;
                    const val = Boolean(editPermissions[key]);
                    return (
                      <TouchableOpacity
                        key={act.key}
                        style={styles.actionRow}
                        activeOpacity={0.7}
                        onPress={() =>
                          setEditPermissions({
                            ...editPermissions,
                            [key]: !val,
                          })
                        }
                      >
                        <View
                          style={[
                            styles.checkboxBox,
                            val && styles.checkboxBoxChecked,
                          ]}
                        >
                          {val && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.actionRowLabel}>{act.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveModalBtn, SHADOWS.md]}
                activeOpacity={0.88}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveModalBtnText}>Save User & Apply Permissions 💾</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: Add New User
         ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add New Team Member</Text>
                <Text style={styles.modalSubtitle}>Create new mobile login account</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Balaji Govind"
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Login Username *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. balaji.govind"
                  value={newUsername}
                  onChangeText={setNewUsername}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Mobile Number *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="9840123456"
                    value={newPhone}
                    onChangeText={setNewPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1.3 }]}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="user@booshnam.com"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assigned Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {SYSTEM_ROLES.map((r) => {
                    const selected = newRoleCode === r.code;
                    return (
                      <TouchableOpacity
                        key={r.code}
                        style={[
                          styles.selectPill,
                          selected && styles.selectPillActive,
                        ]}
                        onPress={() => {
                          setNewRoleCode(r.code);
                          if (r.defaultDepartment) {
                            setNewDepartment(r.defaultDepartment);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.selectPillText,
                            selected && styles.selectPillTextActive,
                          ]}
                        >
                          {r.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {DEPARTMENTS.map((dept) => {
                    const selected = newDepartment === dept.name;
                    return (
                      <TouchableOpacity
                        key={dept.id}
                        style={[
                          styles.selectPill,
                          selected && styles.selectPillActive,
                        ]}
                        onPress={() => setNewDepartment(dept.name)}
                      >
                        <Text
                          style={[
                            styles.selectPillText,
                            selected && styles.selectPillTextActive,
                          ]}
                        >
                          {dept.icon} {dept.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.saveModalBtn, SHADOWS.md]}
                activeOpacity={0.88}
                onPress={handleSaveNewUser}
              >
                <Text style={styles.saveModalBtnText}>Create Account & Enable Access 🚀</Text>
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
  header: {
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 36) : 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
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
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  metricRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  metricChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 13,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
  clearSearch: {
    fontSize: 14,
    color: '#94a3b8',
    paddingHorizontal: 4,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  userInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  adminPill: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  adminPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dc2626',
  },
  usernameSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 2,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  deptBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  deptBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permsSummary: {
    flex: 1,
  },
  permsSummaryText: {
    fontSize: 11,
    color: '#64748b',
  },
  actionTagsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  actionTag: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  configBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  configBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  modalScroll: {
    padding: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  selectPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  selectPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  selectPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  statusToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  statusToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusToggleDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 240,
  },
  checklistSection: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  checklistHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  checklistDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  checkboxGrid: {
    gap: 8,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  checkboxItemChecked: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#ffffff',
  },
  checkboxBoxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  checkboxLabelChecked: {
    color: '#0f172a',
    fontWeight: '700',
  },
  actionsBox: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRowLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  saveModalBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveModalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
