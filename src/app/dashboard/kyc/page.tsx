import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Briefcase, 
  FileText, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const STEPS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'review', label: 'Review', icon: CheckCircle },
];

export const KYCPage = () => {
  const { user, userData, reloadUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: userData?.fullName || '',
    dob: userData?.dob || '',
    address: userData?.address || '',
    stateOfOrigin: userData?.stateOfOrigin || '',
    maritalStatus: userData?.maritalStatus || '',
    employmentStatus: userData?.employmentStatus || '',
    employerName: userData?.employerName || '',
    jobTitle: userData?.jobTitle || '',
    monthlyIncome: userData?.monthlyIncome || '',
    nationalIdNumber: userData?.nationalIdNumber || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Update user document
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        kycStatus: 'pending',
        kycSubmittedAt: new Date().toISOString(),
      });

      // Note: Admin notification removed from root collection to avoid permission errors.
      // The Admin Panel already listens for users with 'pending' kycStatus.

      await reloadUser();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error submitting KYC:', err);
      setError(err.message || 'Failed to submit KYC. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Full Name</label>
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Date of Birth</label>
                <input 
                  type="date" 
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Home Address</label>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter your full home address"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">State of Origin</label>
                <input 
                  type="text" 
                  name="stateOfOrigin"
                  value={formData.stateOfOrigin}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter your state of origin"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Marital Status</label>
                <select 
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
            </div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Employment Status</label>
                <select 
                  name="employmentStatus"
                  value={formData.employmentStatus}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Status</option>
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="business-owner">Business Owner</option>
                  <option value="unemployed">Unemployed</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Employer Name</label>
                <input 
                  type="text" 
                  name="employerName"
                  value={formData.employerName}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Company Name"
                  required={formData.employmentStatus === 'employed'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Job Title</label>
                <input 
                  type="text" 
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="e.g. Software Engineer"
                  required={formData.employmentStatus === 'employed'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Monthly Income</label>
                <input 
                  type="text" 
                  name="monthlyIncome"
                  value={formData.monthlyIncome}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="e.g. $5,000"
                  required
                />
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-accent/5 border border-accent/10 flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-accent shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-accent uppercase tracking-tighter mb-1">Identity Verification</h4>
                  <p className="text-sm text-accent/70">Please provide your National Identification Number for verification. Photo upload is optional at this stage.</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">National ID Number</label>
                <input 
                  type="text" 
                  name="nationalIdNumber"
                  value={formData.nationalIdNumber}
                  onChange={handleInputChange}
                  className="input-field text-2xl font-black tracking-widest"
                  placeholder="0000 0000 000"
                  required
                />
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-100/50 dark:bg-zinc-800/50">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Review Your Information</h4>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Full Name</p>
                    <p className="font-bold dark:text-white">{formData.fullName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Date of Birth</p>
                    <p className="font-bold dark:text-white">{formData.dob}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Address</p>
                    <p className="font-bold dark:text-white">{formData.address}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Employment</p>
                    <p className="font-bold dark:text-white uppercase">{formData.employmentStatus}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Monthly Income</p>
                    <p className="font-bold dark:text-white">{formData.monthlyIncome}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">National ID</p>
                    <p className="font-bold dark:text-white tracking-widest">{formData.nationalIdNumber}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-500/5 border border-yellow-100 dark:border-yellow-500/20 rounded-2xl">
              <input type="checkbox" className="mt-1" required />
              <p className="text-xs text-yellow-800 dark:text-yellow-400 font-bold leading-relaxed">
                I hereby certify that the information provided above is true and accurate to the best of my knowledge. I understand that providing false information may lead to rejection of my application.
              </p>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white uppercase mb-1">KYC Verification</h2>
          <p className="text-gray-500">Complete your identity verification to access all features.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                idx <= currentStep ? 'bg-accent text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'
              }`}>
                <step.icon className="w-4 h-4" />
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${
                  idx < currentStep ? 'bg-accent' : 'bg-gray-100 dark:bg-zinc-800'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="card p-8">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 text-sm font-bold">
            {error}
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-zinc-800 flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0 || isSubmitting}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${
              currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep === STEPS.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary px-10 py-3 rounded-2xl text-sm flex items-center gap-2 shadow-xl shadow-accent/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Verification
                  <CheckCircle className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="btn-primary px-10 py-3 rounded-2xl text-sm flex items-center gap-2 shadow-xl shadow-accent/20"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default KYCPage;
