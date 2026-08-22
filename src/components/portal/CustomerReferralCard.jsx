import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Share2,
  Copy,
  CheckCircle,
  QrCode as QrIcon,
  MousePointerClick,
  Users,
  Coins,
} from 'lucide-react';
import QRCode from 'qrcode';
import { brochureUrlFor } from '@/lib/referralLink';
import { base44 } from '@/api/base44Client';

const REFERRAL_REWARD_DUC = 50;

/**
 * Shows the logged-in customer's personal referral link (with copy + QR) and
 * their aggregate referral stats: clicks, shares, conversions, and $DUC earned.
 * Copying the link counts as a "share".
 */
export default function CustomerReferralCard({ customer }) {
  const referralCode = customer?.referral_code;
  const [brochureUrl, setBrochureUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!referralCode) return;
    const rp = `?ref=${encodeURIComponent(referralCode)}`;
    const url = brochureUrlFor(rp);
    setBrochureUrl(url);
    QRCode.toDataURL(url, { width: 200, margin: 1 })
      .then(setQrUrl)
      .catch(() => {});
  }, [referralCode]);

  const copy = () => {
    if (!brochureUrl) return;
    navigator.clipboard.writeText(brochureUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Count this as a share.
    base44.functions
      .invoke('manageCustomerPortal', { action: 'track_share', referral_code: referralCode })
      .catch(() => {});
  };

  if (!referralCode) return null;

  const stats = [
    { label: 'Link Clicks', value: customer?.ref_clicks || 0, icon: MousePointerClick, color: 'text-blue-600 bg-blue-50' },
    { label: 'Shares', value: customer?.ref_shares || 0, icon: Share2, color: 'text-purple-600 bg-purple-50' },
    { label: 'Conversions', value: customer?.ref_conversions || 0, icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Referral $DUC', value: (customer?.ref_duc_earned || 0).toFixed(2), icon: Coins, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" /> My Referral Link
        </CardTitle>
        <CardDescription>
          Share openTILL with businesses. Earn {REFERRAL_REWARD_DUC} $DUC when a referred merchant signs up
          for openTILL Payments and processes $100.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-lg border p-3">
              <div className={`w-8 h-8 rounded-md ${color} flex items-center justify-center mb-1.5`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Your referral link</label>
          <div className="flex gap-2">
            <Input value={brochureUrl} readOnly className="text-sm" />
            <Button onClick={copy} variant="outline" className="shrink-0">
              {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {qrUrl && (
          <div className="flex items-center gap-4 pt-1">
            <div className="bg-white p-2 rounded-lg border">
              <img src={qrUrl} alt="Referral QR" className="w-28 h-28" />
            </div>
            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <QrIcon className="w-4 h-4 mt-0.5 shrink-0" />
              Scan to open your referral link.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}