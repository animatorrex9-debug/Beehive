import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Wallet, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldEllipsis,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NudgeBanner } from '../../components/dashboard/NudgeBanner';

import { useNavigate } from 'react-router-dom';

export const DashboardPage = () => {
  const { user, userData } = useAuth();
  const { activeLoan } = useOutletContext<{ activeLoan: any }>();
  const navigate = useNavigate();

  const kycStatus = userData?.kycStatus || 'unverified';

  const stats = [
    {
      label: 'Loan Amount',
      value: activeLoan ? `$${activeLoan.amount.toLocaleString()}` : '$0',
      icon: Wallet,
      color: 'text-accent',
      bg: 'bg-accent/10'
    },
    {
      label: 'Current Status',
      value: activeLoan ? activeLoan.status.replace('_', ' ').toUpperCase() : 'NO ACTIVE LOAN',
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10'
    },
    {
      label: 'Next Payment',
      value: activeLoan?.status === 'disbursed' ? 'Mar 15, 2026' : 'N/A',
      icon: TrendingUp,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:hidden"
      >
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
          Welcome back,
        </p>
        <h2 className="text-3xl font-black tracking-tighter dark:text-white uppercase">
          {userData?.fullName || user?.email?.split('@')[0]}
        </h2>
      </motion.div>

      {/* Nudge Banner */}
      {activeLoan && <NudgeBanner status={activeLoan.status} />}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="card flex items-center gap-6 group hover:border-accent/30 transition-all cursor-default"
          >
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black dark:text-white tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* KYC Status Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card overflow-hidden relative group"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black tracking-tighter dark:text-white mb-1 uppercase">Identity Verification</h3>
              <p className="text-sm text-gray-500">
                {kycStatus === 'verified' ? 'Your account is fully verified.' :
                 kycStatus === 'pending' ? 'Your documents are under review.' :
                 kycStatus === 'rejected' ? 'Verification rejected. Please resubmit.' :
                 'Complete verification to apply for a loan.'}
              </p>
            </div>
            {kycStatus === 'verified' ? (
              <ShieldCheck className="w-10 h-10 text-green-500" />
            ) : kycStatus === 'pending' ? (
              <ShieldEllipsis className="w-10 h-10 text-yellow-500" />
            ) : (
              <ShieldAlert className={`w-10 h-10 ${kycStatus === 'rejected' ? 'text-red-500' : 'text-gray-300'}`} />
            )}
          </div>

          <div className={`p-4 rounded-2xl border mb-6 flex items-center justify-between ${
            kycStatus === 'verified' ? 'bg-green-50 border-green-100 dark:bg-green-500/5 dark:border-green-500/20' :
            kycStatus === 'pending' ? 'bg-yellow-50 border-yellow-100 dark:bg-yellow-500/5 dark:border-yellow-500/20' :
            kycStatus === 'rejected' ? 'bg-red-50 border-red-100 dark:bg-red-500/5 dark:border-red-500/20' :
            'bg-gray-50 border-gray-100 dark:bg-zinc-900 dark:border-zinc-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                kycStatus === 'verified' ? 'bg-green-500' :
                kycStatus === 'pending' ? 'bg-yellow-500' :
                kycStatus === 'rejected' ? 'bg-red-500' :
                'bg-gray-400'
              }`} />
              <span className={`text-sm font-bold uppercase tracking-wider ${
                kycStatus === 'verified' ? 'text-green-700 dark:text-green-400' :
                kycStatus === 'pending' ? 'text-yellow-700 dark:text-yellow-400' :
                kycStatus === 'rejected' ? 'text-red-700 dark:text-red-400' :
                'text-gray-500'
              }`}>
                {kycStatus}
              </span>
            </div>
            {kycStatus !== 'verified' && (
              <button 
                onClick={() => navigate('/dashboard/kyc')}
                className="text-xs font-black text-accent hover:underline uppercase tracking-tighter flex items-center gap-1"
              >
                {kycStatus === 'pending' ? 'Check Status' : 
                 kycStatus === 'rejected' ? 'Resubmit' : 'Start Verification'}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {kycStatus === 'unverified' && (
            <div className="bg-accent/5 rounded-xl p-4 border border-accent/10">
              <p className="text-xs text-accent font-bold leading-relaxed">
                Verification is required before your first loan can be disbursed. This usually takes less than 24 hours.
              </p>
            </div>
          )}

          {kycStatus === 'pending' && (
            <div className="bg-yellow-50 dark:bg-yellow-500/5 rounded-xl p-4 border border-yellow-100 dark:border-yellow-500/20">
              <p className="text-xs text-yellow-700 dark:text-yellow-400 font-bold leading-relaxed">
                We'll notify you once verified. This usually takes less than 24 hours.
              </p>
            </div>
          )}

          {kycStatus === 'rejected' && userData?.rejectionReason && (
            <div className="bg-red-50 dark:bg-red-500/5 rounded-xl p-4 border border-red-100 dark:border-red-500/20">
              <p className="text-xs text-red-700 dark:text-red-400 font-bold leading-relaxed">
                Reason: {userData.rejectionReason}
              </p>
            </div>
          )}
        </motion.div>

        {/* Active Loan Summary Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card flex flex-col justify-between"
        >
          <div>
            <h3 className="text-xl font-black tracking-tighter dark:text-white mb-1 uppercase">Active Loan Summary</h3>
            <p className="text-sm text-gray-500 mb-8">Overview of your current financial commitment.</p>
            
            {activeLoan ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Principal</span>
                  <span className="text-lg font-black dark:text-white">${activeLoan.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Next Action</span>
                  <span className="text-sm font-black text-accent uppercase tracking-tighter">
                    {activeLoan.status === 'approved' ? 'Connect Bank' : 
                     activeLoan.status === 'pin_sent' ? 'Enter PIN' : 
                     'Wait for Approval'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-gray-400 font-bold mb-4">No active loan applications</p>
                <button 
                  onClick={() => {
                    if (kycStatus === 'verified') {
                      navigate('/dashboard/loan-application');
                    } else {
                      alert('Please complete your Identity Verification (KYC) before applying for a loan.');
                      navigate('/dashboard/kyc');
                    }
                  }}
                  className="btn-primary px-8 py-3 rounded-2xl text-sm flex items-center gap-2 mx-auto"
                >
                  Apply Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {activeLoan && (
            <button className="w-full mt-6 py-4 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 text-sm font-black uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
              View Full Details
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
};
