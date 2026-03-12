import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { auth, db, isConfigured } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  activeLoan: any | null;
  loading: boolean;
  loanLoading: boolean;
  isAdmin: boolean;
  emailVerified: boolean;
  isConfigured: boolean;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userData: null, 
  activeLoan: null,
  loading: true, 
  loanLoading: true,
  isAdmin: false, 
  emailVerified: false,
  isConfigured: false,
  reloadUser: async () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [activeLoan, setActiveLoan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loanLoading, setLoanLoading] = useState(true);
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
      setLoanLoading(false);
      return;
    }

    let unsubscribeDoc: (() => void) | null = null;
    let unsubscribeLoans: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setEmailVerified(user?.emailVerified || false);
      
      // Clean up previous listeners
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }
      if (unsubscribeLoans) {
        unsubscribeLoans();
        unsubscribeLoans = null;
      }

      if (user) {
        // Use onSnapshot for real-time updates to userData
        try {
          unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), { includeMetadataChanges: true }, async (userDoc) => {
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
            if (err.code !== 'permission-denied' || auth.currentUser) {
              console.error('Error fetching user data:', err);
            }
            setUserData(null);
            setIsAdmin(false);
            setLoading(false);
          });

          // Fetch active loan for status indicators globally
          const loansQuery = query(
            collection(db, 'loans'), 
            where('userId', '==', user.uid)
          );

          unsubscribeLoans = onSnapshot(loansQuery, { includeMetadataChanges: true }, (snapshot) => {
            if (!snapshot.empty) {
              const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
              // Sort by createdAt descending
              docs.sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || Date.now() + 1000;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeB - timeA;
              });
              setActiveLoan(docs[0]);
            } else {
              setActiveLoan(null);
            }
            setLoanLoading(false);
          }, (err) => {
            if (err.code !== 'permission-denied') {
              console.error('Error fetching active loan:', err);
            }
            setLoanLoading(false);
          });

        } catch (snapErr) {
          console.error('Error setting up listeners:', snapErr);
          setLoading(false);
          setLoanLoading(false);
        }
      } else {
        setUserData(null);
        setActiveLoan(null);
        setIsAdmin(false);
        setLoading(false);
        setLoanLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribeLoans) unsubscribeLoans();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      activeLoan,
      loading, 
      loanLoading,
      isAdmin, 
      emailVerified, 
      isConfigured, 
      reloadUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
