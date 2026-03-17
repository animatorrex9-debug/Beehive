import React, { useState } from 'react';
import { Heart, Send, CheckCircle2, AlertCircle, Globe, Leaf, GraduationCap, Activity } from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';

export const CharityPage = () => {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    charity: 'red_cross',
    amount: '',
    anonymous: false
  });

  const charities = [
    { id: 'red_cross', name: 'International Red Cross', icon: <Activity className="text-red-500" />, description: 'Providing emergency assistance, disaster relief, and health education.' },
    { id: 'wwf', name: 'WWF Nature Fund', icon: <Leaf className="text-green-500" />, description: 'Protecting the future of nature and reducing the most pressing threats to life on Earth.' },
    { id: 'unicef', name: 'UNICEF', icon: <Globe className="text-blue-500" />, description: 'Working in over 190 countries to save children’s lives and defend their rights.' },
    { id: 'save_children', name: 'Save the Children', icon: <GraduationCap className="text-orange-500" />, description: 'Giving children a healthy start in life, the opportunity to learn and protection from harm.' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;
    
    const amountNum = Number(formData.amount);
    if (amountNum > userData.walletBalance) {
      setError('Insufficient funds in your wallet.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const selectedCharity = charities.find(c => c.id === formData.charity);
      
      // Update user balance
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: increment(-amountNum)
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'donation',
        amount: amountNum,
        currency: 'USD',
        status: 'completed',
        description: `Donation to ${selectedCharity?.name}`,
        timestamp: new Date().toISOString()
      });

      // Record donation detail
      await addDoc(collection(db, 'donations'), {
        userId: user.uid,
        charityId: formData.charity,
        charityName: selectedCharity?.name,
        amount: amountNum,
        anonymous: formData.anonymous,
        timestamp: new Date().toISOString()
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Donation error:', err);
      setError('Failed to process donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <BankingFeaturePage title="Donate to Charity" description="Thank You!" icon={Heart}>
        <div className="max-w-md mx-auto text-center space-y-6 py-12">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-10 h-10 fill-current" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white">DONATION SUCCESSFUL</h2>
          <p className="text-gray-500">Your generous contribution has been processed. Together, we are making a difference. A receipt has been sent to your email.</p>
          <button onClick={() => setSuccess(false)} className="btn-primary w-full py-4">Make Another Donation</button>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Donate to Charity" 
      description="Support causes you care about directly from your Beehive account"
      icon={Heart}
    >
      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-8 space-y-8">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Select Charity Organization</label>
              <div className="grid md:grid-cols-2 gap-4">
                {charities.map((charity) => (
                  <button
                    key={charity.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, charity: charity.id })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex gap-4 ${
                      formData.charity === charity.id 
                        ? 'border-accent bg-accent/5' 
                        : 'border-gray-100 dark:border-zinc-800 hover:border-gray-200'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center flex-shrink-0">
                      {charity.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm dark:text-white">{charity.name}</h4>
                      <p className="text-[10px] text-gray-500 line-clamp-2">{charity.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Donation Amount (USD)</label>
                <input 
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. 50"
                  className="w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white"
                  required
                />
              </div>
              <div className="flex items-center gap-3 pt-8">
                <input 
                  type="checkbox"
                  id="anonymous"
                  checked={formData.anonymous}
                  onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
                />
                <label htmlFor="anonymous" className="text-sm font-medium dark:text-white">Donate Anonymously</label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" /> {loading ? 'Processing...' : 'Complete Donation'}
            </button>
          </form>
        </div>

        <div className="space-y-8">
          <h3 className="text-2xl font-black tracking-tighter dark:text-white">IMPACT TRACKER</h3>
          <div className="p-8 rounded-3xl bg-gradient-to-br from-red-500 to-pink-600 text-white relative overflow-hidden">
            <Heart className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Total Donated</p>
            <h2 className="text-4xl font-black mb-4">$1,240.00</h2>
            <p className="text-xs opacity-80">You've helped support 12 different causes this year. Thank you for your kindness!</p>
          </div>

          <div className="card p-6 space-y-4">
            <h4 className="font-bold dark:text-white">Recent Contributions</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Red Cross</span>
                <span className="font-bold dark:text-white">$50.00</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">WWF</span>
                <span className="font-bold dark:text-white">$25.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BankingFeaturePage>
  );
};
