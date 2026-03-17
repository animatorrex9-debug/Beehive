import React, { useState, useRef } from 'react';
import { ArrowDownCircle, Banknote, CreditCard, QrCode, CheckCircle2, AlertCircle, Upload, Image as ImageIcon, Bitcoin, DollarSign, Landmark } from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, SUPABASE_BUCKET } from '../../../lib/supabase';

export const DepositPage = () => {
  const { user, userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'method' | 'amount' | 'proof'>('method');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        return;
      }
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || parseFloat(amount) <= 0 || !proofFile) return;

    setLoading(true);
    setError('');

    try {
      const depositAmount = parseFloat(amount);
      
      // 1. Upload to Supabase Storage
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${user.uid}-${Date.now()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, proofFile);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(filePath);
      
      // Small delay to ensure network stability before Firestore write
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. Record transaction in Firestore
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        userEmail: user.email,
        type: 'deposit',
        amount: depositAmount,
        currency: 'USD',
        status: 'pending',
        method: method,
        description: `Deposit via ${method}`,
        proofOfPayment: publicUrl,
        storagePath: filePath, // Store path for potential deletion later
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString()
      });

      setSuccess(true);
      setAmount('');
      setMethod(null);
      setProofImage(null);
      setProofFile(null);
      setStep('method');
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.message || 'Failed to submit deposit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-gray-500 mb-8">Your deposit of ${amount} via {method} has been submitted for approval. Funds will be added to your balance once the admin verifies your payment proof.</p>
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
        <div className="flex items-center justify-center gap-4 mb-12">
          <StepCircle num={1} active={step === 'method'} completed={!!method} label="Method" />
          <div className="w-12 h-0.5 bg-gray-200 dark:bg-zinc-800" />
          <StepCircle num={2} active={step === 'amount'} completed={parseFloat(amount) > 0} label="Amount" />
          <div className="w-12 h-0.5 bg-gray-200 dark:bg-zinc-800" />
          <StepCircle num={3} active={step === 'proof'} completed={!!proofImage} label="Proof" />
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
                onClick={() => { setMethod('Credit Card'); setStep('amount'); }}
              />
              <DepositMethod 
                icon={<DollarSign className="w-8 h-8" />}
                title="USDT (TRC20)"
                description="Fast crypto deposit with low fees"
                onClick={() => { setMethod('USDT'); setStep('amount'); }}
              />
              <DepositMethod 
                icon={<Landmark className="w-8 h-8" />}
                title="Bank Transfer"
                description="Direct transfer to our corporate account"
                onClick={() => { setMethod('Bank Transfer'); setStep('amount'); }}
              />
              <DepositMethod 
                icon={<ImageIcon className="w-8 h-8" />}
                title="PayPal"
                description="Secure payment via PayPal balance"
                onClick={() => { setMethod('PayPal'); setStep('amount'); }}
              />
              <DepositMethod 
                icon={<Bitcoin className="w-8 h-8" />}
                title="Bitcoin (BTC)"
                description="Decentralized digital currency deposit"
                onClick={() => { setMethod('Bitcoin'); setStep('amount'); }}
              />
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
              <div className="space-y-6">
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
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep('method')}
                    className="btn-secondary flex-1 py-4"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setStep('proof')}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="btn-primary flex-[2] py-4"
                  >
                    Continue
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
    <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-accent' : 'text-gray-400'}`}>{label}</span>
  </div>
);

const DepositMethod = ({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="p-8 rounded-3xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 hover:border-accent/50 transition-all text-left group"
  >
    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 text-accent shadow-sm flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
      {icon}
    </div>
    <h3 className="text-xl font-black mb-2 dark:text-white">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
  </button>
);
