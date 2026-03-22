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
  ArrowLeft
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
  updateDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showList, setShowList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch users assigned to this manager
    const usersQuery = query(
      collection(db, 'users'),
      where('managerId', '==', user.uid)
    );

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignedUsers(usersList);
      setLoading(false);
    });

    return () => unsubscribeUsers();
  }, [user]);

  useEffect(() => {
    if (!selectedUser || !user) {
      setMessages([]);
      setChatId(null);
      return;
    }

    // Find or create chat with this user
    const findChat = async () => {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('userId', '==', selectedUser.id),
        where('managerId', '==', user.uid),
        limit(1)
      );

      const chatSnapshot = await getDocs(chatsQuery);
      let currentChatId = '';

      if (chatSnapshot.empty) {
        // Create new chat
        const newChat = await addDoc(collection(db, 'chats'), {
          userId: selectedUser.id,
          managerId: user.uid,
          participants: [selectedUser.id, user.uid],
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageAt: serverTimestamp()
        });
        currentChatId = newChat.id;
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !user) return;

    const messageText = newMessage;
    setNewMessage('');
    setIsEmojiPickerOpen(false);

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: messageText,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        read: false,
        type: 'text'
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId || !user) return;

    setIsUploading(true);
    
    // Simulate upload delay
    setTimeout(async () => {
      try {
        const messageText = `Sent a file: ${file.name}`;
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          text: messageText,
          senderId: user.uid,
          timestamp: serverTimestamp(),
          read: false,
          type: 'file',
          fileName: file.name,
          fileSize: file.size
        });

        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: messageText,
          lastMessageAt: serverTimestamp()
        });
        
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('Error uploading file:', error);
        setIsUploading(false);
      }
    }, 1500);
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
      console.error('Error updating status:', error);
    }
  };

  const handleClearChat = async () => {
    if (!chatId) return;
    alert('Chat history cleared (simulated)');
    setIsMoreMenuOpen(false);
  };

  const filteredUsers = assignedUsers.filter(u => 
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full p-2 sm:p-4 lg:p-6 pb-20 lg:pb-6 flex flex-col">
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
                <button onClick={() => setShowList(false)} className="p-2 text-zinc-400 hover:text-accent">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-accent transition-colors" />
                <input 
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-accent/30 rounded-xl text-xs transition-all dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar">
              <div className="p-2 space-y-0.5">
                {filteredUsers.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-5 h-5 text-zinc-300" />
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 italic">No clients</p>
                  </div>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        if (window.innerWidth < 768) setShowList(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all relative group ${
                        selectedUser?.id === u.id 
                          ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${
                        selectedUser?.id === u.id ? 'border-white/20 bg-white/10' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950'
                      }`}>
                        <UserIcon className={`w-4 h-4 ${selectedUser?.id === u.id ? 'text-white' : 'text-zinc-400'}`} />
                      </div>
                      <div className="flex-grow text-left min-w-0">
                        <p className={`font-bold text-xs truncate ${selectedUser?.id === u.id ? 'text-white' : 'dark:text-white'}`}>
                          {u.fullName || 'Anonymous'}
                        </p>
                        <p className={`text-[8px] font-mono truncate opacity-60`}>
                          {u.email}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-grow flex flex-col bg-white dark:bg-zinc-950 relative min-w-0 w-full">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shadow-sm z-10">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <button 
                  onClick={() => setShowList(!showList)}
                  className={`p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all text-zinc-400 hover:text-accent ${showList ? 'md:hidden' : ''}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 flex-shrink-0 shadow-sm">
                  <UserIcon className="w-6 h-6 text-zinc-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm md:text-base font-black tracking-tight dark:text-white uppercase truncate">{selectedUser.fullName}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.kycStatus === 'verified' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                      KYC: {selectedUser.kycStatus || 'unverified'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <button 
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-accent transition-colors"
                >
                  <Settings className="w-4 h-4 md:w-5 h-5" />
                </button>
                <div className="relative" ref={moreMenuRef}>
                  <button 
                    onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-accent transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 md:w-5 h-5" />
                  </button>
                  
                  <AnimatePresence>
                    {isMoreMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
                      >
                        <div className="p-1">
                          <button 
                            onClick={handleClearChat}
                            className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            Clear History
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 md:p-8 space-y-6 bg-zinc-50/30 dark:bg-zinc-950/30 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <MessageSquare className="w-12 h-12 mb-2" />
                  <p className="font-mono text-[10px] uppercase tracking-widest">No messages</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.uid;
                  const showDate = idx === 0 || (messages[idx-1] && format(messages[idx-1].timestamp?.toMillis() || 0, 'yyyy-MM-dd') !== format(msg.timestamp?.toMillis() || 0, 'yyyy-MM-dd'));
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && msg.timestamp && (
                        <div className="flex justify-center my-8">
                          <span className="px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                            {format(msg.timestamp.toMillis(), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] md:max-w-[70%] group relative`}>
                          <div className={`rounded-2xl px-4 py-3 shadow-sm border text-sm ${
                            isMe 
                              ? 'bg-accent border-accent text-white rounded-tr-none' 
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 dark:text-white rounded-tl-none'
                          }`}>
                            {msg.type === 'file' ? (
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                                  <Paperclip className="w-4 h-4" />
                                </div>
                                <div className="flex-grow min-w-0">
                                  <p className="text-xs font-bold truncate">{msg.fileName}</p>
                                  <p className="text-[9px] opacity-70">{(msg.fileSize / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                            ) : (
                              <p className="leading-relaxed font-medium">{msg.text}</p>
                            )}
                          </div>
                          <div className={`flex items-center gap-2 mt-1.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[8px] font-mono text-zinc-400 uppercase">
                              {msg.timestamp?.toMillis ? format(msg.timestamp.toMillis(), 'HH:mm') : '...'}
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
              <form onSubmit={handleSendMessage} className="flex items-center gap-3 md:gap-4 max-w-5xl mx-auto">
                <div className="flex items-center gap-1">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-2.5 text-zinc-400 hover:text-accent hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
                    placeholder="Message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full px-5 py-3 bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-accent/20 rounded-2xl text-sm transition-all dark:text-white outline-none font-medium"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 md:w-14 md:h-14 bg-accent text-white rounded-2xl flex items-center justify-center hover:bg-accent/90 disabled:opacity-50 transition-all shadow-lg shadow-accent/20 flex-shrink-0 active:scale-95"
                >
                  <Send className="w-6 h-6" />
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
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2 block">KYC Verification Status</label>
                          <div className="grid grid-cols-2 gap-3">
                            {['verified', 'pending', 'rejected', 'unverified'].map((status) => (
                              <button
                                key={status}
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
          </>
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
  </div>
  );
};
