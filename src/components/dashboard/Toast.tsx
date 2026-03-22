import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, CheckCircle, AlertCircle } from 'lucide-react';

interface ToastProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  } | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Wait for exit animation
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto"
            onClick={() => setVisible(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-950 border-2 border-accent/20 dark:border-accent/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 flex flex-col items-center text-center gap-6 pointer-events-auto"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center shadow-inner">
              {React.cloneElement(getIcon() as React.ReactElement<{ className?: string }>, { className: "w-8 h-8" })}
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black dark:text-white uppercase tracking-tighter">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {notification.message}
              </p>
            </div>
            <button 
              onClick={() => setVisible(false)}
              className="w-full btn-primary py-4 rounded-2xl text-xs font-black uppercase tracking-widest"
            >
              Dismiss
            </button>
            <button 
              onClick={() => setVisible(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
