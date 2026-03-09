import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

export const DashboardLayout: React.FC = () => {
  const { user } = useAuth();
  const [activeLoan, setActiveLoan] = useState<any>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    // Fetch active loan for status indicators
    const q = query(
      collection(db, 'loans'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const unsubscribeLoans = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveLoan(snapshot.docs[0].data());
      } else {
        setActiveLoan(null);
      }
    });

    // Fetch unread messages count (mock for now or implement if chat exists)
    // For now, let's just set it to 0
    setUnreadMessages(0);

    return () => {
      unsubscribeLoans();
    };
  }, [user]);

  const loanStatusActionRequired = ['approved', 'pin_sent'].includes(activeLoan?.status);
  const isLoanDisbursed = activeLoan?.status === 'disbursed';

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-primary">
      <Sidebar 
        loanStatusActionRequired={loanStatusActionRequired}
        unreadMessages={unreadMessages}
        isLoanDisbursed={isLoanDisbursed}
      />
      
      <div className="flex-grow flex flex-col min-w-0">
        <Header />
        
        <main className="flex-grow p-4 sm:p-6 lg:p-10 pb-24 lg:pb-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ activeLoan }} />
          </div>
        </main>
      </div>

      <MobileNav 
        loanStatusActionRequired={loanStatusActionRequired}
        unreadMessages={unreadMessages}
      />
    </div>
  );
};
