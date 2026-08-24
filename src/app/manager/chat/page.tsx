import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Search, 
  Send, 
  User as UserIcon,
  Settings,
  Bell,
  CheckCircle2,
  Clock,
  ChevronRight,
  MoreVertical,
  Paperclip,
  Smile,
  ArrowLeft,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy, 
  doc, 
  getDoc,
  updateDoc,
  getDocs,
  limit
} from 'supabase/db';
import { db, auth } from '../../../lib/supabase-service';
import { supabase, SUPABASE_BUCKET } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { LoadingLogo } from '../../../components/LoadingLogo';

interface AttachedFile {
  url: string;
  name: string;
  type: string;
  size: number;
}

const getTimestampDate = (ts: any): Date | null => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') {
    try { return ts.toDate(); } catch (e) {}
  }
  if (typeof ts.toMillis === 'function') {
    try { return new Date(ts.toMillis()); } catch (e) {}
  }
  if (typeof ts.seconds === 'number') {
    return new Date(ts.seconds * 1000);
  }
  if (ts instanceof Date) {
    return isNaN(ts.getTime()) ? null : ts;
  }
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const ManagerChatPage = () => {
  const { user, userData } = useAuth();
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2000);

    const loadClients = async () => {
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('managerId', '==', user.uid)
        );

        const unsubscribeUsers = onSnapshot(
          usersQuery, 
          async (snapshot) => {
            if (!isMounted) return;
            let usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Also check chats for assigned clients
            try {
              const chatsQuery = query(
                collection(db, 'chats'),
                where('managerId', '==', user.uid)
              );
              const chatSnap = await getDocs(chatsQuery);
              const chatUserIds = chatSnap.docs
                .map(d => d.data()?.userId)
                .filter((id): id is string => Boolean(id && id !== user.uid));

              for (const cUserId of chatUserIds) {
                if (!usersList.some(u => u.id === cUserId)) {
                  try {
                    const uSnap = await getDoc(doc(db, 'users', cUserId));
                    if (uSnap.exists()) {
                      usersList.push({ id: uSnap.id, ...uSnap.data() });
                    }
                  } catch (e) {}
                }
              }
            } catch (e) {}

            if (isMounted) {
              setAssignedUsers(usersList);
              setLoading(false);
            }
          },
          (err) => {
            console.error('Error fetching manager clients:', err);
            if (isMounted) setLoading(false);
          }
        );

        return unsubscribeUsers;
      } catch (err) {
        console.error('Exception loading manager clients:', err);
        if (isMounted) setLoading(false);
        return () => {};
      }
    };

    let unsubPromise = loadClients();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubPromise.then(unsub => {
        if (unsub) unsub();
      });
    };
  }, [user]);

  useEffect(() => {
    if (!selectedUser || !user) {
      setMessages([]);
      setChatId(null);
      setAttachedFile(null);
      setUploadError(null);
      return;
    }

    setAttachedFile(null);
    setUploadError(null);

    // Find or create chat with this user
    const findChat = async () => {
      try {
        const chatsQuery = query(
          collection(db, 'chats'),
          where('userId', '==', selectedUser.id),
          where('managerId', '==', user.uid),
          limit(1)
        );

        const chatSnapshot = await getDocs(chatsQuery);
        let currentChatId = '';

        if (chatSnapshot.empty) {
          // Check if any chat exists for this user
          const userChatQuery = query(
            collection(db, 'chats'),
            where('userId', '==', selectedUser.id),
            limit(1)
          );
          const userChatSnap = await getDocs(userChatQuery);

          if (!userChatSnap.empty) {
            currentChatId = userChatSnap.docs[0].id;
            try {
              await updateDoc(doc(db, 'chats', currentChatId), {
                managerId: user.uid
              });
            } catch (e) {}
          } else {
            // Create new chat
            const newChat = await addDoc(collection(db, 'chats'), {
              userId: selectedUser.id,
              managerId: user.uid,
              participants: [selectedUser.id, user.uid],
              createdAt: serverTimestamp(),
              lastMessage: '',
              lastMessageTimestamp: serverTimestamp()
            });
            currentChatId = newChat.id;
          }
        } else {
          currentChatId = chatSnapshot.docs[0].id;
        }

        setChatId(currentChatId);

        // Listen for messages in this chat
        const messagesQuery = query(
          collection(db, 'chats', currentChatId, 'messages'),
          orderBy('timestamp', 'asc')
        );

        const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMessages(msgs);
          scrollToBottom();
        });

        return unsubscribeMessages;
      } catch (err) {
        console.error('Error finding/subscribing chat:', err);
        return () => {};
      }
    };

    let unsubscribe: any;
    findChat().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedUser, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachedFile) || !user) return;

    let activeChatId = chatId;
    if (!activeChatId && selectedUser) {
      try {
        const newChat = await addDoc(collection(db, 'chats'), {
          userId: selectedUser.id,
          managerId: user.uid,
          participants: [selectedUser.id, user.uid],
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageTimestamp: serverTimestamp()
        });
        activeChatId = newChat.id;
        setChatId(activeChatId);
      } catch (err) {
        console.error('Error initiating chat on message send:', err);
        return;
      }
    }

    if (!activeChatId) return;

    const messageText = newMessage.trim();
    const fileData = attachedFile;
    setNewMessage('');
    setAttachedFile(null);
    setUploadError(null);
    setIsEmojiPickerOpen(false);

    try {
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
        text: messageText || (fileData ? (fileData.type.startsWith('image/') ? 'Image attachment' : `File: ${fileData.name}`) : ''),
        senderId: user.uid,
        senderName: userData?.fullName || 'Account Manager',
        senderRole: 'account_manager',
        timestamp: serverTimestamp(),
        read: false,
        type: fileData ? 'file' : 'text',
        fileUrl: fileData?.url || null,
        fileName: fileData?.name || null,
        fileSize: fileData?.size || null,
        fileType: fileData?.type || null
      });

      const previewSummary = fileData
        ? (fileData.type.startsWith('image/') ? '📷 Image' : `📎 ${fileData.name}`)
        : messageText;

      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: previewSummary,
        lastMessageAt: serverTimestamp(),
        lastMessageTimestamp: serverTimestamp()
      });
      
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error instanceof Error ? error.message : String(error));
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds the 25MB limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop() || 'bin';
      const fileName = `${user.uid}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const targetChatId = chatId || 'general';
      const filePath = `chats/${targetChatId}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, file);

      if (uploadErr) {
        console.warn('Storage bucket notice:', uploadErr);
      }

      const { data: { publicUrl: url } } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(filePath);

      setAttachedFile({
        url: url || '',
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size
      });
    } catch (error) {
      console.warn('Upload fallback to dataURL:', error);
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachedFile({
            url: reader.result as string,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size
          });
        };
        reader.readAsDataURL(file);
      } catch (readErr) {
        setUploadError('Could not process attachment. Please try again.');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateUserStatus = async (status: string) => {
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        kycStatus: status
      });
      setSelectedUser({ ...selectedUser, kycStatus: status });
      setIsSettingsModalOpen(false);
    } catch (error) {
      console.error('Error updating status:', error instanceof Error ? error.message : String(error));
    }
  };

  const filteredUsers = assignedUsers.filter(u => 
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingLogo size="lg" />
      </div>
    );
  }

  return (
    <div className="flex-grow p-2 sm:p-4 lg:p-6 pb-20 lg:pb-6 flex flex-col min-h-0">
      <div className="flex-grow flex bg-white dark:bg-zinc-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-zinc-200 dark:border-zinc-800 relative w-full">
        {/* Sidebar - User List */}
        <AnimatePresence initial={false}>
          {showList && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900 overflow-hidden z-20 absolute md:relative inset-y-0 left-0 md:inset-auto"
            >
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="font-black tracking-tighter uppercase text-xs dark:text-white opacity-50">Clients</h3>
                {typeof window !== 'undefined' && window.innerWidth < 768 && selectedUser && (
                  <button type="button" onClick={() => setShowList(false)} className="p-2 text-zinc-400 hover:text-accent">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-accent transition-colors" />
                  <input 
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 rounded-xl text-xs focus:border-accent outline-none transition-all dark:text-white"
                  />
                </div>
              </div>

              <div className="flex-grow overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-xs">
                    No clients assigned yet
                  </div>
                ) : (
                  filteredUsers.map((client) => {
                    const isSelected = selectedUser?.id === client.id;
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(client);
                          if (typeof window !== 'undefined' && window.innerWidth < 768) setShowList(false);
                        }}
                        className={`w-full p-4 flex items-center gap-3 text-left transition-all relative ${
                          isSelected 
                            ? 'bg-accent/10 dark:bg-accent/20' 
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm uppercase ${
                            isSelected 
                              ? 'bg-accent text-white shadow-lg shadow-accent/30' 
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}>
                            {client.fullName ? client.fullName.substring(0, 2) : 'CL'}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${
                            client.kycStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-accent' : 'dark:text-white'}`}>
                              {client.fullName || client.email?.split('@')[0] || 'Unknown User'}
                            </h4>
                          </div>
                          <p className="text-[10px] text-zinc-400 truncate">{client.email}</p>
                        </div>
                        {isSelected && (
                          <div className="w-1.5 h-6 bg-accent rounded-full absolute left-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Main Area */}
        {selectedUser ? (
          <div className="flex-grow flex flex-col min-w-0 bg-zinc-50/50 dark:bg-zinc-950 relative">
            {/* Header */}
            <div className="p-4 md:px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setShowList(!showList)} 
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
                >
                  <Users className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent font-black text-xs flex items-center justify-center uppercase">
                    {selectedUser.fullName ? selectedUser.fullName.substring(0, 2) : 'CL'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight dark:text-white flex items-center gap-2">
                      {selectedUser.fullName || selectedUser.email?.split('@')[0]}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        selectedUser.kycStatus === 'verified'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {selectedUser.kycStatus || 'Unverified'}
                      </span>
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-mono">{selectedUser.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 relative">
                <button 
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-2.5 text-zinc-400 hover:text-accent hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
                  title="Client Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Flow */}
            <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-black dark:text-white uppercase tracking-tight mb-1">Direct Chat Channel</h4>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    This is a secure direct channel between you and {selectedUser.fullName || selectedUser.email}. Messages and files sent here are private.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.uid;
                  const currentDate = getTimestampDate(msg.timestamp);
                  const prevDate = idx > 0 ? getTimestampDate(messages[idx - 1]?.timestamp) : null;
                  const showDate = idx === 0 || (currentDate && (!prevDate || format(prevDate, 'yyyy-MM-dd') !== format(currentDate, 'yyyy-MM-dd')));
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && currentDate && (
                        <div className="flex justify-center my-6">
                          <span className="px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                            {format(currentDate, 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] md:max-w-[70%] group relative`}>
                          <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isMe ? 'text-accent' : 'text-zinc-400'}`}>
                              {isMe ? 'Account Manager' : 
                               msg.senderId === selectedUser?.id ? (selectedUser.fullName || 'Client') : 
                               'System Admin'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                              isMe ? 'bg-blue-500/10 text-blue-500' :
                              msg.senderId === selectedUser?.id ? 'bg-emerald-500/10 text-emerald-500' :
                              'bg-zinc-500/10 text-zinc-500'
                            }`}>
                              {isMe ? 'Manager' : msg.senderId === selectedUser?.id ? 'Client' : 'Admin'}
                            </span>
                          </div>
                          <div className={`rounded-2xl px-4 py-3 shadow-sm border text-sm ${
                            isMe 
                              ? 'bg-accent border-accent text-white rounded-tr-none' 
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 dark:text-white rounded-tl-none'
                          }`}>
                            {msg.type === 'file' || msg.fileUrl ? (
                              <div className="space-y-2">
                                {msg.fileType?.startsWith('image/') ? (
                                  <div className="rounded-xl overflow-hidden max-w-sm">
                                    <img 
                                      src={msg.fileUrl} 
                                      alt={msg.fileName || 'Attachment'} 
                                      className="max-w-full rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                                      onClick={() => window.open(msg.fileUrl, '_blank', 'noopener,noreferrer')}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20 text-white' : 'bg-accent/10 text-accent'}`}>
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="flex-grow min-w-0">
                                      <p className="text-xs font-bold truncate">{msg.fileName || 'Attachment'}</p>
                                      {msg.fileSize && <p className="text-[10px] opacity-75">{(msg.fileSize / 1024).toFixed(1)} KB</p>}
                                      <a 
                                        href={msg.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`text-[10px] font-black uppercase tracking-widest underline mt-1 inline-block ${isMe ? 'text-white' : 'text-accent'}`}
                                      >
                                        Download File
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {msg.text && !msg.text.startsWith('Sent a file:') && !msg.text.startsWith('File:') && !msg.text.startsWith('Image attachment') && (
                                  <p className="leading-relaxed font-medium pt-1 border-t border-white/10 dark:border-zinc-800">{msg.text}</p>
                                )}
                              </div>
                            ) : (
                              <p className="leading-relaxed font-medium whitespace-pre-wrap">{msg.text}</p>
                            )}
                          </div>
                          <div className={`flex items-center gap-2 mt-1.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[8px] font-mono text-zinc-400 uppercase">
                              {currentDate ? format(currentDate, 'HH:mm') : '...'}
                            </span>
                            {isMe && (
                              <CheckCircle2 className={`w-2.5 h-2.5 ${msg.read ? 'text-accent' : 'text-zinc-300'}`} />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shadow-sm">
              {/* Attachment Preview Bar */}
              <AnimatePresence>
                {attachedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 10, height: 0 }}
                    className="mb-3 p-3 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl flex items-center justify-between border border-zinc-200 dark:border-zinc-700 max-w-5xl mx-auto"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {attachedFile.type.startsWith('image/') ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/5 flex-shrink-0">
                          <img src={attachedFile.url} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold dark:text-white truncate max-w-[240px] md:max-w-md">{attachedFile.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {(attachedFile.size / 1024).toFixed(1)} KB • Ready to send
                        </p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 max-w-5xl mx-auto">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                  <button type="button" onClick={() => setUploadError(null)} className="ml-auto text-xs underline">Dismiss</button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-3 md:gap-4 max-w-5xl mx-auto">
                <div className="flex items-center gap-1">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    id="manager-chat-file-upload"
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-2.5 text-zinc-400 hover:text-accent hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all disabled:opacity-50"
                    title="Attach file or image"
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    ) : (
                      <Paperclip className="w-5 h-5" />
                    )}
                  </button>
                  <div className="relative" ref={emojiPickerRef}>
                    <button 
                      type="button" 
                      onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                      className="p-2.5 text-zinc-400 hover:text-accent hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all hidden md:block"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    
                    {isEmojiPickerOpen && (
                      <div className="absolute bottom-full left-0 mb-4 z-50 shadow-2xl">
                        <EmojiPicker 
                          onEmojiClick={onEmojiClick}
                          theme={document.documentElement.classList.contains('dark') ? 'dark' as any : 'light' as any}
                          width={300}
                          height={400}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-grow">
                  <input 
                    type="text"
                    placeholder="Type message or attach a file..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full px-5 py-3 bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-accent/20 rounded-2xl text-sm transition-all dark:text-white outline-none font-medium"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={(!newMessage.trim() && !attachedFile) || isUploading}
                  className="w-12 h-12 md:w-14 md:h-14 bg-accent text-white rounded-2xl flex items-center justify-center hover:bg-accent/90 disabled:opacity-40 transition-all shadow-lg shadow-accent/20 flex-shrink-0 active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>

            {/* Settings Modal */}
            <AnimatePresence>
              {isSettingsModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase">User Settings</h3>
                        <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl">
                          <X className="w-5 h-5 text-zinc-400" />
                        </button>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2 block">KYC Verification Status</label>
                          <div className="grid grid-cols-2 gap-3">
                            {['verified', 'pending', 'rejected', 'unverified'].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleUpdateUserStatus(status)}
                                className={`px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                  selectedUser.kycStatus === status
                                    ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20'
                                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-500 hover:border-accent/30'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700">
                          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3">Account Overview</p>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-zinc-500">Wallet Balance</span>
                              <span className="text-xs font-bold dark:text-white">${selectedUser.walletBalance?.toLocaleString() || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-zinc-500">Savings</span>
                              <span className="text-xs font-bold dark:text-white">${selectedUser.savings?.toLocaleString() || '0.00'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center p-12 text-center bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
            <div className="w-24 h-24 bg-accent/10 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-inner border border-accent/20">
              <MessageSquare className="w-12 h-12 text-accent" />
            </div>
            <h2 className="text-4xl font-black tracking-tighter dark:text-white mb-4 uppercase">Select a Client</h2>
            <p className="text-zinc-500 max-w-md mx-auto text-sm leading-relaxed italic">
              Choose a client from the list on the left to start a secure conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
