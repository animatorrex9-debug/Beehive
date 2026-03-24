import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ManagerSidebar } from './ManagerSidebar';
import { ManagerMobileNav } from './ManagerMobileNav';
import { Header } from '../dashboard/Header';
import { Toast } from '../dashboard/Toast';
import { useAuth } from '../../hooks/useAuth';

export const ManagerLayout: React.FC = () => {
  const { user } = useAuth();
  const [latestNotification, setLatestNotification] = React.useState<any>(null);
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-primary">
      <ManagerSidebar />
      
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        
        <main className="flex-grow flex flex-col min-h-0">
          <div className={`flex-grow ${location.pathname.includes('/chat') ? 'overflow-hidden' : 'overflow-y-auto'} p-4 sm:p-6 lg:p-10 pb-24 lg:pb-20`}>
            <div className={`flex-grow flex flex-col min-h-0 w-full max-w-[1600px] mx-auto ${location.pathname.includes('/chat') ? 'h-full' : ''}`}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      <Toast 
        notification={latestNotification} 
        onClose={() => setLatestNotification(null)} 
      />

      <ManagerMobileNav />
    </div>
  );
};
