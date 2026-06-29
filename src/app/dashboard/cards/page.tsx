import React, { useState } from 'react';
import { CreditCard, Plus, Shield, Eye, Settings, EyeOff, Lock, Unlock, CheckCircle2, AlertCircle, X, MessageSquare } from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/supabase-service';
import { doc, updateDoc, collection, addDoc, increment } from 'supabase/db';
import { motion, AnimatePresence } from 'motion/react';

export const CardsPage = () => {
  const { user, userData } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showActivationPopup, setShowActivationPopup] = useState(false);

  const isActivated = userData?.cardActivated === true;

  const handleRevealClick = () => {
    if (!isActivated) {
      setShowActivationPopup(true);
    } else {
      setShowDetails(!showDetails);
    }
  };

  const handleCreateCard = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');

    try {
      // Update user card count
      await updateDoc(doc(db, 'users', user.uid), {
        activeCards: increment(1)
      });

      // Record transaction (as a service fee or just a log)
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'service',
        amount: 0,
        currency: 'USD',
        status: 'completed',
        description: 'New Virtual Card Issued',
        timestamp: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Card creation error:', err);
      setError('Failed to create card. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BankingFeaturePage 
      title="Virtual Cards" 
      description="Secure, instant virtual cards for global spending"
      icon={CreditCard}
    >
      <div className="grid lg:grid-cols-2 gap-12 w-full">
        <div className="space-y-8">
          <div className="relative group cursor-pointer">
            <motion.div 
              animate={{ opacity: isFrozen ? 0.6 : 1 }}
              className={`p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-black text-white aspect-[1.6/1] flex flex-col justify-between shadow-2xl overflow-hidden relative ${isFrozen ? 'grayscale' : ''}`}
            >
              <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
                <CreditCard className="w-48 h-48" />
              </div>
              
              {isFrozen && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    <span className="font-bold uppercase tracking-widest text-sm">Frozen</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start">
                <div className="w-12 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg" />
                <span className="font-black italic text-xl">Beehive Platinum</span>
              </div>
              <div className="space-y-4">
                <p className="text-2xl font-mono tracking-[0.2em]">
                  {showDetails ? '4242 8888 9999 4242' : '**** **** **** 4242'}
                </p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] uppercase opacity-50 mb-1">Card Holder</p>
                    <p className="font-bold tracking-widest uppercase">{userData?.fullName || 'User Name'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase opacity-50 mb-1">Expires</p>
                    <p className="font-bold">{showDetails ? '12/28' : '**/**'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <CardAction 
              icon={showDetails ? <EyeOff /> : <Eye />} 
              label={showDetails ? "Hide Details" : "View Details"} 
              onClick={handleRevealClick}
            />
            <CardAction 
              icon={isFrozen ? <Unlock /> : <Shield />} 
              label={isFrozen ? "Unfreeze" : "Freeze Card"} 
              onClick={() => setIsFrozen(!isFrozen)}
            />
            <CardAction icon={<Settings />} label="Settings" />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-xl flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5" />
              New virtual card issued successfully!
            </div>
          )}
        </div>

        <div className="space-y-8">
          <h3 className="text-2xl font-black tracking-tighter dark:text-white">CARD BENEFITS</h3>
          <div className="space-y-6">
            <Benefit 
              title="Zero Transaction Fees" 
              description="No hidden charges on international or local purchases."
            />
            <Benefit 
              title="Instant Issuance" 
              description="Get your card details immediately after approval."
            />
            <Benefit 
              title="Advanced Security" 
              description="Dynamic CVV and instant freeze capabilities for your peace of mind."
            />
          </div>
          <button 
            onClick={handleCreateCard}
            disabled={loading}
            className="btn-primary w-full py-4 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> {loading ? 'Issuing...' : 'Create New Virtual Card'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showActivationPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-zinc-800 relative"
            >
              <button 
                onClick={() => setShowActivationPopup(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors dark:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto">
                  <Lock className="w-10 h-10" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase">Card Activation Required</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Your virtual card is currently inactive. To reveal your card details and start spending, please contact your account manager.
                  </p>
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    onClick={() => {
                      // Navigate to chat or handle contact
                      window.location.href = '/dashboard/chat';
                    }}
                    className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-5 h-5" /> Contact Account Manager
                  </button>
                  <button 
                    onClick={() => setShowActivationPopup(false)}
                    className="w-full py-4 text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors uppercase tracking-widest"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </BankingFeaturePage>
  );
};

const CardAction = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 hover:bg-accent hover:text-white transition-all dark:text-white"
  >
    {icon}
    <span className="text-[10px] font-bold uppercase">{label}</span>
  </button>
);

const Benefit = ({ title, description }: { title: string, description: string }) => (
  <div className="flex gap-4">
    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
    <div>
      <h4 className="font-bold dark:text-white">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
);
