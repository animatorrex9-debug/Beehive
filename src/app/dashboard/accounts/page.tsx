import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, CreditCard, History, RefreshCw, ArrowRightLeft, TrendingUp, TrendingDown, AlertCircle, X } from 'lucide-react';
import { useCurrency } from '../../../hooks/useCurrency';
import { useAuth } from '../../../hooks/useAuth';
import { useCryptoPrices } from '../../../hooks/useCryptoPrices';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';

export const AccountsPage = () => {
  const { formatAmount } = useCurrency();
  const { user, userData } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { btcPrice, usdtPrice } = useCryptoPrices();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [moveAmount, setMoveAmount] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState('');
  
  const balance = userData?.walletBalance || 0;
  const savings = userData?.savings || 0;
  const btcBalance = userData?.btcBalance || 0;
  const usdtBalance = userData?.usdtBalance || 0;

  const handleMoveFunds = async () => {
    if (!user || !moveAmount || parseFloat(moveAmount) <= 0) return;
    const amountNum = parseFloat(moveAmount);
    
    if (amountNum > balance) {
      setMoveError('Insufficient main balance');
      return;
    }

    setMoveLoading(true);
    setMoveError('');

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        walletBalance: increment(-amountNum),
        savings: increment(amountNum)
      });

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        userEmail: user.email,
        type: 'transfer',
        amount: amountNum,
        currency: userData?.currency?.code || 'USD',
        status: 'completed',
        description: 'Transfer to Savings Account',
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString()
      });

      setShowMoveModal(false);
      setMoveAmount('');
    } catch (err: any) {
      console.error('Error moving funds:', err);
      setMoveError(err.message || 'Failed to move funds');
    } finally {
      setMoveLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort client-side to avoid index requirement
      txs.sort((a: any, b: any) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      setTransactions(txs.slice(0, 10));
      setLoading(false);
    }, (err) => {
      console.error('Error fetching transactions:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tighter dark:text-white">MY ACCOUNTS</h1>
          <p className="text-gray-500">Manage your money and transactions</p>
        </div>
        <div className="flex gap-3">
          <Link to="/dashboard/settings" className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Account
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-3xl bg-primary text-white relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet className="w-24 h-24" />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Main Balance</p>
          <h2 className="text-4xl font-black mb-8">{formatAmount(balance)}</h2>
          <div className="flex gap-4">
            <Link to="/dashboard/deposit" className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition-all flex items-center justify-center gap-2">
              <ArrowDownLeft className="w-4 h-4" /> Deposit
            </Link>
            <Link to="/dashboard/send" className="flex-1 py-3 rounded-xl bg-accent font-bold transition-all flex items-center justify-center gap-2">
              <ArrowUpRight className="w-4 h-4" /> Send
            </Link>
          </div>
        </motion.div>

        {/* Savings Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-xl"
        >
          <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Savings Account</p>
          <h2 className="text-4xl font-black mb-8 dark:text-white">{formatAmount(savings)}</h2>
          <button 
            onClick={() => setShowMoveModal(true)}
            className="w-full py-3 rounded-xl border-2 border-gray-100 dark:border-zinc-800 font-bold hover:border-accent transition-all dark:text-white"
          >
            Move Funds
          </button>
        </motion.div>

        {/* Bitcoin Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-xl"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Bitcoin Balance</p>
            <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" /> LIVE
            </div>
          </div>
          <h2 className="text-4xl font-black mb-1 dark:text-white">{btcBalance.toFixed(8)} BTC</h2>
          <p className="text-gray-500 font-bold mb-8">≈ {formatAmount(btcBalance * btcPrice)}</p>
          <Link to="/dashboard/swap" className="w-full py-3 rounded-xl bg-orange-500/10 text-orange-500 font-bold hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Swap BTC
          </Link>
        </motion.div>

        {/* USDT Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-xl"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-bold uppercase tracking-widest text-gray-500">USDT Balance</p>
            <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" /> LIVE
            </div>
          </div>
          <h2 className="text-4xl font-black mb-1 dark:text-white">{usdtBalance.toFixed(2)} USDT</h2>
          <p className="text-gray-500 font-bold mb-8">≈ {formatAmount(usdtBalance * usdtPrice)}</p>
          <Link to="/dashboard/swap" className="w-full py-3 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Swap USDT
          </Link>
        </motion.div>

        {/* Virtual Card Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-8 rounded-3xl bg-accent text-white relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-12">
            <CreditCard className="w-8 h-8" />
            <span className="font-bold italic">Beehive</span>
          </div>
          <p className="text-lg font-mono tracking-widest mb-4">**** **** **** 4242</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] uppercase opacity-60">Card Holder</p>
              <p className="font-bold text-sm uppercase">{userData?.fullName || 'User'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase opacity-60">Expires</p>
              <p className="font-bold text-sm">12/28</p>
            </div>
          </div>
          <button 
            onClick={() => setShowActivateModal(true)}
            className="w-full mt-6 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all font-bold text-xs uppercase tracking-widest"
          >
            Activate Card
          </button>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <div className="card p-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black tracking-tighter dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-accent" /> RECENT TRANSACTIONS
          </h3>
          <button className="text-sm font-bold text-accent hover:underline">View All</button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-4" />
              <p>Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No transactions found.</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    tx.type === 'send' || tx.type === 'swap' || tx.type === 'investment' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {tx.type === 'send' || tx.type === 'swap' || tx.type === 'investment' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-bold dark:text-white capitalize">{tx.description || tx.type}</p>
                    <p className="text-xs text-gray-500">
                      {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleDateString() : new Date(tx.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black ${tx.type === 'send' || tx.type === 'swap' || tx.type === 'investment' ? 'text-red-500' : 'text-green-500'}`}>
                    {tx.type === 'send' || tx.type === 'swap' || tx.type === 'investment' ? '-' : '+'}{formatAmount(tx.amount)}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-gray-400">{tx.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Move Funds Modal */}
      <AnimatePresence>
        {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-zinc-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black dark:text-white">Move Funds</h3>
                <button onClick={() => setShowMoveModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-6 h-6 dark:text-white" />
                </button>
              </div>

              <p className="text-gray-500 mb-8">Transfer funds from your main balance to your savings account to earn interest.</p>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amount to Move</label>
                    <p className="text-xs font-bold text-accent">Available: {formatAmount(balance)}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={moveAmount}
                      onChange={(e) => setMoveAmount(e.target.value)}
                      className="w-full px-4 py-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white text-xl font-bold"
                      placeholder="0.00"
                    />
                    <button 
                      onClick={() => setMoveAmount(balance.toString())}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-accent hover:underline"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {moveError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {moveError}
                  </div>
                )}

                <button
                  onClick={handleMoveFunds}
                  disabled={moveLoading || !moveAmount || parseFloat(moveAmount) <= 0}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                >
                  {moveLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ArrowRightLeft className="w-5 h-5" /> Confirm Transfer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activate Card Modal */}
      <AnimatePresence>
        {showActivateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-zinc-800 text-center"
            >
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto mb-6">
                <CreditCard className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black dark:text-white mb-4">Activate Your Card</h3>
              <p className="text-gray-500 mb-8">
                To activate your Beehive virtual card and start spending, please contact our 24/7 support team. They will verify your details and enable your card instantly.
              </p>
              <div className="space-y-3">
                <Link 
                  to="/dashboard/chat"
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                >
                  Message Support
                </Link>
                <button 
                  onClick={() => setShowActivateModal(false)}
                  className="w-full py-4 text-gray-500 font-bold hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
