import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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

export const SupabaseAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setCurrencyByCountry } = useCurrency();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [activeLoan, setActiveLoan] = useState<any | null>(null);
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loanLoading, setLoanLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  // Sync state with localStorage for Loans
  useEffect(() => {
    if (user) {
      const storedLoanId = localStorage.getItem(`supabase_loan_active_id_${user.id}`);
      const storedStatus = localStorage.getItem(`supabase_loan_local_status_${user.id}`);
      setActiveLoanId(storedLoanId);
      setLocalStatus(storedStatus);
    } else {
      setActiveLoanId(null);
      setLocalStatus(null);
    }
  }, [user]);

  useEffect(() => {
    if (user && localStatus) {
      localStorage.setItem(`supabase_loan_local_status_${user.id}`, localStatus);
    } else if (user) {
      localStorage.removeItem(`supabase_loan_local_status_${user.id}`);
    }
  }, [localStatus, user]);

  useEffect(() => {
    if (user && !loanLoading) {
      if (activeLoanId) {
        localStorage.setItem(`supabase_loan_active_id_${user.id}`, activeLoanId);
      } else if (activeLoanId === null) {
        localStorage.removeItem(`supabase_loan_active_id_${user.id}`);
      }
    }
  }, [activeLoanId, loanLoading, user]);

  useEffect(() => {
    if (activeLoan?.id) {
      setActiveLoanId(activeLoan.id);
    }
  }, [activeLoan?.id]);

  useEffect(() => {
    if (activeLoan?.status === localStatus) {
      setLocalStatus(null);
    }
  }, [activeLoan?.status, localStatus]);

  // Auth Listener
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setLoanLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const initialUser = session?.user ?? null;
      setUser(initialUser);
      setEmailVerified(initialUser?.email_confirmed_at ? true : false);
      if (!initialUser) {
        setLoading(false);
        setLoanLoading(false);
      }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setEmailVerified(currentUser?.email_confirmed_at ? true : false);
      
      if (!currentUser) {
        setUserData(null);
        setActiveLoan(null);
        setIsAdmin(false);
        setIsManager(false);
        setLoading(false);
        setLoanLoading(false);
      } else {
        setLoading(true);
        setLoanLoading(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Profile data & Realtime changes listener
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    // Fetch initial profile
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.warn('[Supabase] Profile fetch error (may not exist yet):', error.message);
          setUserData(null);
        } else if (data) {
          setUserData(data);
          setIsAdmin(data.role === 'admin');
          setIsManager(data.role === 'account_manager');
          
          if (data.country) {
            setCurrencyByCountry(data.country);
          }
        }
      } catch (err) {
        console.error('[Supabase] Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Subscribe to profile changes using Realtime
    const profileChannel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Supabase Realtime] Profile update:', payload.new);
          const newData = payload.new as any;
          setUserData(newData);
          setIsAdmin(newData?.role === 'admin');
          setIsManager(newData?.role === 'account_manager');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  // Loans listener with Realtime
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    const fetchLoans = async () => {
      try {
        const { data, error } = await supabase
          .from('loans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Supabase] Loans fetch error:', error.message);
        } else if (data && data.length > 0) {
          setActiveLoan(data[0]);
          setActiveLoanId(data[0].id);
        } else {
          setActiveLoan(null);
          setActiveLoanId(null);
        }
      } catch (err) {
        console.error('[Supabase] Error fetching loans:', err);
      } finally {
        setLoanLoading(false);
      }
    };

    fetchLoans();

    // Subscribe to loan updates
    const loanChannel = supabase
      .channel(`loans-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loans',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchLoans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(loanChannel);
    };
  }, [user]);

  const reloadUser = async () => {
    if (!isSupabaseConfigured) return;
    const { data: { user: updatedUser } } = await supabase.auth.getUser();
    if (updatedUser) {
      setUser(updatedUser);
      setEmailVerified(updatedUser.email_confirmed_at ? true : false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user: user as any, 
      userData, 
      activeLoan,
      activeLoanId,
      loading, 
      loanLoading,
      isAdmin, 
      isManager,
      emailVerified, 
      isConfigured: isSupabaseConfigured, 
      localStatus,
      setLocalStatus,
      reloadUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useSupabaseAuth = () => useContext(AuthContext);
