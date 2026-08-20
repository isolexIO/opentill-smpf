import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, Copy, CheckCircle, QrCode as QrIcon, FileText } from 'lucide-react';
import QRCode from 'qrcode';
import { resolveReferral, buildRefParam, appendRefParam, brochureUrlFor } from '@/lib/referralLink';

/**
 * A reusable card that resolves the viewer's referral identity and surfaces
 * shareable brochure + signup links (with copy + QR). Works for any user type:
 * merchants (?ref=CODE), ambassadors (?dealer_id=SLUG), or anonymous viewers.
 *
 * Pass `merchantId` to share a specific merchant's referral link (used by the
 * customer portal, where the viewer is a PIN-logged-in customer).
 */
export default function BrochureShareCard({ merchantId, defaultReferralCode, title = 'Share the Brochure', description }) {
  const [brochureUrl, setBrochureUrl] = useState('');
  const [signupUrl, setSignupUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [refLabel, setRefLabel] = useState('');
  const [copied, setCopied] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const resolved = await resolveReferral({ merchantId });
        // Fall back to the platform default code when nothing else resolved, so
        // share links always carry a referral code (e.g. global customers).
        const ref = resolved || (defaultReferralCode ? { type: 'merchant', code: defaultReferralCode } : null);
        const refParam = buildRefParam(ref);
        if (active) {
          setBrochureUrl(brochureUrlFor(refParam));
          setSignupUrl(appendRefParam(`${window.location.origin}/`, refParam));
          setRefLabel(
            ref?.type === 'dealer'
              ? `Ambassador link (?dealer_id=${ref.code})`
              : ref?.type === 'merchant'
                ? `Merchant referral (?ref=${ref.code})`
                : 'Public link (no referral attached)'
          );
          if (refParam) {
            const qr = await QRCode.toDataURL(brochureUrlFor(refParam), { width: 200, margin: 1 });
            if (active) setQrUrl(qr);
          }
        }
      } catch { /* ignore */ }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [merchantId, defaultReferralCode]);

  const copy = (which) => {
    const text = which === 'brochure' ? brochureUrl : signupUrl;
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-gray-400">Resolving your referral link…</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {description ||
            'Share the openTILL SMPF brochure. Your referral code is attached automatically so signups are credited to you.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-gray-500">{refLabel}</div>

        <div>
          <label className="text-sm font-medium flex items-center gap-1.5 mb-1">
            <FileText className="w-4 h-4" /> Brochure link
          </label>
          <div className="flex gap-2">
            <Input value={brochureUrl} readOnly className="text-sm" />
            <Button onClick={() => copy('brochure')} variant="outline" className="shrink-0">
              {copied === 'brochure' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Signup link</label>
          <div className="flex gap-2">
            <Input value={signupUrl} readOnly className="text-sm" />
            <Button onClick={() => copy('signup')} variant="outline" className="shrink-0">
              {copied === 'signup' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {qrUrl && (
          <div className="flex items-center gap-4 pt-2">
            <div className="bg-white p-2 rounded-lg border">
              <img src={qrUrl} alt="Brochure QR" className="w-28 h-28" />
            </div>
            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <QrIcon className="w-4 h-4 mt-0.5 shrink-0" />
              Scan to open the brochure with your referral attached.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}