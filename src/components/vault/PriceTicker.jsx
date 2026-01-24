import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PriceTicker() {
  const CLINK_MINT = 'FPzmBaifnDkTDi26cuiEkRGofnvF7ReXUtWT7Eebjupx';
  const [price, setPrice] = useState(null);
  const [change24h, setChange24h] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLivePrice();
    const interval = setInterval(fetchLivePrice, 60000); // Update every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLivePrice = async () => {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${CLINK_MINT}`);
      const data = await response.json();
      
      if (data.data && data.data[CLINK_MINT]) {
        const priceData = data.data[CLINK_MINT];
        setPrice(priceData.price);
        // Use price 24h ago if available, otherwise use mock change
        const change = priceData.price24h ? ((priceData.price - priceData.price24h) / priceData.price24h) * 100 : 0;
        setChange24h(change);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching live price:', error);
      setLoading(false);
    }
  };

  if (loading || !price) {
    return (
      <div className="bg-gray-900 text-white py-2 overflow-hidden">
        <div className="animate-pulse flex items-center justify-center">
          <span className="text-sm">Loading $cLINK price...</span>
        </div>
      </div>
    );
  }

  const isPositive = change24h >= 0;

  return (
    <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white py-2 overflow-hidden">
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 20s linear infinite;
          }
        `}
      </style>
      <div className="animate-marquee whitespace-nowrap inline-block">
        <span className="mx-8 inline-flex items-center space-x-2">
          <span className="font-bold text-yellow-400">$cLINK</span>
          <span className="text-lg font-semibold">${price?.toFixed(8)}</span>
          <span className={`inline-flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change24h).toFixed(2)}%
          </span>
        </span>
        <span className="mx-8 inline-flex items-center space-x-2">
          <span className="font-bold text-yellow-400">$cLINK</span>
          <span className="text-lg font-semibold">${price?.toFixed(8)}</span>
          <span className={`inline-flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change24h).toFixed(2)}%
          </span>
        </span>
        <span className="mx-8 inline-flex items-center space-x-2">
          <span className="font-bold text-yellow-400">$cLINK</span>
          <span className="text-lg font-semibold">${price?.toFixed(8)}</span>
          <span className={`inline-flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change24h).toFixed(2)}%
          </span>
        </span>
        <span className="mx-8 inline-flex items-center space-x-2">
          <span className="font-bold text-yellow-400">$cLINK</span>
          <span className="text-lg font-semibold">${price?.toFixed(8)}</span>
          <span className={`inline-flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change24h).toFixed(2)}%
          </span>
        </span>
      </div>
    </div>
  );
}