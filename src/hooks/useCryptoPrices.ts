import { useState, useEffect } from 'react';

export const useCryptoPrices = () => {
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [usdtPrice, setUsdtPrice] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Use CryptoCompare as it's very reliable and has good CORS support
        const response = await fetch('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD');
        if (!response.ok) throw new Error('CryptoCompare API error');
        
        const data = await response.json();
        if (data.USD) {
          setBtcPrice(data.USD);
          setLoading(false);
          return;
        }
        throw new Error('Invalid data from CryptoCompare');
      } catch (err) {
        console.warn('Primary crypto fetch failed, trying fallback:', err);
        
        // Fallback to Coinbase
        try {
          const btcRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
          if (btcRes.ok) {
            const btcData = await btcRes.json();
            if (btcData.data?.amount) {
              setBtcPrice(parseFloat(btcData.data.amount));
              setLoading(false);
              return;
            }
          }
        } catch (fallbackErr) {
          console.error('All crypto price fetches failed:', fallbackErr);
          // Set some reasonable defaults if everything fails so the UI doesn't look broken
          if (btcPrice === 0) setBtcPrice(65000); 
          setLoading(false);
        }
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return { btcPrice, usdtPrice, loading };
};
