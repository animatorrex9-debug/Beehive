import React, { useState } from 'react';
import { TrendingUp, PieChart, BarChart3, ArrowUpRight, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, collection, addDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export const InvestPage = () => {
  const { user, userData } = useAuth();
  const [selectedOption, setSelectedOption] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || parseFloat(amount) <= 0 || !selectedOption) return;

    const investAmount = parseFloat(amount);
    
    if (userData?.walletBalance < investAmount) {
      setError('Insufficient funds in your wallet.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update user balance
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: increment(-investAmount)
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'investment',
        amount: investAmount,
        currency: 'USD',
        status: 'completed',
        description: `Invested in ${selectedOption.title}`,
        timestamp: new Date().toISOString(),
        metadata: {
          category: selectedOption.title,
          returns: selectedOption.returns
        }
      });

      setSuccess(true);
      setAmount('');
      setSelectedOption(null);
    } catch (err: any) {
      console.error('Investment error:', err);
      setError('Failed to process investment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <BankingFeaturePage 
        title="Investment Success" 
        description="Your wealth is growing"
        icon={CheckCircle2}
      >
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black mb-4 dark:text-white">Investment Confirmed!</h2>
          <p className="text-gray-500 mb-8">Your investment has been processed. You can track its performance in your portfolio dashboard.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="btn-primary w-full py-4"
          >
            Invest More
          </button>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Invest" 
      description="Grow your wealth with Beehive's curated investment portfolios"
      icon={TrendingUp}
    >
      <div className="grid lg:grid-cols-3 gap-8 w-full">
        <InvestmentOption 
          title="Stocks & ETFs"
          description="Invest in the world's leading companies with fractional shares."
          returns="+12.4%"
          icon={<BarChart3 className="w-6 h-6" />}
          onClick={() => setSelectedOption({ title: 'Stocks & ETFs', returns: '+12.4%' })}
        />
        <InvestmentOption 
          title="Crypto"
          description="Buy, sell, and hold major cryptocurrencies securely."
          returns="+45.2%"
          icon={<TrendingUp className="w-6 h-6" />}
          onClick={() => setSelectedOption({ title: 'Crypto', returns: '+45.2%' })}
        />
        <InvestmentOption 
          title="Real Estate"
          description="Fractional ownership in premium real estate properties."
          returns="+8.1%"
          icon={<PieChart className="w-6 h-6" />}
          onClick={() => setSelectedOption({ title: 'Real Estate', returns: '+8.1%' })}
        />
      </div>

      <AnimatePresence>
        {selectedOption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-primary w-full max-w-md p-8 rounded-3xl shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedOption(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-6 h-6 dark:text-white" />
              </button>

              <h3 className="text-2xl font-black mb-2 dark:text-white">Invest in {selectedOption.title}</h3>
              <p className="text-gray-500 mb-8">Enter the amount you'd like to invest. Funds will be deducted from your wallet.</p>

              <form onSubmit={handleInvest} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold dark:text-white">Amount (USD)</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    step="0.01"
                    className="input-field text-2xl font-black py-6" 
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="text-xs text-gray-400">Available Balance: ${userData?.walletBalance?.toLocaleString() || '0.00'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Expected Returns</span>
                    <span className="font-bold text-green-500">{selectedOption.returns}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service Fee</span>
                    <span className="font-bold dark:text-white">0.5%</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary w-full py-4 text-lg"
                >
                  {loading ? 'Processing...' : `Invest $${amount || '0.00'}`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </BankingFeaturePage>
  );
};

const InvestmentOption = ({ title, description, returns, icon, onClick }: { title: string, description: string, returns: string, icon: React.ReactNode, onClick: () => void }) => (
  <div className="p-8 rounded-3xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 flex flex-col justify-between group hover:border-accent transition-all">
    <div>
      <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center text-accent mb-6 shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-black mb-2 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-6">{description}</p>
    </div>
    <div className="flex justify-between items-center">
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg. Returns</p>
        <p className="text-lg font-black text-green-500">{returns}</p>
      </div>
      <button 
        onClick={onClick}
        className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center group-hover:scale-110 transition-transform"
      >
        <ArrowUpRight className="w-5 h-5" />
      </button>
    </div>
  </div>
);
