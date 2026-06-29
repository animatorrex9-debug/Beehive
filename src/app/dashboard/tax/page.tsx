import React, { useState } from 'react';
import { FileCheck, Send, CheckCircle2, AlertCircle, Calculator, Info, ShieldCheck } from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { useCurrency } from '../../../hooks/useCurrency';
import { db } from '../../../lib/supabase-service';
import { collection, addDoc } from 'supabase/db';

export const TaxPage = () => {
  const { user, userData } = useAuth();
  const { currency, formatAmount } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    taxYear: '2023',
    income: '',
    deductions: '',
    filingStatus: 'single'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'tax_filings'), {
        userId: user.uid,
        ...formData,
        currency: userData?.currency?.code || currency.code || 'USD',
        status: 'processing',
        timestamp: new Date().toISOString()
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Tax filing error:', err);
      setError('Failed to submit tax filing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <BankingFeaturePage title="Tax Refunds" description="Filing Submitted" icon={FileCheck}>
        <div className="max-w-md mx-auto text-center space-y-6 py-12">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white">FILING SUCCESSFUL</h2>
          <p className="text-gray-500">Your tax refund application has been received. We are processing your request with the relevant authorities. You will be notified once your refund is ready.</p>
          <button onClick={() => setSuccess(false)} className="btn-primary w-full py-4">File for Another Year</button>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Tax Refunds" 
      description="File your taxes and get your refunds faster with Beehive"
      icon={FileCheck}
    >
      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Tax Year</label>
                <select 
                  value={formData.taxYear}
                  onChange={(e) => setFormData({ ...formData, taxYear: e.target.value })}
                  className="w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white"
                  required
                >
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                  <option value="2021">2021</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Filing Status</label>
                <select 
                  value={formData.filingStatus}
                  onChange={(e) => setFormData({ ...formData, filingStatus: e.target.value })}
                  className="w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white"
                  required
                >
                  <option value="single">Single</option>
                  <option value="married_joint">Married Filing Jointly</option>
                  <option value="head_household">Head of Household</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Annual Income ({currency.code})</label>
                <input 
                  type="number"
                  value={formData.income}
                  onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                  placeholder="e.g. 65000"
                  className="w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Deductions ({currency.code})</label>
                <input 
                  type="number"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                  placeholder="e.g. 12000"
                  className="w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex gap-4">
              <Calculator className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-blue-900 dark:text-blue-100">Estimated Refund</h4>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {formatAmount(Math.max(0, (Number(formData.income) * 0.1) - (Number(formData.deductions) * 0.05)))}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">This is a rough estimate based on the provided information.</p>
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
              <Send className="w-5 h-5" /> {loading ? 'Filing...' : 'File for Refund'}
            </button>
          </form>
        </div>

        <div className="space-y-8">
          <h3 className="text-2xl font-black tracking-tighter dark:text-white">WHY FILE WITH BEEHIVE?</h3>
          <div className="space-y-6">
            <Feature 
              icon={<ShieldCheck className="text-green-500" />}
              title="Secure & Private"
              description="Your tax data is encrypted and handled with the highest security standards."
            />
            <Feature 
              icon={<Info className="text-blue-500" />}
              title="Expert Review"
              description="Every filing is reviewed by our automated systems to ensure accuracy."
            />
            <Feature 
              icon={<CheckCircle2 className="text-accent" />}
              title="Fast Payouts"
              description="Get your refund deposited directly into your Beehive wallet within days."
            />
          </div>

          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700">
            <p className="text-xs text-gray-500 leading-relaxed">
              Beehive is an authorized tax filing partner. We do not provide legal or professional tax advice. Please consult with a tax professional for complex situations.
            </p>
          </div>
        </div>
      </div>
    </BankingFeaturePage>
  );
};

const Feature = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex gap-4">
    <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center justify-center flex-shrink-0 shadow-sm">
      {icon}
    </div>
    <div>
      <h4 className="font-bold dark:text-white">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
);
