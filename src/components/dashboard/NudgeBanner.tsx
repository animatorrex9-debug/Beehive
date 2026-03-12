import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NudgeBannerProps {
  status: string;
}

export const NudgeBanner: React.FC<NudgeBannerProps> = ({ status }) => {
  const navigate = useNavigate();

  const getBannerContent = () => {
    if (!status) return null;
    const s = status.toLowerCase();
    switch (s) {
      case 'pending':
        return {
          step: 1,
          message: "Step 1 of 4: Application received! Connect your bank account now to speed up your disbursement.",
          action: () => navigate('/dashboard/loan-status'),
          buttonText: "Connect Bank"
        };
      case 'approved':
        return {
          step: 1,
          message: "Step 1 of 4: Your loan is approved! Connect your bank account to receive your funds.",
          action: () => navigate('/dashboard/loan-status'),
          buttonText: "Connect Bank"
        };
      case 'bank_details_submitted':
        return {
          step: 2,
          message: "Step 2 of 4: Additional verification required. Please provide your IBAN and other details.",
          action: () => navigate('/dashboard/loan-status'),
          buttonText: "Verify Now"
        };
      case 'pin_sent':
        return {
          step: 3,
          message: "Step 3 of 4: A PIN has been sent to you. Click here to enter your PIN.",
          action: () => navigate('/dashboard/loan-status'),
          buttonText: "Enter PIN"
        };
      case 'pin_submitted':
        return {
          step: 4,
          message: "Step 4 of 4: PIN received. Final approval in progress, please wait.",
          action: null,
          buttonText: "View Status"
        };
      case 'rejected':
        return {
          step: 0,
          message: "Your application was rejected. Please check your notifications for details or apply again.",
          action: () => navigate('/dashboard/loan-application'),
          buttonText: "Re-apply"
        };
      default:
        // Fallback for any other non-disbursed status
        return {
          step: 1,
          message: "Application in progress! Connect your bank account now to speed up your disbursement.",
          action: () => navigate('/dashboard/loan-status'),
          buttonText: "Connect Bank"
        };
    }
  };

  const content = getBannerContent();
  if (!content) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 bg-accent/5 dark:bg-accent/10 border border-accent/20 dark:border-accent/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md shadow-accent/5"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-accent/10 dark:bg-accent/20 flex items-center justify-center text-accent shrink-0 border border-accent/10">
          <Info className="w-5 h-5" />
        </div>
        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
          {content.message}
        </p>
      </div>
      
      <button 
        onClick={() => content.action?.()}
        className="bg-accent hover:bg-accent-hover text-white whitespace-nowrap flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/20 active:scale-95"
      >
        {content.buttonText}
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
