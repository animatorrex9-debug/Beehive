import React, { useState } from 'react';
import { ArrowUpCircle, User, Globe, Hash, CheckCircle2, AlertCircle } from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, collection, addDoc, increment, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export const SendPage = () => {
  const { user, userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'beehive' | 'international'>('beehive');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || parseFloat(amount) <= 0 || !recipient) return;

    const sendAmount = parseFloat(amount);
    
    if (userData?.walletBalance < sendAmount) {
      setError('Insufficient funds in your wallet.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update sender balance
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: increment(-sendAmount)
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'send',
        amount: sendAmount,
        currency: 'USD',
        status: 'completed',
        description: `Sent to ${recipient} (${type})`,
        note: note,
        timestamp: new Date().toISOString()
      });

      setSuccess(true);
      setAmount('');
      setRecipient('');
      setNote('');
    } catch (err: any) {
      console.error('Send error:', err);
      setError('Failed to process transfer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <BankingFeaturePage 
        title="Transfer Success" 
        description="Your money is on its way"
        icon={CheckCircle2}
      >
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black mb-4 dark:text-white">Transfer Sent!</h2>
          <p className="text-gray-500 mb-8">The recipient will receive the funds shortly. A confirmation has been sent to your email.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="btn-primary w-full py-4"
          >
            Send More Money
          </button>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Send Money" 
      description="Transfer funds to anyone, anywhere, instantly"
      icon={ArrowUpCircle}
    >
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setType('beehive')}
            className={`p-6 rounded-2xl font-bold flex flex-col items-center gap-3 transition-all ${
              type === 'beehive' 
                ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                : 'bg-gray-50 dark:bg-zinc-800 dark:text-white'
            }`}
          >
            <User className="w-6 h-6" />
            To Beehive User
          </button>
          <button 
            onClick={() => setType('international')}
            className={`p-6 rounded-2xl font-bold flex flex-col items-center gap-3 transition-all ${
              type === 'international' 
                ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                : 'bg-gray-50 dark:bg-zinc-800 dark:text-white'
            }`}
          >
            <Globe className="w-6 h-6" />
            International
          </button>
        </div>

        <form onSubmit={handleSend} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Recipient Details</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Hash className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                required
                placeholder={type === 'beehive' ? "Account Number or @username" : "IBAN / SWIFT Code"} 
                className="input-field pl-12 py-4"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Amount to Send</label>
              <input 
                type="number" 
                required
                min="1"
                step="0.01"
                placeholder="0.00" 
                className="input-field py-4 text-xl font-black"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-gray-400">Available Balance: ${userData?.walletBalance?.toLocaleString() || '0.00'}</p>
            </div>
            <textarea 
              placeholder="Note (optional)" 
              className="input-field py-4 h-24 resize-none"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-4 text-lg"
            >
              {loading ? 'Processing...' : `Send $${amount || '0.00'}`}
            </button>
          </div>
        </form>
      </div>
    </BankingFeaturePage>
  );
};
