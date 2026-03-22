import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
} from 'lucide-react';

export const ManagerMobileNav: React.FC = () => {
  const navItems = [
    { to: '/manager', icon: LayoutDashboard, label: 'Overview' },
    { to: '/manager/chat', icon: MessageSquare, label: 'Chat' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-gray-200 dark:border-zinc-800 px-2 py-2 flex justify-around items-center z-50 pb-safe">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/manager'}
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
        </NavLink>
      ))}
    </nav>
  );
};
