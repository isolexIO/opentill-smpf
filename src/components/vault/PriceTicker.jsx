import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown } from 'lucide-react';

const DEFAULT_MINT = 'FPzmBaifnDkTDi26cuiEkRGofnvF7ReXUtWT7Eebjupx';

export default function PriceTicker() {
  const [price, setPrice] = useState(null);
  const [change24h, setChange24h] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mintAddress, setMintAddress] = useState(DEFAULT_MINT);
  const [tokenSymbol, setTokenSymbol] = useState('$DUC');

  useEffect(() => {
    loadSettingsThenPrice();
  }, []);

  const loadSettingsThenPrice = async () => {
    try {
      const { data } = await base44.functions.invoke('updateVaultSettings', { action: 'get' });
      const mint = data?.settings?.duc_mint_address || data?.settings?.clink_mint_address || DEFAULT_MINT;
      const symbol = data?.settings?.token_symbol || '$DUC';
      setMintAddress(mint);
      setTokenSymbol(symbol);
      await fetchLivePrice(mint);
    } catch (e) {
      await fetchLivePrice(DEFAULT_MINT);
    }
  };

  const fetchLivePrice = async (mint) => {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();
      if (data?.data?.[mint]) {
        const priceData = data.data[mint];
        setPrice(parseFloat(priceData.price));
        const change = priceData.price24h
          ? ((priceData.price - priceData.price24h) / priceData.price24h) * 100
          : 0;
        setChange24h(change);
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      setPrice(0.00001);
      setChange24h(0);
    } finally {
      setLoading(false);
    }
  };

  // Refresh price every 60s
  useEffect(() => {
    if (!mintAddress) return;
    const interval = setInterval(() => fetchLivePrice(mintAddress), 60000);
    return () => clearInterval(interval);
  }, [mintAddress]);

  if (loading || !price) {
    return (
      <div className="bg-gray-900 text-white py-2 overflow-hidden">
        <div className="animate-pulse flex items-center justify-center">
          <span className="text-sm">Loading {tokenSymbol} price...</span>
        </div>
      </div>
    );
  }

  const isPositive = change24h >= 0;

  const tickerItem = (
    <span className="mx-8 inline-flex items-center space-x-2">
      <span className="font-bold text-yellow-400">{tokenSymbol}</span>
      <span className="text-lg font-semibold">${price?.toFixed(8)}</span>
      <span className={`inline-flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
        {Math.abs(change24h).toFixed(2)}%
      </span>
    </span>
  );

  return (
    <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white py-2 overflow-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 20s linear infinite; }
      `}</style>
      <div className="animate-marquee whitespace-nowrap inline-block">
        {tickerItem}{tickerItem}{tickerItem}{tickerItem}
      </div>
    </div>
  );
}