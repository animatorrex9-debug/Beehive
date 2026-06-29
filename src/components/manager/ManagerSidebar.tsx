import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  LogOut,
  User,
  Settings
} from 'lucide-react';
import { Logo } from '../Logo';
import { ThemeToggle } from '../ThemeToggle';
import { auth } from '../../lib/supabase-service';
import { useAuth } from '../../hooks/useAuth';

export const ManagerSidebar: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/auth/login');
  };

  const navItems = [
    { to: '/manager', icon: LayoutDashboard, label: 'Overview' },
    { to: '/manager/chat', icon: MessageSquare, label: 'Chat' },
  ];

  return (
    <aside className="w-72 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-primary p-6 hidden lg:flex flex-col h-screen sticky top-0">
      <div className="mb-10">
        <Logo className="h-8" />
      </div>

      {/* User Profile Section */}
      <div className="mb-8 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <User className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-sm truncate dark:text-white">
              {userData?.fullName || user?.email?.split('@')[0]}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-accent/10 text-accent border-accent/20">
                Manager
              </span>
            </div>
          </div>
        </div>
      </div>

      <nav className="space-y-1 flex-grow overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/manager'}
            className={({ isActive }) => `
              relative flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all
              ${isActive 
                ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
              }
            `}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="pt-6 mt-6 border-t border-gray-100 dark:border-zinc-800 space-y-2">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Theme</span>
          <ThemeToggle />
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
};
