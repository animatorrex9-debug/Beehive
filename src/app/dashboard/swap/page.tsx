import React, { useState } from 'react';
import { RefreshCw, ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { useCurrency } from '../../../hooks/useCurrency';
import { useCryptoPrices } from '../../../hooks/useCryptoPrices';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, collection, addDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

export const SwapPage = () => {
  const { user, userData } = useAuth();
  const { currency } = useCurrency();
  const { btcPrice, usdtPrice } = useCryptoPrices();
  const [fromAmount, setFromAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState(userData?.currency?.code || currency.code || 'USD');
  const [toCurrency, setToCurrency] = useState('BTC');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const currencies = [
    { code: userData?.currency?.code || currency.code || 'USD', name: userData?.currency?.name || currency.name || 'US Dollar', icon: userData?.currency?.symbol || currency.symbol || '$' },
    { code: 'BTC', name: 'Bitcoin', icon: '₿' },
    { code: 'USDT', name: 'Tether', icon: '₮' },
    { code: 'EUR', name: 'Euro', icon: '€' },
    { code: 'GBP', name: 'British Pound', icon: '£' },
    { code: 'USD', name: 'US Dollar', icon: '$' },
  ].filter((c, index, self) => 
    index === self.findIndex((t) => t.code === c.code)
  );

  const getPrice = (code: string) => {
    if (code === (userData?.currency?.code || currency.code || 'USD')) return 1;
    if (code === 'BTC') return btcPrice;
    if (code === 'USDT') return usdtPrice;
    if (code === 'EUR') return 1.08; // Fixed for now
    if (code === 'GBP') return 1.27; // Fixed for now
    if (code === 'USD') return 1;
    return 1;
  };

  const exchangeRate = getPrice(fromCurrency) / getPrice(toCurrency);
  const toAmount = (parseFloat(fromAmount || '0') * exchangeRate).toFixed(fromCurrency === (userData?.currency?.code || currency.code || 'USD') && toCurrency === 'BTC' ? 8 : 2);

  const getBalance = (code: string) => {
    if (code === (userData?.currency?.code || currency.code || 'USD')) return userData?.walletBalance || 0;
    if (code === 'BTC') return userData?.btcBalance || 0;
    if (code === 'USDT') return userData?.usdtBalance || 0;
    return 0;
  };

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fromAmount || parseFloat(fromAmount) <= 0) return;

    const swapAmount = parseFloat(fromAmount);
    const currentBalance = getBalance(fromCurrency);
    
    if (currentBalance < swapAmount) {
      setError(`Insufficient ${fromCurrency} balance.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', user.uid);
      const updates: any = {};

      // Deduct from source
      if (fromCurrency === (userData?.currency?.code || currency.code || 'USD')) updates.walletBalance = increment(-swapAmount);
      else if (fromCurrency === 'BTC') updates.btcBalance = increment(-swapAmount);
      else if (fromCurrency === 'USDT') updates.usdtBalance = increment(-swapAmount);

      // Add to destination
      const receivedAmount = parseFloat(toAmount);
      if (toCurrency === (userData?.currency?.code || currency.code || 'USD')) updates.walletBalance = increment(receivedAmount);
      else if (toCurrency === 'BTC') updates.btcBalance = increment(receivedAmount);
      else if (toCurrency === 'USDT') updates.usdtBalance = increment(receivedAmount);

      await updateDoc(userRef, updates);

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'swap',
        amount: swapAmount,
        currency: fromCurrency,
        status: 'completed',
        description: `Swapped ${swapAmount} ${fromCurrency} for ${toAmount} ${toCurrency}`,
        timestamp: new Date().toISOString(),
        metadata: {
          rate: exchangeRate,
          receivedAmount: toAmount,
          receivedCurrency: toCurrency
        }
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Swap error:', err instanceof Error ? err.message : String(err));
      setError('Failed to process swap. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <BankingFeaturePage 
        title="Swap Success" 
        description="Your currency has been exchanged"
        icon={CheckCircle2}
      >
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black mb-4 dark:text-white">Swap Complete!</h2>
          <p className="text-gray-500 mb-8">You have successfully swapped {fromAmount} {fromCurrency} for {toAmount} {toCurrency}. Your balance has been updated.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="btn-primary w-full py-4"
          >
            Make Another Swap
          </button>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Currency Swap" 
      description="Exchange currencies instantly at mid-market rates"
      icon={RefreshCw}
    >
      <div className="max-w-xl mx-auto w-full space-y-6">
        <form onSubmit={handleSwap} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">You Send</label>
            <div className="relative">
              <input 
                type="number" 
                required
                min="0.00000001"
                step="any"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="input-field py-6 text-2xl font-black pr-32"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <select 
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className="bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl dark:text-white font-bold outline-none appearance-none cursor-pointer pr-8"
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none dark:text-white" />
              </div>
            </div>
            <p className="text-xs text-gray-400">Available: {getBalance(fromCurrency).toLocaleString()} {fromCurrency}</p>
          </div>

          <div className="flex justify-center">
            <button 
              type="button"
              onClick={() => {
                const temp = fromCurrency;
                setFromCurrency(toCurrency);
                setToCurrency(temp);
              }}
              className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/20 hover:rotate-180 transition-all duration-500"
            >
              <ArrowRightLeft className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">You Receive</label>
            <div className="relative">
              <input 
                type="number" 
                value={toAmount}
                readOnly
                className="input-field py-6 text-2xl font-black pr-32 bg-gray-50 dark:bg-zinc-800/50"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <select 
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className="bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl dark:text-white font-bold outline-none appearance-none cursor-pointer pr-8"
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none dark:text-white" />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Exchange Rate</span>
              <span className="font-bold dark:text-white">1 {fromCurrency} = {exchangeRate} {toCurrency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Transaction Fee</span>
              <span className="font-bold text-green-500">Free</span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full py-5 text-xl font-black"
          >
            {loading ? 'Processing...' : 'Swap Now'}
          </button>
        </form>
      </div>
    </BankingFeaturePage>
  );
};
