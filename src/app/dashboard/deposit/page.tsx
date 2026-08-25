import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownCircle, Banknote, CreditCard, QrCode, CheckCircle2, AlertCircle, Upload, Image as ImageIcon, Bitcoin, DollarSign, Landmark, RefreshCw, Copy, MessageSquare, ArrowRight } from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { useCurrency } from '../../../context/CurrencyContext';
import { db } from '../../../lib/supabase-service';
import { collection, addDoc, serverTimestamp, doc, updateDoc, onSnapshot, arrayUnion } from 'supabase/db';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, SUPABASE_BUCKET } from '../../../lib/supabase';
import { compressImageFile } from '../../../lib/image-compressor';

export const DepositPage = () => {
  const { user, userData } = useAuth();
  const { currency, formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'method' | 'connect' | 'select' | 'amount' | 'proof'>('method');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const getAccountsForMethod = (m: string | null) => {
    if (m === 'Bank Transfer') {
      const accounts = userData?.bankAccounts || [];
      const legacy = userData?.bankDetails;
      const all = [...accounts];
      if (legacy && !accounts.some((a: any) => a.accountNumber === legacy.accountNumber)) {
        all.unshift(legacy);
      }
      return all;
    }
    if (m === 'Credit Card') {
      const cards = userData?.creditCards || [];
      const legacy = userData?.cardDetails;
      const all = [...cards];
      if (legacy && !cards.some((c: any) => c.cardNumber === legacy.cardNumber)) {
        all.unshift(legacy);
      }
      return all;
    }
    return [];
  };

  const currentAccounts = getAccountsForMethod(method);

  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Settings
  const [usdtAddress, setUsdtAddress] = useState('');
  const [btcAddress, setBtcAddress] = useState('');

  useEffect(() => {
    // Initial fallback from storage if available
    try {
      const cached = JSON.parse(localStorage.getItem('beehive_wallet_settings') || '{}');
      if (cached.usdtAddress || cached.usdt_address) setUsdtAddress(cached.usdtAddress || cached.usdt_address);
      if (cached.btcAddress || cached.btc_address) setBtcAddress(cached.btcAddress || cached.btc_address);
    } catch {}

    const unsubscribe = onSnapshot(doc(db, 'settings', 'wallets'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const usdt = data?.usdtAddress || data?.usdt_address || '';
        const btc = data?.btcAddress || data?.btc_address || '';
        if (usdt) setUsdtAddress(usdt);
        if (btc) setBtcAddress(btc);
      }
    });
    return () => unsubscribe();
  }, []);

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

  const handleMethodSelect = (selectedMethod: string) => {
    setMethod(selectedMethod);
    if (selectedMethod === 'Bank Transfer') {
      const accounts = userData?.bankAccounts || [];
      const legacy = userData?.bankDetails;
      const allAccounts = [...accounts];
      if (legacy && !accounts.some((a: any) => a.accountNumber === legacy.accountNumber)) {
        allAccounts.unshift(legacy);
      }

      if (allAccounts.length > 1) {
        setStep('select');
      } else if (allAccounts.length === 1) {
        setSelectedAccount(allAccounts[0]);
        setStep('amount');
      } else {
        setStep('connect');
      }
    } else if (selectedMethod === 'Credit Card') {
      const cards = userData?.creditCards || [];
      const legacy = userData?.cardDetails;
      const allCards = [...cards];
      if (legacy && !cards.some((c: any) => c.cardNumber === legacy.cardNumber)) {
        allCards.unshift(legacy);
      }

      if (allCards.length > 1) {
        setStep('select');
      } else if (allCards.length === 1) {
        setSelectedAccount(allCards[0]);
        setStep('amount');
      } else {
        setStep('connect');
      }
    } else if (selectedMethod === 'USDT' || selectedMethod === 'Bitcoin') {
      setStep('amount');
    } else {
      setStep('amount');
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (currentAccounts.length >= 6) {
      alert(`You can add a maximum of 6 ${method === 'Bank Transfer' ? 'bank accounts' : 'credit cards'}.`);
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const details = method === 'Bank Transfer' ? bankForm : cardForm;
      
      if (method === 'Bank Transfer') {
        await updateDoc(userRef, { 
          bankAccounts: arrayUnion(details),
          ...(!userData?.bankAccounts?.length && !userData?.bankDetails ? { bankDetails: details } : {})
        });
      } else if (method === 'Credit Card') {
        await updateDoc(userRef, { 
          creditCards: arrayUnion(details),
          ...(!userData?.creditCards?.length && !userData?.cardDetails ? { cardDetails: details } : {})
        });
      }
      setSelectedAccount(details);
      setStep('amount');
    } catch (err) {
      console.error('Connection error:', err instanceof Error ? err.message : String(err));
      setError('Failed to connect account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setError('Image size must be less than 15MB');
        return;
      }
      setError('');
      
      try {
        const compressed = await compressImageFile(file, { maxWidth: 800, quality: 0.70 });
        setProofFile(compressed.file);
        setProofImage(compressed.dataUrl);
      } catch (compErr) {
        console.warn('Image compression fallback:', compErr);
        setProofFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setProofImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || parseFloat(amount) <= 0) return;

    setLoading(true);
    setError('');

    try {
      const depositAmount = parseFloat(amount);
      const selectedMethodName = method || (selectedAccount ? 'Bank Transfer' : 'USDT');
      let finalProofUrl = proofImage || '';
      let filePath = '';

      if (selectedMethodName !== 'Bank Transfer' && selectedMethodName !== 'Credit Card') {
        if (!proofFile && !proofImage) {
          setError('Please upload proof of payment');
          setLoading(false);
          return;
        }

        // Attempt Supabase Storage upload if file is present
        if (proofFile) {
          try {
            const fileExt = proofFile.name.split('.').pop() || 'png';
            const fileName = `${user.uid}-${Date.now()}.${fileExt}`;
            filePath = `proofs/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from(SUPABASE_BUCKET)
              .upload(filePath, proofFile);

            if (!uploadError) {
              const { data: { publicUrl: url } } = supabase.storage
                .from(SUPABASE_BUCKET)
                .getPublicUrl(filePath);
              if (url && url.startsWith('http') && !url.includes('localhost') && !url.includes('sb_fallback')) {
                finalProofUrl = url;
              }
            }
          } catch (storageErr) {
            console.warn('Supabase storage upload notice (using direct proof image):', storageErr);
          }
        }
      }

      const userEmailResolved = user.email || userData?.email || '';
      const resolvedProof = finalProofUrl || proofImage || '';

      const metaPayload = {
        method: selectedMethodName,
        userEmail: userEmailResolved,
        userName: userData?.fullName || userData?.displayName || user.displayName || userEmailResolved.split('@')[0] || 'User',
        hasProof: !!resolvedProof,
        createdAt: new Date().toISOString()
      };
      
      const descriptionPayload = `Deposit via ${selectedMethodName} | __META__:${JSON.stringify(metaPayload)}`;

      // Save local backup in localStorage for quick client access
      if (typeof window !== 'undefined' && resolvedProof) {
        try {
          window.localStorage.setItem(`deposit_proof_${user.uid}`, resolvedProof);
          if (filePath) {
            window.localStorage.setItem(`sb_fallback_${filePath}`, resolvedProof);
          }
        } catch (e) {}
      }

      // Also update user profile with latest proof as backup
      if (resolvedProof) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            lastDepositProof: resolvedProof,
            last_deposit_proof: resolvedProof
          });
        } catch (profileErr) {
          console.warn('Notice updating user profile backup proof:', profileErr);
        }
      }
      
      const depositCurrency = selectedMethodName === 'Bitcoin' 
        ? 'BTC' 
        : (selectedMethodName === 'USDT' ? 'USDT' : (userData?.currency?.code || currency.code || 'USD'));

      // Record transaction in Firestore / Supabase with all complete metadata
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        userEmail: userEmailResolved,
        email: userEmailResolved,
        userName: userData?.fullName || userData?.displayName || user.displayName || userEmailResolved.split('@')[0] || 'User',
        type: 'deposit',
        amount: depositAmount,
        currency: depositCurrency,
        status: 'pending',
        method: selectedMethodName,
        paymentMethod: selectedMethodName,
        depositMethod: selectedMethodName,
        description: descriptionPayload,
        proofOfPayment: resolvedProof || null,
        proof_of_payment: resolvedProof || null,
        proofImage: resolvedProof || null,
        proof_image: resolvedProof || null,
        proofUrl: finalProofUrl || null,
        storagePath: filePath || null,
        accountDetails: selectedAccount || null,
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString()
      });

      if (selectedMethodName === 'Bank Transfer' || selectedMethodName === 'Credit Card') {
        setProcessing(true);
      } else {
        setSuccess(true);
      }
      
      setAmount('');
      setMethod(null);
      setProofImage(null);
      setProofFile(null);
      setStep('method');
    } catch (err: any) {
      console.error('Deposit error:', err instanceof Error ? err.message : String(err));
      setError(err.message || 'Failed to submit deposit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (processing) {
    return (
      <BankingFeaturePage 
        title="Processing Deposit" 
        description="Your transaction is being processed"
        icon={RefreshCw}
      >
        <div className="max-w-md mx-auto text-center py-12">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto mb-6"
          >
            <RefreshCw className="w-10 h-10" />
          </motion.div>
          <h2 className="text-3xl font-black mb-4 dark:text-white">Transaction Processing</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Make sure your details are correct, or else the deposit will fail.
            <br className="hidden sm:inline" /> Your deposit is currently being processed by our system. If you don't see it after 5 minutes, please contact our support team.
          </p>
          <button 
            onClick={() => setProcessing(false)}
            className="btn-primary w-full py-4"
          >
            Back to Dashboard
          </button>
        </div>
      </BankingFeaturePage>
    );
  }

  if (success) {
    return (
      <BankingFeaturePage 
        title="Deposit Submitted" 
        description="Your deposit request is being reviewed"
        icon={CheckCircle2}
      >
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black mb-4 dark:text-white">Request Sent!</h2>
          <p className="text-white mb-8">Your deposit request has been submitted for approval. Your transaction is currently under review and you'll be notified once it's done. Your balance will be updated automatically. If you have any issues or haven't seen the money after some time, please contact support.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="btn-primary w-full py-4"
          >
            Back to Deposits
          </button>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Deposit Money" 
      description="Add funds to your Beehive account"
      icon={ArrowDownCircle}
    >
      <div className="max-w-4xl mx-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-12 overflow-x-auto pb-4 no-scrollbar">
          <StepCircle num={1} active={step === 'method'} completed={!!method} label="Method" />
          <div className="w-8 sm:w-12 h-0.5 bg-gray-200 dark:bg-zinc-800 shrink-0" />
          <StepCircle num={2} active={step === 'connect' || step === 'select'} completed={step === 'amount' || step === 'proof'} label="Connect" />
          <div className="w-8 sm:w-12 h-0.5 bg-gray-200 dark:bg-zinc-800 shrink-0" />
          <StepCircle num={3} active={step === 'amount'} completed={parseFloat(amount) > 0} label="Amount" />
          <div className="w-8 sm:w-12 h-0.5 bg-gray-200 dark:bg-zinc-800 shrink-0" />
          <StepCircle num={4} active={step === 'proof'} completed={!!proofImage} label="Proof" />
        </div>

        <AnimatePresence mode="wait">
          {step === 'method' && (
            <motion.div 
              key="method"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <DepositMethod 
                icon={<CreditCard className="w-8 h-8" />}
                title="Credit Card"
                description="Instant processing via secure gateway"
                onClick={() => handleMethodSelect('Credit Card')}
              />
              <DepositMethod 
                icon={
                  <div className="relative">
                    <Landmark className="w-8 h-8" />
                    <MessageSquare className="w-4 h-4 absolute -bottom-1 -right-1 text-accent fill-accent/20" />
                  </div>
                }
                title="Bank Transfer - Chat with Account Manager"
                description="Chat directly with your account manager for wire & bank transfer instructions and deposit processing."
                onClick={() => navigate('/dashboard/chat')}
                buttonText="Chat with Account Manager"
              />
              <DepositMethod 
                icon={<DollarSign className="w-8 h-8" />}
                title="USDT (TRC20)"
                description="Fast crypto deposit with low fees"
                onClick={() => handleMethodSelect('USDT')}
              />
              <DepositMethod 
                icon={<Bitcoin className="w-8 h-8" />}
                title="Bitcoin (BTC)"
                description="Decentralized digital currency deposit"
                onClick={() => handleMethodSelect('Bitcoin')}
              />
            </motion.div>
          )}

          {step === 'select' && (
            <motion.div 
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-md mx-auto w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl"
            >
              <div className="mb-8">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                  method === 'Bank Transfer' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                }`}>
                  {method === 'Bank Transfer' ? <Landmark className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                </div>
                <h2 className="text-2xl font-bold dark:text-white">Select {method}</h2>
                <p className="text-gray-500 text-sm">Choose which account to use for this deposit</p>
              </div>

              <div className="space-y-4 mb-8">
                {method === 'Bank Transfer' ? (
                  <>
                    {/* Legacy bankDetails */}
                    {userData?.bankDetails && (!userData.bankAccounts || !userData.bankAccounts.some((b: any) => b.accountNumber === userData.bankDetails.accountNumber)) && (
                      <button
                        onClick={() => {
                          setSelectedAccount(userData.bankDetails);
                          setStep('amount');
                        }}
                        className="w-full p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 hover:border-accent transition-all text-left group"
                      >
                        <p className="font-bold dark:text-white group-hover:text-accent">{userData.bankDetails.bankName}</p>
                        <p className="text-sm text-gray-500">****{userData.bankDetails.accountNumber.slice(-4)}</p>
                      </button>
                    )}
                    {/* bankAccounts array */}
                    {userData?.bankAccounts?.map((bank: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedAccount(bank);
                          setStep('amount');
                        }}
                        className="w-full p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 hover:border-accent transition-all text-left group"
                      >
                        <p className="font-bold dark:text-white group-hover:text-accent">{bank.bankName}</p>
                        <p className="text-sm text-gray-500">****{bank.accountNumber.slice(-4)}</p>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {/* Legacy cardDetails */}
                    {userData?.cardDetails && (!userData.creditCards || !userData.creditCards.some((c: any) => c.cardNumber === userData.cardDetails.cardNumber)) && (
                      <button
                        onClick={() => {
                          setSelectedAccount(userData.cardDetails);
                          setStep('amount');
                        }}
                        className="w-full p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 hover:border-accent transition-all text-left group"
                      >
                        <p className="font-bold dark:text-white group-hover:text-accent">Card ending in {userData.cardDetails.cardNumber.slice(-4)}</p>
                        <p className="text-sm text-gray-500">Expires: {userData.cardDetails.expiryDate}</p>
                      </button>
                    )}
                    {/* creditCards array */}
                    {userData?.creditCards?.map((card: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedAccount(card);
                          setStep('amount');
                        }}
                        className="w-full p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 hover:border-accent transition-all text-left group"
                      >
                        <p className="font-bold dark:text-white group-hover:text-accent">Card ending in {card.cardNumber.slice(-4)}</p>
                        <p className="text-sm text-gray-500">Expires: {card.expiryDate}</p>
                      </button>
                    ))}
                  </>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep('method')}
                  className="btn-secondary flex-1 py-4"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (currentAccounts.length >= 6) {
                      alert(`Maximum of 6 ${method === 'Bank Transfer' ? 'bank accounts' : 'credit cards'} reached.`);
                      return;
                    }
                    setStep('connect');
                  }}
                  className="btn-primary flex-[2] py-4"
                >
                  Add New
                </button>
              </div>
            </motion.div>
          )}

          {step === 'connect' && (
            <motion.div 
              key="connect"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-md mx-auto w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl"
            >
              <div className="mb-8">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                  method === 'Bank Transfer' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                }`}>
                  {method === 'Bank Transfer' ? <Landmark className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                </div>
                <h2 className="text-2xl font-bold dark:text-white">Connect {method}</h2>
                <p className="text-gray-500 text-sm">Please provide your details to proceed with the deposit</p>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                {method === 'Bank Transfer' ? (
                  <>
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
                  </>
                ) : (
                  <>
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
                  </>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setStep('method')}
                    className="btn-secondary flex-1 py-4"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-[2] py-4"
                  >
                    {loading ? 'Connecting...' : 'Connect & Continue'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'amount' && (
            <motion.div 
              key="amount"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-md mx-auto w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl"
            >
              <h3 className="text-xl font-black mb-6 dark:text-white">Enter Amount ({method})</h3>
              
              {selectedAccount && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Using Account:</p>
                    <div className="flex gap-3">
                      {currentAccounts.length > 1 && (
                        <button 
                          onClick={() => setStep('select')}
                          className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline"
                        >
                          Change
                        </button>
                      )}
                      {currentAccounts.length < 6 && (
                        <button 
                          onClick={() => setStep('connect')}
                          className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline"
                        >
                          Add Another
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                      {method === 'Bank Transfer' ? <Landmark className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold dark:text-white">
                        {method === 'Bank Transfer' ? selectedAccount.bankName : `Card ending in ${selectedAccount.cardNumber.slice(-4)}`}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">
                        {method === 'Bank Transfer' ? `****${selectedAccount.accountNumber.slice(-4)}` : `Expires: ${selectedAccount.expiryDate}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {(method === 'USDT' || method === 'Bitcoin') && (
                <div className="mb-8 p-6 bg-accent/5 rounded-2xl border border-accent/10">
                  <p className="text-xs font-black text-accent uppercase tracking-widest mb-4">Transfer to this address:</p>
                  <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 mb-4">
                    <p className="text-sm font-mono break-all dark:text-white flex-1">
                      {method === 'USDT' ? usdtAddress : btcAddress}
                    </p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(method === 'USDT' ? usdtAddress : btcAddress);
                        // Optional: show toast
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-accent"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed uppercase font-bold tracking-tighter">
                    Please ensure you send the exact amount using the correct network ({method === 'USDT' ? 'TRC20' : 'BTC Network'}). Transfers to the wrong network will result in permanent loss of funds.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold dark:text-white uppercase tracking-widest opacity-50">Amount ({currency.code})</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400">{currency.symbol}</span>
                    <input 
                      type="number" 
                      required
                      min="1"
                      step="0.01"
                      className="input-field text-2xl font-black py-6 pl-16" 
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-400">Current Balance: {formatAmount(userData?.walletBalance || 0)}</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      const accounts = method === 'Bank Transfer' ? (userData?.bankAccounts || []) : (userData?.creditCards || []);
                      const legacy = method === 'Bank Transfer' ? userData?.bankDetails : userData?.cardDetails;
                      const hasMultiple = (accounts.length + (legacy ? 1 : 0)) > 1;
                      setStep(hasMultiple ? 'select' : 'method');
                    }}
                    className="btn-secondary flex-1 py-4"
                  >
                    Back
                  </button>
                  <button 
                    onClick={(e) => {
                      if (method === 'Bank Transfer' || method === 'Credit Card') {
                        handleDeposit(e as any);
                      } else {
                        setStep('proof');
                      }
                    }}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="btn-primary flex-[2] py-4"
                  >
                    {method === 'Bank Transfer' || method === 'Credit Card' ? 'Complete Deposit' : 'Continue'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'proof' && (
            <motion.div 
              key="proof"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-md mx-auto w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl"
            >
              <h3 className="text-xl font-black mb-2 dark:text-white">Upload Proof</h3>
              <p className="text-sm text-gray-500 mb-6">Please upload a screenshot or photo of your payment confirmation.</p>
              
              <form onSubmit={handleDeposit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                )}

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    proofImage ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-zinc-800 hover:border-accent'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {proofImage ? (
                    <div className="space-y-4">
                      <img src={proofImage} alt="Proof" className="max-h-40 mx-auto rounded-lg shadow-md" />
                      <p className="text-xs text-green-600 font-bold">Image Selected ✓</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                      <p className="text-sm font-bold dark:text-white">Click to upload image</p>
                      <p className="text-xs text-gray-500">JPG, PNG up to 2MB</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setStep('amount')}
                    className="btn-secondary flex-1 py-4"
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading || !proofImage}
                    className="btn-primary flex-[2] py-4"
                  >
                    {loading ? 'Submitting...' : 'Submit Deposit'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BankingFeaturePage>
  );
};

const StepCircle = ({ num, active, completed, label }: { num: number, active: boolean, completed: boolean, label: string }) => (
  <div className="flex flex-col items-center gap-2">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
      completed ? 'bg-green-500 text-white' : active ? 'bg-accent text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'
    }`}>
      {completed ? <CheckCircle2 className="w-5 h-5" /> : num}
    </div>
    <span className={`hidden sm:block text-[10px] font-black uppercase tracking-widest ${active ? 'text-accent' : 'text-gray-400'}`}>{label}</span>
  </div>
);

const DepositMethod = ({ 
  icon, 
  title, 
  description, 
  onClick,
  buttonText
}: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  onClick: () => void,
  buttonText?: string
}) => (
  <button 
    onClick={onClick}
    className="p-6 sm:p-8 rounded-3xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 hover:border-accent/50 transition-all text-left group w-full flex flex-col justify-between"
  >
    <div>
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-zinc-900 text-accent shadow-sm flex items-center justify-center mb-4 sm:mb-6 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-black mb-2 dark:text-white">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-4">{description}</p>
    </div>
    {buttonText && (
      <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-accent text-white group-hover:bg-accent/90 transition-all w-fit shadow-sm">
        <span>{buttonText}</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    )}
  </button>
);
