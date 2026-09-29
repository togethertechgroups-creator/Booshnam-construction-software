import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProjectWorkspaceScreen from './src/screens/ProjectWorkspaceScreen';
import AdminUserManagementScreen from './src/screens/AdminUserManagementScreen';
import { User, Project } from './src/types';
import { COLORS } from './src/theme';
import {
  requestNotificationPermission,
  registerDeviceToken,
  setupPushNotificationListeners,
} from './src/services/pushNotificationService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // Initialize Push Notifications on App Launch
  useEffect(() => {
    async function initPush() {
      await requestNotificationPermission();
      await registerDeviceToken();
    }
    initPush();

    const unsubscribe = setupPushNotificationListeners((data) => {
      console.log('App handling push data:', data);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // When user logs in, re-register token with user phone & role
  useEffect(() => {
    if (user) {
      registerDeviceToken(user.phone, user.role);
    }
  }, [user]);

  // 1. Not logged in → OnSite Booshnam Login Screen
  if (!user) {
    return <LoginScreen onLogin={(u) => setUser(u)} />;
  }

  // 2. Admin User Management Screen
  if (showUserManagement) {
    return (
      <AdminUserManagementScreen
        currentUser={user}
        onBack={() => setShowUserManagement(false)}
        onUserUpdated={(updatedUser) => {
          if (updatedUser.id === user.id) {
            setUser(updatedUser);
          }
        }}
      />
    );
  }

  // 3. Active Project Workspace → Replicates Web App Tabs & Dashboard
  if (activeProject) {
    return (
      <ProjectWorkspaceScreen
        project={activeProject}
        user={user}
        onBack={() => setActiveProject(null)}
      />
    );
  }

  // 4. Home Screen → Assigned Projects & Sites List
  return (
    <HomeScreen
      user={user}
      onOpenProject={(proj) => setActiveProject(proj)}
      onOpenUserManagement={() => setShowUserManagement(true)}
      onLogout={() => {
        setUser(null);
        setActiveProject(null);
        setShowUserManagement(false);
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
