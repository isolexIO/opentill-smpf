import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, Cpu } from 'lucide-react';
import { createPageUrl } from '@/utils';

/**
 * Renders a locked/greyed-out version of a feature tile with an unlock CTA.
 */
export default function LockedFeatureTile({ item }) {
  return (
    <Card
      className="group opacity-60 border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:opacity-80 transition-all"
      onClick={() => window.location.href = createPageUrl('Motherboard')}
    >
      <CardHeader className="p-6 relative">
        <div className={`w-12 h-12 rounded-lg bg-gray-300 flex items-center justify-center mb-4`}>
          {item.icon ? React.cloneElement(item.icon, { className: 'w-6 h-6 text-gray-500' }) : <Cpu className="w-6 h-6 text-gray-500" />}
        </div>
        <CardTitle className="font-semibold text-lg text-gray-400 mb-1">
          {item.title}
        </CardTitle>
        <CardDescription className="text-sm text-gray-400">
          {item.description}
        </CardDescription>
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
          <Lock className="w-3 h-3" />
          Chip Required
        </div>
      </CardHeader>
    </Card>
  );
}