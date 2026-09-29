import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, SafeAreaView, StatusBar, Platform,
} from 'react-native';

interface AttendanceEntry {
  id: string;
  name: string;
  role: string;
  checkIn?: string;
  checkOut?: string;
  date: string;
  status: 'present' | 'absent' | 'half-day';
}

const DEMO_WORKERS: { name: string; role: string }[] = [
  { name: 'Suresh K', role: 'Mason' },
  { name: 'Arumugam', role: 'Carpenter' },
  { name: 'Murugan', role: 'Helper' },
  { name: 'Selvan', role: 'Steel Fixer' },
  { name: 'Balu', role: 'Electrician' },
  { name: 'Kannan', role: 'Plumber' },
];

function getNow() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getToday() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function AttendanceScreen() {
  const [entries, setEntries] = useState<AttendanceEntry[]>(() =>
    DEMO_WORKERS.map((w, i) => ({
      id: `w${i}`,
      ...w,
      date: new Date().toISOString().split('T')[0],
      status: 'absent' as const,
    }))
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const markPresent = (id: string) => {
    setLoadingId(id);
    setTimeout(() => {
      setEntries(prev =>
        prev.map(e =>
          e.id === id
            ? { ...e, status: 'present', checkIn: e.checkIn || getNow() }
            : e
        )
      );
      setLoadingId(null);
    }, 500);
  };

  const markCheckout = (id: string) => {
    setLoadingId(id);
    setTimeout(() => {
      setEntries(prev =>
        prev.map(e =>
          e.id === id ? { ...e, checkOut: getNow() } : e
        )
      );
      setLoadingId(null);
    }, 500);
  };

  const markAbsent = (id: string) => {
    setEntries(prev =>
      prev.map(e =>
        e.id === id ? { ...e, status: 'absent', checkIn: undefined, checkOut: undefined } : e
      )
    );
  };

  const handleSave = () => {
    const presentCount = entries.filter(e => e.status === 'present').length;
    Alert.alert(
      'Attendance Saved',
      `${presentCount} of ${entries.length} workers marked Present.\nSynced successfully!`,
      [{ text: 'OK' }]
    );
  };

  const presentCount = entries.filter(e => e.status === 'present').length;
  const absentCount = entries.filter(e => e.status === 'absent').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerDate}>{getToday()}</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save ✓</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Pills */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryPill, { backgroundColor: '#ECFDF5' }]}>
          <Text style={[styles.summaryNum, { color: '#065F46' }]}>{presentCount}</Text>
          <Text style={[styles.summaryLabel, { color: '#6EE7B7' }]}>Present</Text>
        </View>
        <View style={[styles.summaryPill, { backgroundColor: '#FEF2F2' }]}>
          <Text style={[styles.summaryNum, { color: '#991B1B' }]}>{absentCount}</Text>
          <Text style={[styles.summaryLabel, { color: '#FCA5A5' }]}>Absent</Text>
        </View>
        <View style={[styles.summaryPill, { backgroundColor: '#F8FAFC' }]}>
          <Text style={[styles.summaryNum, { color: '#334155' }]}>{entries.length}</Text>
          <Text style={[styles.summaryLabel, { color: '#94A3B8' }]}>Total</Text>
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
        {entries.map(entry => {
          const isLoading = loadingId === entry.id;
          const isPresent = entry.status === 'present';

          return (
            <View
              key={entry.id}
              style={[
                styles.workerCard,
                isPresent && styles.workerCardPresent,
              ]}>
              <View style={styles.workerLeft}>
                <View style={[styles.workerAvatar, isPresent && styles.workerAvatarPresent]}>
                  <Text style={styles.workerAvatarText}>
                    {entry.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.workerName}>{entry.name}</Text>
                  <Text style={styles.workerRole}>{entry.role}</Text>
                  {isPresent && entry.checkIn && (
                    <Text style={styles.workerTime}>
                      In: {entry.checkIn}
                      {entry.checkOut ? `  Out: ${entry.checkOut}` : ''}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.workerActions}>
                {isLoading ? (
                  <ActivityIndicator color="#B91C1C" size="small" />
                ) : isPresent ? (
                  <View style={styles.actionRow}>
                    {!entry.checkOut && (
                      <TouchableOpacity
                        style={styles.checkoutBtn}
                        onPress={() => markCheckout(entry.id)}>
                        <Text style={styles.checkoutBtnText}>Check Out</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.absentBtn}
                      onPress={() => markAbsent(entry.id)}>
                      <Text style={styles.absentBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.presentBtn}
                    onPress={() => markPresent(entry.id)}>
                    <Text style={styles.presentBtnText}>Mark Present</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 36) : 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  saveBtn: {
    backgroundColor: '#065F46',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  summaryRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
  },
  summaryPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  summaryNum: { fontSize: 24, fontWeight: '900' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  list: { flex: 1, paddingHorizontal: 14 },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  workerCardPresent: {
    borderColor: '#6EE7B7',
    backgroundColor: '#F0FDF4',
  },
  workerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  workerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarPresent: { backgroundColor: '#10B981' },
  workerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  workerName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  workerRole: { fontSize: 12, color: '#64748B' },
  workerTime: { fontSize: 11, color: '#059669', fontWeight: '600', marginTop: 2 },
  workerActions: { alignItems: 'flex-end' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  presentBtn: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  presentBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  checkoutBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  checkoutBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  absentBtn: {
    backgroundColor: '#FEF2F2',
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absentBtnText: { color: '#B91C1C', fontSize: 14, fontWeight: '800' },
});
