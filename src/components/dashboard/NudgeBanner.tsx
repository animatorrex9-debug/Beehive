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
    switch (status) {
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
          message: "Step 2 of 4: Bank verification in progress. Please wait for confirmation.",
          action: null,
          buttonText: "View Status"
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
      default:
        return null;
    }
  };

  const content = getBannerContent();
  if (!content) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-4 bg-green-50 dark:bg-green-500/10 border-2 border-green-200 dark:border-green-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <p className="text-sm font-bold text-green-800 dark:text-green-300 leading-tight">
          {content.message}
        </p>
      </div>
      
      <button 
        onClick={() => content.action?.()}
        className="btn-primary whitespace-nowrap flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-accent/20"
      >
        {content.buttonText}
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
