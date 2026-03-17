import React, { useState } from 'react';
import { Award, Send, CheckCircle2, AlertCircle, FileText, Briefcase, GraduationCap, Users } from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const GrantsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    type: 'business',
    amount: '',
    purpose: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'grants'), {
        userId: user.uid,
        ...formData,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Grant application error:', err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <BankingFeaturePage title="Grants" description="Application Submitted" icon={Award}>
        <div className="max-w-md mx-auto text-center space-y-6 py-12">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white">APPLICATION RECEIVED</h2>
          <p className="text-gray-500">Your grant application has been submitted successfully. Our team will review it and get back to you within 5-7 business days.</p>
          <button onClick={() => setSuccess(false)} className="btn-primary w-full py-4">Apply for Another Grant</button>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Grants" 
      description="Apply for business, education, and community grants"
      icon={Award}
    >
      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Grant Type</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white"
                  required
                >
                  <option value="business">Business Expansion</option>
                  <option value="education">Education & Research</option>
                  <option value="community">Community Development</option>
                  <option value="innovation">Tech Innovation</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Requested Amount (USD)</label>
                <input 
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. 5000"
                  className="w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Purpose of Grant</label>
              <input 
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="Briefly state the main goal"
                className="w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Detailed Description</label>
              <textarea 
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain how this grant will help you achieve your goals..."
                className="w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white"
                required
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
              className="btn-primary w-full py-4 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" /> {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>

        <div className="space-y-8">
          <h3 className="text-2xl font-black tracking-tighter dark:text-white">AVAILABLE PROGRAMS</h3>
          <div className="space-y-4">
            <GrantProgram 
              icon={<Briefcase className="text-blue-500" />}
              title="SME Growth Fund"
              amount="Up to $25,000"
            />
            <GrantProgram 
              icon={<GraduationCap className="text-purple-500" />}
              title="Academic Excellence"
              amount="Up to $10,000"
            />
            <GrantProgram 
              icon={<Users className="text-green-500" />}
              title="Social Impact"
              amount="Up to $15,000"
            />
          </div>

          <div className="p-6 rounded-2xl bg-accent/10 border border-accent/20">
            <h4 className="font-bold text-accent mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Eligibility Check
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ensure your profile is fully verified (KYC Level 2) before applying to increase your chances of approval.
            </p>
          </div>
        </div>
      </div>
    </BankingFeaturePage>
  );
};

const GrantProgram = ({ icon, title, amount }: { icon: React.ReactNode, title: string, amount: string }) => (
  <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h4 className="font-bold dark:text-white">{title}</h4>
      <p className="text-xs text-gray-500">{amount}</p>
    </div>
  </div>
);
