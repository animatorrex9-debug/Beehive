import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, CreditCard, History, RefreshCw } from 'lucide-react';
import { useCurrency } from '../../../hooks/useCurrency';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';

export const AccountsPage = () => {
  const { formatAmount } = useCurrency();
  const { user, userData } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const balance = userData?.walletBalance || 0;
  const savings = userData?.savings || 0;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(txs);
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
          <button className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Account
          </button>
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
          <button className="w-full py-3 rounded-xl border-2 border-gray-100 dark:border-zinc-800 font-bold hover:border-accent transition-all dark:text-white">
            Move Funds
          </button>
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
    </div>
  );
};
