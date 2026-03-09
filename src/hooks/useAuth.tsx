import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, isConfigured } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  isAdmin: boolean;
  emailVerified: boolean;
  isConfigured: boolean;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userData: null, 
  loading: true, 
  isAdmin: false, 
  emailVerified: false,
  isConfigured: false,
  reloadUser: async () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const reloadUser = async () => {
    if (isConfigured && auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
      setEmailVerified(auth.currentUser.emailVerified);
      
      // Update Firestore if verified
      if (auth.currentUser.emailVerified) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          emailVerified: true
        });
      }
    }
  };

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setEmailVerified(user?.emailVerified || false);
      
      // Clean up previous document listener if it exists
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (user) {
        // Use onSnapshot for real-time updates to userData
        try {
          unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUserData(data);
              setIsAdmin(data?.role === 'admin' || data?.role === 'account_manager');
              
              // Sync email verification status if it changed
              if (user.emailVerified && !data.emailVerified) {
                try {
                  await updateDoc(doc(db, 'users', user.uid), {
                    emailVerified: true
                  });
                } catch (updateErr) {
                  console.error('Error syncing email verification:', updateErr);
                }
              }
            } else {
              setUserData(null);
              setIsAdmin(false);
            }
            setLoading(false);
          }, (err) => {
            // Only log if it's not a permission error during logout/login transition
            if (err.code !== 'permission-denied' || auth.currentUser) {
              console.error('Error fetching user data:', err);
            }
            setUserData(null);
            setIsAdmin(false);
            setLoading(false);
          });
        } catch (snapErr) {
          console.error('Error setting up user data listener:', snapErr);
          setLoading(false);
        }
      } else {
        setUserData(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAdmin, emailVerified, isConfigured, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
