import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  CheckCircle, 
  MessageSquare, 
  Calendar, 
  History, 
  LogOut,
  User,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  TrendingUp,
  Heart,
  FileCheck,
  Award,
  RefreshCw,
  Wallet,
  Settings
} from 'lucide-react';
import { Logo } from '../Logo';
import { ThemeToggle } from '../ThemeToggle';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  loanStatusActionRequired?: boolean;
  unreadMessages?: number;
  isLoanDisbursed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  loanStatusActionRequired, 
  unreadMessages = 0,
  isLoanDisbursed = false
}) => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/auth/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/accounts', icon: Wallet, label: 'Accounts & Balance' },
    { to: '/dashboard/deposit', icon: ArrowDownCircle, label: 'Deposit Money' },
    { to: '/dashboard/send', icon: ArrowUpCircle, label: 'Send Money' },
    { to: '/dashboard/cards', icon: CreditCard, label: 'Virtual Cards' },
    { to: '/dashboard/invest', icon: TrendingUp, label: 'Invest' },
    { to: '/dashboard/swap', icon: RefreshCw, label: 'Currency Swap' },
    { to: '/dashboard/charity', icon: Heart, label: 'Donate to Charity' },
    { to: '/dashboard/grants', icon: Award, label: 'Grants' },
    { to: '/dashboard/loan-application', icon: FileText, label: 'Loan Application' },
    { 
      to: '/dashboard/loan-status', 
      icon: CheckCircle, 
      label: 'Loan Status',
      badge: loanStatusActionRequired ? <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-pulse" /> : null
    },
    { 
      to: '/dashboard/chat', 
      icon: MessageSquare, 
      label: 'Account Manager',
      badge: unreadMessages > 0 ? (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {unreadMessages}
        </span>
      ) : null
    },
    { 
      to: '/dashboard/repayment', 
      icon: Calendar, 
      label: 'Repayment Schedule',
      locked: !isLoanDisbursed
    },
    { to: '/dashboard/history', icon: History, label: 'Loan History' },
    { to: '/dashboard/settings', icon: Settings, label: 'Profile Settings' },
  ];

  const kycStatus = userData?.kycStatus || 'unverified';

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
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                kycStatus === 'verified' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
                kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20' :
                kycStatus === 'rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                'bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:border-zinc-700'
              }`}>
                {kycStatus}
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
            end={item.to === '/dashboard'}
            className={({ isActive }) => `
              relative flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all
              ${isActive 
                ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
              }
              ${item.locked ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
            `}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.label}</span>
            {item.badge}
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
