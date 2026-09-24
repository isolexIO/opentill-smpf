import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';

const ISSUING_URL = 'https://issuing.opentill.io';

/**
 * CardIssuingPanel - Shown in the Motherboard when the "Card Issuing" chip
 * (symbol: ISSUE) is installed. Embeds the issuing.opentill.io console so
 * merchants can issue and manage virtual/physical cards without leaving the POS.
 */
export default function CardIssuingPanel({ chip, merchant }) {
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeFailed, setIframeFailed] = useState(false);

  // Pass merchant context to the issuing console when available.
  const src = merchant?.id
    ? `${ISSUING_URL}?merchant_id=${encodeURIComponent(merchant.id)}`
    : ISSUING_URL;

  return (
    <Card className="border-2 border-cyan-500 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={chip?.image_url || '/api/placeholder/64/64'}
              alt={chip?.name || 'Card Issuing'}
              className="w-12 h-12 rounded-lg shrink-0 object-cover"
            />
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-cyan-600 shrink-0" />
                Card Issuing
              </CardTitle>
              <CardDescription className="truncate">
                Issue &amp; manage cards via issuing.opentill.io
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-800 shrink-0">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Installed
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative bg-gray-50" style={{ minHeight: 560 }}>
          {!iframeFailed ? (
            <iframe
              key={iframeKey}
              src={src}
              title="openTILL Card Issuing Console"
              className="w-full"
              style={{ minHeight: 560, border: 0 }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              onError={() => setIframeFailed(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-10" style={{ minHeight: 560 }}>
              <CreditCard className="w-12 h-12 text-cyan-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Open the Card Issuing Console</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md">
                The issuing console opens in a secure new tab so you can create virtual and
                physical cards, set spend limits, and monitor transactions.
              </p>
              <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Launch issuing.opentill.io
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-white">
          <p className="text-xs text-gray-500">
            Powered by issuing.opentill.io
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setIframeFailed(false); setIframeKey(k => k + 1); }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reload
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Open in new tab
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}