import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowUpCircle, 
  User, 
  Globe, 
  Hash, 
  CheckCircle2, 
  AlertCircle, 
  Landmark, 
  Smartphone, 
  CreditCard, 
  Mail, 
  Phone, 
  ExternalLink, 
  History, 
  Search, 
  ArrowRightLeft, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  ArrowRight, 
  Info, 
  Lock, 
  UserCheck, 
  X, 
  Receipt,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { useCurrency, getCurrencyByCountry, DEFAULT_CURRENCY, CurrencyInfo } from '../../../context/CurrencyContext';
import { db, handleSupabaseError as handleFirestoreError, OperationType } from '../../../lib/supabase-service';
import { supabase } from '../../../lib/supabase';
import { 
  doc, 
  updateDoc, 
  collection, 
  addDoc, 
  increment, 
  serverTimestamp, 
  query, 
  where, 
  limit, 
  getDocs 
} from 'supabase/db';
import { motion, AnimatePresence } from 'motion/react';

type TransferType = 'beehive' | 'local' | 'international' | 'thirdparty';
type ThirdPartyApp = 'paypal' | 'zelle' | 'cashapp' | 'venmo' | 'payoneer' | 'wise' | 'skrill' | 'westernunion' | 'moneygram';

interface RecentRecipient {
  recipient: string;
  type: TransferType;
  description: string;
  metadata?: any;
}

interface VerifiedRecipientUser {
  id: string;
  email: string;
  fullName: string;
  country?: string;
  currency: CurrencyInfo;
  photoURL?: string;
}

