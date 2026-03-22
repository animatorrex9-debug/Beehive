import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { auth, db, isConfigured, handleFirestoreError, OperationType } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  activeLoan: any | null;
  activeLoanId: string | null;
  loading: boolean;
  loanLoading: boolean;
  isAdmin: boolean;
  emailVerified: boolean;
  isConfigured: boolean;
  localStatus: string | null;
  setLocalStatus: (status: string | null) => void;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userData: null, 
  activeLoan: null,
  activeLoanId: null,
  loading: true, 
  loanLoading: true,
  isAdmin: false, 
  emailVerified: false,
  isConfigured: false,
  localStatus: null,
  setLocalStatus: () => {},
  reloadUser: async () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [activeLoan, setActiveLoan] = useState<any | null>(null);
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);

  // Load activeLoanId when user changes
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`loan_active_id_${user.uid}`);
      setActiveLoanId(stored);
    } else {
      setActiveLoanId(null);
    }
  }, [user]);

  const [loading, setLoading] = useState(true);
  const [loanLoading, setLoanLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  // Load localStatus when user changes
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`loan_local_status_${user.uid}`);
      setLocalStatus(stored);
    } else {
      setLocalStatus(null);
    }
  }, [user]);

  // Sync localStatus with localStorage
  useEffect(() => {
    if (user) {
      if (localStatus) {
        localStorage.setItem(`loan_local_status_${user.uid}`, localStatus);
      } else {
        localStorage.removeItem(`loan_local_status_${user.uid}`);
      }
    }
  }, [localStatus, user]);

  // Sync activeLoanId with localStorage
  useEffect(() => {
    if (user && !loanLoading) {
      if (activeLoanId) {
        localStorage.setItem(`loan_active_id_${user.uid}`, activeLoanId);
      } else if (activeLoanId === null) {
        // Only remove if we've finished loading and confirmed no loan
        localStorage.removeItem(`loan_active_id_${user.uid}`);
      }
    }
  }, [activeLoanId, loanLoading, user]);

  // Sync activeLoanId with activeLoan
  useEffect(() => {
    if (activeLoan?.id) {
      setActiveLoanId(activeLoan.id);
    }
  }, [activeLoan?.id]);

  // Clear localStatus when activeLoan status matches
  useEffect(() => {
    if (activeLoan?.status === localStatus) {
      setLocalStatus(null);
    }
  }, [activeLoan?.status, localStatus]);

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

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setEmailVerified(user?.emailVerified || false);
      if (user) {
        console.log(`[Auth] User detected: ${user.email} (UID: ${user.uid})`);
        // When a user is detected, we should ensure loading is true
        // until the userData listener has had a chance to fetch the profile
        setLoading(true);
        setLoanLoading(true);
      } else {
        console.log('[Auth] No user detected');
        setUserData(null);
        setActiveLoan(null);
        setIsAdmin(false);
        setLoading(false);
        setLoanLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [isConfigured]);

  // User Data Listener
  useEffect(() => {
    if (!isConfigured || !user) return;

    const unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log(`[Firestore] User data loaded for ${user.uid}:`, data.fullName || 'No name');
        setUserData(data);
        setIsAdmin(
          data?.role === 'admin'
        );
        
        // Sync email verification status if it changed
        if (user.emailVerified && !data.emailVerified) {
          updateDoc(doc(db, 'users', user.uid), {
            emailVerified: true
          }).catch(updateErr => {
            console.error('Error syncing email verification:', updateErr);
            handleFirestoreError(updateErr, OperationType.UPDATE, `users/${user.uid}`);
          });
        }
      } else {
        setUserData(null);
        setIsAdmin(false);
      }
      setLoading(false);
    }, (err) => {
      if (err.code === 'permission-denied') {
        console.warn('Permission denied for user data listener. This is expected if the user is not yet fully authenticated in Firestore.');
      } else {
        handleFirestoreError(err, OperationType.GET, 'users');
      }
      setUserData(null);
      setIsAdmin(false);
      setLoading(false);
    });

    return () => unsubscribeDoc();
  }, [isConfigured, user]);

  // Loans Listener
  useEffect(() => {
    if (!isConfigured || !user) return;

    const loansQuery = query(
      collection(db, 'loans'), 
      where('userId', '==', user.uid)
    );

    const unsubscribeLoans = onSnapshot(loansQuery, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
        // Sort by createdAt descending
        docs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || Date.now() + 1000;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        setActiveLoan(docs[0]);
        setActiveLoanId(docs[0].id);
        setLoanLoading(false);
      } else {
        // If query is empty, check if we have a specific ID from userData or localStorage
        const idToTry = userData?.activeLoanId || localStorage.getItem(`loan_active_id_${user.uid}`);
        if (idToTry) {
          getDoc(doc(db, 'loans', idToTry)).then(directDoc => {
            if (directDoc.exists()) {
              setActiveLoan({ id: directDoc.id, ...directDoc.data() });
              setActiveLoanId(directDoc.id);
            } else {
              setActiveLoan(null);
              setActiveLoanId(null);
            }
            setLoanLoading(false);
          }).catch(err => {
            handleFirestoreError(err, OperationType.GET, `loans/${idToTry}`);
            setActiveLoan(null);
            setActiveLoanId(null);
            setLoanLoading(false);
          });
        } else {
          setActiveLoan(null);
          setActiveLoanId(null);
          setLoanLoading(false);
        }
      }
    }, (err) => {
      if (err.code === 'permission-denied') {
        console.warn('Permission denied for loans listener. This is expected if the user is not yet fully authenticated in Firestore.');
      } else {
        handleFirestoreError(err, OperationType.GET, 'loans');
      }
      setLoanLoading(false);
    });

    return () => unsubscribeLoans();
  }, [isConfigured, user, userData?.activeLoanId]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      activeLoan,
      activeLoanId,
      loading, 
      loanLoading,
      isAdmin, 
      emailVerified, 
      isConfigured, 
      localStatus,
      setLocalStatus,
      reloadUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
