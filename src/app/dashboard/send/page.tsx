import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpCircle, User, Globe, Hash, CheckCircle2, AlertCircle, Landmark, Smartphone, CreditCard, Mail, Phone, ExternalLink, History, Search } from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { useCurrency } from '../../../context/CurrencyContext';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, collection, addDoc, increment, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

type TransferType = 'beehive' | 'local' | 'international' | 'thirdparty';
type ThirdPartyApp = 'paypal' | 'zelle' | 'cashapp' | 'venmo' | 'payoneer' | 'wise' | 'skrill' | 'westernunion' | 'moneygram';

interface RecentRecipient {
  recipient: string;
  type: TransferType;
  description: string;
  metadata?: any;
}

export const SendPage = () => {
  const { user, userData } = useAuth();
  const { currency, formatAmount } = useCurrency();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<TransferType>('beehive');
  const [thirdPartyApp, setThirdPartyApp] = useState<ThirdPartyApp>('paypal');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local Bank Fields
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  
  // International Fields
  const [iban, setIban] = useState('');
  const [swift, setSwift] = useState('');
  const [country, setCountry] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([]);

  const fetchRecentRecipients = useCallback(async () => {
    if (!user) return;
    const path = 'transactions';
    try {
      const q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        where('type', '==', 'send')
      );
      const querySnapshot = await getDocs(q);
      const txsData: any[] = [];
      querySnapshot.forEach((doc) => {
        txsData.push(doc.data());
      });

      // Sort client-side to avoid index requirement
      txsData.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      const recipients: RecentRecipient[] = [];
      const seen = new Set();

      txsData.forEach((data) => {
        const key = data.metadata?.recipient || data.metadata?.accountNumber || data.description;
        if (!seen.has(key) && recipients.length < 5) {
          recipients.push({
            recipient: data.metadata?.recipient || data.metadata?.accountNumber || '',
            type: data.transferType || 'beehive',
            description: data.description,
            metadata: data.metadata
          });
          seen.add(key);
        }
      });
      setRecentRecipients(recipients);
    } catch (err) {
      console.error('Error fetching recent recipients:', err instanceof Error ? err.message : String(err));
      // Use the standard error handler for better context
      import('../../../lib/firebase').then(({ handleFirestoreError, OperationType }) => {
        handleFirestoreError(err, OperationType.GET, path);
      }).catch(() => {
        // Fallback if import fails
        throw err;
      });
    }
  }, [user]);

  useEffect(() => {
    fetchRecentRecipients();
  }, [fetchRecentRecipients]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || parseFloat(amount) <= 0) return;

    const sendAmount = parseFloat(amount);
    
    if ((userData?.walletBalance || 0) < sendAmount) {
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

      let description = '';
      let metadata: any = {};

      if (type === 'beehive') {
        description = `Sent to Beehive user: ${recipient}`;
        metadata = { recipient };
      } else if (type === 'local') {
        description = `Local transfer to ${bankName}`;
        metadata = { bankName, accountName, accountNumber: recipient };
      } else if (type === 'international') {
        description = `International transfer to ${country}`;
        metadata = { iban, swift, country, bankName };
      } else if (type === 'thirdparty') {
        description = `${thirdPartyApp.charAt(0).toUpperCase() + thirdPartyApp.slice(1)} transfer to ${recipient}`;
        metadata = { app: thirdPartyApp, recipient };
      }

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'send',
        transferType: type,
        amount: sendAmount,
        currency: userData?.currency?.code || currency.code || 'USD',
        status: 'completed',
        description,
        metadata,
        note: note,
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp()
      });

      setSuccess(true);
      setAmount('');
      setRecipient('');
      setNote('');
      setBankName('');
      setAccountName('');
      setIban('');
      setSwift('');
      setCountry('');
      fetchRecentRecipients();
    } catch (err: any) {
      console.error('Send error:', err instanceof Error ? err.message : String(err));
      setError('Failed to process transfer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectRecent = (rec: RecentRecipient) => {
    setType(rec.type);
    if (rec.type === 'beehive') {
      setRecipient(rec.recipient);
    } else if (rec.type === 'local') {
      setRecipient(rec.recipient);
      setBankName(rec.metadata?.bankName || '');
      setAccountName(rec.metadata?.accountName || '');
    } else if (rec.type === 'international') {
      setCountry(rec.metadata?.country || '');
      setBankName(rec.metadata?.bankName || '');
      setIban(rec.metadata?.iban || '');
      setSwift(rec.metadata?.swift || '');
    } else if (rec.type === 'thirdparty') {
      setThirdPartyApp(rec.metadata?.app || 'paypal');
      setRecipient(rec.recipient);
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
          <h2 className="text-3xl font-black mb-4 dark:text-white tracking-tighter uppercase">Transfer Sent!</h2>
          <p className="text-gray-500 mb-8">If your funds are not seen in the next five minutes, contact your account manager</p>
          <button 
            onClick={() => setSuccess(false)}
            className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest"
          >
            Send More Money
          </button>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Transfer Funds" 
      description="Send money locally, internationally, or via third-party apps"
      icon={ArrowUpCircle}
    >
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Transfer Type Selection */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TypeButton 
              active={type === 'beehive'} 
              onClick={() => setType('beehive')} 
              icon={<User className="w-5 h-5" />} 
              label="Internal" 
            />
            <TypeButton 
              active={type === 'local'} 
              onClick={() => setType('local')} 
              icon={<Landmark className="w-5 h-5" />} 
              label="Local Bank" 
            />
            <TypeButton 
              active={type === 'international'} 
              onClick={() => setType('international')} 
              icon={<Globe className="w-5 h-5" />} 
              label="International" 
            />
            <TypeButton 
              active={type === 'thirdparty'} 
              onClick={() => setType('thirdparty')} 
              icon={<Smartphone className="w-5 h-5" />} 
              label="Apps" 
            />
          </div>

          <form onSubmit={handleSend} className="space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tighter dark:text-white uppercase">Recipient Information</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/10 px-2 py-1 rounded-full">
                  {type === 'beehive' ? 'Internal' : type === 'local' ? 'Local Bank' : type === 'international' ? 'International' : 'Third-Party'}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {type === 'beehive' && (
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="email" 
                        required
                        placeholder="Recipient Email Address" 
                        className="input-field pl-12 py-4"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                      />
                    </div>
                  )}

                  {type === 'local' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            required
                            placeholder="Bank Name" 
                            className="input-field pl-12 py-4"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                          />
                        </div>
                        <div className="relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            required
                            placeholder="Account Number" 
                            className="input-field pl-12 py-4"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          required
                          placeholder="Account Name" 
                          className="input-field pl-12 py-4"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {type === 'international' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            required
                            placeholder="Country" 
                            className="input-field pl-12 py-4"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                          />
                        </div>
                        <div className="relative">
                          <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            required
                            placeholder="Bank Name" 
                            className="input-field pl-12 py-4"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            required
                            placeholder="IBAN" 
                            className="input-field pl-12 py-4"
                            value={iban}
                            onChange={(e) => setIban(e.target.value)}
                          />
                        </div>
                        <div className="relative">
                          <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            required
                            placeholder="SWIFT / BIC" 
                            className="input-field pl-12 py-4"
                            value={swift}
                            onChange={(e) => setSwift(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {type === 'thirdparty' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-gray-50 dark:bg-zinc-800 rounded-2xl">
                        <AppButton 
                          active={thirdPartyApp === 'paypal'} 
                          onClick={() => setThirdPartyApp('paypal')} 
                          label="PayPal" 
                        />
                        <AppButton 
                          active={thirdPartyApp === 'zelle'} 
                          onClick={() => setThirdPartyApp('zelle')} 
                          label="Zelle" 
                        />
                        <AppButton 
                          active={thirdPartyApp === 'cashapp'} 
                          onClick={() => setThirdPartyApp('cashapp')} 
                          label="CashApp" 
                        />
                        <AppButton 
                          active={thirdPartyApp === 'venmo'} 
                          onClick={() => setThirdPartyApp('venmo')} 
                          label="Venmo" 
                        />
                        <AppButton 
                          active={thirdPartyApp === 'payoneer'} 
                          onClick={() => setThirdPartyApp('payoneer')} 
                          label="Payoneer" 
                        />
                        <AppButton 
                          active={thirdPartyApp === 'wise'} 
                          onClick={() => setThirdPartyApp('wise')} 
                          label="Wise" 
                        />
                        <AppButton 
                          active={thirdPartyApp === 'skrill'} 
                          onClick={() => setThirdPartyApp('skrill')} 
                          label="Skrill" 
                        />
                        <AppButton 
                          active={thirdPartyApp === 'westernunion'} 
                          onClick={() => setThirdPartyApp('westernunion')} 
                          label="Western Union" 
                        />
                        <AppButton 
                          active={thirdPartyApp === 'moneygram'} 
                          onClick={() => setThirdPartyApp('moneygram')} 
                          label="MoneyGram" 
                        />
                      </div>
                      <div className="relative">
                        {['paypal', 'zelle', 'payoneer', 'wise', 'skrill', 'westernunion', 'moneygram'].includes(thirdPartyApp) ? (
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        ) : (
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        )}
                        <input 
                          type="text" 
                          required
                          placeholder={
                            thirdPartyApp === 'paypal' ? "Email or PayPal.me link" : 
                            thirdPartyApp === 'zelle' ? "Email or Phone Number" : 
                            thirdPartyApp === 'cashapp' ? "Cashtag ($username)" :
                            thirdPartyApp === 'venmo' ? "@username" :
                            thirdPartyApp === 'payoneer' ? "Email address" :
                            thirdPartyApp === 'wise' ? "Email or Account Details" :
                            thirdPartyApp === 'westernunion' ? "MTCN or Receiver Email" :
                            thirdPartyApp === 'moneygram' ? "Reference Number or Email" :
                            "Email or ID"
                          } 
                          className="input-field pl-12 py-4"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black tracking-tighter dark:text-white uppercase">Transaction Details</h3>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Amount to Send ({currency.code})</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400">{currency.symbol}</span>
                    <input 
                      type="number" 
                      required
                      min="1"
                      step="0.01"
                      placeholder="0.00" 
                      className="input-field pl-10 py-6 text-3xl font-black"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400">Available Balance: {formatAmount(userData?.walletBalance || 0)}</p>
                    {amount && parseFloat(amount) > 0 && (
                      <p className="text-xs text-accent font-bold">Fee: {formatAmount(0)} (Free)</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Note (Optional)</label>
                  <textarea 
                    placeholder="What's this for?" 
                    className="input-field py-4 h-24 resize-none"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="btn-primary w-full py-5 text-xl shadow-xl shadow-accent/20 flex items-center justify-center gap-3 font-black uppercase tracking-widest"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowUpCircle className="w-6 h-6" />
                      Send {formatAmount(parseFloat(amount || '0'))}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Recent Recipients */}
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-accent" />
                <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">Recent</h3>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search..."
                  className="bg-gray-50 dark:bg-zinc-800 border-none rounded-lg pl-7 pr-2 py-1 text-[10px] focus:ring-1 focus:ring-accent outline-none w-24"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              {recentRecipients.filter(r => 
                r.recipient.toLowerCase().includes(searchQuery.toLowerCase()) || 
                r.description.toLowerCase().includes(searchQuery.toLowerCase())
              ).length > 0 ? (
                recentRecipients
                  .filter(r => 
                    r.recipient.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    r.description.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((rec, i) => (
                  <button
                    key={i}
                    onClick={() => selectRecent(rec)}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-black text-xs uppercase">
                      {rec.recipient.charAt(0) || rec.description.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black dark:text-white truncate uppercase tracking-tighter">
                        {rec.recipient || rec.description}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                        {rec.type}
                      </p>
                    </div>
                    <ArrowUpCircle className="w-4 h-4 text-gray-300 group-hover:text-accent transition-colors" />
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No recent transfers</p>
                </div>
              )}
            </div>
          </div>

          {/* Security Info */}
          <div className="space-y-4">
            <SecurityCard 
              icon={<ShieldCheck className="w-5 h-5 text-green-500" />}
              title="End-to-End Encrypted"
              desc="Your financial data is always protected."
            />
            <SecurityCard 
              icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />}
              title="Instant Transfers"
              desc="Most transfers are completed in seconds."
            />
            <SecurityCard 
              icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
              title="Fraud Protection"
              desc="24/7 monitoring for suspicious activity."
            />
          </div>
        </div>
      </div>
    </BankingFeaturePage>
  );
};

const TypeButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`p-4 rounded-2xl font-bold flex flex-col items-center gap-2 transition-all border-2 ${
      active 
        ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' 
        : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-gray-400 hover:border-accent/30'
    }`}
  >
    {icon}
    <span className="text-[10px] uppercase tracking-widest">{label}</span>
  </button>
);

const AppButton = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
      active 
        ? 'bg-white dark:bg-zinc-700 text-accent shadow-sm' 
        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
    }`}
  >
    {label}
  </button>
);

const SecurityCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 flex flex-col items-center text-center gap-3">
    {icon}
    <h4 className="text-sm font-black uppercase tracking-widest dark:text-white">{title}</h4>
    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
  </div>
);

const ShieldCheck = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