export const SendPage = () => {
  const { user, userData, refreshUserData } = useAuth();
  const { currency, formatAmount, convertAmount, rates } = useCurrency();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<TransferType>('beehive');
  const [thirdPartyApp, setThirdPartyApp] = useState<ThirdPartyApp>('paypal');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Beehive user lookup state
  const [verifiedRecipient, setVerifiedRecipient] = useState<VerifiedRecipientUser | null>(null);
  const [isVerifyingRecipient, setIsVerifyingRecipient] = useState(false);
  const [recipientLookupError, setRecipientLookupError] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Completed transfer receipt details
  const [completedTransfer, setCompletedTransfer] = useState<{
    recipientName: string;
    recipientEmail: string;
    sentAmount: number;
    senderCurrency: CurrencyInfo;
    receivedAmount: number;
    recipientCurrency: CurrencyInfo;
    rate: number;
    type: TransferType;
    refId: string;
    note?: string;
  } | null>(null);

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

  // Fetch recent recipients
  const fetchRecentRecipients = useCallback(async () => {
    if (!user) return;
    const path = 'transactions';
    try {
      const q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        where('type', '==', 'send'),
        limit(20)
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
      handleFirestoreError(err, OperationType.GET, path);
    }
  }, [user]);

  useEffect(() => {
    fetchRecentRecipients();
  }, [fetchRecentRecipients]);

  // Lookup Beehive user by email
  useEffect(() => {
    if (type !== 'beehive') {
      setVerifiedRecipient(null);
      setRecipientLookupError('');
      setIsVerifyingRecipient(false);
      return;
    }

    const trimmedEmail = recipient.trim().toLowerCase();

    if (!trimmedEmail) {
      setVerifiedRecipient(null);
      setRecipientLookupError('');
      setIsVerifyingRecipient(false);
      return;
    }

    // Basic email pattern check before triggering query
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setVerifiedRecipient(null);
      setRecipientLookupError('');
      setIsVerifyingRecipient(false);
      return;
    }

    if (user?.email && trimmedEmail === user.email.toLowerCase()) {
      setVerifiedRecipient(null);
      setRecipientLookupError('You cannot transfer money to your own email address.');
      setIsVerifyingRecipient(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsVerifyingRecipient(true);
      setRecipientLookupError('');
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', trimmedEmail), limit(1));
        const snapshot = await getDocs(q);

        let foundUser: any = null;
        let targetId = '';

        if (!snapshot.empty) {
          foundUser = snapshot.docs[0].data();
          targetId = snapshot.docs[0].id;
        } else {
          // Direct Supabase query fallback in case RLS or caching intervened
          try {
            const { data: remoteProfiles } = await supabase
              .from('profiles')
              .select('*')
              .ilike('email', trimmedEmail)
              .limit(1);
            if (remoteProfiles && remoteProfiles.length > 0) {
              foundUser = remoteProfiles[0];
              targetId = remoteProfiles[0].id;
            }
          } catch (e) {}

          // Fallback from localStorage registry
          if (!foundUser) {
            try {
              const knownUsers: any[] = JSON.parse(localStorage.getItem('beehive_known_users') || '[]');
              const matched = knownUsers.find(u => u && u.email && u.email.toLowerCase().trim() === trimmedEmail);
              if (matched) {
                foundUser = matched;
                targetId = matched.id;
              }
            } catch (e) {}
          }

          // Fallback from profile extras in localStorage
          if (!foundUser) {
            try {
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('local_profile_extras_')) {
                  const extraData = JSON.parse(localStorage.getItem(key) || '{}');
                  if (extraData && extraData.email && extraData.email.toLowerCase().trim() === trimmedEmail) {
                    foundUser = extraData;
                    targetId = key.replace('local_profile_extras_', '');
                    break;
                  }
                }
              }
            } catch (e) {}
          }
        }

        if (foundUser && targetId) {
          if (targetId === user?.uid) {
            setVerifiedRecipient(null);
            setRecipientLookupError('You cannot transfer money to your own email address.');
            return;
          }

          let targetCurrency: CurrencyInfo = DEFAULT_CURRENCY;
          if (foundUser.currency && foundUser.currency.code) {
            targetCurrency = foundUser.currency;
          } else if (foundUser.country) {
            targetCurrency = getCurrencyByCountry(foundUser.country);
          }

          const recipientObj: VerifiedRecipientUser = {
            id: targetId,
            email: foundUser.email || trimmedEmail,
            fullName: foundUser.fullName || foundUser.full_name || foundUser.displayName || foundUser.name || (foundUser.email ? foundUser.email.split('@')[0] : trimmedEmail.split('@')[0]),
            country: foundUser.country || 'Global',
            currency: targetCurrency,
            photoURL: foundUser.photoURL || foundUser.photo_url
          };

          setVerifiedRecipient(recipientObj);
          setRecipientLookupError('');
        } else {
          setVerifiedRecipient(null);
          setRecipientLookupError('No Beehive user found with this email address. Please check the spelling.');
        }
      } catch (err) {
        console.error('Error verifying recipient user:', err);
        setRecipientLookupError('Unable to verify user at this moment.');
      } finally {
        setIsVerifyingRecipient(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [recipient, type, user]);

  // Conversion calculations for Beehive transfer
  const parsedSendAmount = parseFloat(amount) || 0;
  const isDifferentCurrency = useMemo(() => {
    if (!verifiedRecipient) return false;
    return verifiedRecipient.currency.code !== currency.code;
  }, [verifiedRecipient, currency]);

  const recipientEstimatedAmount = useMemo(() => {
    if (!verifiedRecipient || parsedSendAmount <= 0) return 0;
    return convertAmount(parsedSendAmount, currency.code, verifiedRecipient.currency.code);
  }, [verifiedRecipient, parsedSendAmount, currency.code, convertAmount]);

  const liveExchangeRate = useMemo(() => {
    if (!verifiedRecipient || !rates) return 1;
    const fromRate = rates[currency.code] || 1;
    const toRate = rates[verifiedRecipient.currency.code] || 1;
    return toRate / fromRate;
  }, [verifiedRecipient, currency.code, rates]);

  // Initiate transfer validation & open confirmation modal
  const handleInitiateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || parsedSendAmount <= 0) return;

    const availableBalance = userData?.walletBalance || 0;
    if (parsedSendAmount > availableBalance) {
      setError(`Insufficient funds in your wallet. Available: ${formatAmount(availableBalance)}`);
      return;
    }

    if (type === 'beehive') {
      if (!verifiedRecipient) {
        setError('Please enter a valid, registered Beehive user email address.');
        return;
      }
      if (verifiedRecipient.id === user.uid) {
        setError('You cannot transfer money to your own account.');
        return;
      }
      setError('');
      setShowApprovalModal(true);
      return;
    }

    // Direct submit for other types
    executeTransfer();
  };

  // Execute transfer in Firestore
  const executeTransfer = async () => {
    if (!user || parsedSendAmount <= 0) return;

    const availableBalance = userData?.walletBalance || 0;
    if (parsedSendAmount > availableBalance) {
      setError(`Insufficient funds in your wallet. Available: ${formatAmount(availableBalance)}`);
      setShowApprovalModal(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const txRefId = 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase();

      if (type === 'beehive' && verifiedRecipient) {
        const receivedAmount = convertAmount(parsedSendAmount, currency.code, verifiedRecipient.currency.code);
        const senderDescription = `Transfer to ${verifiedRecipient.fullName} (${currency.symbol}${parsedSendAmount.toLocaleString()} ${currency.code}${isDifferentCurrency ? ` → ${verifiedRecipient.currency.symbol}${receivedAmount.toLocaleString()} ${verifiedRecipient.currency.code}` : ''})`;
        const recipientDescription = `Received from ${userData?.fullName || user.email} (${currency.symbol}${parsedSendAmount.toLocaleString()} ${currency.code}${isDifferentCurrency ? ` → ${verifiedRecipient.currency.symbol}${receivedAmount.toLocaleString()} ${verifiedRecipient.currency.code}` : ''})`;

        let rpcSuccess = false;
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('transfer_beehive_funds', {
            p_recipient_id: verifiedRecipient.id,
            p_send_amount: parsedSendAmount,
            p_received_amount: receivedAmount,
            p_sender_currency: currency.code,
            p_recipient_currency: verifiedRecipient.currency.code,
            p_sender_description: senderDescription,
            p_recipient_description: recipientDescription,
            p_note: note || '',
            p_tx_ref_id: txRefId
          });

          if (!rpcErr && rpcRes && rpcRes.success) {
            rpcSuccess = true;
          }
        } catch (rpcEx) {
          console.warn('[Send] RPC transfer error, falling back to direct operations:', rpcEx);
        }

        if (!rpcSuccess) {
          // 1. Debit sender's wallet balance
          await updateDoc(doc(db, 'users', user.uid), {
            walletBalance: increment(-parsedSendAmount)
          });

          // 2. Credit recipient's wallet balance
          await updateDoc(doc(db, 'users', verifiedRecipient.id), {
            walletBalance: increment(receivedAmount)
          });

          // 3. Record sender transaction
          await addDoc(collection(db, 'transactions'), {
            userId: user.uid,
            type: 'send',
            transferType: 'beehive',
            amount: parsedSendAmount,
            currency: currency.code,
            status: 'completed',
            description: senderDescription,
            metadata: { 
              recipient: verifiedRecipient.email,
              recipientName: verifiedRecipient.fullName,
              recipientId: verifiedRecipient.id,
              recipientCurrency: verifiedRecipient.currency.code,
              convertedAmount: receivedAmount,
              exchangeRate: liveExchangeRate,
              refId: txRefId,
              note
            },
            note: note,
            timestamp: new Date().toISOString(),
            createdAt: serverTimestamp()
          });

          // 4. Record recipient transaction
          await addDoc(collection(db, 'transactions'), {
            userId: verifiedRecipient.id,
            type: 'receive',
            transferType: 'beehive',
            amount: receivedAmount,
            currency: verifiedRecipient.currency.code,
            status: 'completed',
            description: recipientDescription,
            metadata: { 
              sender: user.email,
              senderName: userData?.fullName || user.email,
              senderId: user.uid,
              senderCurrency: currency.code,
              originalAmount: parsedSendAmount,
              exchangeRate: liveExchangeRate,
              refId: txRefId,
              note
            },
            note: note,
            timestamp: new Date().toISOString(),
            createdAt: serverTimestamp()
          });

          // 5. In-app notification for recipient
          try {
            await addDoc(collection(db, 'notifications', verifiedRecipient.id, 'items'), {
              title: 'Money Received',
              message: `You received ${verifiedRecipient.currency.symbol}${receivedAmount.toLocaleString()} ${verifiedRecipient.currency.code} from ${userData?.fullName || user.email}.${note ? ` Note: "${note}"` : ''}`,
              type: 'transfer',
              read: false,
              timestamp: new Date().toISOString(),
              createdAt: serverTimestamp()
            });
          } catch (notifErr) {
            console.warn('Notification log error (non-fatal):', notifErr);
          }
        }

        // In-app notification for sender
        try {
          await addDoc(collection(db, 'notifications', user.uid, 'items'), {
            title: 'Transfer Completed',
            message: `Successfully transferred ${currency.symbol}${parsedSendAmount.toLocaleString()} ${currency.code} to ${verifiedRecipient.fullName}.`,
            type: 'transfer',
            read: false,
            timestamp: new Date().toISOString(),
            createdAt: serverTimestamp()
          });
        } catch (notifErr) {
          console.warn('Sender notification log error (non-fatal):', notifErr);
        }

        setCompletedTransfer({
          recipientName: verifiedRecipient.fullName,
          recipientEmail: verifiedRecipient.email,
          sentAmount: parsedSendAmount,
          senderCurrency: currency,
          receivedAmount: receivedAmount,
          recipientCurrency: verifiedRecipient.currency,
          rate: liveExchangeRate,
          type: 'beehive',
          refId: txRefId,
          note: note
        });

      } else {
        // Non-Beehive transfers (Local bank, International, Third-Party)
        await updateDoc(doc(db, 'users', user.uid), {
          walletBalance: increment(-parsedSendAmount)
        });

        let description = '';
        let metadata: any = { refId: txRefId };

        if (type === 'local') {
          description = `Local transfer to ${bankName} (${currency.symbol}${parsedSendAmount.toLocaleString()} ${currency.code})`;
          metadata = { bankName, accountName, accountNumber: recipient, refId: txRefId };
        } else if (type === 'international') {
          description = `International transfer to ${country} (${currency.symbol}${parsedSendAmount.toLocaleString()} ${currency.code})`;
          metadata = { iban, swift, country, bankName, refId: txRefId };
        } else if (type === 'thirdparty') {
          description = `${thirdPartyApp.charAt(0).toUpperCase() + thirdPartyApp.slice(1)} transfer to ${recipient} (${currency.symbol}${parsedSendAmount.toLocaleString()} ${currency.code})`;
          metadata = { app: thirdPartyApp, recipient, refId: txRefId };
        }

        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          type: 'send',
          transferType: type,
          amount: parsedSendAmount,
          currency: currency.code,
          status: 'completed',
          description,
          metadata,
          note: note,
          timestamp: new Date().toISOString(),
          createdAt: serverTimestamp()
        });

        setCompletedTransfer({
          recipientName: type === 'local' ? accountName : recipient,
          recipientEmail: recipient,
          sentAmount: parsedSendAmount,
          senderCurrency: currency,
          receivedAmount: parsedSendAmount,
          recipientCurrency: currency,
          rate: 1,
          type: type,
          refId: txRefId,
          note: note
        });
      }

      await refreshUserData();
      setShowApprovalModal(false);
      setSuccess(true);
      setAmount('');
      setRecipient('');
      setNote('');
      setBankName('');
      setAccountName('');
      setIban('');
      setSwift('');
      setCountry('');
      setVerifiedRecipient(null);
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

  if (success && completedTransfer) {
    return (
      <BankingFeaturePage 
        title="Transfer Receipt" 
        description="Your transfer has been processed and delivered"
        icon={Receipt}
      >
        <div className="max-w-xl mx-auto py-6">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-500/10 rounded-full blur-3xl" />
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mx-auto mb-4 shadow-lg shadow-green-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full">
                {completedTransfer.type === 'beehive' ? 'Instant Beehive Transfer Completed' : 'External Transfer Submitted'}
              </span>
              <h2 className="text-2xl font-black mt-2 text-gray-900 dark:text-white tracking-tight">
                {completedTransfer.senderCurrency.symbol}{completedTransfer.sentAmount.toLocaleString()} {completedTransfer.senderCurrency.code} Sent
              </h2>
              <p className="text-xs text-gray-500 mt-1">Ref ID: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{completedTransfer.refId}</span></p>
            </div>

            {/* Transfer Breakdown Card */}
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800 space-y-4 mb-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Recipient</span>
                <span className="font-black text-gray-900 dark:text-white text-right">
                  {completedTransfer.recipientName}
                  <span className="block text-[10px] text-gray-400 font-medium">{completedTransfer.recipientEmail}</span>
                </span>
              </div>

              <div className="h-px bg-gray-200 dark:bg-zinc-700/50" />

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider">You Paid</span>
                <span className="font-black text-gray-900 dark:text-white">
                  {completedTransfer.senderCurrency.symbol}{completedTransfer.sentAmount.toLocaleString()} {completedTransfer.senderCurrency.code}
                </span>
              </div>

              {completedTransfer.type === 'beehive' && completedTransfer.recipientCurrency.code !== completedTransfer.senderCurrency.code && (
                <>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Exchange Rate</span>
                    <span className="font-mono text-accent font-bold">
                      1 {completedTransfer.senderCurrency.code} = {completedTransfer.rate.toFixed(4)} {completedTransfer.recipientCurrency.code}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Recipient Received</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {completedTransfer.recipientCurrency.symbol}{completedTransfer.receivedAmount.toLocaleString()} {completedTransfer.recipientCurrency.code}
                    </span>
                  </div>
                </>
              )}

              {completedTransfer.note && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-wider">Note</span>
                  <span className="text-gray-600 dark:text-gray-300 italic">"{completedTransfer.note}"</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Fee</span>
                <span className="text-accent font-black">Free ($0.00)</span>
              </div>
            </div>

            {/* External/Third-Party/Bank Transfer Support Notice */}
            {completedTransfer.type !== 'beehive' && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-amber-800 dark:text-amber-300">
                      External Transfer Processing Notice
                    </p>
                    <p className="text-gray-600 dark:text-zinc-300 leading-relaxed">
                      External network settlements (Local bank, International SWIFT/IBAN, or Third-Party Wallets) typically process within a few minutes. 
                      <strong className="text-gray-900 dark:text-white font-semibold"> If the recipient does not see the money credited afterwards, please contact Customer Support or your Account Manager immediately with your Reference ID ({completedTransfer.refId}).</strong>
                    </p>
                    <div className="pt-2">
                      <Link 
                        to="/dashboard/chat" 
                        className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-accent hover:underline"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Contact Customer Support
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button 
                onClick={() => {
                  setSuccess(false);
                  setCompletedTransfer(null);
                }}
                className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-accent/20"
              >
                Send Another Transfer
              </button>
            </div>
          </motion.div>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Transfer Funds" 
      description="Send money directly to Beehive members with automatic currency conversion"
      icon={ArrowUpCircle}
    >
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Transfer Type Selection */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TypeButton 
              active={type === 'beehive'} 
              onClick={() => {
                setType('beehive');
                setError('');
              }} 
              icon={<User className="w-5 h-5" />} 
              label="Beehive Member" 
              badge="Instant & Converted"
            />
            <TypeButton 
              active={type === 'local'} 
              onClick={() => {
                setType('local');
                setError('');
              }} 
              icon={<Landmark className="w-5 h-5" />} 
              label="Local Bank" 
            />
            <TypeButton 
              active={type === 'international'} 
              onClick={() => {
                setType('international');
                setError('');
              }} 
              icon={<Globe className="w-5 h-5" />} 
              label="International" 
            />
            <TypeButton 
              active={type === 'thirdparty'} 
              onClick={() => {
                setType('thirdparty');
                setError('');
              }} 
              icon={<Smartphone className="w-5 h-5" />} 
              label="Apps & Wallets" 
            />
          </div>

          <form onSubmit={handleInitiateTransfer} className="space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-red-200 dark:border-red-800/40">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black tracking-tight dark:text-white uppercase">
                  {type === 'beehive' ? 'Recipient Beehive Member' : 'Recipient Information'}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full">
                  {type === 'beehive' ? 'Internal Instant Transfer' : type === 'local' ? 'Local Bank' : type === 'international' ? 'SWIFT / IBAN' : 'Third-Party'}
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
                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="email" 
                          required
                          placeholder="Enter recipient's Beehive email address" 
                          className={`input-field pl-12 pr-12 py-4 ${verifiedRecipient ? 'border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/30' : ''}`}
                          value={recipient}
                          onChange={(e) => {
                            setRecipient(e.target.value);
                            setError('');
                          }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {isVerifyingRecipient ? (
                            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          ) : verifiedRecipient ? (
                            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-sm">
                              <Check className="w-4 h-4" />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Verified Recipient Card */}
                      {verifiedRecipient && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center uppercase shadow-sm">
                              {verifiedRecipient.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                  {verifiedRecipient.fullName}
                                </p>
                                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                  <UserCheck className="w-3 h-3" /> Verified Member
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500">{verifiedRecipient.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-widest">Account Currency</span>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              {verifiedRecipient.currency.symbol} {verifiedRecipient.currency.code}
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {/* Recipient Lookup Error */}
                      {recipientLookupError && (
                        <p className="text-xs text-red-500 font-bold flex items-center gap-1.5 px-1">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {recipientLookupError}
                        </p>
                      )}

                      {!verifiedRecipient && !recipientLookupError && !isVerifyingRecipient && (
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 px-1">
                          <Info className="w-3.5 h-3.5" />
                          Type the exact email address the receiver registered with on Beehive.
                        </p>
                      )}
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
                        {(['paypal', 'zelle', 'cashapp', 'venmo', 'payoneer', 'wise', 'skrill', 'westernunion', 'moneygram'] as ThirdPartyApp[]).map((app) => (
                          <AppButton 
                            key={app}
                            active={thirdPartyApp === app} 
                            onClick={() => setThirdPartyApp(app)} 
                            label={app === 'paypal' ? 'PayPal' : app === 'cashapp' ? 'CashApp' : app === 'westernunion' ? 'Western Union' : app.charAt(0).toUpperCase() + app.slice(1)} 
                          />
                        ))}
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

              {/* Amount & Conversion Section */}
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black tracking-tight dark:text-white uppercase">Amount & Details</h3>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Amount to Send ({currency.code})
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400">{currency.symbol}</span>
                    <input 
                      type="number" 
                      required
                      min="0.01"
                      step="any"
                      placeholder="0.00" 
                      className="input-field pl-16 py-5 text-3xl font-black"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400">Available Balance: <span className="font-bold text-gray-700 dark:text-gray-300">{formatAmount(userData?.walletBalance || 0)}</span></p>
                    <p className="text-xs text-accent font-bold">Fee: Free ($0.00)</p>
                  </div>
                </div>

                {/* Real-Time Currency Conversion & Approval Box for Beehive Transfers */}
                {type === 'beehive' && verifiedRecipient && parsedSendAmount > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border border-accent/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" />
                        <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                          Pre-Transfer Conversion Summary
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                        Live Rate Guaranteed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center py-2">
                      <div className="p-3 bg-white/70 dark:bg-zinc-800/70 rounded-xl border border-gray-200/50 dark:border-zinc-700/50">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">You Send ({currency.code})</span>
                        <span className="text-sm font-black text-gray-900 dark:text-white">
                          {currency.symbol}{parsedSendAmount.toLocaleString()} {currency.code}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="p-2 rounded-full bg-accent/10 text-accent mb-1">
                          <ArrowRightLeft className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400">
                          1 {currency.code} = {liveExchangeRate.toFixed(4)} {verifiedRecipient.currency.code}
                        </span>
                      </div>

                      <div className="p-3 bg-emerald-500/15 rounded-xl border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Recipient Gets ({verifiedRecipient.currency.code})</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {verifiedRecipient.currency.symbol}{recipientEstimatedAmount.toLocaleString()} {verifiedRecipient.currency.code}
                        </span>
                      </div>
                    </div>

                    {isDifferentCurrency ? (
                      <p className="text-[11px] text-gray-500 leading-tight">
                        <span className="font-bold text-gray-700 dark:text-gray-300">{verifiedRecipient.fullName}</span>'s account is set to <span className="font-bold">{verifiedRecipient.currency.name} ({verifiedRecipient.currency.code})</span>. Funds will be converted instantly upon approval with zero conversion fee.
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-500 leading-tight">
                        Same currency transfer. Funds will be credited directly to <span className="font-bold text-gray-700 dark:text-gray-300">{verifiedRecipient.fullName}</span>'s wallet.
                      </p>
                    )}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Note or Reason (Optional)</label>
                  <textarea 
                    placeholder="What's this transfer for?" 
                    className="input-field py-3 h-20 resize-none text-xs"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !amount || parsedSendAmount <= 0 || (type === 'beehive' && (!verifiedRecipient || isVerifyingRecipient))}
                  className="btn-primary w-full py-5 text-lg shadow-xl shadow-accent/20 flex items-center justify-center gap-3 font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowUpCircle className="w-6 h-6" />
                      {type === 'beehive' 
                        ? `Review & Send ${formatAmount(parsedSendAmount)}`
                        : `Send ${formatAmount(parsedSendAmount)}`}
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
                <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">Recent Recipients</h3>
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
            
            <div className="space-y-3">
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
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center font-black text-xs uppercase flex-shrink-0">
                      {rec.recipient.charAt(0) || rec.description.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black dark:text-white truncate uppercase tracking-tight">
                        {rec.recipient || rec.description}
                      </p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">
                        {rec.type === 'beehive' ? 'Beehive Member' : rec.type}
                      </p>
                    </div>
                    <ArrowUpCircle className="w-4 h-4 text-gray-300 group-hover:text-accent transition-colors" />
                  </button>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No recent transfers</p>
                </div>
              )}
            </div>
          </div>

          {/* Security Info */}
          <div className="space-y-3">
            <SecurityCard 
              icon={<ShieldCheck className="w-5 h-5 text-green-500" />}
              title="End-to-End Encrypted"
              desc="Transfers are protected with military-grade financial encryption."
            />
            <SecurityCard 
              icon={<Sparkles className="w-5 h-5 text-accent" />}
              title="Automated FX Conversion"
              desc="Send in your local currency; receivers receive funds in their own currency instantly."
            />
            <SecurityCard 
              icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />}
              title="Zero Transfer Fees"
              desc="All internal Beehive member-to-member transfers are 100% free."
            />
          </div>
        </div>
      </div>

      {/* Transfer Approval & Confirmation Modal */}
      <AnimatePresence>
        {showApprovalModal && verifiedRecipient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowApprovalModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-accent/10 text-accent">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black dark:text-white tracking-tight">Approve Transfer</h3>
                  <p className="text-xs text-gray-500">Please review and confirm your transfer details</p>
                </div>
              </div>

              {/* Recipient summary */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800 flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-accent text-white font-black text-sm flex items-center justify-center uppercase">
                  {verifiedRecipient.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                      {verifiedRecipient.fullName}
                    </p>
                    <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{verifiedRecipient.email}</p>
                </div>
              </div>

              {/* Conversion Breakdown */}
              <div className="space-y-3 p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800/80 dark:to-zinc-800/40 border border-gray-200/60 dark:border-zinc-700/60 mb-6 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Debit from Your Wallet</span>
                  <span className="font-black text-gray-900 dark:text-white text-sm">
                    {currency.symbol}{parsedSendAmount.toLocaleString()} {currency.code}
                  </span>
                </div>

                {isDifferentCurrency && (
                  <>
                    <div className="flex justify-between items-center text-gray-500">
                      <span className="font-bold uppercase tracking-wider">FX Exchange Rate</span>
                      <span className="font-mono font-bold text-accent">
                        1 {currency.code} = {liveExchangeRate.toFixed(4)} {verifiedRecipient.currency.code}
                      </span>
                    </div>
                    <div className="h-px bg-gray-200 dark:bg-zinc-700/60" />
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-black text-sm">
                      <span className="uppercase tracking-wider">Recipient Credited</span>
                      <span>
                        {verifiedRecipient.currency.symbol}{recipientEstimatedAmount.toLocaleString()} {verifiedRecipient.currency.code}
                      </span>
                    </div>
                  </>
                )}

                {note && (
                  <div className="flex justify-between items-center text-gray-500 pt-1">
                    <span className="font-bold uppercase tracking-wider">Note</span>
                    <span className="italic">"{note}"</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-gray-500 pt-1">
                  <span className="font-bold uppercase tracking-wider">Network Fee</span>
                  <span className="text-accent font-black">Free ($0.00)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="btn-secondary py-4 text-xs font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeTransfer}
                  disabled={loading}
                  className="btn-primary py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Approve & Send
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </BankingFeaturePage>
  );
};

const TypeButton = ({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: string }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`p-4 rounded-2xl font-bold flex flex-col items-center gap-2 transition-all border-2 relative ${
      active 
        ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' 
        : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-gray-400 hover:border-accent/30'
    }`}
  >
    {icon}
    <span className="text-[10px] uppercase tracking-widest">{label}</span>
    {badge && active && (
      <span className="text-[8px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </button>
);

const AppButton = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`flex-1 py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
      active 
        ? 'bg-white dark:bg-zinc-700 text-accent shadow-sm' 
        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
    }`}
  >
    {label}
  </button>
);

const SecurityCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 flex flex-col items-center text-center gap-2">
    {icon}
    <h4 className="text-xs font-black uppercase tracking-widest dark:text-white">{title}</h4>
    <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
  </div>
);
