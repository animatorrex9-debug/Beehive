import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useCurrency } from '../../../hooks/useCurrency';
import { db } from '../../../lib/supabase-service';
import { collection, query, where, orderBy, getDocs } from 'supabase/db';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Clock, 
  Search, 
  Filter,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  FileText,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Transaction {
  id: string;
  type: 'send' | 'deposit' | 'swap' | 'loan' | 'repayment';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  timestamp: string;
  metadata?: any;
}

export const HistoryPage = () => {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'send' | 'deposit' | 'swap'>('all');

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const txs: Transaction[] = [];
        querySnapshot.forEach((doc) => {
          txs.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        
        // Sort client-side to avoid index requirement
        txs.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
        
        setTransactions(txs);
      } catch (err) {
        console.error('Error fetching transactions:', err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         tx.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || tx.type === filter;
    return matchesSearch && matchesFilter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'send': return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case 'deposit': return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
      case 'swap': return <RefreshCw className="w-5 h-5 text-blue-500" />;
      case 'loan': return <FileText className="w-5 h-5 text-accent" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase dark:text-white">Transaction History</h2>
          <p className="text-gray-500 text-sm">Monitor your financial activity across all services.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search transactions..."
              className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-accent outline-none w-full md:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative group">
            <button className="p-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-gray-500 hover:text-accent transition-colors">
              <Filter className="w-5 h-5" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2">
              {(['all', 'send', 'deposit', 'swap'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`w-full text-left px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
                    filter === f ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading History...</p>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Transaction</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                <AnimatePresence mode="popLayout">
                  {filteredTransactions.map((tx) => (
                    <motion.tr 
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center">
                            {getIcon(tx.type)}
                          </div>
                          <div>
                            <p className="text-sm font-black dark:text-white uppercase tracking-tighter truncate max-w-[200px]">
                              {tx.description}
                            </p>
                            {tx.metadata?.recipient && (
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                To: {tx.metadata.recipient}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500">
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`text-sm font-black ${
                          tx.type === 'deposit' ? 'text-green-500' : 
                          tx.type === 'send' ? 'text-red-500' : 'dark:text-white'
                        }`}>
                          {tx.type === 'send' ? '-' : '+'}{formatAmount(tx.amount)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {tx.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : tx.status === 'failed' ? (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            tx.status === 'completed' ? 'text-green-600' : 
                            tx.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-gray-300 hover:text-accent transition-colors">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <History className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter">No Transactions Found</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">
              You haven't made any transactions yet. Your activity will appear here once you start using Beehive.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
