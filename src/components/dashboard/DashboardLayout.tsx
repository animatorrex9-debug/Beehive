import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { collection, query, onSnapshot, limit, orderBy, doc, updateDoc } from 'supabase/db';
import { db } from '../../lib/supabase-service';
import { useAuth } from '../../hooks/useAuth';
import { NudgeBanner } from './NudgeBanner';
import { Toast } from './Toast';
import { LoadingLogo } from '../LoadingLogo';

export const DashboardLayout: React.FC = () => {
  const { user, userData, activeLoan, loanLoading, localStatus } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [latestNotification, setLatestNotification] = useState<any>(null);
  const shownNotificationIds = useRef<Set<string>>(new Set());
  const location = useLocation();

  // Helper to load dismissed IDs for this user
  const getDismissedIds = useCallback((): Set<string> => {
    if (!user?.uid) return new Set();
    try {
      const stored = JSON.parse(localStorage.getItem(`beehive_dismissed_notifications_${user.uid}`) || '[]');
      return new Set(Array.isArray(stored) ? stored : []);
    } catch {
      return new Set();
    }
  }, [user?.uid]);

  // Helper to mark a notification as dismissed & read
  const handleDismissNotification = useCallback(async (notificationId: string) => {
    if (!user?.uid || !notificationId) return;

    // 1. Record in in-memory shown set
    shownNotificationIds.current.add(notificationId);

    // 2. Persist to localStorage so it never shows again across sessions/pages
    try {
      const currentList = Array.from(getDismissedIds());
      if (!currentList.includes(notificationId)) {
        currentList.push(notificationId);
        localStorage.setItem(`beehive_dismissed_notifications_${user.uid}`, JSON.stringify(currentList));
      }
    } catch (e) {
      console.warn('Failed to save dismissed notification ID locally:', e);
    }

    // 3. Mark as read in the database
    try {
      await updateDoc(doc(db, 'notifications', user.uid, 'items', notificationId), {
        read: true,
        dismissed: true
      });
    } catch (e) {
      console.warn('Failed to mark notification as read in database:', e);
    }

    setLatestNotification(null);
  }, [user?.uid, getDismissedIds]);

  useEffect(() => {
    if (!user?.uid) return;

    const dismissedSet = getDismissedIds();

    // Listen for new notifications to show toasts
    const notificationsQuery = query(
      collection(db, 'notifications', user.uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    let unsubscribeNotifications: (() => void) | null = null;

    try {
      unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        if (!snapshot.empty) {
          // Find the newest unread and undismissed notification
          for (const docSnap of snapshot.docs) {
            const id = docSnap.id;
            const data = docSnap.data() as any;
            const notification = { id, ...data };

            if (notification.read || notification.dismissed) continue;
            if (dismissedSet.has(id) || shownNotificationIds.current.has(id)) continue;

            // Check creation timestamp
            let createdAt = 0;
            if (notification.createdAt) {
              if (typeof notification.createdAt === 'number') {
                createdAt = notification.createdAt;
              } else if (typeof notification.createdAt.toMillis === 'function') {
                createdAt = notification.createdAt.toMillis();
              } else if (typeof notification.createdAt.toDate === 'function') {
                createdAt = notification.createdAt.toDate().getTime();
              } else if (typeof notification.createdAt === 'string') {
                createdAt = new Date(notification.createdAt).getTime();
              } else if (notification.createdAt.seconds) {
                createdAt = notification.createdAt.seconds * 1000;
              }
            }

            const now = Date.now();
            // If created within the last 60 seconds and not seen/dismissed yet
            const isFresh = createdAt > 0 ? (now - createdAt < 60000) : false;

            if (isFresh) {
              shownNotificationIds.current.add(id);
              setLatestNotification(notification);
              break;
            } else {
              // Old unread notification that was already created before this session - silently mark as dismissed so it doesn't bother the user
              dismissedSet.add(id);
              try {
                const currentList = Array.from(dismissedSet);
                localStorage.setItem(`beehive_dismissed_notifications_${user.uid}`, JSON.stringify(currentList));
              } catch {}
            }
          }
        }
      }, (err) => {
        if (err.code === 'permission-denied') {
          console.warn('Permission denied for notifications listener.');
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
  }, [user?.uid, getDismissedIds]);

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
        onDismiss={handleDismissNotification}
      />

      <MobileNav 
        loanStatusActionRequired={loanStatusActionRequired}
        unreadMessages={unreadMessages}
      />
    </div>
  );
};
