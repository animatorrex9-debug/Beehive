import React from 'react';
import { Outlet } from 'react-router-dom';
import { ManagerSidebar } from './ManagerSidebar';
import { ManagerMobileNav } from './ManagerMobileNav';
import { Header } from '../dashboard/Header';
import { Toast } from '../dashboard/Toast';
import { useAuth } from '../../hooks/useAuth';

export const ManagerLayout: React.FC = () => {
  const { user } = useAuth();
  const [latestNotification, setLatestNotification] = React.useState<any>(null);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-primary">
      <ManagerSidebar />
      
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        
        <main className="flex-grow flex flex-col min-h-0 overflow-hidden">
          <div className="flex-grow flex flex-col min-h-0 w-full max-w-[1600px] mx-auto">
            <Outlet />
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
