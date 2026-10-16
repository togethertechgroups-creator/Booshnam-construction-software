/**
 * Booshnam Chat & Real-Time Messaging Service
 * Synchronizes client/party communications with WhatsApp-grade experience,
 * cross-tab BroadcastChannel, localStorage persistence, and Cloudflare Durable Objects/Edge support.
 */

import { FINANCE_STORAGE_KEYS, PartyRecord } from './financeSyncService';
import { getCurrentUserAccount, UserAccount } from './authService';
import { Project } from '../types';

export interface ChatContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  type: 'Client' | 'Staff' | 'Subcontractor' | 'Vendor' | 'Consultant' | 'Lead' | 'User';
  role?: string;
  avatarText: string;
  avatarColor: string;
  onlineStatus?: 'online' | 'offline' | 'typing';
  lastSeen?: string;
  activeProjects?: string[];
  unreadCount: number;
  balanceDue?: number;
  lastMessage?: {
    id: string;
    text: string;
    timestamp: number;
    senderId: string;
    status: 'sent' | 'delivered' | 'read';
  };
}

export interface ChatMessage {
  id: string;
  threadId: string; // contactId or thread identifier
  senderId: string;
  senderName: string;
  senderRole?: string;
  recipientId: string;
  recipientName: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  attachment?: {
    name: string;
    type: 'image' | 'file' | 'pdf';
    url: string;
    size?: string;
  };
}

export interface CloudflareSyncConfig {
  enabled: boolean;
  workerUrl: string;
  durableObjectName?: string;
  authToken?: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSyncTime?: number;
}

const CHAT_STORAGE_KEYS = {
  MESSAGES: 'booshnam_chat_messages_v1',
  CLOUDFLARE_CONFIG: 'booshnam_chat_cloudflare_config_v1',
  PRESENCE: 'booshnam_chat_online_presence_v1',
};

// Real-Time Cross-Tab Broadcast Channel (0ms latency between browser tabs/windows)
export let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('booshnam_realtime_chat_v1');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment');
}

/**
 * Web Audio Chime Generator (WhatsApp-style send & receive chimes)
 */
function playAudioTone(freq1: number, freq2: number, duration: number = 0.12) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq1, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio context may be restricted by browser policy until user interaction
  }
}

export function playSendSound() {
  playAudioTone(880, 1174, 0.08); // crisp high pop
}

export function playReceiveSound() {
  playAudioTone(587, 880, 0.14); // pleasant dual ping
}

/**
 * Get all Messages from LocalStorage
 */
export function getAllChatMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEYS.MESSAGES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load chat messages', e);
    return [];
  }
}

/**
 * Save messages to LocalStorage & broadcast to other tabs/windows
 */
function saveAllChatMessages(messages: ChatMessage[], broadcast: boolean = true) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAT_STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent('booshnam_chat_messages_updated', { detail: messages }));

    if (broadcast && broadcastChannel) {
      broadcastChannel.postMessage({ type: 'SYNC_MESSAGES', messages });
    }
  } catch (e) {
    console.error('Failed to save chat messages', e);
  }
}

/**
 * Cloudflare Edge Sync configuration
 */
export function getCloudflareConfig(): CloudflareSyncConfig {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      workerUrl: '',
      durableObjectName: 'BooshnamChatRoom',
      status: 'disconnected',
    };
  }
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEYS.CLOUDFLARE_CONFIG);
    if (!raw) {
      return {
        enabled: true,
        workerUrl: 'https://booshnam-chat.togethertech.workers.dev',
        durableObjectName: 'BooshnamChatRoom',
        status: 'connected',
      };
    }
    return JSON.parse(raw);
  } catch (e) {
    return {
      enabled: false,
      workerUrl: '',
      status: 'disconnected',
    };
  }
}

export function saveCloudflareConfig(cfg: CloudflareSyncConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHAT_STORAGE_KEYS.CLOUDFLARE_CONFIG, JSON.stringify(cfg));
  window.dispatchEvent(new CustomEvent('booshnam_cloudflare_config_updated', { detail: cfg }));
}

/**
 * Sync with Cloudflare Worker / Durable Object endpoint if available
 */
