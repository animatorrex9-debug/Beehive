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
  formatAmount: (amount: number, skipConversion?: boolean) => string;
  convertAmount: (amount: number, from: string, to: string) => number;
  rates: Record<string, number>;
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
  'UAE': 'AED',
  'UK': 'GBP',
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
  const [rates, setRates] = useState<Record<string, number>>({ 
    USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1600, CAD: 1.35, AUD: 1.52, JPY: 151, CNY: 7.23, INR: 83, ZAR: 19, AED: 3.67, SAR: 3.75, EGP: 47, KES: 132, GHS: 13,
    BTC: 0.000015, // Default placeholder
    USDT: 1
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Fetch Fiat Rates
        const fiatResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        let newRates: Record<string, number> = { ...rates };
        
        if (fiatResponse.ok) {
          const data = await fiatResponse.json();
          newRates = { ...newRates, ...data.rates };
        }

        // Fetch Crypto Rates (BTC)
        try {
          const cryptoResponse = await fetch('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD');
          if (cryptoResponse.ok) {
            const cryptoData = await cryptoResponse.json();
            if (cryptoData.USD) {
              // rates are relative to USD, so 1 USD = 1/BTC_PRICE BTC
              newRates['BTC'] = 1 / cryptoData.USD;
            }
          }
        } catch (cryptoError) {
          console.error('Failed to fetch BTC rate:', cryptoError);
        }

        // USDT is usually 1:1 with USD
        newRates['USDT'] = 1;

        setRates(newRates);
      } catch (error) {
        console.error('Failed to fetch real-time rates:', error);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 300000); // Update every 5 minutes for better crypto accuracy
    return () => clearInterval(interval);
  }, []);

  const convertAmount = (amount: number, from: string, to: string) => {
    if (from === to) return amount;
    
    // Convert from source to USD
    const amountInUSD = from === 'USD' ? amount : amount / (rates[from] || 1);
    
    // Convert from USD to target
    return amountInUSD * (rates[to] || 1);
  };

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

  const setCurrencyByCountry = async (countryName: string) => {
    const newCurrency = getCurrencyByCountry(countryName);
    await setCurrency(newCurrency);
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

  const formatAmount = (amount: number, skipConversion: boolean = false) => {
    try {
      const displayAmount = skipConversion ? amount : convertAmount(amount, 'USD', currency.code);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.code,
      }).format(displayAmount);
    } catch (e) {
      const displayAmount = skipConversion ? amount : convertAmount(amount, 'USD', currency.code);
      return `${currency.symbol}${displayAmount.toLocaleString()}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, setCurrencyByCountry, formatAmount, convertAmount, rates, loading }}>
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
