import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, query, collection, where, getDocs, setDoc } from 'firebase/firestore';
import { auth, db, isConfigured, handleFirestoreError, OperationType } from '../lib/firebase';

import { useCurrency } from '../context/CurrencyContext';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  activeLoan: any | null;
  activeLoanId: string | null;
  loading: boolean;
  loanLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
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
  isManager: false,
  emailVerified: false,
  isConfigured: false,
  localStatus: null,
  setLocalStatus: () => {},
  reloadUser: async () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setCurrencyByCountry } = useCurrency();
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
  const [isManager, setIsManager] = useState(false);
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

  const ensureUserProfile = async (firebaseUser: User) => {
    if (!isConfigured) return;
    
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);
      const userEmail = firebaseUser.email?.toLowerCase().trim() || '';
      
      if (!userDoc.exists()) {
        console.log(`[Auth] No profile found for UID ${firebaseUser.uid}. Checking for existing profile by email: ${userEmail}`);
        
        // Try to find by normalized email
        let q = query(collection(db, 'users'), where('email', '==', userEmail));
        let querySnapshot = await getDocs(q);
        
        // Fallback: Try to find by original email (in case it wasn't normalized before)
        if (querySnapshot.empty && firebaseUser.email && firebaseUser.email !== userEmail) {
          console.log(`[Auth] No normalized profile found. Trying original email: ${firebaseUser.email}`);
          q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
          querySnapshot = await getDocs(q);
        }
        
        if (!querySnapshot.empty) {
          const existingDoc = querySnapshot.docs[0];
          const existingData = existingDoc.data();
          console.log(`[Auth] Found existing profile with UID ${existingDoc.id}. Linking to new UID ${firebaseUser.uid}...`);
          
          await setDoc(userRef, {
            ...existingData,
            uid: firebaseUser.uid,
            email: userEmail,
            updatedAt: new Date().toISOString(),
            emailVerified: firebaseUser.emailVerified || existingData.emailVerified || false
          });
        } else {
          // Truly a new user. Initialize basic fields to prevent "dummy" accounts.
          console.log(`[Auth] Initializing new user profile for ${userEmail}`);
          await setDoc(userRef, {
            fullName: firebaseUser.displayName || userEmail.split('@')[0],
            email: userEmail,
            role: userEmail === 'animatorrex9@gmail.com' ? 'admin' : 'user',
            walletBalance: 0,
            investmentBalance: 0,
            grantBalance: 0,
            savings: 0,
            activeCards: 1,
            kycStatus: 'unverified',
            createdAt: new Date().toISOString(),
            emailVerified: firebaseUser.emailVerified,
            country: '', // Trigger complete-profile if missing
            lastReturnCalculationDate: new Date().toISOString(),
          });
        }
      } else {
        // Profile exists, but let's ensure admin role for the specific email
        const data = userDoc.data();
        if (userEmail === 'animatorrex9@gmail.com' && data.role !== 'admin') {
          console.log('[Auth] Forcing admin role for animatorrex9@gmail.com');
          await updateDoc(userRef, { role: 'admin' });
        }
      }
    } catch (err) {
      console.error('[Auth] Error ensuring user profile:', err);
    }
  };

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

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log(`[Auth] User detected: ${user.email} (UID: ${user.uid})`);
        
        // Ensure loading is true until profile is ready
        setLoading(true);
        setLoanLoading(true);
        setUser(user);
        setEmailVerified(user.emailVerified);
        
        // Ensure user profile exists and is linked correctly
        await ensureUserProfile(user);
      } else {
        console.log('[Auth] No user detected');
        setUser(null);
        setUserData(null);
        setActiveLoan(null);
        setIsAdmin(false);
        setIsManager(false);
        setEmailVerified(false);
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
        console.log(`[Firestore] User data loaded for ${user.uid}:`, {
          fullName: data.fullName || 'No name',
          country: data.country || 'MISSING',
          role: data.role || 'user'
        });
        setUserData(data);
        setIsAdmin(data?.role === 'admin');
        setIsManager(data?.role === 'manager');
        
        if (data.country) {
          setCurrencyByCountry(data.country);
        }
        
        // Sync email verification status if it changed
        if (user.emailVerified && !data.emailVerified) {
          updateDoc(doc(db, 'users', user.uid), {
            emailVerified: true
          }).catch(updateErr => {
            console.error('Error syncing email verification:', updateErr instanceof Error ? updateErr.message : String(updateErr));
            handleFirestoreError(updateErr, OperationType.UPDATE, `users/${user.uid}`);
          });
        }
      } else {
        setUserData(null);
        setIsAdmin(false);
        setIsManager(false);
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
      isManager,
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