export async function syncWithCloudflare(message?: ChatMessage) {
  const config = getCloudflareConfig();
  if (!config.enabled || !config.workerUrl) return;

  try {
    if (message) {
      // Push message to Cloudflare Durable Object
      await fetch(`${config.workerUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {}),
        },
        body: JSON.stringify(message),
      }).catch(() => {
        // Silently fallback to local real-time channel
      });
    }
  } catch (err) {
    // Graceful offline fallback
  }
}

/**
 * Real-Time Presence Service
 * Contacts are ONLY marked online when they are actively inside the chat.
 * Otherwise, they default strictly to offline.
 */
export function getOnlineUsers(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEYS.PRESENCE);
    if (!raw) return new Set();
    const data: Record<string, number> = JSON.parse(raw);
    const now = Date.now();
    const active = new Set<string>();
    for (const [key, ts] of Object.entries(data)) {
      if (now - ts < 15000) {
        active.add(key.toLowerCase());
      }
    }
    return active;
  } catch (e) {
    return new Set();
  }
}

export function registerChatPresence(userAccount: UserAccount | null) {
  if (typeof window === 'undefined' || !userAccount) return;
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEYS.PRESENCE);
    const data: Record<string, number> = raw ? JSON.parse(raw) : {};
    const now = Date.now();

    const idKey = (userAccount.id || '').toLowerCase();
    const nameKey = (userAccount.staff_name || userAccount.username || '').toLowerCase();
    const phoneKey = (userAccount.phone || '').replace(/[^0-9]/g, '');

    if (idKey) data[idKey] = now;
    if (nameKey) data[nameKey] = now;
    if (phoneKey && phoneKey.length > 5) data[phoneKey] = now;

    // Prune stale heartbeats older than 30s
    for (const [k, ts] of Object.entries(data)) {
      if (now - ts > 30000) delete data[k];
    }

    localStorage.setItem(CHAT_STORAGE_KEYS.PRESENCE, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('booshnam_chat_presence_updated'));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'PRESENCE_HEARTBEAT', data });
    }
  } catch (e) {}
}

export function unregisterChatPresence(userAccount: UserAccount | null) {
  if (typeof window === 'undefined' || !userAccount) return;
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEYS.PRESENCE);
    if (!raw) return;
    const data: Record<string, number> = JSON.parse(raw);

    const idKey = (userAccount.id || '').toLowerCase();
    const nameKey = (userAccount.staff_name || userAccount.username || '').toLowerCase();
    const phoneKey = (userAccount.phone || '').replace(/[^0-9]/g, '');

    if (idKey) delete data[idKey];
    if (nameKey) delete data[nameKey];
    if (phoneKey) delete data[phoneKey];

    localStorage.setItem(CHAT_STORAGE_KEYS.PRESENCE, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('booshnam_chat_presence_updated'));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'PRESENCE_HEARTBEAT', data });
    }
  } catch (e) {}
}

/**
 * Build Unified Contact List:
 * Gathers all Parties (Clients, Vendors, Subcontractors, Staff),
 * Project Clients, Leads, and System User Accounts with smart deduplication.
 */
export function getChatContacts(projects: Project[] = []): ChatContact[] {
  const contactsMap = new Map<string, ChatContact>();
  const allMessages = getAllChatMessages();
  const currentUser = getCurrentUserAccount();
  const onlineUsers = getOnlineUsers();

  const isContactOnline = (id: string, name: string, phone?: string): boolean => {
    const normId = (id || '').toLowerCase();
    const normName = (name || '').trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    return (
      onlineUsers.has(normId) ||
      onlineUsers.has(normName) ||
      (cleanPhone.length > 5 && onlineUsers.has(cleanPhone))
    );
  };

  // Helper to find existing contact by phone or normalized name for deduplication
  const findExisting = (name: string, phone?: string): ChatContact | undefined => {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const normName = (name || '').trim().toLowerCase();
    return Array.from(contactsMap.values()).find((c) => {
      const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
      if (cleanPhone && cleanPhone.length > 5 && cPhone === cleanPhone) return true;
      if (normName && c.name.trim().toLowerCase() === normName) return true;
      return false;
    });
  };

  // Helper to compute avatar initials & colors
  const getAvatar = (name: string, type: string) => {
    const trimmed = (name || '').trim();
    const parts = trimmed.split(/\s+/);
    const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : trimmed.slice(0, 2) || 'CL';

    let color = 'bg-emerald-600 text-white';
    if (type === 'Client') color = 'bg-blue-600 text-white';
    else if (type === 'Staff' || type === 'User') color = 'bg-purple-600 text-white';
    else if (type === 'Subcontractor') color = 'bg-amber-600 text-white';
    else if (type === 'Vendor' || type === 'Supplier') color = 'bg-rose-600 text-white';
    else if (type === 'Lead') color = 'bg-teal-600 text-white';

    return { text: initials.toUpperCase(), color };
  };

  // 1. Load from Finance Parties (Parties added in Accounts & Finance)
  try {
    const rawParties = localStorage.getItem(FINANCE_STORAGE_KEYS.PARTIES);
    if (rawParties) {
      const parties: PartyRecord[] = JSON.parse(rawParties);
      if (Array.isArray(parties)) {
        parties.forEach((p) => {
          if (!p.id || !p.name) return;
          const phone = p.phone || '';
          const existing = findExisting(p.name, phone);
          if (existing) {
            if (!existing.phone && phone) existing.phone = phone;
            if (!existing.email && p.email) existing.email = p.email;
            if (p.balanceDue !== undefined) existing.balanceDue = p.balanceDue;
            return;
          }

          const avatar = getAvatar(p.name, p.type || 'Client');
          const key = `party-${p.id}`;
          const online = isContactOnline(key, p.name, phone);

          contactsMap.set(key, {
            id: key,
            name: p.name,
            phone: phone,
            email: p.email,
            type: (p.type as any) || 'Client',
            role: p.type === 'Staff' ? 'Staff Member' : p.type,
            avatarText: p.avatarText || avatar.text,
            avatarColor: p.avatarColor || avatar.color,
            balanceDue: p.balanceDue,
            activeProjects: p.activeProjects || [],
            onlineStatus: online ? 'online' : 'offline',
            lastSeen: online ? 'online' : 'offline',
            unreadCount: 0,
          });
        });
      }
    }
  } catch (e) {
    console.error('Failed to load parties for chat', e);
  }

  // 2. Load from System User Accounts (authService)
  try {
    const rawUsers = localStorage.getItem('booshnam_user_accounts_v2');
    if (rawUsers) {
      const users: UserAccount[] = JSON.parse(rawUsers);
      if (Array.isArray(users)) {
        users.forEach((u) => {
          if (!u.id) return;
          if (currentUser && (u.id === currentUser.id || (u.username && u.username === currentUser.username))) return;
          const name = u.staff_name || u.username;
          if (!name) return;

          const existing = findExisting(name, u.phone);
          if (existing) {
            if (!existing.phone && u.phone) existing.phone = u.phone;
            if (u.role_name) existing.role = u.role_name;
            return;
          }

          const avatar = getAvatar(name, 'Staff');
          const key = `user-${u.id}`;
          const online = isContactOnline(key, name, u.phone);

          contactsMap.set(key, {
            id: key,
            name: name,
            phone: u.phone || '',
            type: 'Staff',
            role: u.role_name || 'Staff',
            avatarText: avatar.text,
            avatarColor: avatar.color,
            onlineStatus: online ? 'online' : 'offline',
            lastSeen: online ? 'online' : 'offline',
            unreadCount: 0,
          });
        });
      }
    }
  } catch (e) {
    console.error('Failed to load users for chat', e);
  }

  // 3. Load from Projects (Clients on projects)
  if (Array.isArray(projects)) {
    projects.forEach((proj) => {
      const clientName = proj.client_name || (proj as any).client || '';
      if (!clientName || clientName === '-' || clientName.toLowerCase() === 'sample client') return;

      const clientPhone = (proj as any).client_phone || (proj as any).phone || '';
      const existing = findExisting(clientName, clientPhone);

      if (existing) {
        if (proj.name && existing.activeProjects && !existing.activeProjects.includes(proj.name)) {
          existing.activeProjects.push(proj.name);
        }
      } else {
        const key = `client-${proj.id || Math.random().toString(36).substr(2, 6)}`;
        const avatar = getAvatar(clientName, 'Client');
        const online = isContactOnline(key, clientName, clientPhone);

        contactsMap.set(key, {
          id: key,
          name: clientName,
          phone: clientPhone,
          type: 'Client',
          role: `Client • ${proj.name}`,
          avatarText: avatar.text,
          avatarColor: avatar.color,
          activeProjects: [proj.name],
          onlineStatus: online ? 'online' : 'offline',
          lastSeen: online ? 'online' : 'offline',
          unreadCount: 0,
        });
      }
    });
  }

  // 4. Load from Quotation Leads (booshnam_leads_v2)
  try {
    const rawLeads = localStorage.getItem('booshnam_leads_v2');
    if (rawLeads) {
      const leads = JSON.parse(rawLeads);
      if (Array.isArray(leads)) {
        leads.forEach((l: any) => {
          const leadName = l.client_name || l.name;
          if (!leadName) return;
          const leadPhone = l.phone || '';
          const existing = findExisting(leadName, leadPhone);

          if (!existing) {
            const key = `lead-${l.id || Math.random().toString(36).substr(2, 6)}`;
            const avatar = getAvatar(leadName, 'Lead');
            const online = isContactOnline(key, leadName, leadPhone);

            contactsMap.set(key, {
              id: key,
              name: leadName,
              phone: leadPhone,
              email: l.email,
              type: 'Lead',
              role: `Lead • ${l.project_type || 'Inquiry'}`,
              avatarText: avatar.text,
              avatarColor: avatar.color,
              onlineStatus: online ? 'online' : 'offline',
              lastSeen: online ? 'online' : 'offline',
              unreadCount: 0,
            });
          }
        });
      }
    }
  } catch (e) {}

  // 5. Fallback demo contacts if completely empty (strictly offline by default)
  if (contactsMap.size === 0) {
    const sampleContacts: ChatContact[] = [
      {
        id: 'contact-c1',
        name: 'Kavitha Ramachandran',
        phone: '+91 98401 23456',
        email: 'kavitha.rc@gmail.com',
        type: 'Client',
        role: 'Client • Prestige Villa Phase 2',
        avatarText: 'KR',
        avatarColor: 'bg-emerald-600 text-white',
        activeProjects: ['Prestige Villa Phase 2'],
        onlineStatus: 'offline',
        lastSeen: 'offline',
        unreadCount: 0,
        balanceDue: 245000,
      },
      {
        id: 'contact-c2',
        name: 'Ramesh Sundaram',
        phone: '+91 94440 98765',
        email: 'ramesh.sundaram@gmail.com',
        type: 'Client',
        role: 'Client • Grand Palace Enclave',
        avatarText: 'RS',
        avatarColor: 'bg-blue-600 text-white',
        activeProjects: ['Grand Palace Enclave'],
        onlineStatus: 'offline',
        lastSeen: 'offline',
        unreadCount: 0,
        balanceDue: 580000,
      },
      {
        id: 'contact-s1',
        name: 'Vignesh Subcontractor',
        phone: '+91 98841 55678',
        type: 'Subcontractor',
        role: 'Masonry & Concrete Works',
        avatarText: 'VS',
        avatarColor: 'bg-amber-600 text-white',
        activeProjects: ['Prestige Villa Phase 2'],
        onlineStatus: 'offline',
        lastSeen: 'offline',
        unreadCount: 0,
        balanceDue: -85000,
      },
      {
        id: 'contact-v1',
        name: 'Sri Krishna Steel & Cement',
        phone: '+91 94455 11223',
        type: 'Vendor',
        role: 'Materials Supplier (TMT & OPC)',
        avatarText: 'SK',
        avatarColor: 'bg-rose-600 text-white',
        onlineStatus: 'offline',
        lastSeen: 'offline',
        unreadCount: 0,
        balanceDue: -340000,
      },
      {
        id: 'contact-u1',
        name: 'Site Supervisor Murugan',
        phone: '+91 97910 88990',
        type: 'Staff',
        role: 'Senior Site Supervisor',
        avatarText: 'SM',
        avatarColor: 'bg-purple-600 text-white',
        onlineStatus: 'offline',
        lastSeen: 'offline',
        unreadCount: 0,
      },
    ];

    sampleContacts.forEach((c) => {
      const online = isContactOnline(c.id, c.name, c.phone);
      c.onlineStatus = online ? 'online' : 'offline';
      c.lastSeen = online ? 'online' : 'offline';
      contactsMap.set(c.id, c);
    });
  }

  // Calculate unread count & attach last message for each contact
  const currentUserId = currentUser?.id || 'usr-super';
  const contactsList = Array.from(contactsMap.values());

  contactsList.forEach((c) => {
    // Messages in this thread: where sender or recipient is contact.id or contact.name
    const threadMsgs = allMessages.filter(
      (m) =>
        (m.recipientId === c.id || m.senderId === c.id) ||
        (m.recipientName.toLowerCase() === c.name.toLowerCase() || m.senderName.toLowerCase() === c.name.toLowerCase())
    );

    if (threadMsgs.length > 0) {
      const sorted = [...threadMsgs].sort((a, b) => b.timestamp - a.timestamp);
      const lastMsg = sorted[0];
      c.lastMessage = {
        id: lastMsg.id,
        text: lastMsg.text,
        timestamp: lastMsg.timestamp,
        senderId: lastMsg.senderId,
        status: lastMsg.status,
      };

      // Unread count: messages sent to current user that are not 'read'
      const unread = threadMsgs.filter(
        (m) => m.senderId === c.id && m.recipientId === currentUserId && m.status !== 'read'
      ).length;
      c.unreadCount = unread;
    }
  });

  // Sort contacts: those with recent messages on top, then alphabetical
  return contactsList.sort((a, b) => {
    const timeA = a.lastMessage?.timestamp || 0;
    const timeB = b.lastMessage?.timestamp || 0;
    if (timeA !== timeB) return timeB - timeA;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get messages between current user and selected contact
 */
export function getThreadMessages(contactId: string, contactName: string): ChatMessage[] {
  const allMessages = getAllChatMessages();
  const currentUser = getCurrentUserAccount();
  const currentUserId = currentUser?.id || 'usr-super';
  const currentUserName = currentUser?.staff_name || 'Admin';

  const thread = allMessages.filter((m) => {
    const matchId =
      (m.senderId === contactId && m.recipientId === currentUserId) ||
      (m.senderId === currentUserId && m.recipientId === contactId) ||
      (m.threadId === contactId);

    const matchName =
      (m.senderName.toLowerCase() === contactName.toLowerCase() && m.recipientName.toLowerCase() === currentUserName.toLowerCase()) ||
      (m.senderName.toLowerCase() === currentUserName.toLowerCase() && m.recipientName.toLowerCase() === contactName.toLowerCase());

    return matchId || matchName;
  });

  return thread.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Send a new Message
 */
export function sendChatMessage(
  recipient: ChatContact,
  text: string,
  attachment?: ChatMessage['attachment']
): ChatMessage {
  const currentUser = getCurrentUserAccount();
  const currentUserId = currentUser?.id || 'usr-super';
  const currentUserName = currentUser?.staff_name || 'Administrator';
  const currentUserRole = currentUser?.role_name || 'Admin';

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    threadId: recipient.id,
    senderId: currentUserId,
    senderName: currentUserName,
    senderRole: currentUserRole,
    recipientId: recipient.id,
    recipientName: recipient.name,
    text: text.trim(),
    timestamp: Date.now(),
    status: 'sent',
    attachment,
  };

  const allMessages = getAllChatMessages();
  const updated = [...allMessages, newMsg];
  saveAllChatMessages(updated, true);

  playSendSound();

  // Async sync to Cloudflare
  syncWithCloudflare(newMsg);

  // Simulated auto-delivery & read status upgrade
  setTimeout(() => {
    markMessageStatus(newMsg.id, 'delivered');
  }, 600);

  setTimeout(() => {
    markMessageStatus(newMsg.id, 'read');
  }, 2200);

  return newMsg;
}

/**
 * Mark a message's status
 */
export function markMessageStatus(messageId: string, status: 'delivered' | 'read') {
  const allMessages = getAllChatMessages();
  const idx = allMessages.findIndex((m) => m.id === messageId);
  if (idx !== -1 && allMessages[idx].status !== 'read') {
    allMessages[idx].status = status;
    saveAllChatMessages(allMessages, true);
  }
}

/**
 * Mark all messages from a contact as read
 */
export function markThreadAsRead(contactId: string) {
  const allMessages = getAllChatMessages();
  const currentUser = getCurrentUserAccount();
  const currentUserId = currentUser?.id || 'usr-super';

  let hasChanges = false;
  allMessages.forEach((m) => {
    if (m.senderId === contactId && m.recipientId === currentUserId && m.status !== 'read') {
      m.status = 'read';
      hasChanges = true;
    }
  });

  if (hasChanges) {
    saveAllChatMessages(allMessages, true);
  }
}

/**
 * Get total unread count across all contacts
 */
export function getTotalUnreadChatCount(): number {
  const currentUser = getCurrentUserAccount();
  const currentUserId = currentUser?.id || 'usr-super';
  const allMessages = getAllChatMessages();

  return allMessages.filter((m) => m.recipientId === currentUserId && m.status !== 'read').length;
}

/**
 * Setup Real-Time Listener for Cross-Tab and Cloudflare Sync
 */
export function setupChatRealtimeListener(onUpdate: () => void) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === CHAT_STORAGE_KEYS.MESSAGES) {
      onUpdate();
      playReceiveSound();
    }
  };

  const handleCustom = () => {
    onUpdate();
  };

  const handleBroadcast = (e: MessageEvent) => {
    if (e.data && e.data.type === 'SYNC_MESSAGES') {
      onUpdate();
      playReceiveSound();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('booshnam_chat_messages_updated', handleCustom);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('booshnam_chat_messages_updated', handleCustom);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}
