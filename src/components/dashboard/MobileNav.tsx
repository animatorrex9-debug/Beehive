import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  CheckCircle, 
  MessageSquare, 
  History
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface MobileNavProps {
  loanStatusActionRequired?: boolean;
  unreadMessages?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({ 
  loanStatusActionRequired, 
  unreadMessages = 0 
}) => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const kycStatus = userData?.kycStatus || 'unverified';

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { 
      to: '/dashboard/loan-application', 
      icon: FileText, 
      label: 'Apply',
      onClick: (e: React.MouseEvent) => {
        if (kycStatus !== 'verified') {
          e.preventDefault();
          alert('Please complete your Identity Verification (KYC) before applying for a loan.');
          navigate('/dashboard/kyc');
        }
      }
    },
    { 
      to: '/dashboard/loan-status', 
      icon: CheckCircle, 
      label: 'Status',
      badge: loanStatusActionRequired ? <span className="absolute top-2 right-4 w-2 h-2 bg-green-500 rounded-full animate-pulse" /> : null
    },
    { 
      to: '/dashboard/chat', 
      icon: MessageSquare, 
      label: 'Chat',
      badge: unreadMessages > 0 ? (
        <span className="absolute top-1 right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {unreadMessages}
        </span>
      ) : null
    },
    { to: '/dashboard/history', icon: History, label: 'History' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-gray-200 dark:border-zinc-800 px-2 py-2 flex justify-around items-center z-50 pb-safe">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/dashboard'}
          onClick={item.onClick}
          className={({ isActive }) => `
            relative flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all
            ${isActive 
              ? 'text-accent' 
              : 'text-gray-400 dark:text-gray-500'
            }
          `}
        >
          <item.icon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          {item.badge}
        </NavLink>
      ))}
    </nav>
  );
};
