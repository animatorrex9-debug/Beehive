import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, addDoc, where, increment, setDoc, orderBy, getDocs } from 'supabase/db';
import { db, handleSupabaseError as handleFirestoreError, OperationType } from '../../lib/supabase-service';
import { useAuth } from '../../hooks/useAuth';
import { CurrencyInfo, getCurrencyByCountry, DEFAULT_CURRENCY, useCurrency } from '../../context/CurrencyContext';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { AdminCharityTab } from '../../components/admin/AdminCharityTab';
import { 
  CheckCircle, 
  CheckCircle2,
  XCircle, 
  Users, 
  FileText, 
  TrendingUp, 
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  LogOut,
  UserCheck,
  Edit3,
  Save,
  AlertCircle,
  Eye,
  ChevronDown,
  Wallet,
  Plus,
  Award,
  X,
  ArrowDownLeft,
  Building2,
  MessageSquare,
  Send,
  Paperclip,
  Heart,
  Smile,
  User as UserIcon,
  ArrowLeft,
  RefreshCw,
  Clock,
  Loader2,
  Download,
  Image as ImageIcon,
  CreditCard,
  Trash2
} from 'lucide-react';
import { auth } from '../../lib/supabase-service';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useRef } from 'react';
import { supabase, SUPABASE_BUCKET } from '../../lib/supabase';
import { compressImageFile, isImageLike } from '../../lib/image-compressor';

