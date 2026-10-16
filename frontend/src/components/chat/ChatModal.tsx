import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Search, Send, Paperclip, Smile, Phone, Video, MoreVertical,
  Check, CheckCheck, Clock, Shield, Sparkles, MessageSquare,
  Users, User, Building2, FolderKanban, ArrowLeft, ExternalLink,
  Download, Image as ImageIcon, FileText, Mic, AlertCircle,
  Wifi, Settings, RefreshCw, ChevronRight, Hash
} from 'lucide-react';
import {
  ChatContact,
  ChatMessage,
  getChatContacts,
  getThreadMessages,
  sendChatMessage,
  markThreadAsRead,
  setupChatRealtimeListener,
  getCloudflareConfig,
  saveCloudflareConfig,
  CloudflareSyncConfig,
  registerChatPresence,
  unregisterChatPresence,
  broadcastChannel
} from '../../lib/chatService';
import { getCurrentUserAccount } from '../../lib/authService';
import { Project } from '../../types';

interface WhatsAppChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: Project[];
  initialContactId?: string;
  onShowToast?: (msg: string) => void;
}

export const WhatsAppChatModal: React.FC<WhatsAppChatModalProps> = ({
  isOpen,
  onClose,
  projects = [],
  initialContactId,
  onShowToast,
}) => {
  const currentUser = getCurrentUserAccount();
  const currentUserId = currentUser?.id || 'usr-super';
  const currentUserName = currentUser?.staff_name || 'Administrator';

  // State
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'All' | 'Client' | 'Subcontractor' | 'Vendor' | 'Staff' | 'Unread'>('All');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showCloudflareModal, setShowCloudflareModal] = useState(false);
  const [cloudflareConfig, setCloudflareConfig] = useState<CloudflareSyncConfig>(getCloudflareConfig());
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Attachment state
  const [pendingAttachment, setPendingAttachment] = useState<{
    name: string;
    type: 'image' | 'file' | 'pdf';
    url: string;
    size?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceTimerRef = useRef<any>(null);

  // Load contacts
  const refreshContacts = () => {
    const list = getChatContacts(projects);
    setContacts(list);

    if (selectedContact) {
      const updated = list.find((c) => c.id === selectedContact.id);
      if (updated) setSelectedContact(updated);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshContacts();
      const unsub = setupChatRealtimeListener(() => {
        refreshContacts();
        if (selectedContact) {
          const msgs = getThreadMessages(selectedContact.id, selectedContact.name);
          setMessages(msgs);
        }
      });
      return unsub;
    }
  }, [isOpen, selectedContact?.id]);

  // Real-Time Online Presence Tracker: Only show users online when actively inside the chat
  useEffect(() => {
    if (isOpen) {
      registerChatPresence(currentUser);
      const heartbeatTimer = setInterval(() => {
        registerChatPresence(currentUser);
      }, 5000);

      const handlePresenceSync = () => {
        refreshContacts();
      };
      window.addEventListener('booshnam_chat_presence_updated', handlePresenceSync);

      let channelHandler: ((e: MessageEvent) => void) | null = null;
      if (broadcastChannel) {
        channelHandler = (e: MessageEvent) => {
          if (e.data && e.data.type === 'PRESENCE_HEARTBEAT') {
            refreshContacts();
          }
        };
        broadcastChannel.addEventListener('message', channelHandler);
      }

      return () => {
        clearInterval(heartbeatTimer);
        unregisterChatPresence(currentUser);
        window.removeEventListener('booshnam_chat_presence_updated', handlePresenceSync);
        if (broadcastChannel && channelHandler) {
          broadcastChannel.removeEventListener('message', channelHandler);
        }
      };
    } else {
      unregisterChatPresence(currentUser);
    }
  }, [isOpen]);

  // Unregister presence if browser tab/window is closed
  useEffect(() => {
    const handleUnload = () => {
      unregisterChatPresence(currentUser);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Handle initial contact selection
  useEffect(() => {
    if (isOpen && initialContactId && contacts.length > 0) {
      const match = contacts.find((c) => c.id === initialContactId);
      if (match) {
        setSelectedContact(match);
      }
    } else if (isOpen && !selectedContact && contacts.length > 0) {
      // Default to first contact
      setSelectedContact(contacts[0]);
    }
  }, [isOpen, initialContactId, contacts.length]);

  // When selected contact changes, load thread messages and mark as read
  useEffect(() => {
    if (selectedContact) {
      const msgs = getThreadMessages(selectedContact.id, selectedContact.name);
      setMessages(msgs);
      markThreadAsRead(selectedContact.id);
      refreshContacts();
    }
  }, [selectedContact?.id]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAttachment]);

  // Voice recording timer
  useEffect(() => {
    if (isRecordingVoice) {
      setRecordingSeconds(0);
      voiceTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    }
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, [isRecordingVoice]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.role && c.role.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterTab === 'All') return true;
      if (filterTab === 'Unread') return c.unreadCount > 0;
      return c.type === filterTab;
    });
  }, [contacts, searchQuery, filterTab]);

  // Send message
  const handleSendMessage = () => {
    if ((!inputText.trim() && !pendingAttachment) || !selectedContact) return;

    sendChatMessage(selectedContact, inputText.trim(), pendingAttachment || undefined);
    setInputText('');
    setPendingAttachment(null);
    setShowEmojiPicker(false);

    // Refresh active thread
    const updatedMsgs = getThreadMessages(selectedContact.id, selectedContact.name);
    setMessages(updatedMsgs);
    refreshContacts();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle file attachment
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const reader = new FileReader();

    reader.onload = (loadEvt) => {
      const url = loadEvt.target?.result as string;
      setPendingAttachment({
        name: file.name,
        type: isImage ? 'image' : isPdf ? 'pdf' : 'file',
        url,
        size: `${(file.size / 1024).toFixed(1)} KB`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Emojis list
  const QUICK_EMOJIS = ['👍', '❤️', '😊', '🙏', '🏗️', '✅', '💰', '🔥', '👏', '🤝', '⭐', '📦', '🚚', '📋'];

  // Format message timestamp
  const formatMsgTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // WhatsApp Web direct URL
  const getWhatsAppWebUrl = (phone: string, contactName: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hello ${contactName}, greeting from Booshnam Construction!`);
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : '#';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      {/* Container simulating WhatsApp Web frame */}
      <div className="w-full max-w-6xl h-[92vh] max-h-[860px] bg-white rounded-2xl shadow-2xl flex overflow-hidden border border-slate-200/60 select-none">
        
        {/* ── LEFT PANE: CONTACTS & CHAT LIST (WhatsApp Sidebar) ── */}
        <div className={`w-full md:w-[380px] lg:w-[410px] flex flex-col bg-white border-r border-[#e9edef] shrink-0 ${
          selectedContact && 'hidden md:flex'
        }`}>
          {/* Header Bar */}
          <div className="p-3.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {currentUser?.staff_name?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-slate-800 truncate block">
                  {currentUserName}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-2.5 bg-white border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search or start new chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-[#f0f2f5] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 border border-transparent focus:border-emerald-400 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 no-scrollbar">
              {(['All', 'Client', 'Subcontractor', 'Vendor', 'Staff', 'Unread'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    filterTab === tab
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-[#f0f2f5] text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {tab === 'All' ? 'All Chats' : tab === 'Client' ? 'Clients' : tab === 'Subcontractor' ? 'Subcontractors' : tab === 'Vendor' ? 'Vendors' : tab === 'Staff' ? 'Staff' : 'Unread'}
                </button>
              ))}
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
                <Users className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-xs text-slate-600">No matching contacts found</p>
                <p className="text-[11px] text-slate-400 mt-1">Try searching by client name, party, or phone number</p>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selectedContact?.id === contact.id;
                const lastMsg = contact.lastMessage;
                const isMeLast = lastMsg && lastMsg.senderId === currentUserId;

                return (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setSelectedContact(contact);
                      setShowContactDetails(false);
                    }}
                    className={`p-3 flex items-center gap-3 cursor-pointer transition-colors relative group ${
                      isSelected ? 'bg-[#f0f2f5]' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Avatar with Online Dot */}
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${contact.avatarColor}`}>
                        {contact.avatarText}
                      </div>
                      {contact.onlineStatus === 'online' && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
                      )}
                    </div>

                    {/* Middle Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {contact.name}
                        </span>
                        {lastMsg && (
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {formatMsgTime(lastMsg.timestamp)}
                          </span>
                        )}
                      </div>

                      {/* Last Message Preview & Unread Badge */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                          {isMeLast && (
                            lastMsg.status === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
                            ) : lastMsg.status === 'delivered' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )
                          )}
                          <span className="truncate">
                            {lastMsg ? lastMsg.text : contact.phone || contact.role || 'Tap to message'}
                          </span>
                        </div>

                        {contact.unreadCount > 0 && (
                          <span className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs">
                            {contact.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: ACTIVE WHATSAPP CHAT CONVERSATION ── */}
        <div className={`flex-1 flex flex-col bg-[#efeae2] relative min-w-0 ${
          !selectedContact && 'hidden md:flex'
        }`}>
          {selectedContact ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedContact(null)}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 md:hidden"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Avatar */}
                  <div
                    onClick={() => setShowContactDetails((prev) => !prev)}
                    className="cursor-pointer relative"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${selectedContact.avatarColor}`}>
                      {selectedContact.avatarText}
                    </div>
                    {selectedContact.onlineStatus === 'online' && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  {/* Name and Status */}
                  <div
                    onClick={() => setShowContactDetails((prev) => !prev)}
                    className="min-w-0 cursor-pointer"
                  >
                    <span className="font-bold text-sm text-slate-900 truncate block">
                      {selectedContact.name}
                    </span>
                    <span className={`text-[11px] font-medium block truncate ${
                      selectedContact.onlineStatus === 'online' ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                    }`}>
                      {selectedContact.type} • {selectedContact.onlineStatus === 'online' ? 'online' : 'offline'}
                    </span>
                  </div>
                </div>

                {/* Right Action Icons: Info, Close */}
                <div className="flex items-center gap-2">

                  {/* Contact Info Drawer Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowContactDetails((prev) => !prev)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      showContactDetails ? 'bg-slate-300/80 text-slate-900' : 'text-slate-600 hover:bg-slate-200/80'
                    }`}
                    title="Contact Details"
                  >
                    <User className="w-4 h-4" />
                  </button>

                  {/* Close modal */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Thread Messages Area with authentic doodle background */}
              <div 
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3"
                style={{
                  backgroundImage: `radial-gradient(#cbd5e1 0.75px, transparent 0.75px)`,
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Security End-to-End Encryption Banner */}
                <div className="flex justify-center my-2">
                  <div className="px-3.5 py-1.5 bg-[#ffeecd] text-[#54656f] rounded-lg text-[10px] font-medium shadow-2xs max-w-sm text-center flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-amber-700 shrink-0" />
                    <span>Messages are end-to-end synchronized in real-time.</span>
                  </div>
                </div>

                {/* Date Divider Chip */}
                <div className="flex justify-center my-2">
                  <span className="px-2.5 py-1 bg-white/80 backdrop-blur-xs text-slate-600 rounded-md text-[10.5px] font-bold shadow-2xs uppercase tracking-wider">
                    Today
                  </span>
                </div>

                {/* Messages List */}
                {messages.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full bg-white/80 shadow-xs flex items-center justify-center mx-auto mb-2 text-emerald-600">
                      <MessageSquare className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <p className="font-bold text-xs text-slate-700">No messages yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Say hello to {selectedContact.name} ({selectedContact.phone || selectedContact.type}) to initiate client conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] w-fit rounded-xl px-2.5 py-1.5 shadow-2xs relative select-text break-words ${
                            isMe
                              ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs'
                              : 'bg-white text-slate-900 rounded-tl-xs'
                          }`}
                        >
                          {/* Sender name for received messages */}
                          {!isMe && (
                            <span className="block text-[10.5px] font-bold text-emerald-800 mb-0.5">
                              {msg.senderName} {msg.senderRole && `• ${msg.senderRole}`}
                            </span>
                          )}

                          {/* Attachment if present */}
                          {msg.attachment && (
                            <div className="mb-1 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                              {msg.attachment.type === 'image' ? (
                                <img
                                  src={msg.attachment.url}
                                  alt={msg.attachment.name}
                                  className="max-h-60 w-auto object-cover rounded-lg"
                                />
                              ) : (
                                <div className="p-2 flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <span className="font-bold text-xs truncate block text-slate-900">
                                      {msg.attachment.name}
                                    </span>
                                    {msg.attachment.size && (
                                      <span className="text-[10px] text-slate-500">
                                        {msg.attachment.size}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Authentic WhatsApp Bubble Layout: Text + inline spacer + pinned bottom-right timestamp */}
                          <div className="relative inline-block max-w-full text-[13px] text-slate-900 leading-snug">
                            {msg.text && (
                              <span className="whitespace-pre-wrap break-words align-baseline">
                                {msg.text}
                              </span>
                            )}

                            {/* Spacer to guarantee the timestamp never overlaps the text */}
                            <span className="inline-block w-[64px] h-[13px] pointer-events-none select-none" />

                            {/* Timestamp and Sent/Read Ticks on bottom right */}
                            <span className="absolute bottom-0 right-0 inline-flex items-center gap-1 text-[10px] text-slate-500 select-none pb-0.5 pl-1.5">
                              <span>{formatMsgTime(msg.timestamp)}</span>
                              {isMe && (
                                msg.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Pending Attachment Preview */}
                {pendingAttachment && (
                  <div className="flex justify-end">
                    <div className="p-2.5 bg-[#d9fdd3] rounded-2xl shadow-xs border border-emerald-300 max-w-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-emerald-800">Ready to send:</span>
                        <button
                          type="button"
                          onClick={() => setPendingAttachment(null)}
                          className="text-slate-500 hover:text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {pendingAttachment.type === 'image' ? (
                        <img src={pendingAttachment.url} alt="preview" className="rounded-lg max-h-36 object-cover" />
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-white/70 rounded-lg">
                          <FileText className="w-5 h-5 text-rose-600" />
                          <span className="text-xs truncate font-medium">{pendingAttachment.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div className="p-2.5 bg-white border-t border-slate-200 flex flex-wrap gap-2 animate-in slide-in-from-bottom-2 duration-150">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setInputText((prev) => prev + emoji)}
                      className="text-xl p-1.5 hover:bg-slate-100 rounded-lg transition-transform hover:scale-125 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom Message Input Bar */}
              <div className="p-2.5 sm:p-3 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center gap-2 shrink-0">
                {/* Emoji button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    showEmojiPicker ? 'bg-slate-300 text-slate-900' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                  }`}
                  title="Emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Attachment Clip button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Attach file or photo"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Text Input */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-2.5 bg-white rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs border border-transparent focus:border-emerald-400 transition-all"
                  />
                </div>

                {/* Voice Note Recording Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsRecordingVoice((prev) => !prev);
                    if (!isRecordingVoice) {
                      onShowToast?.('Voice note recording started...');
                    } else {
                      onShowToast?.('Voice note sent!');
                      sendChatMessage(selectedContact, `🎤 Voice Message (${recordingSeconds}s)`);
                      const updatedMsgs = getThreadMessages(selectedContact.id, selectedContact.name);
                      setMessages(updatedMsgs);
                    }
                  }}
                  className={`p-2.5 rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    isRecordingVoice
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                  }`}
                  title={isRecordingVoice ? 'Stop and send voice note' : 'Record voice note'}
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* Send Button (Always visible in UI) */}
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() && !pendingAttachment}
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 font-bold text-xs select-none ${
                    inputText.trim() || pendingAttachment
                      ? 'bg-[#00a884] hover:bg-[#008f6f] active:scale-95 text-white shadow-md cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-80'
                  }`}
                  title="Send message (Enter)"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            </>
          ) : (
            /* Empty State / Welcome Screen when no contact selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f0f2f5]">
              <div className="w-20 h-20 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                <MessageSquare className="w-10 h-10 stroke-[1.8]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-display">
                Booshnam Real-Time Chat & Client Messaging
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
                Connect with project clients, parties, subcontractors, vendors, and staff members instantly with real-time delivery and Cloudflare Edge synchronization.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Encrypted & Cloudflare Durable Objects Enabled</span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT CONTACT DETAILS DRAWER (Optional slide-in) ── */}
        {showContactDetails && selectedContact && (
          <div className="w-72 sm:w-80 bg-white border-l border-[#e9edef] flex flex-col p-4 overflow-y-auto animate-in slide-in-from-right-4 duration-200 shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-xs text-slate-800">Contact Details</span>
              <button
                type="button"
                onClick={() => setShowContactDetails(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-5 flex flex-col items-center text-center border-b border-slate-100">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shadow-md ${selectedContact.avatarColor}`}>
                {selectedContact.avatarText}
              </div>
              <h4 className="font-bold text-sm text-slate-900 mt-3">{selectedContact.name}</h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mt-1">
                {selectedContact.type}
              </span>
              {selectedContact.phone && (
                <span className="text-xs text-slate-500 mt-1">{selectedContact.phone}</span>
              )}
            </div>

            {/* Party Details & Balance */}
            <div className="py-3 space-y-3 text-xs">
              {selectedContact.email && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                  <p className="text-slate-800 font-medium mt-0.5">{selectedContact.email}</p>
                </div>
              )}

              {selectedContact.balanceDue !== undefined && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Party Balance</span>
                  <div className={`text-base font-black mt-0.5 ${
                    selectedContact.balanceDue > 0 ? 'text-emerald-700' : selectedContact.balanceDue < 0 ? 'text-rose-600' : 'text-slate-700'
                  }`}>
                    ₹ {Math.abs(selectedContact.balanceDue).toLocaleString('en-IN')}
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      {selectedContact.balanceDue > 0 ? '(To Receive)' : selectedContact.balanceDue < 0 ? '(To Pay)' : '(Settled)'}
                    </span>
                  </div>
                </div>
              )}

              {selectedContact.activeProjects && selectedContact.activeProjects.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Projects</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedContact.activeProjects.map((p) => (
                      <span key={p} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-200/60">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Call Button */}
              {selectedContact.phone && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <a
                    href={`tel:${selectedContact.phone.replace(/[^0-9+]/g, '')}`}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-600" />
                    <span>Call Contact</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── CLOUDFLARE CONFIGURATION MODAL ── */}
      {showCloudflareModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Cloudflare Real-Time Sync</h4>
                  <p className="text-[10.5px] text-slate-500">Durable Objects & Edge WebSocket Relay</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloudflareModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Cloudflare Worker / Realtime Endpoint URL
                </label>
                <input
                  type="text"
                  placeholder="https://booshnam-chat.togethertech.workers.dev"
                  value={cloudflareConfig.workerUrl}
                  onChange={(e) => setCloudflareConfig({ ...cloudflareConfig, workerUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Cloudflare Durable Object Room Name
                </label>
                <input
                  type="text"
                  placeholder="BooshnamChatRoom"
                  value={cloudflareConfig.durableObjectName || ''}
                  onChange={(e) => setCloudflareConfig({ ...cloudflareConfig, durableObjectName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Real-Time Broadcast Active</span>
                </div>
                <p>
                  Cross-tab real-time syncing via BroadcastChannel is active (0ms latency). Messages immediately sync across all browser tabs and client sessions.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCloudflareModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  saveCloudflareConfig({
                    ...cloudflareConfig,
                    enabled: true,
                    status: 'connected',
                    lastSyncTime: Date.now(),
                  });
                  setShowCloudflareModal(false);
                  onShowToast?.('Cloudflare Realtime settings saved & connected');
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
