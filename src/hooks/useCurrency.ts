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
        // Try ipapi.co first
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('ipapi failed');
        const data = await response.json();
        const countryCode = data.country_code;
        
        if (CURRENCY_MAP[countryCode]) {
          setCurrency(CURRENCY_MAP[countryCode]);
        } else {
          setCurrency(CURRENCY_MAP['US']);
        }
      } catch (error) {
        // Fallback to ip-api.com (HTTP only for free tier, but sometimes works better)
        // Or just fail silently and keep default
        try {
          const response = await fetch('https://ip-api.com/json/');
          if (!response.ok) throw new Error('ip-api failed');
          const data = await response.json();
          const countryCode = data.countryCode;
          
          if (CURRENCY_MAP[countryCode]) {
            setCurrency(CURRENCY_MAP[countryCode]);
          }
        } catch (secondError) {
          // If both fail, we just stay with DEFAULT_CURRENCY (NGN)
          // We don't log "Failed to fetch" as an error anymore to avoid console noise
          console.log('Geolocation unavailable, using default currency settings.');
        }
      }
    }

    fetchGeo();
  }, []);

  const formatAmount = (amount: number) => {
    return `${currency.symbol}${amount.toLocaleString()}`;
  };

  return { currency, formatAmount };
}