export const AdminPage = () => {
  const { user, userData, isAdmin, loading: authLoading } = useAuth();
  const { rates, convertAmount } = useCurrency();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [pendingKYCs, setPendingKYCs] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [taxRefunds, setTaxRefunds] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'loans' | 'kyc' | 'deposits' | 'banks' | 'cards' | 'wallet' | 'managers' | 'grants' | 'chats' | 'tax-refunds' | 'charity'>('dashboard');
  const [selectedKYC, setSelectedKYC] = useState<any | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<any | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedGrant, setSelectedGrant] = useState<any | null>(null);
  const [selectedTaxRefund, setSelectedTaxRefund] = useState<any | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [isTaxRefundModalOpen, setIsTaxRefundModalOpen] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [adminProfileForm, setAdminProfileForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    address2: '',
    country: '',
    dob: '',
    ssn: '',
    employmentStatus: '',
    employerName: '',
    jobTitle: '',
    monthlyIncome: '',
    maritalStatus: '',
    stateOfOrigin: '',
    sentry: '',
    walletBalance: 0,
    btcBalance: 0,
    usdtBalance: 0,
    savings: 0,
    investmentBalance: 0,
    grantBalance: 0,
    cardActivated: false
  });
  const [isEditingAdminProfile, setIsEditingAdminProfile] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  // Manager Assignment State
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [selectedTargetUserId, setSelectedTargetUserId] = useState('');
  const [assigningManager, setAssigningManager] = useState(false);
  const [selectedAdminAppointUserId, setSelectedAdminAppointUserId] = useState('');
  const [selectedManagerAppointUserId, setSelectedManagerAppointUserId] = useState('');
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoteTargetRole, setPromoteTargetRole] = useState<'account_manager' | 'admin'>('account_manager');
  const [promoteSearchQuery, setPromoteSearchQuery] = useState('');

  // Wallet & Crypto Balance Adjustment State
  const [walletTargetUserId, setWalletTargetUserId] = useState('');
  const [walletAsset, setWalletAsset] = useState<'fiat' | 'usdt' | 'btc'>('fiat');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletNote, setWalletNote] = useState('Admin adjustment');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [walletSuccess, setWalletSuccess] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Helper to format user display labels robustly
  const getUserLabel = (u: any) => {
    if (!u) return 'Unknown User';
    const name = u.fullName || u.full_name || u.displayName || u.name || (u.email ? u.email.split('@')[0] : null) || 'User';
    const emailPart = u.email ? ` (${u.email})` : ` [ID: ${u.id ? u.id.slice(0, 8) : 'No ID'}]`;
    return `${name}${emailPart}`;
  };

  // Helper to retrieve user currency reliably
  const getUserCurrency = (u: any): CurrencyInfo => {
    if (u?.currency && u.currency.code) return u.currency;
    if (u?.country) return getCurrencyByCountry(u.country);
    return DEFAULT_CURRENCY;
  };

  // Global Settings State
  const [usdtAddress, setUsdtAddress] = useState('');
  const [btcAddress, setBtcAddress] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isRefreshingDeposits, setIsRefreshingDeposits] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ url: string, name: string, type: string, size: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (!authLoading && !isAdmin && user) {
      if (userData?.role === 'account_manager') {
        navigate('/manager');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAdmin, authLoading, navigate, user, userData?.role]);

  const handleSignOut = () => {
    auth.signOut();
    navigate('/');
  };

  useEffect(() => {
    if (!user || !isAdmin) return;

    // Listen for settings
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'wallets'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const usdt = data?.usdtAddress || data?.usdt_address || '';
        const btc = data?.btcAddress || data?.btc_address || '';
        if (usdt) setUsdtAddress(usdt);
        if (btc) setBtcAddress(btc);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/wallets');
    });

    // Listen for all users
    let unsubscribeUsers: (() => void) | null = null;
    try {
      const usersQuery = query(collection(db, 'users'));
      unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const userData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(userData);
      }, (err) => {
        if (err.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'users');
        }
      });
    } catch (err) {
      console.error('Error setting up admin users listener:', err instanceof Error ? err.message : String(err));
    }

    // Listen for loans
    let unsubscribeLoans: (() => void) | null = null;
    try {
      const loansQuery = query(collection(db, 'loans'));
      unsubscribeLoans = onSnapshot(loansQuery, (snapshot) => {
        const loanData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLoans(loanData);
      }, (err) => {
        if (err.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'loans');
        }
      });
    } catch (err) {
      console.error('Error setting up admin loans listener:', err instanceof Error ? err.message : String(err));
    }

    // Listen for pending KYCs
    let unsubscribeKYC: (() => void) | null = null;
    try {
      const kycQuery = query(collection(db, 'users'), where('kycStatus', '==', 'pending'));
      unsubscribeKYC = onSnapshot(kycQuery, (snapshot) => {
        const kycData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPendingKYCs(kycData);
        setLoading(false);
      }, (err) => {
        if (err.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'users (kyc)');
        }
        setLoading(false);
      });
    } catch (err) {
      console.error('Error setting up admin KYC listener:', err instanceof Error ? err.message : String(err));
      setLoading(false);
    }

    // Listen for pending deposits
    let unsubscribeDeposits: (() => void) | null = null;
    try {
      const depositsQuery = query(collection(db, 'transactions'));
      unsubscribeDeposits = onSnapshot(depositsQuery, (snapshot) => {
        const depositData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(doc => {
            if (!doc) return false;
            const typeStr = String(doc.type || '').toLowerCase();
            const statusStr = String(doc.status || '').toLowerCase().trim();
            const descStr = String(doc.description || '').toLowerCase();

            // Explicitly exclude any rejected, completed, declined or cancelled deposits
            if (['rejected', 'completed', 'declined', 'cancelled', 'failed'].includes(statusStr)) {
              return false;
            }

            const isDeposit = typeStr.includes('deposit') || 
                              Boolean(doc.depositMethod) || 
                              Boolean(doc.deposit_method) || 
                              Boolean(doc.paymentMethod) || 
                              Boolean(doc.payment_method) || 
                              Boolean(doc.proofOfPayment) || 
                              Boolean(doc.proof_of_payment) || 
                              Boolean(doc.proofImage) || 
                              Boolean(doc.proof_image) || 
                              Boolean(doc.accountDetails) || 
                              Boolean(doc.account_details) || 
                              descStr.includes('deposit');
            const isPending = statusStr === 'pending' || statusStr === '' || statusStr === 'processing';
            return isDeposit && isPending;
          })
          .sort((a: any, b: any) => {
            const parseDateVal = (val: any) => {
              if (!val) return 0;
              if (typeof val.toMillis === 'function') return val.toMillis();
              if (typeof val.toDate === 'function') return val.toDate().getTime();
              const t = new Date(val).getTime();
              return isNaN(t) ? 0 : t;
            };
            const dateA = parseDateVal(a.createdAt || a.created_at || a.timestamp);
            const dateB = parseDateVal(b.createdAt || b.created_at || b.timestamp);
            return dateB - dateA;
          });
        setPendingDeposits(depositData);
      }, (err) => {
        if (err.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'transactions (deposits)');
        }
      });
    } catch (err) {
      console.error('Error setting up admin deposits listener:', err instanceof Error ? err.message : String(err));
    }

    // Listen for grants
    let unsubscribeGrants: (() => void) | null = null;
    try {
      const grantsQuery = query(collection(db, 'grants'));
      unsubscribeGrants = onSnapshot(grantsQuery, (snapshot) => {
        const grantsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGrants(grantsData.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }, (err) => {
        if (err.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'grants');
        }
      });
    } catch (err) {
      console.error('Error setting up admin grants listener:', err instanceof Error ? err.message : String(err));
    }

    // Listen for tax refunds
    let unsubscribeTaxRefunds: (() => void) | null = null;
    try {
      const taxRefundsQuery = query(collection(db, 'tax_refunds'));
      unsubscribeTaxRefunds = onSnapshot(taxRefundsQuery, (snapshot) => {
        const taxRefundsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTaxRefunds(taxRefundsData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (err) => {
        if (err.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'tax_refunds');
        }
      });
    } catch (err) {
      console.error('Error setting up admin tax refunds listener:', err instanceof Error ? err.message : String(err));
    }

    // Listen for all chats
    let unsubscribeChats: (() => void) | null = null;
    try {
      const chatsQuery = query(collection(db, 'chats'));
      unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
        const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChats(chatData);
      }, (err) => {
        if (err.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'chats');
        }
      });
    } catch (err) {
      console.error('Error setting up admin chats listener:', err instanceof Error ? err.message : String(err));
    }

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeLoans) unsubscribeLoans();
      if (unsubscribeKYC) unsubscribeKYC();
      if (unsubscribeDeposits) unsubscribeDeposits();
      if (unsubscribeGrants) unsubscribeGrants();
      if (unsubscribeTaxRefunds) unsubscribeTaxRefunds();
      if (unsubscribeChats) unsubscribeChats();
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, [user]);

  useEffect(() => {
    if (!selectedChatId || activeTab !== 'chats') {
      setMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, 'chats', selectedChatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.LIST, `chats/${selectedChatId}/messages`);
      }
    });

    return () => unsubscribeMessages();
  }, [selectedChatId, activeTab]);

  const handleSendMessage = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    if ((!newMessage.trim() && !attachedFile) || !selectedChatId || !user) return;

    const messageText = newMessage.trim();
    const fileData = attachedFile;
    
    setNewMessage('');
    setAttachedFile(null);
    setIsEmojiPickerOpen(false);

    try {
      const messageData: any = {
        text: messageText || (fileData ? (fileData.type?.startsWith('image/') ? 'Image attachment' : `File: ${fileData.name}`) : ''),
        senderId: user.uid,
        senderName: 'System Admin',
        senderRole: 'admin',
        timestamp: serverTimestamp(),
        read: false,
        type: fileData ? 'file' : 'text'
      };

      if (fileData) {
        messageData.fileUrl = fileData.url;
        messageData.fileName = fileData.name;
        messageData.fileType = fileData.type;
        messageData.fileSize = fileData.size;
      }

      await addDoc(collection(db, 'chats', selectedChatId, 'messages'), messageData);

      const previewSummary = fileData
        ? (fileData.type?.startsWith('image/') ? '📷 Image' : `📎 ${fileData.name}`)
        : messageText;

      await updateDoc(doc(db, 'chats', selectedChatId), {
        lastMessage: previewSummary,
        lastMessageAt: serverTimestamp(),
        lastMessageTimestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message as admin:', error instanceof Error ? error.message : String(error));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedChatId) return;

    setIsUploading(true);
    try {
      let uploadFile: File = file;
      let compressedDataUrl = '';

      if (isImageLike(file)) {
        try {
          const compressed = await compressImageFile(file, { maxWidth: 1000, quality: 0.75 });
          uploadFile = compressed.file;
          compressedDataUrl = compressed.dataUrl;
        } catch (compErr) {
          console.warn('Image compression fallback in admin:', compErr);
        }
      }

      const fileExt = uploadFile.name.split('.').pop() || 'bin';
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `chats/${selectedChatId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, uploadFile);

      if (uploadError) {
        console.warn('Storage upload error in admin, fallback:', uploadError);
      }

      const { data: { publicUrl } } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(filePath);

      setAttachedFile({
        url: publicUrl || compressedDataUrl || '',
        name: uploadFile.name,
        type: uploadFile.type || 'application/octet-stream',
        size: uploadFile.size
      });
    } catch (error) {
      console.warn('Admin chat file upload fallback:', error);
      try {
        if (isImageLike(file)) {
          const comp = await compressImageFile(file, { maxWidth: 1000, quality: 0.75 });
          setAttachedFile({
            url: comp.dataUrl,
            name: comp.file.name,
            type: comp.file.type,
            size: comp.file.size
          });
        } else {
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
        }
      } catch (readErr) {
        console.error('Fallback read error in admin:', readErr);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isUpdatingProfile) return;

    setIsUpdatingProfile(true);
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      const userCurrency = getUserCurrency(selectedUser);
      const inputWalletBalance = Number(adminProfileForm.walletBalance) || 0;
      const inputBtcBalance = Number(adminProfileForm.btcBalance) || 0;
      const inputUsdtBalance = Number(adminProfileForm.usdtBalance) || 0;
      const inputSavings = Number(adminProfileForm.savings) || 0;
      const inputInvestment = Number(adminProfileForm.investmentBalance) || 0;
      const inputGrant = Number(adminProfileForm.grantBalance) || 0;

      const updatedPayload = {
        ...adminProfileForm,
        walletBalance: inputWalletBalance,
        btcBalance: inputBtcBalance,
        usdtBalance: inputUsdtBalance,
        savings: inputSavings,
        investmentBalance: inputInvestment,
        grantBalance: inputGrant,
        updatedAt: serverTimestamp()
      };

      await updateDoc(userRef, updatedPayload);
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...updatedPayload } : u));
      setSelectedUser(prev => prev ? { ...prev, ...updatedPayload } : null);
      setIsEditingAdminProfile(false);
      setMessage({ 
        text: `User profile updated! Wallet: ${userCurrency.symbol}${inputWalletBalance.toLocaleString()} ${userCurrency.code}, BTC: ${inputBtcBalance} BTC, USDT: ${inputUsdtBalance} USDT.`, 
        type: 'success' 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${selectedUser.id}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!isAdmin || isUpdatingRole) return;
    setIsUpdatingRole(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setMessage({ text: `User role updated to ${newRole} successfully!`, type: 'success' });
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }
    } catch (err: any) {
      console.error('Error updating user role:', err instanceof Error ? err.message : String(err));
      setMessage({ text: `Failed to update user role: ${err.message}`, type: 'error' });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleGrantStatusUpdate = async (grantId: string, userId: string, status: 'approved' | 'rejected', amount: number, currency: string) => {
    try {
      const grantRef = doc(db, 'grants', grantId);
      await updateDoc(grantRef, { 
        status,
        updatedAt: serverTimestamp()
      });

      if (status === 'approved') {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          grantBalance: increment(amount),
          updatedAt: serverTimestamp()
        });

        // Add transaction record
        await addDoc(collection(db, 'transactions'), {
          userId,
          type: 'grant',
          amount,
          currency,
          status: 'completed',
          description: 'Grant Application Approved (Added to Grant Balance)',
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      }

      setIsGrantModalOpen(false);
      setSelectedGrant(null);
      setMessage({ text: `Grant application ${status} successfully!`, type: 'success' });
    } catch (error) {
      console.error('Error updating grant status:', error instanceof Error ? error.message : String(error));
      setMessage({ text: 'Failed to update grant status', type: 'error' });
    }
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return 'Just now';
    try {
      if (dateVal?.toDate && typeof dateVal.toDate === 'function') {
        return dateVal.toDate().toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      if (dateVal instanceof Date) {
        return dateVal.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      if (typeof dateVal === 'string' || typeof dateVal === 'number') {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
    return String(dateVal || 'Just now');
  };

  const getDepositUserEmail = (deposit: any, targetUser?: any) => {
    if (deposit?.userEmail) return deposit.userEmail;
    if (deposit?.user_email) return deposit.user_email;
    if (deposit?.email) return deposit.email;
    if (targetUser?.email) return targetUser.email;
    
    if (deposit?.description && typeof deposit.description === 'string' && deposit.description.includes('__META__:')) {
      try {
        const metaStr = deposit.description.split('__META__:')[1]?.trim();
        if (metaStr) {
          const parsed = JSON.parse(metaStr);
          if (parsed.userEmail) return parsed.userEmail;
          if (parsed.email) return parsed.email;
        }
      } catch (e) {}
    }
    
    return deposit?.userId ? `User ID: ${deposit.userId.slice(0, 8)}...` : 'Unknown User';
  };

  const getDepositMethod = (deposit: any) => {
    if (deposit?.method) return deposit.method;
    if (deposit?.paymentMethod) return deposit.paymentMethod;
    if (deposit?.payment_method) return deposit.payment_method;
    if (deposit?.depositMethod) return deposit.depositMethod;
    if (deposit?.deposit_method) return deposit.deposit_method;
    
    if (deposit?.description && typeof deposit.description === 'string') {
      if (deposit.description.includes('__META__:')) {
        try {
          const metaStr = deposit.description.split('__META__:')[1]?.trim();
          if (metaStr) {
            const parsed = JSON.parse(metaStr);
            if (parsed.method) return parsed.method;
          }
        } catch (e) {}
      }
      const cleanDesc = deposit.description.split('| __META__:')[0].replace(/^Deposit via\s*/i, '').trim();
      if (cleanDesc && cleanDesc.length < 50) return cleanDesc;
    }
    if (deposit?.accountDetails?.bankName) return `Bank Transfer (${deposit.accountDetails.bankName})`;
    if (deposit?.accountDetails?.cardNumber) return `Credit Card (****${deposit.accountDetails.cardNumber.slice(-4)})`;
    return 'Crypto / Transfer';
  };

  const getDepositProof = (deposit: any, targetUser?: any): string | null => {
    if (!deposit) return null;
    
    // 1. Check direct properties on deposit
    const directFields = [
      deposit.proofOfPayment,
      deposit.proof_of_payment,
      deposit.proofImage,
      deposit.proof_image,
      deposit.proofUrl,
      deposit.proof_url,
      deposit.imageUrl,
      deposit.image_url
    ];
    for (const field of directFields) {
      if (typeof field === 'string' && field.trim() && field !== 'null' && field !== 'undefined') {
        return field.trim();
      }
    }

    // 2. Check embedded __META__ in description
    if (deposit.description && typeof deposit.description === 'string') {
      if (deposit.description.includes('__META__:')) {
        try {
          const metaStr = deposit.description.split('__META__:')[1]?.trim();
          if (metaStr) {
            const parsed = JSON.parse(metaStr);
            if (parsed.proofOfPayment && typeof parsed.proofOfPayment === 'string' && parsed.proofOfPayment.trim()) {
              return parsed.proofOfPayment.trim();
            }
            if (parsed.proof_of_payment && typeof parsed.proof_of_payment === 'string' && parsed.proof_of_payment.trim()) {
              return parsed.proof_of_payment.trim();
            }
            if (parsed.proofImage && typeof parsed.proofImage === 'string' && parsed.proofImage.trim()) {
              return parsed.proofImage.trim();
            }
          }
        } catch (e) {}
      }
      if (deposit.description.startsWith('data:image/')) {
        return deposit.description;
      }
    }

    // 3. Check accountDetails object
    if (deposit.accountDetails) {
      if (typeof deposit.accountDetails === 'object') {
        if (deposit.accountDetails.proofOfPayment) return deposit.accountDetails.proofOfPayment;
        if (deposit.accountDetails.proofImage) return deposit.accountDetails.proofImage;
      } else if (typeof deposit.accountDetails === 'string') {
        try {
          const parsed = JSON.parse(deposit.accountDetails);
          if (parsed?.proofOfPayment) return parsed.proofOfPayment;
          if (parsed?.proofImage) return parsed.proofImage;
        } catch (e) {}
      }
    }

    // 4. Check target user backup proof
    if (targetUser?.lastDepositProof && typeof targetUser.lastDepositProof === 'string' && targetUser.lastDepositProof.trim()) {
      return targetUser.lastDepositProof;
    }
    if (targetUser?.last_deposit_proof && typeof targetUser.last_deposit_proof === 'string' && targetUser.last_deposit_proof.trim()) {
      return targetUser.last_deposit_proof;
    }

    // 5. Local storage fallback
    if (typeof window !== 'undefined') {
      try {
        if (deposit.storagePath) {
          const local = window.localStorage.getItem(`sb_fallback_${deposit.storagePath}`);
          if (local) return local;
        }
        if (deposit.storage_path) {
          const local = window.localStorage.getItem(`sb_fallback_${deposit.storage_path}`);
          if (local) return local;
        }
        if (deposit.userId) {
          const local = window.localStorage.getItem(`deposit_proof_${deposit.userId}`);
          if (local) return local;
        }
      } catch (e) {}
    }

    return null;
  };

  const handleRefreshDeposits = async () => {
    setIsRefreshingDeposits(true);
    try {
      const depositsQuery = query(collection(db, 'transactions'));
      const snapshot = await getDocs(depositsQuery);
      const depositData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(doc => {
          if (!doc) return false;
          const typeStr = String(doc.type || '').toLowerCase();
          const statusStr = String(doc.status || '').toLowerCase().trim();
          const descStr = String(doc.description || '').toLowerCase();

          // Explicitly exclude any rejected, completed, declined or cancelled deposits
          if (['rejected', 'completed', 'declined', 'cancelled', 'failed'].includes(statusStr)) {
            return false;
          }

          const isDeposit = typeStr.includes('deposit') || 
                            Boolean(doc.depositMethod) || 
                            Boolean(doc.deposit_method) || 
                            Boolean(doc.paymentMethod) || 
                            Boolean(doc.payment_method) || 
                            Boolean(doc.proofOfPayment) || 
                            Boolean(doc.proof_of_payment) || 
                            Boolean(doc.proofImage) || 
                            Boolean(doc.proof_image) || 
                            Boolean(doc.accountDetails) || 
                            Boolean(doc.account_details) || 
                            descStr.includes('deposit');
          const isPending = statusStr === 'pending' || statusStr === '' || statusStr === 'processing';
          return isDeposit && isPending;
        })
        .sort((a: any, b: any) => {
          const parseDateVal = (val: any) => {
            if (!val) return 0;
            if (typeof val.toMillis === 'function') return val.toMillis();
            if (typeof val.toDate === 'function') return val.toDate().getTime();
            const t = new Date(val).getTime();
            return isNaN(t) ? 0 : t;
          };
          const dateA = parseDateVal(a.createdAt || a.created_at || a.timestamp);
          const dateB = parseDateVal(b.createdAt || b.created_at || b.timestamp);
          return dateB - dateA;
        });
      setPendingDeposits(depositData);
      setMessage({ text: 'Deposits refreshed successfully.', type: 'success' });
    } catch (err: any) {
      console.error('Error manually refreshing deposits:', err);
      setMessage({ text: 'Failed to refresh deposits.', type: 'error' });
    } finally {
      setIsRefreshingDeposits(false);
    }
  };

  const formatUserBalance = (user: any) => {
    if (!user) return '$0.00';
    const balance = user.wallet?.balance ?? user.walletBalance ?? 0;
    const userCurrency = getUserCurrency(user);
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: userCurrency.code,
      }).format(balance);
    } catch (e) {
      return `${userCurrency.symbol}${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const formatDepositAmount = (deposit: any) => {
    if (!deposit) return '$0.00';
    const targetUser = users.find(u => u.id === deposit.userId);
    const userCurrency = getUserCurrency(targetUser);
    const currCode = deposit.currency || userCurrency.code;
    const amountNum = Number(deposit.amount) || 0;
    if (currCode === 'BTC') {
      return `${amountNum.toFixed(6)} BTC`;
    }
    if (currCode === 'USDT') {
      return `${amountNum.toFixed(2)} USDT`;
    }
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currCode,
      }).format(amountNum);
    } catch (e) {
      const sym = currCode === 'USD' ? '$' : currCode === 'EUR' ? '€' : currCode === 'GBP' ? '£' : currCode === 'NGN' ? '₦' : `${currCode} `;
      return `${sym}${amountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const formatAmountWithUserCurrency = (amount: number, user: any, isRawUSD: boolean = false) => {
    const userCurrency = getUserCurrency(user);
    const finalAmount = isRawUSD ? convertAmount(amount, 'USD', userCurrency.code) : amount;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: userCurrency.code,
      }).format(finalAmount);
    } catch (e) {
      return `${userCurrency.symbol}${finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const handleLoanStatusUpdate = async (loanId: string, status: string) => {
    try {
      const loan = loans.find(l => l.id === loanId);
      if (!loan) return;

      await updateDoc(doc(db, 'loans', loanId), {
        status,
        updatedAt: serverTimestamp(),
        reviewedBy: user?.email,
      });

      // Update user document for instant UI feedback
      await updateDoc(doc(db, 'users', loan.userId), {
        activeLoanStatus: status,
        updatedAt: serverTimestamp()
      });

      // If disbursed, convert loan amount to raw USD and update user's wallet balance
      if (status === 'disbursed') {
        const targetUser = users.find(u => u.id === loan.userId);
        const loanCurrency = loan.currency || getUserCurrency(targetUser).code;
        const loanAmountUSD = convertAmount(Number(loan.amount) || 0, loanCurrency, 'USD');
        await updateDoc(doc(db, 'users', loan.userId), {
          walletBalance: increment(loanAmountUSD),
          updatedAt: serverTimestamp()
        });
      }

      // Notify user
      try {
        const userName = loan.userName || loan.userEmail?.split('@')[0] || 'User';
        await addDoc(collection(db, 'notifications', loan.userId, 'items'), {
          type: 'loan_update',
          title: status === 'approved' ? 'Loan Approved' : 
                 status === 'rejected' ? 'Loan Rejected' : 
                 status === 'disbursed' ? 'Loan Disbursed' : 'Loan Update',
          message: status === 'approved' 
            ? `Hello ${userName}, your loan application for ${formatAmountWithUserCurrency(loan.amount, users.find(u => u.id === loan.userId))} has been approved! Please connect your bank account to proceed.` 
            : status === 'rejected' 
            ? `Hello ${userName}, we regret to inform you that your loan application for ${formatAmountWithUserCurrency(loan.amount, users.find(u => u.id === loan.userId))} was not approved at this time.`
            : status === 'disbursed'
            ? `Congratulations ${userName}! Your loan of ${formatAmountWithUserCurrency(loan.amount, users.find(u => u.id === loan.userId))} has been successfully disbursed to your wallet.`
            : `Hello ${userName}, your loan status has been updated to ${status}.`,
          createdAt: serverTimestamp(),
          read: false,
        });
      } catch (notifyErr) {
        console.error('Error sending notification:', notifyErr instanceof Error ? notifyErr.message : String(notifyErr));
      }

      setMessage({ text: `Loan updated to ${status} successfully!`, type: 'success' });
    } catch (err: any) {
      console.error('Error updating loan status:', err instanceof Error ? err.message : String(err));
      setMessage({ text: `Failed to update loan status: ${err.message}`, type: 'error' });
    }
  };

  const handleKYCUpdate = async (userId: string, status: 'verified' | 'rejected', reason?: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        kycStatus: status,
        rejectionReason: reason || null,
        kycReviewedAt: serverTimestamp(),
        kycReviewedBy: user?.email,
      });

      // Notify user using the subcollection pattern
      try {
        await addDoc(collection(db, 'notifications', userId, 'items'), {
          type: 'kyc_update',
          title: status === 'verified' ? 'KYC Verified' : 'KYC Rejected',
          message: status === 'verified' 
            ? 'Your identity verification has been approved. You can now apply for loans.' 
            : `Your identity verification was rejected. Reason: ${reason}`,
          createdAt: serverTimestamp(),
          read: false,
        });
      } catch (notifyErr) {
        console.error('Error sending notification:', notifyErr instanceof Error ? notifyErr.message : String(notifyErr));
        // Don't fail the whole process if notification fails
      }

      setMessage({ text: `User KYC ${status === 'verified' ? 'verified' : 'rejected'} successfully!`, type: 'success' });
      setSelectedKYC(null);
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (err: any) {
      console.error('Error updating KYC status:', err instanceof Error ? err.message : String(err));
      setMessage({ text: `Failed to update KYC status: ${err.message}`, type: 'error' });
    }
  };

  const handleDepositUpdate = async (depositId: string, status: 'completed' | 'rejected') => {
    try {
      const deposit = pendingDeposits.find(d => d.id === depositId);
      if (!deposit) return;

      // Update transaction status
      await updateDoc(doc(db, 'transactions', depositId), {
        status,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.email,
      });

      if (status === 'rejected') {
        // Clean up any local storage backup proofs
        try {
          if (deposit.userId) {
            window.localStorage.removeItem(`deposit_proof_${deposit.userId}`);
            await updateDoc(doc(db, 'users', deposit.userId), {
              lastDepositProof: null,
              last_deposit_proof: null
            });
          }
          window.localStorage.removeItem(`deposit_proof_${depositId}`);
        } catch (e) {}
      }

      if (status === 'completed') {
        const targetUser = users.find(u => u.id === deposit.userId);
        const userCurr = getUserCurrency(targetUser);
        const depCurr = deposit.currency || userCurr.code;
        const depAmount = Number(deposit.amount) || 0;

        if (depCurr === 'BTC') {
          await updateDoc(doc(db, 'users', deposit.userId), {
            btcBalance: increment(depAmount),
            updatedAt: serverTimestamp()
          });
          setUsers(prev => prev.map(u => u.id === deposit.userId ? {
            ...u,
            btcBalance: (u.btcBalance || 0) + depAmount
          } : u));
        } else if (depCurr === 'USDT') {
          await updateDoc(doc(db, 'users', deposit.userId), {
            usdtBalance: increment(depAmount),
            updatedAt: serverTimestamp()
          });
          setUsers(prev => prev.map(u => u.id === deposit.userId ? {
            ...u,
            usdtBalance: (u.usdtBalance || 0) + depAmount
          } : u));
        } else {
          // Fiat deposit - direct credit in user's native currency
          const amountInUserCurrency = depCurr === userCurr.code 
            ? depAmount 
            : convertAmount(depAmount, depCurr, userCurr.code);

          await updateDoc(doc(db, 'users', deposit.userId), {
            walletBalance: increment(amountInUserCurrency),
            updatedAt: serverTimestamp()
          });

          setUsers(prev => prev.map(u => u.id === deposit.userId ? {
            ...u,
            walletBalance: (u.walletBalance || 0) + amountInUserCurrency
          } : u));
        }
      }

      // Notify user
      try {
        const formattedDepositStr = formatDepositAmount(deposit);
        await addDoc(collection(db, 'notifications', deposit.userId, 'items'), {
          type: 'deposit_update',
          title: status === 'completed' ? 'Deposit Approved' : 'Deposit Rejected',
          message: status === 'completed' 
            ? `Your deposit of ${formattedDepositStr} has been approved and added to your balance.` 
            : `Your deposit of ${formattedDepositStr} was rejected. Please contact support for more information.`,
          createdAt: serverTimestamp(),
          read: false,
        });
      } catch (notifyErr) {
        console.error('Error sending notification:', notifyErr instanceof Error ? notifyErr.message : String(notifyErr));
      }

      // Optimistically remove from state so UI updates immediately
      setPendingDeposits(prev => prev.filter(d => d.id !== depositId));

      setMessage({ text: `Deposit ${status === 'completed' ? 'approved' : 'rejected'} successfully!`, type: 'success' });
      setSelectedDeposit(null);
    } catch (err: any) {
      console.error('Error updating deposit status:', err instanceof Error ? err.message : String(err));
      setMessage({ text: `Failed to update deposit status: ${err.message}`, type: 'error' });
    }
  };

  const handleDepositDelete = async (depositId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this deposit request? This cannot be undone.')) {
      return;
    }
    try {
      const deposit = pendingDeposits.find(d => d.id === depositId);
      await deleteDoc(doc(db, 'transactions', depositId));
      if (deposit?.userId) {
        try {
          window.localStorage.removeItem(`deposit_proof_${deposit.userId}`);
          await updateDoc(doc(db, 'users', deposit.userId), {
            lastDepositProof: null,
            last_deposit_proof: null
          });
        } catch (e) {}
      }
      try {
        window.localStorage.removeItem(`deposit_proof_${depositId}`);
      } catch (e) {}

      setPendingDeposits(prev => prev.filter(d => d.id !== depositId));
      setMessage({ text: 'Deposit request deleted permanently!', type: 'success' });
      setSelectedDeposit(null);
    } catch (err: any) {
      console.error('Error deleting deposit record:', err);
      setMessage({ text: `Failed to delete deposit record: ${err.message}`, type: 'error' });
    }
  };

  const handleWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletTargetUserId || !walletAmount || isAdjusting) return;

    setIsAdjusting(true);
    try {
      const parsedAmount = parseFloat(walletAmount);
      if (isNaN(parsedAmount)) throw new Error('Invalid amount');

      const targetUser = users.find(u => u.id === walletTargetUserId);
      const targetUserCurrency = getUserCurrency(targetUser);

      if (walletAsset === 'btc') {
        // Adjust BTC
        await updateDoc(doc(db, 'users', walletTargetUserId), {
          btcBalance: increment(parsedAmount),
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'transactions'), {
          userId: walletTargetUserId,
          amount: parsedAmount,
          currency: 'BTC',
          type: 'admin_adjustment',
          status: 'completed',
          note: walletNote,
          description: `Admin Bitcoin Adjustment (${parsedAmount >= 0 ? '+' : ''}${parsedAmount} BTC)`,
          createdAt: serverTimestamp(),
          reviewedBy: user?.email
        });

        await addDoc(collection(db, 'notifications', walletTargetUserId, 'items'), {
          type: 'wallet_adjustment',
          title: 'Bitcoin Balance Updated',
          message: `An admin has adjusted your Bitcoin balance by ${parsedAmount >= 0 ? '+' : ''}${parsedAmount} BTC. Note: ${walletNote}`,
          createdAt: serverTimestamp(),
          read: false,
        });

        setUsers(prev => prev.map(u => u.id === walletTargetUserId ? {
          ...u,
          btcBalance: (u.btcBalance || 0) + parsedAmount
        } : u));

        setMessage({ 
          text: `Bitcoin balance adjusted by ${parsedAmount >= 0 ? '+' : ''}${parsedAmount} BTC!`, 
          type: 'success' 
        });
      } else if (walletAsset === 'usdt') {
        // Adjust USDT
        await updateDoc(doc(db, 'users', walletTargetUserId), {
          usdtBalance: increment(parsedAmount),
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'transactions'), {
          userId: walletTargetUserId,
          amount: parsedAmount,
          currency: 'USDT',
          type: 'admin_adjustment',
          status: 'completed',
          note: walletNote,
          description: `Admin USDT Adjustment (${parsedAmount >= 0 ? '+' : ''}${parsedAmount.toFixed(2)} USDT)`,
          createdAt: serverTimestamp(),
          reviewedBy: user?.email
        });

        await addDoc(collection(db, 'notifications', walletTargetUserId, 'items'), {
          type: 'wallet_adjustment',
          title: 'USDT Balance Updated',
          message: `An admin has adjusted your USDT balance by ${parsedAmount >= 0 ? '+' : ''}${parsedAmount.toFixed(2)} USDT. Note: ${walletNote}`,
          createdAt: serverTimestamp(),
          read: false,
        });

        setUsers(prev => prev.map(u => u.id === walletTargetUserId ? {
          ...u,
          usdtBalance: (u.usdtBalance || 0) + parsedAmount
        } : u));

        setMessage({ 
          text: `USDT balance adjusted by ${parsedAmount >= 0 ? '+' : ''}${parsedAmount.toFixed(2)} USDT!`, 
          type: 'success' 
        });
      } else {
        // Adjust Fiat Wallet Balance directly in native currency
        await updateDoc(doc(db, 'users', walletTargetUserId), {
          walletBalance: increment(parsedAmount),
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'transactions'), {
          userId: walletTargetUserId,
          amount: parsedAmount,
          currency: targetUserCurrency.code,
          type: 'admin_adjustment',
          status: 'completed',
          note: walletNote,
          description: `Admin Wallet Adjustment (${parsedAmount >= 0 ? '+' : ''}${targetUserCurrency.symbol}${Math.abs(parsedAmount).toLocaleString()} ${targetUserCurrency.code})`,
          createdAt: serverTimestamp(),
          reviewedBy: user?.email
        });

        const formattedNotice = `${parsedAmount >= 0 ? '+' : '-'}${targetUserCurrency.symbol}${Math.abs(parsedAmount).toLocaleString()} ${targetUserCurrency.code}`;
        await addDoc(collection(db, 'notifications', walletTargetUserId, 'items'), {
          type: 'wallet_adjustment',
          title: 'Wallet Balance Updated',
          message: `An admin has adjusted your wallet balance by ${formattedNotice}. Note: ${walletNote}`,
          createdAt: serverTimestamp(),
          read: false,
        });

        setUsers(prev => prev.map(u => u.id === walletTargetUserId ? {
          ...u,
          walletBalance: (u.walletBalance || 0) + parsedAmount
        } : u));

        setMessage({ 
          text: `Wallet adjusted! Applied ${formattedNotice} directly to native account balance.`, 
          type: 'success' 
        });
      }

      setWalletSuccess(true);
      setWalletAmount('');
      setWalletNote('Admin adjustment');
      setTimeout(() => setWalletSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error adjusting balance:', err instanceof Error ? err.message : String(err));
      setMessage({ text: `Failed to adjust balance: ${err.message}`, type: 'error' });
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || isUpdatingSettings) return;

    setIsUpdatingSettings(true);
    try {
      const cleanUsdt = usdtAddress.trim();
      const cleanBtc = btcAddress.trim();
      
      await setDoc(doc(db, 'settings', 'wallets'), {
        usdt_address: cleanUsdt,
        btc_address: cleanBtc,
        usdtAddress: cleanUsdt,
        btcAddress: cleanBtc,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email
      }, { merge: true });

      try {
        localStorage.setItem('beehive_wallet_settings', JSON.stringify({
          usdtAddress: cleanUsdt,
          btcAddress: cleanBtc,
          usdt_address: cleanUsdt,
          btc_address: cleanBtc
        }));
      } catch {}

      setMessage({ text: 'Wallet addresses updated successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Error updating settings:', err instanceof Error ? err.message : String(err));
      setMessage({ text: `Failed to update settings: ${err.message}`, type: 'error' });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManagerId || !selectedTargetUserId || assigningManager) return;

    setAssigningManager(true);
    try {
      const targetUser = users.find(u => u.id === selectedTargetUserId);
      const manager = users.find(u => u.id === selectedManagerId);

      if (!targetUser || !manager) throw new Error('User or Manager not found');

      await updateDoc(doc(db, 'users', selectedTargetUserId), {
        managerId: selectedManagerId,
        updatedAt: serverTimestamp()
      });
      setUsers(prev => prev.map(u => u.id === selectedTargetUserId ? { ...u, managerId: selectedManagerId } : u));

      // Create or update chat
      const chatId = [selectedManagerId, selectedTargetUserId].sort().join('_');
      await setDoc(doc(db, 'chats', chatId), {
        participants: [selectedManagerId, selectedTargetUserId],
        managerId: selectedManagerId,
        userId: selectedTargetUserId,
        lastMessage: 'Manager assigned by admin',
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMessage({ text: `Manager ${manager.email} assigned to ${targetUser.email} successfully!`, type: 'success' });
      setSelectedTargetUserId('');
    } catch (err: any) {
      console.error('Error assigning manager:', err instanceof Error ? err.message : String(err));
      setMessage({ text: `Failed to assign manager: ${err.message}`, type: 'error' });
    } finally {
      setAssigningManager(false);
    }
  };

  const pendingLoans = loans.filter(l => l.status === 'pending');
  const inProgressLoans = loans.filter(l => ['bank_details_submitted', 'pin_sent'].includes(l.status));
  const pinVerificationLoans = loans.filter(l => l.status === 'pin_submitted');
  const bankConnectedLoans = loans.filter(l => l.bankDetails);
  const cardConnectedUsers = users.filter(u => (u.creditCards && u.creditCards.length > 0) || u.cardDetails);
  const totalVolume = loans.reduce((acc, l) => acc + (l.status === 'approved' || l.status === 'disbursed' ? l.amount : 0), 0);
  const totalUsers = users.length;
  const verifiedUsers = users.filter(u => u.kycStatus === 'verified').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-primary">
      {/* Top Bar */}
      <header className="bg-white dark:bg-primary border-b border-gray-200 dark:border-zinc-800 p-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Logo className="h-6" />
            <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Panel
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-zinc-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold dark:text-white">{user?.email}</p>
                <p className="text-xs text-gray-500">System Administrator</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-black">
                {user?.email?.[0].toUpperCase()}
              </div>
              <button 
                onClick={handleSignOut}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all border border-gray-200 dark:border-zinc-800"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-2xl text-sm font-bold uppercase tracking-widest flex items-center gap-3 ${
              message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </motion.div>
        )}

        {/* Tabs Navigation */}
        <div className="flex flex-nowrap overflow-x-auto pb-2 gap-2 mb-8 p-1 bg-gray-100 dark:bg-zinc-900 rounded-2xl w-full max-w-full scrollbar-hide">
          <TabButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<TrendingUp className="w-4 h-4" />}
            label="Overview"
          />
          <TabButton 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')}
            icon={<Users className="w-4 h-4" />}
            label="Users"
          />
          <TabButton 
            active={activeTab === 'kyc'} 
            onClick={() => setActiveTab('kyc')}
            icon={<ShieldCheck className="w-4 h-4" />}
            label="KYC"
            count={pendingKYCs.length}
          />
          <TabButton 
            active={activeTab === 'loans'} 
            onClick={() => setActiveTab('loans')}
            icon={<FileText className="w-4 h-4" />}
            label="Loans"
            count={pendingLoans.length}
          />
          <TabButton 
            active={activeTab === 'deposits'} 
            onClick={() => setActiveTab('deposits')}
            icon={<ArrowUpRight className="w-4 h-4" />}
            label="Deposits"
            count={pendingDeposits.length}
          />
          <TabButton 
            active={activeTab === 'grants'} 
            onClick={() => setActiveTab('grants')}
            icon={<Award className="w-4 h-4" />}
            label="Grants"
            count={grants.filter(g => g.status === 'pending').length}
          />
          <TabButton 
            active={activeTab === 'tax-refunds'} 
            onClick={() => setActiveTab('tax-refunds')}
            icon={<FileText className="w-4 h-4" />}
            label="Tax Refunds"
            count={taxRefunds.filter(r => r.status === 'pending').length}
          />
          <TabButton 
            active={activeTab === 'banks'} 
            onClick={() => setActiveTab('banks')}
            icon={<UserCheck className="w-4 h-4" />}
            label="Bank Connections"
          />
          <TabButton 
            active={activeTab === 'cards'} 
            onClick={() => setActiveTab('cards')}
            icon={<CreditCard className="w-4 h-4" />}
            label="Card Connections"
          />
          <TabButton 
            active={activeTab === 'wallet'} 
            onClick={() => setActiveTab('wallet')}
            icon={<Wallet className="w-4 h-4" />}
            label="Wallet"
          />
          <TabButton 
            active={activeTab === 'managers'} 
            onClick={() => setActiveTab('managers')}
            icon={<UserCheck className="w-4 h-4" />}
            label="Managers"
          />
          <TabButton 
            active={activeTab === 'chats'} 
            onClick={() => setActiveTab('chats')}
            icon={<MessageSquare className="w-4 h-4" />}
            label="Chats"
          />
          <TabButton 
            active={activeTab === 'charity'} 
            onClick={() => setActiveTab('charity')}
            icon={<Heart className="w-4 h-4 text-red-500" />}
            label="Charity Campaigns"
          />
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-10">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AdminStatCard 
                icon={<Users className="text-blue-500" />}
                label="Total Users"
                value={totalUsers.toString()}
                subValue={`${verifiedUsers} Verified`}
              />
              <AdminStatCard 
                icon={<TrendingUp className="text-accent" />}
                label="Loan Volume"
                value={loans.filter(l => l.status === 'approved' || l.status === 'disbursed').length.toString()}
                subValue="Approved Loans"
              />
              <AdminStatCard 
                icon={<ShieldCheck className="text-purple-500" />}
                label="Pending KYC"
                value={pendingKYCs.length.toString()}
                subValue="Awaiting Review"
              />
              <AdminStatCard 
                icon={<Award className="text-pink-500" />}
                label="Pending Grants"
                value={grants.filter(g => g.status === 'pending').length.toString()}
                subValue="New Applications"
              />
              <AdminStatCard 
                icon={<FileText className="text-amber-500" />}
                label="Pending Tax Refunds"
                value={taxRefunds.filter(r => r.status === 'pending').length.toString()}
                subValue="Tax Applications"
              />
              <AdminStatCard 
                icon={<ArrowUpRight className="text-orange-500" />}
                label="Pending Deposits"
                value={pendingDeposits.length.toString()}
                subValue="Action Required"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card">
                <h3 className="text-lg font-bold mb-6 dark:text-white uppercase tracking-widest text-xs opacity-50">Recent Activity</h3>
                <div className="space-y-4">
                  {loans.slice(0, 5).map((loan) => (
                    <div key={loan.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-white">{loan.userEmail}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                            Loan Application • {formatAmountWithUserCurrency(loan.amount, users.find(u => u.id === loan.userId))}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                        loan.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        loan.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {loan.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-bold mb-6 dark:text-white uppercase tracking-widest text-xs opacity-50">KYC Funnel</h3>
                <div className="space-y-6">
                  <FunnelStep label="Total Registered" value={totalUsers} total={totalUsers} color="bg-blue-500" />
                  <FunnelStep label="KYC Submitted" value={users.filter(u => u.kycStatus).length} total={totalUsers} color="bg-purple-500" />
                  <FunnelStep label="KYC Verified" value={verifiedUsers} total={totalUsers} color="bg-green-500" />
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <div className="card">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold dark:text-white uppercase tracking-tighter">User Management</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="pb-4">User</th>
                    <th className="pb-4">KYC Status</th>
                    <th className="pb-4">Fiat Balance</th>
                    <th className="pb-4">Crypto Balances</th>
                    <th className="pb-4">Joined</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {users.map((u) => (
                    <tr key={u.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-4">
                        <div className="font-bold dark:text-white">{u.fullName || u.email}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{u.email}</div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          u.kycStatus === 'verified' ? 'bg-green-100 text-green-700' :
                          u.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {u.kycStatus || 'Not Started'}
                        </span>
                      </td>
                      <td className="py-4 font-bold text-accent">{formatUserBalance(u)}</td>
                      <td className="py-4 text-xs font-mono">
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold">₮ {Number(u.usdtBalance || 0).toFixed(2)} USDT</div>
                        <div className="text-amber-600 dark:text-amber-400 font-bold">₿ {Number(u.btcBalance || 0).toFixed(6)} BTC</div>
                      </td>
                      <td className="py-4 text-gray-500 text-sm">{formatDate(u.createdAt)}</td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => setSelectedUser(u)}
                          className="p-2 hover:bg-accent/10 text-gray-400 hover:text-accent rounded-lg transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'grants' ? (
          <div className="card">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold dark:text-white uppercase tracking-tighter">Grant Applications</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search grants..." 
                  className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="pb-4">Applicant</th>
                    <th className="pb-4">Type</th>
                    <th className="pb-4">Amount</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {grants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-gray-500 italic">
                        No grant applications found.
                      </td>
                    </tr>
                  ) : (
                    grants.map((grant) => {
                      const applicant = users.find(u => u.id === grant.userId);
                      return (
                        <tr key={grant.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4">
                            <div className="font-bold dark:text-white">{applicant?.email || 'Unknown User'}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{grant.userId}</div>
                          </td>
                          <td className="py-4">
                            <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700">
                              {grant.type}
                            </span>
                          </td>
                          <td className="py-4 font-bold text-accent">
                            {grant.currency} {Number(grant.amount).toLocaleString()}
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              grant.status === 'approved' ? 'bg-green-100 text-green-700' :
                              grant.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {grant.status}
                            </span>
                          </td>
                          <td className="py-4 text-gray-500 text-sm">{formatDate(grant.timestamp)}</td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => {
                                setSelectedGrant(grant);
                                setIsGrantModalOpen(true);
                              }}
                              className="p-2 hover:bg-accent/10 text-gray-400 hover:text-accent rounded-lg transition-all"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'tax-refunds' ? (
          <div className="card">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold dark:text-white uppercase tracking-tighter">Tax Refund Applications</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search tax refunds..." 
                  className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="pb-4">Applicant</th>
                    <th className="pb-4">ID.me Username</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {taxRefunds.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-gray-500 italic">
                        No tax refund applications found.
                      </td>
                    </tr>
                  ) : (
                    taxRefunds.map((refund) => {
                      const applicant = users.find(u => u.id === refund.userId);
                      return (
                        <tr key={refund.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4">
                            <div className="font-bold dark:text-white">{refund.fullName || applicant?.email || 'Unknown User'}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{refund.email}</div>
                          </td>
                          <td className="py-4">
                            <div className="text-sm dark:text-white font-medium">{refund.idMeUsername}</div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              refund.status === 'completed' ? 'bg-green-100 text-green-700' :
                              refund.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {refund.status}
                            </span>
                          </td>
                          <td className="py-4 text-gray-500 text-sm">{formatDate(refund.createdAt)}</td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => {
                                setSelectedTaxRefund(refund);
                                setIsTaxRefundModalOpen(true);
                              }}
                              className="p-2 hover:bg-accent/10 text-gray-400 hover:text-accent rounded-lg transition-all"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'banks' ? (
          <div className="card">
            <h2 className="text-xl font-bold mb-8 dark:text-white uppercase tracking-tighter">Bank Connections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bankConnectedLoans.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-500 italic">
                  No bank connections found in current applications.
                </div>
              ) : (
                bankConnectedLoans.map((loan) => (
                  <div key={loan.id} className="p-6 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">{loan.userEmail}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Connected via Loan #{loan.id.slice(0, 6)}</p>
                      </div>
                    </div>
                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-zinc-800">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400 uppercase font-black tracking-widest">Bank</span>
                        <span className="font-bold dark:text-white">{loan.bankDetails?.bankName}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400 uppercase font-black tracking-widest">Account</span>
                        <span className="font-bold dark:text-white">{loan.bankDetails?.accountNumber}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400 uppercase font-black tracking-widest">Name</span>
                        <span className="font-bold dark:text-white">{loan.bankDetails?.accountName}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'cards' ? (
          <div className="card">
            <h2 className="text-xl font-bold mb-8 dark:text-white uppercase tracking-tighter">Card Connections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cardConnectedUsers.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-500 italic">
                  No card connections found.
                </div>
              ) : (
                cardConnectedUsers.map((u) => (
                  <div key={u.id} className="p-6 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">{u.email}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{u.fullName || 'No Name'}</p>
                      </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                      {u.creditCards && u.creditCards.map((card: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-accent">{card.cardType || 'Credit Card'}</span>
                            <span className="text-[10px] font-mono text-gray-400">#{idx + 1}</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400 uppercase font-black tracking-widest">Number</span>
                              <span className="font-bold dark:text-white font-mono">{card.cardNumber}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400 uppercase font-black tracking-widest">Expiry</span>
                              <span className="font-bold dark:text-white">{card.expiryDate}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400 uppercase font-black tracking-widest">CVV</span>
                              <span className="font-bold text-accent">{card.cvv}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400 uppercase font-black tracking-widest">PIN</span>
                              <span className="font-bold text-accent">{card.pin || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {u.cardDetails && (
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Legacy Card</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400 uppercase font-black tracking-widest">Number</span>
                              <span className="font-bold dark:text-white font-mono">{u.cardDetails.cardNumber}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400 uppercase font-black tracking-widest">Expiry</span>
                              <span className="font-bold dark:text-white">{u.cardDetails.expiryDate}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400 uppercase font-black tracking-widest">CVV</span>
                              <span className="font-bold text-amber-600">{u.cardDetails.cvv}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400 uppercase font-black tracking-widest">PIN</span>
                              <span className="font-bold text-amber-600">{u.cardDetails.pin || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'wallet' ? (
          <div className="card max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter dark:text-white uppercase">User Balance & Asset Adjustment</h2>
                <p className="text-gray-500 text-sm">Add or deduct fiat, USDT, or Bitcoin funds directly for any user</p>
              </div>
            </div>

            <form onSubmit={handleWalletAdjustment} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Select User</label>
                <div className="relative">
                  <select 
                    value={walletTargetUserId}
                    onChange={(e) => setWalletTargetUserId(e.target.value)}
                    className="w-full p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all appearance-none dark:text-white"
                    required
                  >
                    <option value="">Choose a user...</option>
                    {users.map(u => {
                      const uCurr = getUserCurrency(u);
                      return (
                        <option key={u.id} value={u.id}>
                          {u.fullName || u.email} ({u.email}) — [Wallet: {formatUserBalance(u)} | USDT: {Number(u.usdtBalance || 0).toFixed(2)} | BTC: {Number(u.btcBalance || 0).toFixed(6)}]
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Asset Type Selector */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Select Asset To Adjust</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setWalletAsset('fiat')}
                    className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                      walletAsset === 'fiat'
                        ? 'bg-accent text-white border-accent shadow-md shadow-accent/20'
                        : 'bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-zinc-800 hover:border-accent/40'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    Fiat Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletAsset('usdt')}
                    className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                      walletAsset === 'usdt'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-zinc-800 hover:border-emerald-500/40'
                    }`}
                  >
                    <span className="font-mono font-bold">₮</span>
                    Tether (USDT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletAsset('btc')}
                    className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                      walletAsset === 'btc'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                        : 'bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-zinc-800 hover:border-amber-500/40'
                    }`}
                  >
                    <span className="font-mono font-bold">₿</span>
                    Bitcoin (BTC)
                  </button>
                </div>
              </div>

              {walletTargetUserId && (() => {
                const targetU = users.find(u => u.id === walletTargetUserId);
                const targetCurr = getUserCurrency(targetU);
                const parsedInput = parseFloat(walletAmount) || 0;

                const currentFiat = targetU?.wallet?.balance ?? targetU?.walletBalance ?? 0;
                const currentBtc = targetU?.btcBalance ?? 0;
                const currentUsdt = targetU?.usdtBalance ?? 0;

                const projectedFiat = currentFiat + parsedInput;
                const projectedBtc = currentBtc + parsedInput;
                const projectedUsdt = currentUsdt + parsedInput;

                return (
                  <div className="p-4 bg-accent/5 dark:bg-accent/10 border border-accent/20 rounded-2xl space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`p-2.5 rounded-xl border ${walletAsset === 'fiat' ? 'bg-accent/15 border-accent text-accent' : 'bg-white/60 dark:bg-zinc-900/60 border-gray-200/50 dark:border-zinc-800'}`}>
                        <p className="text-[9px] uppercase font-bold text-gray-400">Fiat ({targetCurr.code})</p>
                        <p className="text-xs font-black truncate">{targetCurr.symbol}{currentFiat.toLocaleString()} {targetCurr.code}</p>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${walletAsset === 'usdt' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-white/60 dark:bg-zinc-900/60 border-gray-200/50 dark:border-zinc-800'}`}>
                        <p className="text-[9px] uppercase font-bold text-gray-400">USDT</p>
                        <p className="text-xs font-black truncate">{currentUsdt.toFixed(2)} USDT</p>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${walletAsset === 'btc' ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400' : 'bg-white/60 dark:bg-zinc-900/60 border-gray-200/50 dark:border-zinc-800'}`}>
                        <p className="text-[9px] uppercase font-bold text-gray-400">Bitcoin</p>
                        <p className="text-xs font-black truncate">{currentBtc.toFixed(6)} BTC</p>
                      </div>
                    </div>

                    {parsedInput !== 0 && (
                      <div className="pt-3 border-t border-accent/10 text-xs grid grid-cols-2 gap-2">
                        <div className="bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-xl border border-gray-200/60 dark:border-zinc-800">
                          <span className="text-[10px] text-gray-400 block uppercase font-bold">Adjustment ({walletAsset.toUpperCase()})</span>
                          <span className={`font-mono font-black ${parsedInput >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {parsedInput >= 0 ? '+' : ''}{parsedInput} {walletAsset === 'fiat' ? targetCurr.code : walletAsset.toUpperCase()}
                          </span>
                        </div>
                        <div className="bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-xl border border-gray-200/60 dark:border-zinc-800">
                          <span className="text-[10px] text-gray-400 block uppercase font-bold">Projected New Balance</span>
                          <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                            {walletAsset === 'fiat' && `${targetCurr.symbol}${projectedFiat.toLocaleString()} ${targetCurr.code}`}
                            {walletAsset === 'usdt' && `${projectedUsdt.toFixed(2)} USDT`}
                            {walletAsset === 'btc' && `${projectedBtc.toFixed(6)} BTC`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                    Adjustment Amount ({walletAsset === 'fiat' ? (walletTargetUserId ? getUserCurrency(users.find(u => u.id === walletTargetUserId)).code : 'Native Currency') : walletAsset.toUpperCase()})
                  </label>
                  {walletTargetUserId && (
                    <span className="text-xs font-bold text-accent">
                      {walletAsset === 'fiat' && `User Currency: ${getUserCurrency(users.find(u => u.id === walletTargetUserId)).symbol} ${getUserCurrency(users.find(u => u.id === walletTargetUserId)).code}`}
                      {walletAsset === 'usdt' && 'Target: Tether (USDT)'}
                      {walletAsset === 'btc' && 'Target: Bitcoin (BTC)'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    {walletAsset === 'fiat' ? (walletTargetUserId ? getUserCurrency(users.find(u => u.id === walletTargetUserId)).symbol : '$') : walletAsset === 'usdt' ? '₮' : '₿'}
                  </div>
                  <input 
                    type="number"
                    step={walletAsset === 'btc' ? '0.000001' : '0.01'}
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder={walletAsset === 'btc' ? '0.000000' : '0.00'}
                    className="w-full p-4 pl-12 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all dark:text-white font-mono"
                    required
                  />
                </div>
                <p className="mt-2 text-[10px] text-gray-500 uppercase tracking-widest">
                  {walletAsset === 'fiat' 
                    ? `Enter amount in ${walletTargetUserId ? getUserCurrency(users.find(u => u.id === walletTargetUserId)).code : 'user currency'}. Use negative numbers to deduct funds.`
                    : `Enter amount in ${walletAsset.toUpperCase()}. Use negative numbers to deduct.`}
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Adjustment Note</label>
                <input 
                  type="text"
                  value={walletNote}
                  onChange={(e) => setWalletNote(e.target.value)}
                  placeholder="Reason for adjustment..."
                  className="w-full p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all dark:text-white"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isAdjusting}
                className="w-full py-4 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAdjusting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Apply {walletAsset.toUpperCase()} Adjustment
                  </>
                )}
              </button>

              {walletSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl flex items-center gap-3 text-green-600 dark:text-green-400"
                >
                  <CheckCircle className="w-5 h-5" />
                  <p className="text-sm font-bold">Balance adjusted successfully!</p>
                </motion.div>
              )}
            </form>

            <div className="mt-12 pt-12 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter dark:text-white uppercase">Deposit Wallet Addresses</h2>
                  <p className="text-gray-500 text-sm">Update the addresses shown to users for USDT and BTC deposits</p>
                </div>
              </div>

              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">USDT (TRC20) Address</label>
                  <input 
                    type="text"
                    value={usdtAddress}
                    onChange={(e) => setUsdtAddress(e.target.value)}
                    placeholder="Enter TRC20 address"
                    className="w-full p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Bitcoin (BTC) Address</label>
                  <input 
                    type="text"
                    value={btcAddress}
                    onChange={(e) => setBtcAddress(e.target.value)}
                    placeholder="Enter BTC address"
                    className="w-full p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all dark:text-white"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isUpdatingSettings}
                  className="w-full py-4 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUpdatingSettings ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Update Addresses
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : activeTab === 'managers' ? (
          <div className="card max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter dark:text-white uppercase">Manager Assignment</h2>
                  <p className="text-gray-500 text-sm">Assign an account manager to a customer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPromoteTargetRole('account_manager');
                  setPromoteSearchQuery('');
                  setIsPromoteModalOpen(true);
                }}
                className="px-5 py-3 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-accent/20 flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Promote User (Pop-Up Modal)
              </button>
            </div>

            <form onSubmit={handleAssignManager} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Select Manager</label>
                <div className="relative">
                  <select 
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all appearance-none dark:text-white"
                    required
                  >
                    <option value="" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">Choose a manager...</option>
                    {users.filter(u => {
                      const r = (u.role || '').toLowerCase();
                      return r === 'manager' || r === 'admin' || r === 'account_manager';
                    }).map(u => (
                      <option key={u.id} value={u.id} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                        {getUserLabel(u)} — Role: {u.role || 'manager'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Select Customer</label>
                <div className="relative">
                  <select 
                    value={selectedTargetUserId}
                    onChange={(e) => setSelectedTargetUserId(e.target.value)}
                    className="w-full p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all appearance-none dark:text-white"
                    required
                  >
                    <option value="" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">Choose a customer...</option>
                    {users.filter(u => {
                      const r = (u.role || '').toLowerCase();
                      return r !== 'manager' && r !== 'admin' && r !== 'account_manager';
                    }).map(u => {
                      const currentMgr = users.find(m => m.id === u.managerId);
                      const mgrLabel = currentMgr ? ` (Assigned to: ${getUserLabel(currentMgr)})` : ' (No Manager)';
                      return (
                        <option key={u.id} value={u.id} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                          {getUserLabel(u)}{mgrLabel}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <button 
                type="submit"
                disabled={assigningManager}
                className="w-full py-4 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {assigningManager ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    Assign Manager
                  </>
                )}
              </button>
            </form>

            <div className="mt-12 pt-12 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold dark:text-white uppercase tracking-widest text-xs opacity-50">Promote User to Admin</h3>
                <button
                  type="button"
                  onClick={() => {
                    setPromoteTargetRole('admin');
                    setPromoteSearchQuery('');
                    setIsPromoteModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Pop-Up Modal
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedAdminAppointUserId) {
                    handleUpdateRole(selectedAdminAppointUserId, 'admin');
                    setSelectedAdminAppointUserId('');
                  }
                }}
                className="space-y-4"
              >
                <div className="relative">
                  <select 
                    value={selectedAdminAppointUserId}
                    onChange={(e) => setSelectedAdminAppointUserId(e.target.value)}
                    className="w-full p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">Select a user to appoint as admin...</option>
                    {users.filter(u => (u.role || '').toLowerCase() !== 'admin').map(u => (
                      <option key={u.id} value={u.id} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                        {getUserLabel(u)} — Current Role: {u.role || 'user'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                <button
                  type="submit"
                  disabled={!selectedAdminAppointUserId || isUpdatingRole}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
                >
                  {isUpdatingRole ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      Appoint Selected User as Admin
                    </>
                  )}
                </button>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest italic">
                  Appointed admins will have full access to this panel.
                </p>
              </form>
            </div>

            <div className="mt-12 pt-12 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold dark:text-white uppercase tracking-widest text-xs opacity-50">Promote User to Account Manager</h3>
                <button
                  type="button"
                  onClick={() => {
                    setPromoteTargetRole('account_manager');
                    setPromoteSearchQuery('');
                    setIsPromoteModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Pop-Up Modal
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedManagerAppointUserId) {
                    handleUpdateRole(selectedManagerAppointUserId, 'account_manager');
                    setSelectedManagerAppointUserId('');
                  }
                }}
                className="space-y-4"
              >
                <div className="relative">
                  <select 
                    value={selectedManagerAppointUserId}
                    onChange={(e) => setSelectedManagerAppointUserId(e.target.value)}
                    className="w-full p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all appearance-none dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">Select a user to promote to manager...</option>
                    {users.filter(u => {
                      const r = (u.role || '').toLowerCase();
                      return r !== 'account_manager' && r !== 'manager' && r !== 'admin';
                    }).map(u => (
                      <option key={u.id} value={u.id} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                        {getUserLabel(u)} — Current Role: {u.role || 'user'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                <button
                  type="submit"
                  disabled={!selectedManagerAppointUserId || isUpdatingRole}
                  className="w-full py-4 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
                >
                  {isUpdatingRole ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5" />
                      Promote Selected User to Manager
                    </>
                  )}
                </button>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest italic">
                  Promoted users will appear in the manager selection list above.
                </p>
              </form>
            </div>

            <div className="mt-12 pt-12 border-t border-gray-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold mb-6 dark:text-white uppercase tracking-widest text-xs opacity-50">Current Assignments</h3>
              <div className="space-y-4">
                {users.filter(u => u.managerId).map(u => {
                  const manager = users.find(m => m.id === u.managerId);
                  return (
                    <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                      <div>
                        <p className="text-sm font-bold dark:text-white">{getUserLabel(u)}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Customer</p>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="w-4 h-0.5 bg-gray-300 dark:bg-zinc-700" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-accent">{manager ? getUserLabel(manager) : 'Unknown'}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Manager</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === 'chats' ? (
          <div className="card h-[calc(100vh-280px)] min-h-[600px] flex flex-col p-0 overflow-hidden border-2 border-accent/10">
            <div className="flex h-full relative">
              {/* Chat Sidebar */}
              <div className={`${selectedChatId ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-100 dark:border-zinc-800 flex-col bg-gray-50/30 dark:bg-zinc-900/30`}>
                <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Active Conversations</h3>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search chats..." 
                      className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                    />
                  </div>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                  {chats.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
                        <MessageSquare className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest italic">No active chats</p>
                    </div>
                  ) : (
                    [...chats].sort((a, b) => {
                      const parseT = (val: any) => {
                        if (!val) return 0;
                        if (typeof val.toMillis === 'function') return val.toMillis();
                        if (typeof val.toDate === 'function') return val.toDate().getTime();
                        const t = new Date(val).getTime();
                        return isNaN(t) ? 0 : t;
                      };
                      return parseT(b.lastMessageAt) - parseT(a.lastMessageAt);
                    }).map((chat) => {
                      const manager = users.find(u => u.id === chat.managerId);
                      const client = users.find(u => u.id === chat.userId);
                      const isActive = selectedChatId === chat.id;
                      const chatDate = chat.lastMessageAt ? (typeof chat.lastMessageAt.toDate === 'function' ? chat.lastMessageAt.toDate() : typeof chat.lastMessageAt.toMillis === 'function' ? new Date(chat.lastMessageAt.toMillis()) : new Date(chat.lastMessageAt)) : null;
                      
                      return (
                        <button 
                          key={chat.id}
                          onClick={() => setSelectedChatId(chat.id)}
                          className={`w-full p-4 text-left border-b border-gray-50 dark:border-zinc-900/50 hover:bg-white dark:hover:bg-zinc-800 transition-all relative group ${isActive ? 'bg-white dark:bg-zinc-800 shadow-sm' : ''}`}
                        >
                          {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${isActive ? 'border-accent/20 bg-accent/10' : 'border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950'}`}>
                              <UserIcon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-gray-400'}`} />
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="flex justify-between items-start">
                                <p className={`text-xs font-black uppercase tracking-tight truncate ${isActive ? 'text-accent' : 'dark:text-white'}`}>
                                  {client?.fullName || client?.email?.split('@')[0] || 'Unknown Client'}
                                </p>
                                <span className="text-[8px] font-mono text-gray-400 uppercase">
                                  {chatDate && !isNaN(chatDate.getTime()) ? format(chatDate, 'HH:mm') : ''}
                                </span>
                              </div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest truncate mt-0.5">
                                Manager: {manager?.fullName || manager?.email || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate italic leading-relaxed pl-13">
                            {chat.lastMessage || 'No messages yet...'}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Chat Window */}
              <div className={`${selectedChatId ? 'flex' : 'hidden md:flex'} flex-grow flex-col bg-white dark:bg-zinc-950 relative h-full overflow-hidden`}>
                {selectedChatId ? (
                  <>
                    {/* Chat Header */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900 shadow-sm z-20 sticky top-0">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setSelectedChatId(null)}
                          className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-all text-gray-400 hover:text-accent"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 shadow-inner">
                          <UserIcon className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <h4 className="text-base font-black tracking-tighter dark:text-white uppercase">
                            {users.find(u => u.id === chats.find(c => c.id === selectedChatId)?.userId)?.fullName || 'Chat Session'}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-[9px] font-mono text-accent uppercase tracking-widest font-black">
                              Manager: {users.find(u => u.id === chats.find(c => c.id === selectedChatId)?.managerId)?.fullName || users.find(u => u.id === chats.find(c => c.id === selectedChatId)?.managerId)?.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedChatId(null)}
                          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Back to List
                        </button>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-grow overflow-y-auto p-8 space-y-8 bg-gray-50/30 dark:bg-zinc-950/30 custom-scrollbar h-full">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20">
                          <MessageSquare className="w-16 h-16 mb-4" />
                          <p className="font-mono text-xs uppercase tracking-[0.2em]">Secure Channel Initialized</p>
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const sender = users.find(u => u.id === msg.senderId);
                          const isMe = msg.senderId === user?.uid;
                          const isManager = sender?.role === 'account_manager' || sender?.role === 'manager' || sender?.role === 'admin';
                          const parseMsgDate = (val: any): Date | null => {
                            if (!val) return null;
                            if (typeof val.toDate === 'function') return val.toDate();
                            if (typeof val.toMillis === 'function') return new Date(val.toMillis());
                            if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
                            const d = new Date(val);
                            return isNaN(d.getTime()) ? null : d;
                          };
                          const currentMsgDate = parseMsgDate(msg.timestamp);
                          const prevMsgDate = idx > 0 ? parseMsgDate(messages[idx-1]?.timestamp) : null;
                          const showDate = idx === 0 || (currentMsgDate && (!prevMsgDate || format(prevMsgDate, 'yyyy-MM-dd') !== format(currentMsgDate, 'yyyy-MM-dd')));
                          
                          return (
                            <React.Fragment key={msg.id}>
                              {showDate && currentMsgDate && (
                                <div className="flex justify-center my-8">
                                  <span className="px-4 py-1.5 rounded-full bg-gray-200 dark:bg-zinc-800 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                    {format(currentMsgDate, 'MMMM d, yyyy')}
                                  </span>
                                </div>
                              )}
                              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
                                  <div className={`flex items-center gap-2 mb-2 px-1 ${isMe ? 'justify-end' : ''}`}>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isMe ? 'text-accent' : 'text-gray-400'}`}>
                                      {isMe ? 'System Admin' : 
                                       isManager ? 'Account Manager' :
                                       sender?.fullName || sender?.email?.split('@')[0] || 'Unknown'}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                      sender?.role === 'admin' ? 'bg-red-500/10 text-red-500' :
                                      sender?.role === 'account_manager' || sender?.role === 'manager' ? 'bg-blue-500/10 text-blue-500' :
                                      'bg-gray-500/10 text-gray-500'
                                    }`}>
                                      {sender?.role === 'admin' ? 'System Admin' : 
                                       sender?.role === 'account_manager' || sender?.role === 'manager' ? 'Account Manager' : 
                                       'User'}
                                    </span>
                                  </div>
                                  <div className={`p-4 rounded-2xl text-sm shadow-sm border ${
                                    isMe ? 'bg-accent border-accent text-white rounded-tr-none' : 
                                    isManager ? 'bg-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-500/10 rounded-tl-none' :
                                    'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 dark:text-gray-300 rounded-tl-none'
                                  }`}>
                                    {msg.fileUrl && (
                                      <div className="mb-3">
                                        {msg.fileType?.startsWith('image/') ? (
                                          <img 
                                            src={msg.fileUrl} 
                                            alt={msg.fileName} 
                                            className="max-w-full rounded-lg border border-white/10 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(msg.fileUrl, '_blank')}
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <a 
                                            href={msg.fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                              isMe ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700'
                                            }`}
                                          >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-accent/10'}`}>
                                              <FileText className={`w-5 h-5 ${isMe ? 'text-white' : 'text-accent'}`} />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                              <p className={`text-xs font-bold truncate ${isMe ? 'text-white' : 'dark:text-white'}`}>{msg.fileName}</p>
                                              <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-gray-500'}`}>
                                                {(msg.fileSize / 1024).toFixed(1)} KB • {msg.fileType?.split('/')[1]?.toUpperCase()}
                                              </p>
                                            </div>
                                            <Download className={`w-4 h-4 ${isMe ? 'text-white/60' : 'text-gray-400'}`} />
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    {msg.text && <p className="leading-relaxed font-medium">{msg.text}</p>}
                                  </div>
                                  <div className={`flex items-center gap-2 mt-2 px-1 ${isMe ? 'justify-end' : ''}`}>
                                    <p className="text-[8px] font-mono text-gray-400 uppercase tracking-tighter">
                                      {currentMsgDate ? format(currentMsgDate, 'HH:mm:ss') : 'Sending...'}
                                    </p>
                                    {isMe && <CheckCircle className="w-3 h-3 text-accent opacity-50" />}
                                  </div>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="p-6 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 shadow-lg">
                      {attachedFile && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700 flex items-center justify-between animate-in slide-in-from-bottom-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                              {attachedFile.type.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-accent" /> : <FileText className="w-5 h-5 text-accent" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold dark:text-white truncate max-w-[200px]">{attachedFile.name}</p>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setAttachedFile(null)}
                            className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <form onSubmit={handleSendMessage} className="flex gap-4 max-w-4xl mx-auto">
                        <div className="relative flex-grow group">
                          <input 
                            type="text" 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Intervene as System Administrator..."
                            className="w-full pl-6 pr-12 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-transparent focus:border-accent/30 rounded-2xl text-sm font-medium transition-all dark:text-white outline-none shadow-inner"
                          />
                          <button 
                            type="button"
                            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors"
                          >
                            <Smile className="w-5 h-5" />
                          </button>
                          
                          {isEmojiPickerOpen && (
                            <div className="absolute bottom-full right-0 mb-6 z-[100] shadow-2xl">
                              <EmojiPicker 
                                onEmojiClick={(emojiData) => setNewMessage(prev => prev + emojiData.emoji)}
                                theme={document.documentElement.classList.contains('dark') ? 'dark' as any : 'light' as any}
                                width={320}
                                height={400}
                              />
                            </div>
                          )}
                        </div>
                        <input 
                          type="file" 
                          id="admin-chat-file" 
                          className="hidden" 
                          onChange={handleFileUpload}
                        />
                        <label 
                          htmlFor="admin-chat-file"
                          className="w-14 h-14 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-gray-400 hover:text-accent hover:border-accent/30 transition-all cursor-pointer flex items-center justify-center flex-shrink-0"
                        >
                          {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Paperclip className="w-6 h-6" />}
                        </label>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSendMessage();
                          }}
                          disabled={(!newMessage.trim() && !attachedFile) || isUploading}
                          className="w-14 h-14 bg-accent text-white rounded-2xl flex items-center justify-center hover:bg-accent/90 disabled:opacity-50 transition-all shadow-xl shadow-accent/20 active:scale-95 flex-shrink-0 disabled:grayscale"
                        >
                          <Send className="w-6 h-6" />
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-12 bg-gray-50/50 dark:bg-zinc-950/50">
                    <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl border border-gray-100 dark:border-zinc-800 relative">
                      <div className="absolute inset-0 bg-accent/5 rounded-[2.5rem] animate-pulse" />
                      <MessageSquare className="w-10 h-10 text-accent relative z-10" />
                    </div>
                    <h3 className="text-3xl font-black tracking-tighter dark:text-white uppercase mb-4">Intelligence Center</h3>
                    <p className="text-gray-500 text-sm max-w-sm leading-relaxed italic">
                      Select an active conversation from the sidebar to monitor communications or provide administrative support to managers and clients.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'charity' ? (
          <AdminCharityTab />
        ) : activeTab === 'loans' ? (
          <div className="space-y-8">
            {/* Pending Review */}
            <div className="card">
              <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
                Pending Review
                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-black">
                  {pendingLoans.length}
                </span>
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 text-sm uppercase tracking-wider">
                      <th className="pb-4 font-bold">Applicant</th>
                      <th className="pb-4 font-bold">Amount</th>
                      <th className="pb-4 font-bold">Purpose</th>
                      <th className="pb-4 font-bold">Date</th>
                      <th className="pb-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-gray-500">
                          Loading applications...
                        </td>
                      </tr>
                    ) : pendingLoans.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-gray-500">
                          No pending applications to review.
                        </td>
                      </tr>
                    ) : (
                      pendingLoans.map((loan) => (
                        <tr key={loan.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4">
                            <div className="font-bold dark:text-white">{loan.userEmail}</div>
                            <div className="text-xs text-gray-400 font-mono">{loan.id}</div>
                          </td>
                          <td className="py-4 font-bold text-accent">{formatAmountWithUserCurrency(loan.amount, users.find(u => u.id === loan.userId))}</td>
                          <td className="py-4 text-gray-500">{loan.purpose}</td>
                          <td className="py-4 text-gray-500">
                            {loan.createdAt?.toDate ? loan.createdAt.toDate().toLocaleDateString() : 'Just now'}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleLoanStatusUpdate(loan.id, 'rejected')}
                                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                                title="Reject"
                              >
                                <XCircle className="w-6 h-6" />
                              </button>
                              <button 
                                onClick={() => handleLoanStatusUpdate(loan.id, 'approved')}
                                className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-accent transition-all"
                                title="Approve"
                              >
                                <CheckCircle className="w-6 h-6" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* In Progress */}
            <div className="card">
              <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
                In Progress (Bank Connection)
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-black">
                  {inProgressLoans.length}
                </span>
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 text-sm uppercase tracking-wider">
                      <th className="pb-4 font-bold">Applicant</th>
                      <th className="pb-4 font-bold">Status</th>
                      <th className="pb-4 font-bold">Details Provided</th>
                      <th className="pb-4 font-bold text-right">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {inProgressLoans.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-gray-500">
                          No loans currently in bank connection phase.
                        </td>
                      </tr>
                    ) : (
                      inProgressLoans.map((loan) => (
                        <tr key={loan.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4">
                            <div className="font-bold dark:text-white">{loan.userEmail}</div>
                            <div className="text-xs text-gray-400 font-mono">{loan.id}</div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              loan.status === 'bank_details_submitted' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {loan.status === 'bank_details_submitted' ? 'Filling Additional Info' : 'Awaiting PIN'}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="text-xs text-gray-500">
                              {loan.bankDetails ? '✓ Bank Details' : '✗ Bank Details'}<br/>
                              {loan.additionalDetails ? '✓ Additional Info' : '✗ Additional Info'}
                            </div>
                          </td>
                          <td className="py-4 text-right text-gray-500 text-xs">
                            <div className="flex justify-end items-center gap-2">
                              <span>{loan.updatedAt?.toDate ? loan.updatedAt.toDate().toLocaleString() : 'Just now'}</span>
                              <button 
                                onClick={() => setSelectedLoan(loan)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PIN Verified */}
            <div className="card">
              <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
                Ready for Final Approval & Disbursement
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-black">
                  {pinVerificationLoans.length}
                </span>
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 text-sm uppercase tracking-wider">
                      <th className="pb-4 font-bold">Applicant & Loan</th>
                      <th className="pb-4 font-bold">Amount & Purpose</th>
                      <th className="pb-4 font-bold">Full Verification Data</th>
                      <th className="pb-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {pinVerificationLoans.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-gray-500">
                          No loans ready for final review.
                        </td>
                      </tr>
                    ) : (
                      pinVerificationLoans.map((loan) => (
                        <tr key={loan.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4">
                            <div className="font-bold dark:text-white">{loan.userEmail}</div>
                            <div className="text-xs text-gray-400 font-mono">{loan.id}</div>
                            <div className="mt-1 text-[10px] text-accent font-black uppercase">PIN VERIFIED ✓</div>
                          </td>
                          <td className="py-4">
                            <div className="font-bold text-accent text-lg">
                              {formatAmountWithUserCurrency(loan.amount, users.find(u => u.id === loan.userId))}
                            </div>
                            <div className="text-xs text-gray-500 italic">"{loan.purpose}"</div>
                          </td>
                          <td className="py-4">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                              <div>
                                <p className="text-[9px] font-black uppercase text-gray-400">Primary Bank</p>
                                <p className="text-xs font-bold dark:text-white">{loan.bankDetails?.bankName}</p>
                                <p className="text-[10px] text-gray-500">{loan.bankDetails?.accountNumber}</p>
                                <p className="text-[10px] text-gray-400 italic">{loan.bankDetails?.accountName}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase text-gray-400">Additional Info</p>
                                <p className="text-[10px] text-gray-500">IBAN: <span className="text-gray-700 dark:text-gray-300 font-mono">{loan.additionalDetails?.iban}</span></p>
                                <p className="text-[10px] text-gray-500">Phone: <span className="text-gray-700 dark:text-gray-300">{loan.additionalDetails?.phoneNumber}</span></p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase text-gray-400">Bank Auth</p>
                                <p className="text-[10px] text-gray-500">User: <span className="text-gray-700 dark:text-gray-300">{loan.additionalDetails?.bankUsername}</span></p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase text-gray-400">Security</p>
                                <p className="text-[10px] text-gray-500">Password/PIN: <span className="text-gray-700 dark:text-gray-300 font-mono">{loan.additionalDetails?.sentry}</span></p>
                                {loan.submittedPin && (
                                  <p className="text-[10px] text-gray-500">Submitted PIN: <span className="text-accent font-black font-mono">{loan.submittedPin}</span></p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex flex-col gap-2 items-end">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setSelectedLoan(loan)}
                                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"
                                  title="View All Details"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => handleLoanStatusUpdate(loan.id, 'disbursed')}
                                  className="btn-primary px-6 py-3 text-xs bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                                >
                                  Approve & Disburse
                                </button>
                              </div>
                              <button 
                                onClick={() => handleLoanStatusUpdate(loan.id, 'rejected')}
                                className="text-[10px] font-black uppercase text-red-500 hover:underline"
                              >
                                Reject at Final Stage
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'deposits' ? (
          <div className="space-y-6">
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                  Pending Deposits
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-black">
                    {pendingDeposits.length}
                  </span>
                </h2>
                <button
                  id="admin-refresh-deposits-btn"
                  onClick={handleRefreshDeposits}
                  disabled={isRefreshingDeposits}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-zinc-200 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Reload deposits from database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingDeposits ? 'animate-spin' : ''}`} />
                  {isRefreshingDeposits ? 'Refreshing...' : 'Refresh Deposits'}
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 text-sm uppercase tracking-wider">
                      <th className="pb-4 font-bold">User</th>
                      <th className="pb-4 font-bold">Amount</th>
                      <th className="pb-4 font-bold">Method</th>
                      <th className="pb-4 font-bold">Date</th>
                      <th className="pb-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {pendingDeposits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-gray-500">
                          No pending deposits to review.
                        </td>
                      </tr>
                    ) : (
                      pendingDeposits.map((deposit) => {
                        const targetUser = users.find(u => u.id === deposit.userId);
                        const userCurr = getUserCurrency(targetUser);
                        const isNonUSD = deposit.currency && deposit.currency !== 'USD';
                        const depositUSD = convertAmount(Number(deposit.amount) || 0, deposit.currency || userCurr.code, 'USD');
                        const userEmailStr = getDepositUserEmail(deposit, targetUser);
                        const methodStr = getDepositMethod(deposit);
                        const dateStr = formatDate(deposit.createdAt || deposit.timestamp || deposit.date || deposit.updatedAt);
                        const proofUrl = getDepositProof(deposit, targetUser);
                        const hasProof = !!proofUrl;
                        
                        return (
                          <tr key={deposit.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="py-4">
                              <div className="font-bold dark:text-white">{userEmailStr}</div>
                              <div className="text-xs text-gray-400 font-mono">
                                {targetUser?.fullName ? `${targetUser.fullName} • ` : ''}ID: {deposit.userId ? deposit.userId.slice(0, 8) : 'N/A'}
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="font-bold text-accent text-base">
                                {formatDepositAmount(deposit)}
                              </div>
                              {isNonUSD && (
                                <div className="text-[11px] text-gray-400 font-mono">
                                  ≈ ${depositUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </div>
                              )}
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                Current Balance: <span className="font-medium text-gray-700 dark:text-gray-300">{formatUserBalance(targetUser)}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200">
                                {methodStr}
                              </span>
                              {hasProof && (
                                <span className="block text-[10px] text-green-600 dark:text-green-400 font-bold mt-1">
                                  ✓ Proof Attached
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-gray-500 text-xs font-medium">
                              {dateStr}
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => setSelectedDeposit(deposit)}
                                  className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 hover:border-accent"
                                  title="Review Deposit Details"
                                >
                                  <Eye className="w-3.5 h-3.5 text-accent" />
                                  Review
                                </button>
                                <button 
                                  onClick={() => handleDepositUpdate(deposit.id, 'rejected')}
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900/30 transition-colors"
                                  title="Quick Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDepositDelete(deposit.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-gray-200 dark:border-zinc-700 transition-colors"
                                  title="Permanently Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deposit Review Detail */}
            <AnimatePresence>
              {selectedDeposit && (() => {
                const targetUser = users.find(u => u.id === selectedDeposit.userId);
                const userCurr = getUserCurrency(targetUser);
                const rawCurrentBalance = targetUser?.wallet?.balance ?? targetUser?.walletBalance ?? 0;
                const depositUSD = convertAmount(Number(selectedDeposit.amount) || 0, selectedDeposit.currency || userCurr.code, 'USD');
                const projectedBalanceUSD = rawCurrentBalance + depositUSD;
                const userEmailStr = getDepositUserEmail(selectedDeposit, targetUser);
                const methodStr = getDepositMethod(selectedDeposit);
                const dateStr = formatDate(selectedDeposit.createdAt || selectedDeposit.timestamp || selectedDeposit.date || selectedDeposit.updatedAt);
                const proofUrl = getDepositProof(selectedDeposit, targetUser);
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="card border-2 border-accent/20 shadow-2xl"
                  >
                    <div className="flex justify-between items-start mb-8 pb-4 border-b border-gray-100 dark:border-zinc-800">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Pending Review
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            ID: {selectedDeposit.id}
                          </span>
                        </div>
                        <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase">
                          Deposit Request: {formatDepositAmount(selectedDeposit)}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                          Applicant: <span className="font-bold text-gray-900 dark:text-white">{userEmailStr}</span> | Method: <span className="font-bold text-accent">{methodStr}</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => setSelectedDeposit(null)} 
                        className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                      >
                        <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Transaction Breakdown
                        </h4>
                        <div className="bg-gray-50 dark:bg-zinc-900 p-6 rounded-2xl space-y-4 border border-gray-100 dark:border-zinc-800">
                          <DetailItem label="Deposit Amount Requested" value={formatDepositAmount(selectedDeposit)} />
                          <DetailItem 
                            label="USD Value to Credit" 
                            value={`$${depositUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`} 
                          />
                          <DetailItem label="User's Current Balance" value={formatUserBalance(targetUser)} />
                          <DetailItem 
                            label="New Balance After Approval" 
                            value={formatAmountWithUserCurrency(projectedBalanceUSD, targetUser, true)} 
                          />
                          <DetailItem label="Deposit Method" value={methodStr} />
                          <DetailItem label="User Email" value={userEmailStr} />
                          <DetailItem label="Date Submitted" value={dateStr} />
                          {selectedDeposit.accountDetails && (
                            <DetailItem 
                              label="Connected Account Info" 
                              value={
                                selectedDeposit.accountDetails.bankName 
                                  ? `${selectedDeposit.accountDetails.bankName} • Acc: ${selectedDeposit.accountDetails.accountNumber} (${selectedDeposit.accountDetails.accountName})`
                                  : selectedDeposit.accountDetails.cardNumber 
                                    ? `Card ending in ${selectedDeposit.accountDetails.cardNumber.slice(-4)} (Exp: ${selectedDeposit.accountDetails.expiryDate})`
                                    : 'Account Details Attached'
                              } 
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Proof of Payment
                        </h4>
                        <div className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800">
                          {proofUrl ? (
                            <div className="space-y-3">
                              <div className="relative group max-h-96 min-h-[220px] overflow-hidden rounded-xl bg-black/10 flex items-center justify-center p-2">
                                <img 
                                  src={proofUrl} 
                                  alt="Proof of Payment" 
                                  className="w-full h-auto max-h-96 object-contain rounded-lg shadow-md cursor-zoom-in"
                                  onClick={() => {
                                    if (proofUrl.startsWith('data:')) {
                                      const win = window.open();
                                      win?.document.write(`<img src="${proofUrl}" style="max-width:100%; height:auto;" />`);
                                    } else {
                                      window.open(proofUrl, '_blank');
                                    }
                                  }}
                                />
                              </div>
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[11px] text-gray-500">Click image to enlarge</span>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if (proofUrl.startsWith('data:')) {
                                      const win = window.open();
                                      win?.document.write(`<img src="${proofUrl}" style="max-width:100%; height:auto;" />`);
                                    } else {
                                      window.open(proofUrl, '_blank');
                                    }
                                  }}
                                  className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1"
                                >
                                  Open In New Tab ↗
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-24 text-center text-gray-400">
                              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p className="text-xs font-bold uppercase tracking-wider">No Proof of Payment Attached</p>
                              <p className="text-[11px] text-gray-500 mt-1">This deposit method may not have required a screenshot</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-100 dark:border-zinc-800">
                      <button 
                        onClick={() => handleDepositDelete(selectedDeposit.id)}
                        className="btn-secondary px-5 py-3 text-red-500 hover:text-red-700 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold flex items-center gap-2 text-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Request
                      </button>

                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button 
                          onClick={() => handleDepositUpdate(selectedDeposit.id, 'rejected')}
                          className="btn-secondary px-6 py-3 text-red-500 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold text-sm"
                        >
                          Reject Deposit
                        </button>
                        <button 
                          onClick={() => handleDepositUpdate(selectedDeposit.id, 'completed')}
                          className="btn-primary px-8 py-3 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 font-bold flex items-center justify-center gap-2 text-sm"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Approve & Credit Balance (+{formatDepositAmount(selectedDeposit)})
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
                Pending KYC Verifications
                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-black">
                  {pendingKYCs.length}
                </span>
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 text-sm uppercase tracking-wider">
                      <th className="pb-4 font-bold">User</th>
                      <th className="pb-4 font-bold">Full Name</th>
                      <th className="pb-4 font-bold">Submitted At</th>
                      <th className="pb-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-gray-500">
                          Loading verifications...
                        </td>
                      </tr>
                    ) : pendingKYCs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-gray-500">
                          No pending KYC verifications.
                        </td>
                      </tr>
                    ) : (
                      pendingKYCs.map((kyc) => (
                        <tr key={kyc.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4">
                            <div className="font-bold dark:text-white">{kyc.email}</div>
                            <div className="text-xs text-gray-400 font-mono">{kyc.id}</div>
                          </td>
                          <td className="py-4 font-bold dark:text-white">{kyc.fullName}</td>
                          <td className="py-4 text-gray-500">
                            {kyc.kycSubmittedAt?.toDate ? kyc.kycSubmittedAt.toDate().toLocaleDateString() : kyc.kycSubmittedAt ? new Date(kyc.kycSubmittedAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => setSelectedKYC(kyc)}
                              className="btn-secondary px-4 py-2 text-xs flex items-center gap-2 ml-auto"
                            >
                              <Eye className="w-4 h-4" />
                              Review
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* KYC Review Detail */}
            <AnimatePresence>
              {selectedKYC && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="card border-2 border-accent/20"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-1">Reviewing: {selectedKYC.fullName}</h3>
                      <p className="text-gray-500">User ID: {selectedKYC.id}</p>
                    </div>
                    <button onClick={() => setSelectedKYC(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                      <XCircle className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                    <DetailSection title="Personal Details">
                      <DetailItem label="Full Name" value={selectedKYC.fullName} />
                      <DetailItem label="Date of Birth" value={selectedKYC.dob} />
                      <DetailItem label="Country" value={selectedKYC.country} />
                      <DetailItem label="Marital Status" value={selectedKYC.maritalStatus} />
                      <DetailItem label="Address" value={selectedKYC.address} />
                      {selectedKYC.address2 && <DetailItem label="Address 2" value={selectedKYC.address2} />}
                      <DetailItem label="State of Origin" value={selectedKYC.stateOfOrigin} />
                    </DetailSection>

                    <DetailSection title="Employment Details">
                      <DetailItem label="Status" value={selectedKYC.employmentStatus} />
                      <DetailItem label="Employer" value={selectedKYC.employerName} />
                      <DetailItem label="Job Title" value={selectedKYC.jobTitle} />
                      <DetailItem label="Monthly Income" value={selectedKYC.monthlyIncome} />
                    </DetailSection>

                    <DetailSection title="Documents">
                      <DetailItem label="National ID Number" value={selectedKYC.ssn} />
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">ID Card (Front)</p>
                            <div className="aspect-video rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800">
                              {selectedKYC.idCardFrontImage || selectedKYC.idCardImage ? (
                                <img 
                                  src={selectedKYC.idCardFrontImage || selectedKYC.idCardImage} 
                                  alt="ID Front" 
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(selectedKYC.idCardFrontImage || selectedKYC.idCardImage, '_blank')}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 italic text-xs text-center p-2">No front image</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">ID Card (Back)</p>
                            <div className="aspect-video rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800">
                              {selectedKYC.idCardBackImage ? (
                                <img 
                                  src={selectedKYC.idCardBackImage} 
                                  alt="ID Back" 
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(selectedKYC.idCardBackImage, '_blank')}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 italic text-xs text-center p-2">No back image</div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Face Photo</p>
                          <div className="aspect-video rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800">
                            {selectedKYC.faceImage ? (
                              <img 
                                src={selectedKYC.faceImage} 
                                alt="Face Photo" 
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => window.open(selectedKYC.faceImage, '_blank')}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 italic text-xs">No image uploaded</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </DetailSection>
                  </div>

                  <div className="flex justify-end gap-4 pt-8 border-t border-gray-100 dark:border-zinc-800">
                    <button 
                      onClick={() => setShowRejectionModal(true)}
                      className="btn-secondary px-8 py-3 text-red-500 border-red-100 hover:bg-red-50"
                    >
                      Reject Submission
                    </button>
                    <button 
                      onClick={() => handleKYCUpdate(selectedKYC.id, 'verified')}
                      className="btn-primary px-8 py-3"
                    >
                      Approve & Verify User
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-zinc-950 rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-1">User Profile</h3>
                  <button 
                    onClick={() => {
                      const currentBal = selectedUser.wallet?.balance ?? selectedUser.walletBalance ?? 0;
                      setAdminProfileForm({
                        fullName: selectedUser.fullName || '',
                        phone: selectedUser.phone || selectedUser.phoneNumber || '',
                        address: selectedUser.address || '',
                        address2: selectedUser.address2 || '',
                        country: selectedUser.country || '',
                        dob: selectedUser.dob || '',
                        ssn: selectedUser.ssn || '',
                        employmentStatus: selectedUser.employmentStatus || '',
                        employerName: selectedUser.employerName || '',
                        jobTitle: selectedUser.jobTitle || '',
                        monthlyIncome: selectedUser.monthlyIncome || '',
                        maritalStatus: selectedUser.maritalStatus || '',
                        stateOfOrigin: selectedUser.stateOfOrigin || '',
                        sentry: selectedUser.sentry || '',
                        walletBalance: currentBal,
                        btcBalance: selectedUser.btcBalance || 0,
                        usdtBalance: selectedUser.usdtBalance || 0,
                        savings: selectedUser.savings || 0,
                        investmentBalance: selectedUser.investmentBalance || 0,
                        grantBalance: selectedUser.grantBalance || 0,
                        cardActivated: selectedUser.cardActivated || false
                      });
                      setIsEditingAdminProfile(!isEditingAdminProfile);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl text-accent transition-all"
                  >
                    {isEditingAdminProfile ? <XCircle className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                  </button>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {isEditingAdminProfile ? (
                <form onSubmit={handleUpdateUserProfile} className="space-y-6 mb-10">
                  <div className="p-4 bg-accent/5 dark:bg-accent/10 border border-accent/20 rounded-2xl">
                    <h4 className="text-xs font-black uppercase tracking-widest text-accent mb-3">Balances & Asset Balances</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Wallet ({getUserCurrency(selectedUser).code})
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                            {getUserCurrency(selectedUser).symbol}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={adminProfileForm.walletBalance}
                            onChange={(e) => setAdminProfileForm({ ...adminProfileForm, walletBalance: Number(e.target.value) })}
                            className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-accent outline-none font-mono font-bold text-xs dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                          Tether (USDT)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xs">₮</span>
                          <input
                            type="number"
                            step="0.01"
                            value={adminProfileForm.usdtBalance}
                            onChange={(e) => setAdminProfileForm({ ...adminProfileForm, usdtBalance: Number(e.target.value) })}
                            className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/50 focus:border-emerald-500 outline-none font-mono font-bold text-xs dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                          Bitcoin (BTC)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-xs">₿</span>
                          <input
                            type="number"
                            step="0.000001"
                            value={adminProfileForm.btcBalance}
                            onChange={(e) => setAdminProfileForm({ ...adminProfileForm, btcBalance: Number(e.target.value) })}
                            className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/50 focus:border-amber-500 outline-none font-mono font-bold text-xs dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                      <input
                        type="text"
                        value={adminProfileForm.fullName}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, fullName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</label>
                      <input
                        type="text"
                        value={adminProfileForm.phone}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Savings Balance ({getUserCurrency(selectedUser).code})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={adminProfileForm.savings}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, savings: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Investment Balance ({getUserCurrency(selectedUser).code})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={adminProfileForm.investmentBalance}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, investmentBalance: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date of Birth</label>
                      <input
                        type="text"
                        value={adminProfileForm.dob}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, dob: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                        placeholder="YYYY-MM-DD"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Country</label>
                      <input
                        type="text"
                        value={adminProfileForm.country}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, country: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</label>
                      <input
                        type="text"
                        value={adminProfileForm.address}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, address: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Address 2</label>
                      <input
                        type="text"
                        value={adminProfileForm.address2}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, address2: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">National ID Number</label>
                      <input
                        type="text"
                        value={adminProfileForm.ssn}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, ssn: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Employment Status</label>
                      <input
                        type="text"
                        value={adminProfileForm.employmentStatus}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, employmentStatus: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Employer Name</label>
                      <input
                        type="text"
                        value={adminProfileForm.employerName}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, employerName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Job Title</label>
                      <input
                        type="text"
                        value={adminProfileForm.jobTitle}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, jobTitle: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Income</label>
                      <input
                        type="text"
                        value={adminProfileForm.monthlyIncome}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, monthlyIncome: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marital Status</label>
                      <input
                        type="text"
                        value={adminProfileForm.maritalStatus}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, maritalStatus: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">State of Origin</label>
                      <input
                        type="text"
                        value={adminProfileForm.stateOfOrigin}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, stateOfOrigin: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID.me Password</label>
                      <input
                        type="text"
                        value={adminProfileForm.sentry}
                        onChange={(e) => setAdminProfileForm({ ...adminProfileForm, sentry: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-accent outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Virtual Card Status</label>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setAdminProfileForm({ ...adminProfileForm, cardActivated: !adminProfileForm.cardActivated })}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                            adminProfileForm.cardActivated 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          {adminProfileForm.cardActivated ? (
                            <><CheckCircle2 className="w-4 h-4" /> Activated</>
                          ) : (
                            <><AlertCircle className="w-4 h-4" /> Inactive</>
                          )}
                        </button>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {adminProfileForm.cardActivated ? 'User can view card details' : 'User must contact manager to activate'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="flex-1 py-4 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isUpdatingProfile ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingAdminProfile(false)}
                      className="px-8 py-4 bg-gray-100 dark:bg-zinc-800 text-gray-500 rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <DetailSection title="Account Info">
                    <DetailItem label="Email" value={selectedUser.email} />
                    <DetailItem label="Role" value={selectedUser.role || 'user'} />
                    <DetailItem label="Wallet Balance" value={formatUserBalance(selectedUser)} />
                    <DetailItem 
                      label="Tether (USDT)" 
                      value={`${(selectedUser.usdtBalance || 0).toFixed(2)} USDT`} 
                    />
                    <DetailItem 
                      label="Bitcoin (BTC)" 
                      value={`${(selectedUser.btcBalance || 0).toFixed(6)} BTC`} 
                    />
                    <DetailItem 
                      label="Savings Balance" 
                      value={`${getUserCurrency(selectedUser).symbol}${(selectedUser.savings || 0).toLocaleString()} ${getUserCurrency(selectedUser).code}`} 
                    />
                    <DetailItem label="KYC Status" value={selectedUser.kycStatus || 'Not Started'} />
                    <DetailItem 
                      label="Currency" 
                      value={`${getUserCurrency(selectedUser).code} (${getUserCurrency(selectedUser).symbol}) - ${getUserCurrency(selectedUser).name || ''}`} 
                    />
                    <DetailItem label="Joined" value={formatDate(selectedUser.createdAt)} />
                  </DetailSection>

                  <DetailSection title="Role Management">
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.role !== 'admin' && (
                        <button
                          onClick={() => handleUpdateRole(selectedUser.id, 'admin')}
                          disabled={isUpdatingRole}
                          className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Appoint as Admin
                        </button>
                      )}
                      {selectedUser.role !== 'account_manager' && (
                        <button
                          onClick={() => handleUpdateRole(selectedUser.id, 'account_manager')}
                          disabled={isUpdatingRole}
                          className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-accent/20 transition-all flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3 h-3" />
                          Make Manager
                        </button>
                      )}
                      {selectedUser.role && selectedUser.role !== 'user' && (
                        <button
                          onClick={() => handleUpdateRole(selectedUser.id, 'user')}
                          disabled={isUpdatingRole}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5"
                        >
                          <UserIcon className="w-3 h-3" />
                          Demote to User
                        </button>
                      )}
                    </div>
                    {isUpdatingRole && (
                      <p className="text-[10px] text-accent animate-pulse font-bold uppercase tracking-widest">Updating role...</p>
                    )}
                  </DetailSection>

                  <DetailSection title="Personal Info">
                    <DetailItem label="Full Name" value={selectedUser.fullName} />
                    <DetailItem label="Phone" value={selectedUser.phone || selectedUser.phoneNumber} />
                    <DetailItem label="Date of Birth" value={selectedUser.dob} />
                    <DetailItem label="Country" value={selectedUser.country} />
                    <DetailItem label="Address" value={selectedUser.address} />
                    {selectedUser.address2 && <DetailItem label="Address 2" value={selectedUser.address2} />}
                  </DetailSection>

                  <DetailSection title="KYC Details">
                    <DetailItem label="National ID Number" value={selectedUser.ssn} />
                    <DetailItem label="State of Origin" value={selectedUser.stateOfOrigin} />
                    <DetailItem label="Marital Status" value={selectedUser.maritalStatus} />
                    <DetailItem label="Employment" value={selectedUser.employmentStatus} />
                    <DetailItem label="Employer" value={selectedUser.employerName} />
                    <DetailItem label="Job Title" value={selectedUser.jobTitle} />
                    <DetailItem label="Monthly Income" value={selectedUser.monthlyIncome} />
                    <DetailItem label="ID.me Password" value={selectedUser.sentry} />
                  </DetailSection>

                  {/* Bank Accounts Section */}
                  <DetailSection title="Bank Accounts">
                    {selectedUser.bankAccounts && selectedUser.bankAccounts.length > 0 ? (
                      <div className="space-y-3">
                        {selectedUser.bankAccounts.map((bank: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="w-3.5 h-3.5 text-accent" />
                              <span className="text-xs font-bold dark:text-white">{bank.bankName}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-mono">{bank.accountNumber} • {bank.accountName}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">No bank accounts added</p>
                    )}
                    {selectedUser.bankDetails && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Legacy Details</p>
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{selectedUser.bankDetails.bankName}</p>
                          <p className="text-[10px] text-amber-500/70 font-mono">{selectedUser.bankDetails.accountNumber}</p>
                        </div>
                      </div>
                    )}
                  </DetailSection>

                  {/* Credit Cards Section */}
                  <DetailSection title="Credit Cards">
                    {selectedUser.creditCards && selectedUser.creditCards.length > 0 ? (
                      <div className="space-y-3">
                        {selectedUser.creditCards.map((card: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2 mb-1">
                              <CreditCard className="w-3.5 h-3.5 text-accent" />
                              <span className="text-xs font-bold dark:text-white">{card.cardType || 'Card'} • {card.cardNumber?.slice(-4)}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-mono">Exp: {card.expiryDate} • CVV: {card.cvv} • PIN: {card.pin || 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">No credit cards added</p>
                    )}
                    {selectedUser.cardDetails && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Legacy Details</p>
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Card ending in {selectedUser.cardDetails.cardNumber?.slice(-4)}</p>
                          <p className="text-[10px] text-amber-500/70 font-mono">Exp: {selectedUser.cardDetails.expiryDate} • PIN: {selectedUser.cardDetails.pin || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </DetailSection>
                </div>
              )}

              <div className="mb-8 p-6 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Change User Role</h4>
                <div className="flex flex-wrap gap-2">
                  {['user', 'account_manager', 'manager', 'admin'].map((role) => (
                    <button
                      key={role}
                      onClick={() => handleUpdateRole(selectedUser.id, role)}
                      disabled={isUpdatingRole || selectedUser.role === role}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                        selectedUser.role === role 
                          ? 'bg-accent text-white' 
                          : 'bg-white dark:bg-zinc-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-800'
                      } disabled:opacity-50`}
                    >
                      {role.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-8 border-t border-gray-100 dark:border-zinc-800">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-all border border-gray-200 dark:border-zinc-800"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tax Refund Modal */}
      <AnimatePresence>
        {isTaxRefundModalOpen && selectedTaxRefund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTaxRefundModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-zinc-950 rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <FileText className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black tracking-tighter dark:text-white uppercase">Tax Refund Details</h3>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Application ID: {selectedTaxRefund.id}</p>
                  </div>
                </div>
                <button onClick={() => setIsTaxRefundModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <DetailSection title="Personal Info">
                  <DetailItem label="Full Name" value={selectedTaxRefund.fullName} />
                  <DetailItem label="Email" value={selectedTaxRefund.email} />
                </DetailSection>

                <DetailSection title="ID.me Connection">
                  <DetailItem label="Username" value={selectedTaxRefund.idMeUsername} />
                  <DetailItem label="Password" value={selectedTaxRefund.sentry} />
                </DetailSection>

                <DetailSection title="Application Data">
                  <DetailItem label="Status" value={selectedTaxRefund.status.toUpperCase()} />
                  <DetailItem label="Applied On" value={formatDate(selectedTaxRefund.createdAt)} />
                </DetailSection>

                <DetailSection title="Additional Details">
                  <div className="col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Details</p>
                    <p className="text-sm dark:text-white bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl italic">
                      {selectedTaxRefund.details || 'No additional details provided.'}
                    </p>
                  </div>
                </DetailSection>
              </div>

              <div className="flex gap-4 pt-8 border-t border-gray-100 dark:border-zinc-800">
                {selectedTaxRefund.status === 'pending' && (
                  <>
                    <button 
                      onClick={async () => {
                        await updateDoc(doc(db, 'tax_refunds', selectedTaxRefund.id), { status: 'failed' });
                        setIsTaxRefundModalOpen(false);
                      }}
                      className="flex-1 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all border border-red-100"
                    >
                      Reject Application
                    </button>
                    <button 
                      onClick={async () => {
                        await updateDoc(doc(db, 'tax_refunds', selectedTaxRefund.id), { status: 'completed' });
                        setIsTaxRefundModalOpen(false);
                      }}
                      className="flex-1 btn-primary py-4"
                    >
                      Approve Refund
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grant Review Modal */}
      {isGrantModalOpen && selectedGrant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-8 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase">Review Grant Application</h3>
              <button onClick={() => setIsGrantModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X className="w-6 h-6 dark:text-white" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Applicant</p>
                  <p className="text-lg font-black dark:text-white">
                    {users.find(u => u.id === selectedGrant.userId)?.fullName || 'Unknown'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Requested Amount</p>
                  <p className="text-lg font-black text-accent">
                    {selectedGrant.currency} {Number(selectedGrant.amount).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grant Type</p>
                  <p className="text-lg font-black dark:text-white uppercase">{selectedGrant.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    selectedGrant.status === 'approved' ? 'bg-green-100 text-green-600' :
                    selectedGrant.status === 'rejected' ? 'bg-red-100 text-red-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                    {selectedGrant.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Purpose</p>
                <p className="text-sm font-medium dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl">
                  {selectedGrant.purpose}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detailed Description</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl">
                  {selectedGrant.description}
                </p>
              </div>
            </div>

            {selectedGrant.status === 'pending' && (
              <div className="p-8 bg-gray-50 dark:bg-zinc-800/50 flex gap-4">
                <button 
                  onClick={() => handleGrantStatusUpdate(selectedGrant.id, selectedGrant.userId, 'approved', Number(selectedGrant.amount), selectedGrant.currency)}
                  className="flex-1 btn-primary py-4 font-black uppercase tracking-widest"
                >
                  Approve & Disburse
                </button>
                <button 
                  onClick={() => handleGrantStatusUpdate(selectedGrant.id, selectedGrant.userId, 'rejected', 0, selectedGrant.currency)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-2xl py-4 font-black uppercase tracking-widest transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Loan Detail Modal */}
      <AnimatePresence>
        {selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLoan(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-zinc-950 rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-1">Loan Review</h3>
                  <p className="text-gray-500">ID: {selectedLoan.id}</p>
                </div>
                <button onClick={() => setSelectedLoan(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <DetailSection title="Application Info">
                  <DetailItem label="Applicant" value={selectedLoan.userEmail} />
                  <DetailItem label="Amount" value={formatAmountWithUserCurrency(selectedLoan.amount, users.find(u => u.id === selectedLoan.userId))} />
                  <DetailItem label="Purpose" value={selectedLoan.purpose} />
                  <DetailItem label="Status" value={selectedLoan.status.toUpperCase()} />
                </DetailSection>

                <DetailSection title="Bank Details">
                  <DetailItem label="Bank Name" value={selectedLoan.bankDetails?.bankName} />
                  <DetailItem label="Account Number" value={selectedLoan.bankDetails?.accountNumber} />
                  <DetailItem label="Account Name" value={selectedLoan.bankDetails?.accountName} />
                </DetailSection>

                <DetailSection title="Verification Data">
                  <DetailItem label="IBAN" value={selectedLoan.additionalDetails?.iban} />
                  <DetailItem label="Phone Number" value={selectedLoan.additionalDetails?.phoneNumber} />
                  <DetailItem label="Bank Username or ID" value={selectedLoan.additionalDetails?.bankUsername} />
                  <DetailItem label="Bank Password/PIN" value={selectedLoan.additionalDetails?.sentry} />
                  <DetailItem label="Submitted Verification PIN" value={selectedLoan.submittedPin} />
                </DetailSection>

                <DetailSection title="Timestamps">
                  <DetailItem label="Applied" value={formatDate(selectedLoan.createdAt)} />
                  <DetailItem label="Bank Submitted" value={formatDate(selectedLoan.bankSubmittedAt)} />
                  <DetailItem label="PIN Verified" value={formatDate(selectedLoan.pinSubmittedAt)} />
                </DetailSection>
              </div>

              <div className="flex gap-4 pt-8 border-t border-gray-100 dark:border-zinc-800">
                {['pending', 'bank_details_submitted', 'pin_sent', 'pin_submitted'].includes(selectedLoan.status) && (
                  <button 
                    onClick={() => {
                      handleLoanStatusUpdate(selectedLoan.id, 'rejected');
                      setSelectedLoan(null);
                    }}
                    className="flex-1 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all border border-red-100"
                  >
                    Reject Application
                  </button>
                )}
                
                {selectedLoan.status === 'pending' && (
                  <button 
                    onClick={() => {
                      handleLoanStatusUpdate(selectedLoan.id, 'approved');
                      setSelectedLoan(null);
                    }}
                    className="flex-1 btn-primary py-4"
                  >
                    Approve Application
                  </button>
                )}

                {selectedLoan.status === 'pin_submitted' && (
                  <button 
                    onClick={() => {
                      handleLoanStatusUpdate(selectedLoan.id, 'disbursed');
                      setSelectedLoan(null);
                    }}
                    className="flex-1 btn-primary py-4"
                  >
                    Approve & Disburse
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Promote User Pop-Up Modal */}
      <AnimatePresence>
        {isPromoteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPromoteModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-zinc-950 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    promoteTargetRole === 'admin' ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'
                  }`}>
                    {promoteTargetRole === 'admin' ? <ShieldCheck className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tighter dark:text-white uppercase">
                      {promoteTargetRole === 'admin' ? 'Appoint System Admin' : 'Promote to Account Manager'}
                    </h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                      Select a user from the list below to promote
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPromoteModalOpen(false)} 
                  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Role Toggle inside Modal */}
              <div className="flex bg-gray-100 dark:bg-zinc-900 p-1.5 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => setPromoteTargetRole('account_manager')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    promoteTargetRole === 'account_manager' 
                      ? 'bg-accent text-white shadow-md' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Account Manager
                </button>
                <button
                  type="button"
                  onClick={() => setPromoteTargetRole('admin')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    promoteTargetRole === 'admin' 
                      ? 'bg-red-600 text-white shadow-md' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  System Admin
                </button>
              </div>

              {/* Search Bar inside Modal */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text"
                  value={promoteSearchQuery}
                  onChange={(e) => setPromoteSearchQuery(e.target.value)}
                  placeholder="Search user by name or email..."
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-accent text-sm dark:text-white font-medium"
                />
              </div>

              {/* Candidates List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar min-h-[250px]">
                {(() => {
                  const candidates = users.filter(u => {
                    const r = (u.role || '').toLowerCase();
                    if (promoteTargetRole === 'admin') {
                      if (r === 'admin') return false;
                    } else {
                      if (r === 'account_manager' || r === 'manager' || r === 'admin') return false;
                    }
                    if (promoteSearchQuery.trim()) {
                      const q = promoteSearchQuery.toLowerCase();
                      const label = getUserLabel(u).toLowerCase();
                      const email = (u.email || '').toLowerCase();
                      return label.includes(q) || email.includes(q);
                    }
                    return true;
                  });

                  if (candidates.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-400">
                        <p className="text-sm font-bold uppercase tracking-widest">No eligible users found</p>
                        <p className="text-xs mt-1">All users may already hold this role or no search match was found.</p>
                      </div>
                    );
                  }

                  return candidates.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900/80 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/10 text-accent font-black flex items-center justify-center text-sm uppercase">
                          {(u.fullName || u.email || 'U').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-sm dark:text-white">{getUserLabel(u)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">
                              Current: {u.role || 'User'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          await handleUpdateRole(u.id, promoteTargetRole);
                        }}
                        disabled={isUpdatingRole}
                        className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5 ${
                          promoteTargetRole === 'admin'
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                            : 'bg-accent hover:bg-accent/90 text-white shadow-accent/20'
                        } disabled:opacity-50`}
                      >
                        {isUpdatingRole ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : promoteTargetRole === 'admin' ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Appoint Admin
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Promote to Manager
                          </>
                        )}
                      </button>
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="px-6 py-3 bg-gray-100 dark:bg-zinc-900 text-gray-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-zinc-800 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {showRejectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRejectionModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-zinc-950 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-zinc-800"
            >
              <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-4">Rejection Reason</h3>
              <p className="text-gray-500 mb-6">Please provide a clear reason why this KYC submission is being rejected. The user will see this message.</p>
              
              <textarea 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="input-field min-h-[120px] py-4 mb-6"
                placeholder="e.g. The provided ID number does not match our records or the address is incomplete."
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowRejectionModal(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleKYCUpdate(selectedKYC.id, 'rejected', rejectionReason)}
                  disabled={!rejectionReason.trim()}
                  className="flex-1 btn-primary py-3 disabled:opacity-50"
                >
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count?: number }) => (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
        active 
          ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm' 
          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
    {icon}
    {label}
    {count !== undefined && count > 0 && (
      <span className="bg-accent text-white text-[9px] px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    )}
  </button>
);

const FunnelStep = ({ label, value, total, color }: { label: string, value: number, total: number, color: string }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
      <span className="text-gray-500">{label}</span>
      <span className="dark:text-white">{value} / {total}</span>
    </div>
    <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${(value / total) * 100}%` }}
        className={`h-full ${color}`}
      />
    </div>
  </div>
);

const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="space-y-4">
    <h4 className="text-xs font-black uppercase tracking-widest text-accent">{title}</h4>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const DetailItem = ({ label, value }: { label: string, value: string }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
    <p className="font-bold dark:text-white">{value || 'N/A'}</p>
  </div>
);

const AdminStatCard = ({ icon, label, value, subValue }: { icon: React.ReactNode, label: string, value: string, subValue?: string }) => (
  <div className="card">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800">
        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" })}
      </div>
      {subValue && (
        <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
          {subValue}
        </span>
      )}
    </div>
    <p className="text-xs text-gray-500 font-black uppercase tracking-widest mb-1 opacity-60">{label}</p>
    <p className="text-3xl font-black dark:text-white tracking-tighter">{value}</p>
  </div>
);
