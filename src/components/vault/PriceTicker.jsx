import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PriceTicker() {
  // Mock data for now - replace with actual Jupiter API call
  const [price] = useState(0.1234);
  const [change24h] = useState(5.67);

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