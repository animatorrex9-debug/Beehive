import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { safeStringify } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';

export interface CurrencyInfo {
  symbol: string;
  code: string;
  name: string;
}

interface CurrencyContextType {
  currency: CurrencyInfo;
  setCurrency: (currency: CurrencyInfo) => void;
  setCurrencyByCountry: (countryName: string) => void;
  formatAmount: (amount: number) => string;
  loading: boolean;
}

export const DEFAULT_CURRENCY: CurrencyInfo = {
  symbol: '$',
  code: 'USD',
  name: 'United States Dollar'
};

export const countryMap: Record<string, string> = {
  'United States': 'USD',
  'United Kingdom': 'GBP',
  'Nigeria': 'NGN',
  'Canada': 'CAD',
  'Australia': 'AUD',
  'Germany': 'EUR',
  'France': 'EUR',
  'Italy': 'EUR',
  'Spain': 'EUR',
  'Japan': 'JPY',
  'China': 'CNY',
  'India': 'INR',
  'South Africa': 'ZAR',
  'United Arab Emirates': 'AED',
  'Saudi Arabia': 'SAR',
  'Egypt': 'EGP',
  'Kenya': 'KES',
  'Ghana': 'GHS',
};

export const getCurrencyByCountry = (countryName: string): CurrencyInfo => {
  const code = countryMap[countryName] || 'USD';
  const name = new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) || code;
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  const parts = formatter.formatToParts(0);
  const symbolPart = parts.find(part => part.type === 'currency');
  const symbol = symbolPart ? symbolPart.value : (code === 'NGN' ? '₦' : '$');

  return { code, name, symbol };
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);

  const setCurrency = async (newCurrency: CurrencyInfo) => {
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem('user_currency', safeStringify(newCurrency));
    } catch (e) {
      console.error('Failed to save currency to localStorage', e);
    }
    
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          currency: newCurrency
        });
      } catch (e) {
        console.error('Failed to update currency in Firestore', e);
      }
    }
  };

  const setCurrencyByCountry = (countryName: string) => {
    const newCurrency = getCurrencyByCountry(countryName);
    setCurrency(newCurrency);
  };

  useEffect(() => {
    // 1. Try local storage first for immediate UI
    const savedCurrency = localStorage.getItem('user_currency');
    if (savedCurrency) {
      try {
        setCurrencyState(JSON.parse(savedCurrency));
      } catch (e) {
        console.error('Failed to parse saved currency', e);
      }
    }

    // 2. If user is logged in, sync with Firestore
    let unsubscribe: (() => void) | null = null;
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.currency) {
            setCurrencyState(data.currency);
            try {
              localStorage.setItem('user_currency', safeStringify(data.currency));
            } catch (e) {
              console.error('Failed to save currency to localStorage', e);
            }
          }
        }
      });
    }

    // 3. If no saved currency and not logged in (or first time), detect
    if (!savedCurrency && !user) {
      async function detectCurrency() {
        try {
          const response = await fetch('https://ipapi.co/json/');
          if (!response.ok) throw new Error('ipapi failed');
          const data = await response.json();
          
          if (data.country_name) {
            setCurrencyByCountry(data.country_name);
          }
        } catch (e) {
          console.error('Currency detection failed', e);
        } finally {
          setLoading(false);
        }
      }
      detectCurrency();
    } else {
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const formatAmount = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.code,
      }).format(amount);
    } catch (e) {
      return `${currency.symbol}${amount.toLocaleString()}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, setCurrencyByCountry, formatAmount, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
