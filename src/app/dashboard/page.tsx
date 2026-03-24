import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldEllipsis,
  ArrowRight,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  RefreshCw,
  Award,
  Heart
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';
import { useCurrency } from '../../hooks/useCurrency';
import { doc, updateDoc, collection, addDoc, increment, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';

export const DashboardPage = () => {
  const { user, userData } = useAuth();
  const { btcPrice, usdtPrice } = useCryptoPrices();
  const { formatAmount } = useCurrency();
  const { activeLoan } = useOutletContext<{ activeLoan: any }>();
  const navigate = useNavigate();

  const [message, setMessage] = React.useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [dailyGrowthRate, setDailyGrowthRate] = React.useState<number>(0);

  const kycStatus = userData?.kycStatus || 'unverified';

  // Quick Links with better colors
  const quickLinks = [
    { icon: <RefreshCw className="text-blue-500" />, label: "Swap", to: "/dashboard/swap", bg: "bg-blue-500/10" },
    { icon: <Award className="text-purple-500" />, label: "Grants", to: "/dashboard/grants", bg: "bg-purple-500/10" },
    { icon: <Heart className="text-red-500" />, label: "Charity", to: "/dashboard/charity", bg: "bg-red-500/10" },
    { icon: <TrendingUp className="text-emerald-500" />, label: "Invest", to: "/dashboard/invest", bg: "bg-emerald-500/10" },
  ];

  const handleTransferToWallet = async (type: 'investment' | 'grant') => {
    if (!user || !userData) return;
    
    const amount = type === 'investment' ? (userData.investmentBalance || 0) : (userData.grantBalance || 0);
    if (amount <= 0) {
      setMessage({ text: `No ${type} funds available to transfer.`, type: 'error' });
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      
      // If transferring investment, we need to mark active investments as withdrawn
      if (type === 'investment') {
        const q = query(collection(db, 'users', user.uid, 'investments'), where('status', '==', 'active'));
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        querySnapshot.forEach((investmentDoc) => {
          batch.update(investmentDoc.ref, { status: 'withdrawn' });
        });
        
        batch.update(userRef, {
          walletBalance: increment(amount),
          investmentBalance: 0
        });
        
        await batch.commit();
      } else {
        await updateDoc(userRef, {
          walletBalance: increment(amount),
          grantBalance: 0
        });
      }

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'transfer',
        amount: amount,
        currency: userData?.currency?.code || 'USD',
        status: 'completed',
        description: `Transfer from ${type} to wallet`,
        timestamp: new Date().toISOString()
      });

      setMessage({ text: `Successfully transferred ${formatAmount(amount)} to your wallet.`, type: 'success' });
    } catch (err) {
      console.error('Transfer error:', err instanceof Error ? err.message : String(err));
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      setMessage({ text: 'Failed to process transfer.', type: 'error' });
    }
  };

  React.useEffect(() => {
    const processInvestments = async () => {
      // Ensure both user and userData are available AND auth.currentUser is populated
      if (!user || !userData || !auth.currentUser) return;

      try {
        // Double check auth state to prevent unauthenticated requests
        if (auth.currentUser.uid !== user.uid) {
          console.warn('[Dashboard] Auth mismatch, skipping investment processing');
          return;
        }

        // Fetch active investments
        const q = query(collection(db, 'users', user.uid, 'investments'), where('status', '==', 'active'));
        const querySnapshot = await getDocs(q);
        
        let totalDailyReturnAmount = 0;
        let totalInvestedAmount = 0;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const biweeklyRate = data.biweeklyReturn / 100;
          const dailyRate = biweeklyRate / 14;
          const dailyReturn = data.amount * dailyRate;
          
          totalDailyReturnAmount += dailyReturn;
          totalInvestedAmount += data.amount;
        });

        // Calculate current growth rate for UI (weighted average)
        if (totalInvestedAmount > 0) {
          const overallDailyRate = (totalDailyReturnAmount / totalInvestedAmount) * 100;
          setDailyGrowthRate(overallDailyRate);
        } else {
          setDailyGrowthRate(0);
        }

        // Handle return calculation (adding to balance)
        if (!userData.lastReturnCalculationDate) {
          await updateDoc(doc(db, 'users', user.uid), {
            lastReturnCalculationDate: new Date().toISOString()
          });
          return;
        }

        const lastCalc = new Date(userData.lastReturnCalculationDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastCalc.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          if (totalDailyReturnAmount > 0) {
            const totalReturnToAdd = totalDailyReturnAmount * diffDays;
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              investmentBalance: increment(totalReturnToAdd),
              lastReturnCalculationDate: now.toISOString()
            });
            console.log(`Added ${totalReturnToAdd} in returns for ${diffDays} days.`);
          } else {
            // Update date even if no returns to avoid re-checking
            await updateDoc(doc(db, 'users', user.uid), {
              lastReturnCalculationDate: now.toISOString()
            });
          }
        }
      } catch (err) {
        console.error('Error processing investments:', err instanceof Error ? err.message : String(err));
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}/investments`);
      }
    };

    processInvestments();
  }, [user, userData?.lastReturnCalculationDate, userData?.investmentBalance]);

  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const stats = [
    {
      label: 'Wallet Balance',
      value: userData?.walletBalance !== undefined ? formatAmount(userData.walletBalance) : formatAmount(0),
      icon: Wallet,
      color: 'text-accent',
      bg: 'bg-accent/10'
    },
    {
      label: 'Bitcoin',
      value: `${userData?.btcBalance?.toFixed(4) || '0.0000'} BTC`,
      subValue: `≈ ${formatAmount((userData?.btcBalance || 0) * btcPrice)}`,
      icon: TrendingUp,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10'
    },
    {
      label: 'USDT',
      value: `${userData?.usdtBalance?.toFixed(2) || '0.00'} USDT`,
      subValue: `≈ ${formatAmount((userData?.usdtBalance || 0) * usdtPrice)}`,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'Savings',
      value: userData?.savings !== undefined ? formatAmount(userData.savings) : formatAmount(0),
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      label: 'Investment',
      value: userData?.investmentBalance !== undefined ? formatAmount(userData.investmentBalance) : formatAmount(0),
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4">
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl text-sm font-bold uppercase tracking-widest flex items-center gap-3 ${
              message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            }`}
          >
            {message.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            {message.text}
          </motion.div>
        )}

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
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <p className="text-xl font-black dark:text-white tracking-tight">{stat.value}</p>
              {stat.subValue && <p className="text-[10px] text-gray-500 font-bold">{stat.subValue}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Wallet & Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card overflow-hidden relative group bg-accent text-white border-none"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Total Balance</p>
                <h3 className="text-5xl font-black tracking-tighter">
                  {formatAmount(userData?.walletBalance || 0)}
                </h3>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <Wallet className="w-8 h-8" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => navigate('/dashboard/deposit')}
                className="py-4 rounded-2xl bg-white text-accent font-black uppercase tracking-widest text-xs hover:bg-opacity-90 transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2"
              >
                <ArrowDownLeft className="w-4 h-4" /> Deposit
              </button>
              <button 
                onClick={() => navigate('/dashboard/send')}
                className="py-4 rounded-2xl bg-white/20 text-white font-black uppercase tracking-widest text-xs hover:bg-white/30 transition-all backdrop-blur-md flex items-center justify-center gap-2"
              >
                <ArrowUpRight className="w-4 h-4" /> Transfer
              </button>
            </div>
          </div>
          
          {/* Decorative circles */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        </motion.div>

        {/* KYC Status Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
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
                  <span className="text-lg font-black dark:text-white">{formatAmount(activeLoan.amount || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Next Action</span>
                  <span className="text-sm font-black text-accent uppercase tracking-tighter">
                    {activeLoan.status === 'approved' || activeLoan.status === 'pending' ? 'Connect Bank' : 
                     activeLoan.status === 'pin_sent' ? 'Enter PIN' : 
                     activeLoan.status === 'bank_details_submitted' ? 'Verify IBAN' :
                     activeLoan.status === 'disbursed' ? 'Repayment Active' :
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
                      setMessage({ text: 'Please complete your Identity Verification (KYC) before applying for a loan.', type: 'error' });
                      setTimeout(() => navigate('/dashboard/kyc'), 2000);
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
            <button 
              onClick={() => navigate('/dashboard/loan-status')}
              className="w-full mt-6 py-4 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 text-sm font-black uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
            >
              View Full Details
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </motion.div>

        {/* Banking Quick Links */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {quickLinks.map((link, idx) => (
            <QuickLink 
              key={idx} 
              icon={link.icon} 
              label={link.label} 
              to={link.to} 
              bg={link.bg} 
            />
          ))}
        </motion.div>

        {/* Investment & Grants Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 card p-8 space-y-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase">Wealth & Support</h3>
              <p className="text-sm text-gray-500">Track your investment growth and grant funds.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-xs font-bold uppercase tracking-widest">
              <TrendingUp className="w-4 h-4" />
              +{dailyGrowthRate.toFixed(2)}% Daily Growth
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Investment Card */}
            <div className="p-6 rounded-3xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-2 py-1 rounded-lg">Active Growth</span>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Investment Balance</p>
                <h4 className="text-3xl font-black dark:text-white mb-2">{formatAmount(userData?.investmentBalance || 0)}</h4>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">Your capital is working for you across diversified portfolios including stocks, crypto, and real estate.</p>
              </div>
              <button 
                onClick={() => handleTransferToWallet('investment')}
                className="mt-6 w-full py-3 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-widest hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Transfer to Wallet
              </button>
            </div>

            {/* Grant Card */}
            <div className="p-6 rounded-3xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
                    <Award className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest bg-purple-500/5 px-2 py-1 rounded-lg">Approved Funds</span>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Grant Money</p>
                <h4 className="text-3xl font-black dark:text-white mb-2">{formatAmount(userData?.grantBalance || 0)}</h4>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">Funds awarded for business expansion, education, or community impact projects.</p>
              </div>
              <button 
                onClick={() => handleTransferToWallet('grant')}
                className="mt-6 w-full py-3 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-widest hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Transfer to Wallet
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Charity Support</p>
                <p className="text-sm font-black dark:text-white">UNICEF, Red Cross</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Security Level</p>
                <p className="text-sm font-black dark:text-white">Enterprise Grade</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const QuickLink = ({ icon, label, to, bg }: { icon: React.ReactNode, label: string, to: string, bg: string, key?: React.Key }) => {
  const navigate = useNavigate();
  return (
    <button 
      onClick={() => navigate(to)}
      className="card p-6 flex flex-col items-center gap-3 hover:border-accent transition-all group"
    >
      <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center group-hover:scale-110 transition-all`}>
        {icon}
      </div>
      <span className="text-xs font-black uppercase tracking-widest dark:text-white">{label}</span>
    </button>
  );
};
