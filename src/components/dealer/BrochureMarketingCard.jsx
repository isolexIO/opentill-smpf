import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';
import { QrCode, Copy, ExternalLink, Download } from 'lucide-react';

// Ambassador brochure marketing card: a shareable public brochure link with an
// ambassador referral code attached, plus a QR code for offline marketing.
export default function BrochureMarketingCard({ dealer }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  // Ambassadors are referenced via ?dealer_id=<legacy_dealer_id> (the same
  // identifier the home page and onboarding flow resolve against). Using the
  // slug as ?ref= would be treated as a merchant referral code.
  const ref = dealer?.legacy_dealer_id || dealer?.slug || '';
  const brochureUrl = `${window.location.origin}/Brochure${ref ? `?dealer_id=${encodeURIComponent(ref)}` : ''}`;

  useEffect(() => {
    QRCode.toDataURL(brochureUrl, { width: 240, margin: 1 })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [brochureUrl]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(brochureUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" /> Brochure Marketing Link
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row gap-6 items-center">
        <div className="flex flex-col items-center gap-2">
          {qrUrl ? (
            <img src={qrUrl} alt="openTILL brochure QR code" className="w-48 h-48 rounded-lg border p-2 bg-white" />
          ) : (
            <div className="w-48 h-48 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />
          )}
          <p className="text-xs text-gray-500 text-center">Scan to open the openTILL SMPF brochure</p>
        </div>

        <div className="flex-1 space-y-3 w-full">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Share your personalized brochure link with prospects. Your ambassador code is attached so referrals are tracked back to you.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-xs bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded">
              {brochureUrl}
            </code>
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy className="w-4 h-4 mr-1" /> {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <a href={brochureUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" /> Open Brochure
              </a>
            </Button>
            {qrUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={qrUrl} download="opentill-brochure-qr.png">
                  <Download className="w-4 h-4 mr-1" /> Save QR
                </a>
              </Button>
            )}
          </div>
          {ref && (
            <p className="text-xs text-gray-400">Ambassador code: <b>{ref}</b></p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}