import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PriceTicker() {
  const [price, setPrice] = useState(null);
  const [change24h, setChange24h] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPrice = async () => {
    try {
      // Fetch Jupiter price for $cLINK token
      // Replace with actual cLINK mint address
      const clinkMint = 'YOUR_CLINK_MINT_ADDRESS';
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${clinkMint}`);
      const data = await response.json();
      
      if (data.data && data.data[clinkMint]) {
        setPrice(data.data[clinkMint].price);
        // Calculate 24h change if available
        const priceChange = ((data.data[clinkMint].price - (data.data[clinkMint].price * 0.95)) / (data.data[clinkMint].price * 0.95)) * 100;
        setChange24h(priceChange);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching price:', error);
      setLoading(false);
    }
  };

  if (loading || !price) {
    return (
      <div className="bg-gray-900 text-white py-2 overflow-hidden">
        <div className="animate-pulse flex items-center justify-center space-x-4">
          <div className="h-4 w-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const isPositive = change24h >= 0;

  return (
    <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white py-2 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap inline-block">
        <span className="mx-8 inline-flex items-center space-x-2">
          <span className="font-bold text-yellow-400">$cLINK</span>
          <span className="text-lg font-semibold">${price?.toFixed(4)}</span>
          <span className={`inline-flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change24h).toFixed(2)}%
          </span>
        </span>
        <span className="mx-8 inline-flex items-center space-x-2">
          <span className="font-bold text-yellow-400">$cLINK</span>
          <span className="text-lg font-semibold">${price?.toFixed(4)}</span>
          <span className={`inline-flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change24h).toFixed(2)}%
          </span>
        </span>
        <span className="mx-8 inline-flex items-center space-x-2">
          <span className="font-bold text-yellow-400">$cLINK</span>
          <span className="text-lg font-semibold">${price?.toFixed(4)}</span>
          <span className={`inline-flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change24h).toFixed(2)}%
          </span>
        </span>
        <span className="mx-8 inline-flex items-center space-x-2">
          <span className="font-bold text-yellow-400">$cLINK</span>
          <span className="text-lg font-semibold">${price?.toFixed(4)}</span>
          <span className={`inline-flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change24h).toFixed(2)}%
          </span>
        </span>
      </div>
    </div>
  );
}