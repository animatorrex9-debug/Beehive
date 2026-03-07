import { useState, useEffect } from 'react';

interface CurrencyInfo {
  symbol: string;
  code: string;
  country: string;
}

const DEFAULT_CURRENCY: CurrencyInfo = {
  symbol: '₦',
  code: 'NGN',
  country: 'Nigeria'
};

const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  'NG': { symbol: '₦', code: 'NGN', country: 'Nigeria' },
  'US': { symbol: '$', code: 'USD', country: 'United States' },
  'GB': { symbol: '£', code: 'GBP', country: 'United Kingdom' },
  'EU': { symbol: '€', code: 'EUR', country: 'Europe' },
  'AE': { symbol: 'د.إ', code: 'AED', country: 'United Arab Emirates' },
  'SA': { symbol: 'ر.س', code: 'SAR', country: 'Saudi Arabia' },
  'EG': { symbol: 'E£', code: 'EGP', country: 'Egypt' },
};

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyInfo>(DEFAULT_CURRENCY);

  useEffect(() => {
    async function fetchGeo() {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const countryCode = data.country_code;
        
        if (CURRENCY_MAP[countryCode]) {
          setCurrency(CURRENCY_MAP[countryCode]);
        } else {
          // Fallback to USD for unknown countries
          setCurrency(CURRENCY_MAP['US']);
        }
      } catch (error) {
        console.error('Error fetching geolocation:', error);
        // Fallback to default
      }
    }

    fetchGeo();
  }, []);

  const formatAmount = (amount: number) => {
    return `${currency.symbol}${amount.toLocaleString()}`;
  };

  return { currency, formatAmount };
}
