import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function JupiterChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>$cLINK Price Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-8 rounded-lg text-center">
          <div className="space-y-4">
            <div className="text-6xl font-bold text-yellow-600">$0.1234</div>
            <div className="text-xl text-green-600 flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span>+5.67% (24h)</span>
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