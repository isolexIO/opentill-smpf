import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

const DEFAULT_MINT = 'FPzmBaifnDkTDi26cuiEkRGofnvF7ReXUtWT7Eebjupx';

export default function JupiterChart() {
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
      const mint = data?.settings?.clink_mint_address || DEFAULT_MINT;
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
      if (!response.ok) throw new Error(`API error: ${response.status}`);
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
      setPrice(0.000001);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mintAddress) return;
    const interval = setInterval(() => fetchLivePrice(mintAddress), 60000);
    return () => clearInterval(interval);
  }, [mintAddress]);

  const isPositive = change24h >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tokenSymbol} Live Price</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-8 rounded-lg text-center">
          <div className="space-y-4">
            <div className="text-6xl font-bold text-yellow-600">
              {loading ? '...' : `$${price?.toFixed(8) || '0.00000000'}`}
            </div>
            <div className={`text-xl flex items-center justify-center gap-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span>{change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% (24h)</span>
            </div>
            <div className="text-sm text-gray-500 font-mono break-all px-4">
              Mint: {mintAddress}
            </div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Trade on Jupiter:</strong> Visit{' '}
            <a href={`https://jup.ag/swap/SOL-${mintAddress}`} target="_blank" rel="noopener noreferrer" className="underline">
              jup.ag
            </a>{' '}
            to swap {tokenSymbol}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}