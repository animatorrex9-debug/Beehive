import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  Search, 
  MessageSquare, 
  Shield, 
  UserPlus, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useCurrency } from '../../../hooks/useCurrency';
import { handleFirestoreError, OperationType } from '../../../lib/firebase';

export const ChatPage = () => {
  const { user, userData, isAdmin } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [manager, setManager] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isManager = userData?.role === 'manager' || userData?.role === 'account_manager';

  // Fetch chats for managers and admins
  useEffect(() => {
    if (!user || (!isManager && !isAdmin)) return;

    let q;
    if (isAdmin) {
      q = query(collection(db, 'chats'), orderBy('lastMessageTimestamp', 'desc'));
    } else {
      q = query(
        collection(db, 'chats'), 
        where('managerId', '==', user.uid),
        orderBy('lastMessageTimestamp', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(chatData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'chats');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isManager, isAdmin]);

  // Fetch or create chat for regular users
  useEffect(() => {
    if (!user || isManager || isAdmin) return;

    const fetchUserChat = async () => {
      try {
        const q = query(collection(db, 'chats'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const chatDoc = snapshot.docs[0];
          setSelectedChat({ id: chatDoc.id, ...chatDoc.data() });
          setView('chat');
        } else {
          // No chat yet, wait for manager assignment or create a support chat
          if (userData?.managerId) {
            const newChatRef = await addDoc(collection(db, 'chats'), {
              userId: user.uid,
              managerId: userData.managerId,
              participants: [user.uid, userData.managerId],
              lastMessage: 'Chat started',
              lastMessageTimestamp: serverTimestamp(),
              unreadCount: { [user.uid]: 0, [userData.managerId]: 0 }
            });
            setSelectedChat({ 
              id: newChatRef.id, 
              userId: user.uid, 
              managerId: userData.managerId,
              participants: [user.uid, userData.managerId]
            });
            setView('chat');
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'chats');
      } finally {
        setLoading(false);
      }
    };

    fetchUserChat();
  }, [user, isManager, isAdmin, userData?.managerId]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;

    const q = query(
      collection(db, `chats/${selectedChat.id}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgData);
      scrollToBottom();
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `chats/${selectedChat.id}/messages`);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  // Fetch manager details for users
  useEffect(() => {
    if (selectedChat && !isManager && !isAdmin) {
      const fetchManager = async () => {
        if (selectedChat.managerId) {
          const docSnap = await getDoc(doc(db, 'users', selectedChat.managerId));
          if (docSnap.exists()) {
            setManager(docSnap.data());
          }
        }
      };
      fetchManager();
    }
  }, [selectedChat, isManager, isAdmin]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
        senderId: user.uid,
        text: messageText,
        timestamp: serverTimestamp(),
        read: false
      });

      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: messageText,
        lastMessageTimestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '>=', searchQuery),
        where('email', '<=', searchQuery + '\uf8ff'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const startChatWithUser = async (targetUser: any) => {
    // Check if chat already exists
    const q = query(
      collection(db, 'chats'),
      where('userId', '==', targetUser.id),
      where('managerId', '==', user?.uid)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      setSelectedChat({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
    } else {
      const newChatRef = await addDoc(collection(db, 'chats'), {
        userId: targetUser.id,
        managerId: user?.uid,
        participants: [user?.uid, targetUser.id],
        lastMessage: 'Chat started',
        lastMessageTimestamp: serverTimestamp(),
        unreadCount: { [user?.uid || '']: 0, [targetUser.id]: 0 }
      });
      setSelectedChat({ 
        id: newChatRef.id, 
        userId: targetUser.id, 
        managerId: user?.uid,
        participants: [user?.uid || '', targetUser.id]
      });
    }
    setView('chat');
    setSearchQuery('');
    setSearchResults([]);
  };

  const assignManagerToUser = async (userId: string, managerId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { managerId });
      // Also update or create chat
      const q = query(collection(db, 'chats'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        await updateDoc(doc(db, 'chats', snapshot.docs[0].id), {
          managerId,
          participants: [userId, managerId]
        });
      } else {
        await addDoc(collection(db, 'chats'), {
          userId,
          managerId,
          participants: [userId, managerId],
          lastMessage: 'Manager assigned',
          lastMessageTimestamp: serverTimestamp()
        });
      }
      alert('Manager assigned successfully!');
    } catch (err) {
      console.error('Assignment error:', err);
      alert('Failed to assign manager.');
    }
  };

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800">
      {/* Sidebar - Chat List */}
      <AnimatePresence mode="wait">
        {(view === 'list' || !isManager && !isAdmin) && (
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className={`w-full lg:w-96 border-r border-gray-100 dark:border-zinc-800 flex flex-col ${view === 'chat' ? 'hidden lg:flex' : 'flex'}`}
          >
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
              <h2 className="text-2xl font-black tracking-tighter uppercase dark:text-white mb-4">Messages</h2>
              {(isManager || isAdmin) && (
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-sm focus:ring-2 focus:ring-accent outline-none transition-all"
                  />
                </div>
              )}
            </div>

            <div className="flex-grow overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Search Results</p>
                  {searchResults.map(res => (
                    <button
                      key={res.id}
                      onClick={() => startChatWithUser(res)}
                      className="w-full p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-4 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center font-black">
                        {res.fullName?.[0] || res.email?.[0].toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="font-bold dark:text-white">{res.fullName || res.email}</p>
                        <p className="text-xs text-gray-500">{res.role || 'User'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : chats.length > 0 ? (
                <div className="p-4 space-y-2">
                  {chats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        setSelectedChat(chat);
                        setView('chat');
                      }}
                      className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group ${
                        selectedChat?.id === chat.id ? 'bg-accent text-white' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${
                        selectedChat?.id === chat.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'
                      }`}>
                        <User className="w-6 h-6" />
                      </div>
                      <div className="text-left flex-grow overflow-hidden">
                        <div className="flex justify-between items-center mb-1">
                          <p className={`font-bold truncate ${selectedChat?.id === chat.id ? 'text-white' : 'dark:text-white'}`}>
                            {chat.userId === user?.uid ? 'Account Manager' : `User: ${chat.userId?.slice(0, 8) || 'Unknown'}`}
                          </p>
                          <span className={`text-[10px] ${selectedChat?.id === chat.id ? 'text-white/60' : 'text-gray-400'}`}>
                            {chat.lastMessageTimestamp?.toDate ? new Date(chat.lastMessageTimestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${selectedChat?.id === chat.id ? 'text-white/80' : 'text-gray-500'}`}>
                          {chat.lastMessage}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-200 mb-4" />
                  <p className="text-gray-400 font-bold">No conversations yet</p>
                  <p className="text-xs text-gray-500 mt-2">Search for a user to start chatting</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className={`flex-grow flex flex-col ${view === 'list' && (isManager || isAdmin) ? 'hidden lg:flex' : 'flex'}`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                {(isManager || isAdmin) && (
                  <button onClick={() => setView('list')} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-all">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center font-black">
                  {isManager || isAdmin ? <User className="w-6 h-6" /> : (manager?.fullName?.[0] || 'M')}
                </div>
                <div>
                  <h3 className="font-black tracking-tight dark:text-white uppercase">
                    {isManager || isAdmin ? `Chat with User` : (manager?.fullName || 'Account Manager')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl text-gray-400 transition-all">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl text-gray-400 transition-all">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl text-gray-400 transition-all">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-zinc-900/30">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm ${
                        isMe 
                          ? 'bg-accent text-white rounded-tr-none' 
                          : 'bg-white dark:bg-zinc-800 dark:text-white rounded-tl-none border border-gray-100 dark:border-zinc-700'
                      }`}>
                        {msg.text}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-1">
                        {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
              <form onSubmit={handleSendMessage} className="relative">
                <input 
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full pl-6 pr-16 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-sm focus:ring-2 focus:ring-accent outline-none transition-all dark:text-white"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-accent text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center p-12 text-center space-y-6">
            <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center text-accent">
              <MessageSquare className="w-12 h-12" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-2">Your Personal Advisor</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {isManager || isAdmin 
                  ? "Select a conversation from the list or search for a user to start chatting."
                  : "We're assigning a dedicated account manager to your profile. You'll be able to chat here shortly."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Admin Panel - Right Sidebar (Optional) */}
      {isAdmin && selectedChat && (
        <div className="hidden xl:flex w-80 border-l border-gray-100 dark:border-zinc-800 flex-col p-6 space-y-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Shield className="w-3 h-3" />
            Admin Controls
          </h3>
          
          <div className="space-y-4">
            <p className="text-xs font-bold dark:text-white uppercase tracking-wider">Assign Manager</p>
            <div className="space-y-2">
              <button 
                onClick={() => assignManagerToUser(selectedChat.userId, user?.uid || '')}
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 text-xs font-bold hover:bg-accent hover:text-white transition-all text-left flex items-center justify-between group"
              >
                Assign to Me
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <p className="text-[10px] text-gray-400 italic">More managers coming soon...</p>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 dark:border-zinc-800">
            <p className="text-xs font-bold dark:text-white uppercase tracking-wider mb-4">Chat Info</p>
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-gray-400">User ID</span>
                <span className="dark:text-white">{selectedChat.userId?.slice(0, 12) || 'None'}...</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-gray-400">Manager ID</span>
                <span className="dark:text-white">{selectedChat.managerId?.slice(0, 12) || 'None'}...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
