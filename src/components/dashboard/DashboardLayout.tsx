import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { collection, query, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { NudgeBanner } from './NudgeBanner';
import { Toast } from './Toast';
import { LoadingLogo } from '../LoadingLogo';

export const DashboardLayout: React.FC = () => {
  const { user, userData, activeLoan, loanLoading, localStatus } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [latestNotification, setLatestNotification] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    // Listen for new notifications to show toasts
    const notificationsQuery = query(
      collection(db, 'notifications', user.uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    let unsubscribeNotifications: (() => void) | null = null;

    try {
      unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        if (!snapshot.empty) {
          const notification = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() as any };
          
          // Only show toast if it's very recent (within last 10 seconds)
          const createdAt = notification.createdAt?.toMillis?.() || Date.now();
          const now = Date.now();
          if (now - createdAt < 10000 && !notification.read) {
            setLatestNotification(notification);
          }
        }
      }, (err) => {
        if (err.code === 'permission-denied') {
          console.warn('Permission denied for notifications listener. This is expected if the user document is not yet fully initialized.');
          return;
        }
        console.error('Error in notifications snapshot listener:', err);
      });
    } catch (err) {
      console.error('Error setting up notifications listener:', err);
    }

    setUnreadMessages(0);

    return () => {
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, [user]);

  const loanStatus = localStatus || activeLoan?.status || userData?.activeLoanStatus;
  const loanStatusActionRequired = ['approved', 'pending', 'bank_details_submitted', 'pin_sent'].includes(loanStatus);
  const isLoanDisbursed = loanStatus === 'disbursed';
  const showBanner = loanStatus && loanStatus !== 'disbursed' && loanStatus !== 'completed';

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-primary">
      <Sidebar 
        loanStatusActionRequired={loanStatusActionRequired}
        unreadMessages={unreadMessages}
        isLoanDisbursed={isLoanDisbursed}
      />
      
      <div className="flex-grow flex flex-col min-w-0">
        <Header />
        
        <main className="flex-grow flex flex-col min-h-0 overflow-hidden">
          <div className={`flex-grow ${location.pathname.includes('/chat') ? 'overflow-hidden' : 'overflow-y-auto'} p-4 sm:p-6 lg:p-10 pb-24 lg:pb-20`}>
            <div className={`max-w-7xl mx-auto ${location.pathname.includes('/chat') ? 'h-full flex flex-col' : ''}`}>
              {showBanner && (
                <div className="mb-8">
                  <NudgeBanner status={loanStatus} />
                </div>
              )}
              {loanLoading ? (
                <div className="flex items-center justify-center py-20">
                  <LoadingLogo size="lg" />
                </div>
              ) : (
                <Outlet context={{ activeLoan }} />
              )}
            </div>
          </div>
        </main>
      </div>

      <Toast 
        notification={latestNotification} 
        onClose={() => setLatestNotification(null)} 
      />

      <MobileNav 
        loanStatusActionRequired={loanStatusActionRequired}
        unreadMessages={unreadMessages}
      />
    </div>
  );
};
