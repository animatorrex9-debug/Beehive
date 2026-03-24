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
  Lock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useCurrency } from '../../../hooks/useCurrency';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function SettingsPage() {
  const { userData, user } = useAuth();
  const { currency: currentCurrency, setCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<'profile' | 'banking' | 'security'>('profile');
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get all currency codes
  const allCurrencyCodes = (Intl as any).supportedValuesOf?.('currency') || ['USD', 'EUR', 'GBP', 'NGN', 'AED', 'SAR', 'EGP', 'JPY', 'CAD', 'AUD'];
  
  const filteredCurrencies = allCurrencyCodes
    .map((code: string) => {
      try {
        return {
          code,
          name: new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) || code
        };
      } catch (e) {
        return { code, name: code };
      }
    })
    .filter((c: any) => 
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, searchQuery ? 50 : 10); // Show top 10 by default, or top 50 when searching

  const handleCurrencyChange = (code: string) => {
    const name = new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) || code;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find(part => part.type === 'currency');
    const symbol = symbolPart ? symbolPart.value : code;

    setCurrency({ code, name, symbol });
  };

  // Bank Form State
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    bankAppUsername: ''
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

    const currentBanks = userData?.bankAccounts || [];
    const hasLegacy = !!userData?.bankDetails;
    const totalBanks = currentBanks.length + (hasLegacy && !currentBanks.some((b: any) => b.accountNumber === userData.bankDetails.accountNumber) ? 1 : 0);

    if (totalBanks >= 6) {
      alert('You can add a maximum of 6 bank accounts.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        bankAccounts: arrayUnion(bankForm),
        // For backward compatibility, also update bankDetails if it's the first one
        ...(!userData?.bankAccounts?.length && !userData?.bankDetails ? { bankDetails: bankForm } : {})
      });
      setIsAddingBank(false);
      setBankForm({
        bankName: '',
        accountNumber: '',
        accountName: '',
        bankAppUsername: ''
      });
    } catch (error) {
      console.error('Error adding bank:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const currentCards = userData?.creditCards || [];
    const hasLegacy = !!userData?.cardDetails;
    const totalCards = currentCards.length + (hasLegacy && !currentCards.some((c: any) => c.cardNumber === userData.cardDetails.cardNumber) ? 1 : 0);

    if (totalCards >= 6) {
      alert('You can add a maximum of 6 credit cards.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        creditCards: arrayUnion(cardForm),
        // For backward compatibility, also update cardDetails if it's the first one
        ...(!userData?.creditCards?.length && !userData?.cardDetails ? { cardDetails: cardForm } : {})
      });
      setIsAddingCard(false);
      setCardForm({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        pin: ''
      });
    } catch (error) {
      console.error('Error adding card:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: userData?.fullName || '',
    phoneNumber: userData?.phoneNumber || '',
    address: userData?.address || '',
    country: userData?.country || ''
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        fullName: profileForm.fullName,
        phoneNumber: profileForm.phoneNumber,
        address: profileForm.address,
        country: profileForm.country
      });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                        <User className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg dark:text-white">{userData?.fullName}</h3>
                        <p className="text-gray-500 text-sm">{user?.email}</p>
                      </div>
                    </div>
                    {!isEditingProfile && (
                      <button 
                        onClick={() => {
                          setProfileForm({
                            fullName: userData?.fullName || '',
                            phoneNumber: userData?.phoneNumber || '',
                            address: userData?.address || '',
                            country: userData?.country || ''
                          });
                          setIsEditingProfile(true);
                        }}
                        className="text-sm font-bold text-accent hover:opacity-80"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-4 pt-6 border-t border-gray-100 dark:border-zinc-800">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                        <input
                          required
                          type="text"
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
                        <input
                          type="text"
                          value={profileForm.phoneNumber}
                          onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                          placeholder="+1 234 567 890"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Address</label>
                        <input
                          type="text"
                          value={profileForm.address}
                          onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                          placeholder="123 Main St, City"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Country</label>
                        <input
                          type="text"
                          value={profileForm.country}
                          onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                          placeholder="United States"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button 
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="btn-secondary flex-1 py-3"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn-primary flex-1 py-3"
                        >
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                        <p className="font-bold dark:text-white mt-1">{userData?.fullName}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
                        <p className="font-bold dark:text-white mt-1">{userData?.phoneNumber || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Address</label>
                        <p className="font-bold dark:text-white mt-1">{userData?.address || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Country</label>
                        <p className="font-bold dark:text-white mt-1">{userData?.country || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">KYC Status</label>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <p className="font-bold text-green-500 capitalize">{userData?.kycStatus}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Currency Selection */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold dark:text-white">Currency Settings</h3>
                      <p className="text-sm text-gray-500">Choose your preferred currency for display</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Currency</p>
                        <p className="font-bold dark:text-white">{currentCurrency.name} ({currentCurrency.code})</p>
                      </div>
                      <div className="text-2xl font-black text-accent">{currentCurrency.symbol}</div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Search & Select Currency</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search currencies (e.g. USD, EUR, NGN...)"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus:border-accent outline-none transition-all dark:text-white"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                        {filteredCurrencies.map((c: any) => (
                          <button
                            key={c.code}
                            onClick={() => handleCurrencyChange(c.code)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                              currentCurrency.code === c.code
                                ? 'bg-accent text-white border-accent'
                                : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:border-accent'
                            }`}
                          >
                            {c.code} - {c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name}
                          </button>
                        ))}
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
                      <h3 className="font-bold dark:text-white">Bank Accounts</h3>
                    </div>
                    <button 
                      onClick={() => {
                        const currentBanks = userData?.bankAccounts || [];
                        const hasLegacy = !!userData?.bankDetails;
                        const totalBanks = currentBanks.length + (hasLegacy && !currentBanks.some((b: any) => b.accountNumber === userData.bankDetails.accountNumber) ? 1 : 0);
                        if (totalBanks >= 6) {
                          alert('Maximum of 6 bank accounts reached.');
                          return;
                        }
                        setIsAddingBank(true);
                      }}
                      className="flex items-center gap-2 text-sm font-bold text-accent hover:opacity-80 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Add Bank
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Legacy bankDetails support */}
                    {userData?.bankDetails && (!userData.bankAccounts || !userData.bankAccounts.some((b: any) => b.accountNumber === userData.bankDetails.accountNumber)) && (
                      <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-bold dark:text-white">{userData.bankDetails.bankName}</p>
                            <p className="text-sm text-gray-500">Account: ****{userData.bankDetails.accountNumber.slice(-4)}</p>
                            <p className="text-sm text-gray-500">{userData.bankDetails.accountName}</p>
                          </div>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-500/10 text-green-600 text-[10px] font-bold uppercase rounded">Primary</span>
                        </div>
                      </div>
                    )}

                    {/* New bankAccounts array support */}
                    {userData?.bankAccounts?.map((bank: any, index: number) => (
                      <div key={index} className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-bold dark:text-white">{bank.bankName}</p>
                            <p className="text-sm text-gray-500">Account: ****{bank.accountNumber.slice(-4)}</p>
                            <p className="text-sm text-gray-500">{bank.accountName}</p>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase rounded">Connected</span>
                        </div>
                      </div>
                    ))}

                    {(!userData?.bankDetails && (!userData?.bankAccounts || userData.bankAccounts.length === 0)) && (
                      <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                        <p className="text-gray-500 text-sm">No bank account connected</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Credit Card Section */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg text-purple-600">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold dark:text-white">Credit Cards</h3>
                    </div>
                    <button 
                      onClick={() => {
                        const currentCards = userData?.creditCards || [];
                        const hasLegacy = !!userData?.cardDetails;
                        const totalCards = currentCards.length + (hasLegacy && !currentCards.some((c: any) => c.cardNumber === userData.cardDetails.cardNumber) ? 1 : 0);
                        if (totalCards >= 6) {
                          alert('Maximum of 6 credit cards reached.');
                          return;
                        }
                        setIsAddingCard(true);
                      }}
                      className="flex items-center gap-2 text-sm font-bold text-accent hover:opacity-80 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Add Card
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Legacy cardDetails support */}
                    {userData?.cardDetails && (!userData.creditCards || !userData.creditCards.some((c: any) => c.cardNumber === userData.cardDetails.cardNumber)) && (
                      <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-bold dark:text-white">Card ending in {userData.cardDetails.cardNumber.slice(-4)}</p>
                            <p className="text-sm text-gray-500">Expires: {userData.cardDetails.expiryDate}</p>
                          </div>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-500/10 text-green-600 text-[10px] font-bold uppercase rounded">Primary</span>
                        </div>
                      </div>
                    )}

                    {/* New creditCards array support */}
                    {userData?.creditCards?.map((card: any, index: number) => (
                      <div key={index} className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-bold dark:text-white">Card ending in {card.cardNumber.slice(-4)}</p>
                            <p className="text-sm text-gray-500">Expires: {card.expiryDate}</p>
                          </div>
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-600 text-[10px] font-bold uppercase rounded">Connected</span>
                        </div>
                      </div>
                    ))}

                    {(!userData?.cardDetails && (!userData?.creditCards || userData.creditCards.length === 0)) && (
                      <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                        <p className="text-gray-500 text-sm">No credit card added</p>
                      </div>
                    )}
                  </div>
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
          <div className={`${
            userData?.kycStatus === 'verified' ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20' :
            userData?.kycStatus === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/20' :
            userData?.kycStatus === 'rejected' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' :
            'bg-accent/5 border-accent/10'
          } rounded-2xl p-6 border`}>
            <h4 className={`font-bold mb-2 ${
              userData?.kycStatus === 'verified' ? 'text-green-600' :
              userData?.kycStatus === 'pending' ? 'text-yellow-600' :
              userData?.kycStatus === 'rejected' ? 'text-red-600' :
              'text-accent'
            }`}>Account Verification</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {userData?.kycStatus === 'verified' ? (
                "Your account is fully verified. You have access to all features including high-limit loans and international transfers."
              ) : userData?.kycStatus === 'pending' ? (
                "Your identity verification is currently being reviewed. This usually takes 24-48 hours."
              ) : userData?.kycStatus === 'rejected' ? (
                "Your identity verification was rejected. Please contact support or re-submit your documents."
              ) : (
                "Please complete your identity verification (KYC) to unlock all features including loans and transfers."
              )}
            </p>
            <div className={`flex items-center gap-2 font-bold text-sm ${
              userData?.kycStatus === 'verified' ? 'text-green-600' :
              userData?.kycStatus === 'pending' ? 'text-yellow-600' :
              userData?.kycStatus === 'rejected' ? 'text-red-600' :
              'text-accent'
            }`}>
              {userData?.kycStatus === 'verified' ? (
                <><CheckCircle2 className="w-4 h-4" /> Verified Account</>
              ) : userData?.kycStatus === 'pending' ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Verification Pending</>
              ) : userData?.kycStatus === 'rejected' ? (
                <><AlertCircle className="w-4 h-4" /> Verification Rejected</>
              ) : (
                <><AlertCircle className="w-4 h-4" /> Unverified Account</>
              )}
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
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto"
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
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto"
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
