import { useState, useEffect } from 'react';

export const useCryptoPrices = () => {
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [usdtPrice, setUsdtPrice] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Use Coinbase API as it's often more reliable for simple spot prices
        const [btcRes, usdtRes] = await Promise.all([
          fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot'),
          fetch('https://api.coinbase.com/v2/prices/USDT-USD/spot')
        ]);

        if (!btcRes.ok || !usdtRes.ok) throw new Error('Coinbase API error');

        const btcData = await btcRes.json();
        const usdtData = await usdtRes.json();

        if (btcData.data?.amount) setBtcPrice(parseFloat(btcData.data.amount));
        if (usdtData.data?.amount) setUsdtPrice(parseFloat(usdtData.data.amount));
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching crypto prices:', err);
        // Fallback to a secondary API (CoinGecko) if Coinbase fails
        try {
          const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd');
          const data = await response.json();
          if (data.bitcoin?.usd) setBtcPrice(data.bitcoin.usd);
          if (data.tether?.usd) setUsdtPrice(data.tether.usd);
          setLoading(false);
        } catch (fallbackErr) {
          console.error('Fallback price fetch failed:', fallbackErr);
          setLoading(false);
        }
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return { btcPrice, usdtPrice, loading };
};
