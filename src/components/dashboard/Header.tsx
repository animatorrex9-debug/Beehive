import React from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { NotificationCenter } from './NotificationCenter';
import { useAuth } from '../../hooks/useAuth';

import { LogOut } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await auth.signOut();
    navigate('/auth/login');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="h-24 border-b border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-primary/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-black tracking-tighter dark:text-white uppercase lg:hidden py-2">
          Dashboard
        </h1>
        <div className="hidden lg:block">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            {getGreeting()}
          </p>
          <h2 className="text-lg font-black tracking-tight dark:text-white">
            Welcome back, {userData?.fullName?.split(' ')[0] || user?.email?.split('@')[0]}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />
        <div className="w-px h-6 bg-gray-200 dark:bg-zinc-800 mx-1 sm:mx-2" />
        <NotificationCenter />
        <button 
          onClick={handleLogout}
          className="lg:hidden p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
