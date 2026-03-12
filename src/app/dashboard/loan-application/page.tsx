import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Wallet, 
  Calendar, 
  Info, 
  ArrowRight, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useCurrency } from '../../../hooks/useCurrency';

export const LoanApplicationPage = () => {
  const { user, userData } = useAuth();
  const { activeLoan } = useOutletContext<{ activeLoan: any }>();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(50000);
  const [duration, setDuration] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kycStatus = userData?.kycStatus || 'unverified';

  // If already has an active loan that is not disbursed/completed, prevent new application
  const hasActiveApplication = activeLoan && !['disbursed', 'completed', 'rejected'].includes(activeLoan.status);

  if (hasActiveApplication) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-10 h-10 text-accent" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter dark:text-white mb-4 uppercase">Application in Progress</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          You already have an active loan application. Please complete the current process before applying for a new one.
        </p>
        <button 
          onClick={() => navigate('/dashboard/loan-status')}
          className="btn-primary px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest"
        >
          View Status
        </button>
      </div>
    );
  }

  // If not verified, redirect back to dashboard or show message
  if (kycStatus !== 'verified') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-yellow-500" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter dark:text-white mb-4 uppercase">Verification Required</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          You must complete your Identity Verification (KYC) before you can apply for a loan.
        </p>
        <button 
          onClick={() => navigate('/dashboard/kyc')}
          className="btn-primary px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest"
        >
          Start Verification
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const loanRef = await addDoc(collection(db, 'loans'), {
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.fullName || user.email?.split('@')[0],
        amount: Number(amount),
        duration: Number(duration),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        interestRate: 5, // Default 5%
        totalRepayment: Number(amount) * 1.05,
      });

      // Notify user
      await addDoc(collection(db, 'notifications', user.uid, 'items'), {
        type: 'loan_application',
        title: 'Application Received',
        message: `Your loan application for ${formatAmount(amount)} has been received and is awaiting approval. We will notify you once it's processed.`,
        createdAt: serverTimestamp(),
        read: false,
      });

      // Update user document with active loan status for instant UI feedback
      await updateDoc(doc(db, 'users', user.uid), {
        activeLoanStatus: 'pending',
        updatedAt: serverTimestamp()
      });

      // Navigate to dashboard immediately to show the nudge banner
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error submitting loan:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthlyPayment = (amount * 1.05) / duration;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tighter dark:text-white mb-2 uppercase">Apply for a Loan</h2>
        <p className="text-gray-500">Fast, secure, and transparent lending tailored for you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="card space-y-8">
            {/* Amount Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Loan Amount</label>
                <span className="text-2xl font-black text-accent">{formatAmount(amount)}</span>
              </div>
              <input 
                type="range" 
                min="5000" 
                max="500000" 
                step="5000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>{formatAmount(5000)}</span>
                <span>{formatAmount(500000)}</span>
              </div>
            </div>

            {/* Duration Selection */}
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Repayment Period</label>
              <div className="grid grid-cols-3 gap-4">
                {[3, 6, 12].map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setDuration(months)}
                    className={`p-4 rounded-2xl border-2 transition-all text-center group ${
                      duration === months 
                        ? 'border-accent bg-accent/5 text-accent' 
                        : 'border-gray-100 dark:border-zinc-800 text-gray-400 hover:border-gray-200 dark:hover:border-zinc-700'
                    }`}
                  >
                    <p className="text-lg font-black">{months}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Months</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-500/5 rounded-2xl p-4 border border-blue-100 dark:border-blue-500/20 flex gap-4">
              <Info className="w-5 h-5 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                Interest rate is fixed at 5% for all loans. Your repayment schedule will be generated upon approval.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 text-xs font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-5 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? 'Processing Application...' : 'Submit Application'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="card bg-accent text-white border-none">
            <h4 className="text-xs font-black uppercase tracking-widest opacity-60 mb-6">Loan Summary</h4>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium opacity-80">Principal</span>
                <span className="text-lg font-black">{formatAmount(amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium opacity-80">Interest (5%)</span>
                <span className="text-lg font-black">{formatAmount(amount * 0.05)}</span>
              </div>
              <div className="h-px bg-white/20" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium opacity-80">Total Repayment</span>
                <span className="text-2xl font-black">{formatAmount(amount * 1.05)}</span>
              </div>
            </div>

            <div className="mt-8 p-4 bg-white/10 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Estimated Monthly</p>
              <p className="text-2xl font-black">{formatAmount(monthlyPayment)}</p>
            </div>
          </div>

          <div className="card space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Requirements</h4>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs font-bold dark:text-white">KYC Verified</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs font-bold dark:text-white">Active Bank Account</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs font-bold dark:text-white">Valid ID Document</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal removed - navigating to dashboard instead */}
    </div>
  );
};
