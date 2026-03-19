import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Settings, UserPlus, LogIn, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export const DebugControls = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAdmin, reloadUser } = useAuth();
  const navigate = useNavigate();
  const [isPromoting, setIsPromoting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const promoteToAdmin = async () => {
    if (!user) return;
    setIsPromoting(true);
    setMessage(null);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'admin'
      });
      await reloadUser();
      setMessage('User promoted to Admin! You can now access the admin panel.');
    } catch (err) {
      console.error('Error promoting user:', err);
      setMessage('Failed to promote user. Make sure you are logged in.');
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 p-4 w-64 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Settings className="w-3 h-3" />
                Debug Controls
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {message && (
                <div className={`p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider mb-2 ${
                  message.includes('Failed') ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                }`}>
                  {message}
                </div>
              )}
              <button
                onClick={() => {
                  navigate('/admin/login');
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 hover:bg-accent hover:text-white transition-all group"
              >
                <div className="flex items-center gap-3">
                  <LogIn className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Admin Login</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {user && !isAdmin && (
                <button
                  onClick={promoteToAdmin}
                  disabled={isPromoting}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isPromoting ? 'Promoting...' : 'Make Me Admin'}
                    </span>
                  </div>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    navigate('/admin');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Admin Panel</span>
                  </div>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            <p className="mt-4 text-[10px] text-gray-400 font-medium text-center italic">
              Visible only during development
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen 
            ? 'bg-zinc-900 text-white rotate-90' 
            : 'bg-accent text-white hover:scale-110 active:scale-95'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
      </button>
    </div>
  );
};
