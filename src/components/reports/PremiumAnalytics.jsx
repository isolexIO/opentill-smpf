import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Users, ShoppingCart } from 'lucide-react';

export default function PremiumAnalytics({ merchantId, dateRange }) {
  // This is a premium feature that requires the "Advanced Analytics" chip
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Revenue Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">+24.5%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">vs. last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Customer Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">87.3%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">repeat customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">$42.80</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">+$3.20 from avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Cart Abandonment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">12.4%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">-2.1% improvement</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Food', revenue: 15240, percentage: 42 },
              { name: 'Beverages', revenue: 9850, percentage: 27 },
              { name: 'Retail', revenue: 7320, percentage: 20 },
              { name: 'Other', revenue: 3990, percentage: 11 }
            ].map((category) => (
              <div key={category.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{category.name}</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    ${category.revenue.toLocaleString()} ({category.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Peak Hours Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {[
              { hour: '8am', volume: 20 },
              { hour: '9am', volume: 35 },
              { hour: '10am', volume: 45 },
              { hour: '11am', volume: 65 },
              { hour: '12pm', volume: 95 },
              { hour: '1pm', volume: 85 },
              { hour: '2pm', volume: 60 },
              { hour: '3pm', volume: 40 }
            ].map((data) => (
              <div key={data.hour} className="text-center">
                <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded flex items-end justify-center p-1">
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-purple-600 rounded-sm"
                    style={{ height: `${data.volume}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{data.hour}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}