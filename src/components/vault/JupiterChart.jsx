import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function JupiterChart() {
  const CLINK_MINT = 'FPzmBaifnDkTDi26cuiEkRGofnvF7ReXUtWT7Eebjupx';
  const [price, setPrice] = useState(null);
  const [change24h, setChange24h] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLivePrice();
    const interval = setInterval(fetchLivePrice, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLivePrice = async () => {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${CLINK_MINT}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();

      if (data?.data?.[CLINK_MINT]) {
        const priceData = data.data[CLINK_MINT];
        setPrice(priceData.price);
        const change = priceData.price24h ? ((priceData.price - priceData.price24h) / priceData.price24h) * 100 : 0;
        setChange24h(change);
      } else {
        console.warn('No price data in response:', data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching price:', error);
      setPrice(0.000001);
      setLoading(false);
    }
  };

  const isPositive = change24h >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>$cLINK Price Chart</CardTitle>
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
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-500">Market Cap</p>
                <p className="text-lg font-semibold">$1.2M</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-500">24h Volume</p>
                <p className="text-lg font-semibold">$234K</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-500">Circulating</p>
                <p className="text-lg font-semibold">10M</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Trade on Jupiter:</strong> Visit{' '}
            <a href="https://jup.ag" target="_blank" rel="noopener noreferrer" className="underline">
              jup.ag
            </a>{' '}
            to swap $cLINK
          </p>
        </div>
      </CardContent>
    </Card>
  );
}