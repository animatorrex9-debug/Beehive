import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface BankingFeaturePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}

export const BankingFeaturePage: React.FC<BankingFeaturePageProps> = ({ title, description, icon: Icon, children }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter dark:text-white uppercase">{title}</h1>
          <p className="text-gray-500">{description}</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-4 sm:p-8 md:p-12 min-h-[400px] flex flex-col"
      >
        {children || (
          <div className="flex-grow flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
              <Icon className="w-12 h-12 text-gray-300 dark:text-zinc-700" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black dark:text-white">COMING SOON</h2>
              <p className="text-gray-500 max-w-sm mx-auto">
                We're working hard to bring the {title.toLowerCase()} feature to Beehive. 
                Stay tuned for updates!
              </p>
            </div>
            <button className="btn-primary px-8 py-3">Notify Me</button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
