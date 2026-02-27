import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Save, DollarSign, Percent, RefreshCw } from 'lucide-react';

const SETTING_KEY = 'builder_platform_fees';

const DEFAULT_FEES = {
  listing_fee: 0,
  listing_fee_enabled: true,
  trx_fee_type: 'percent', // 'percent' or 'fixed'
  trx_fee_value: 5,
  trx_fee_enabled: true,
  membership_fee: 0,
  membership_fee_interval: 'monthly', // 'monthly' or 'yearly'
  membership_fee_enabled: false,
};

export default function BuilderFeeSettings() {
  const [fees, setFees] = useState(DEFAULT_FEES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [settingId, setSettingId] = useState(null);

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    setLoading(true);
    try {
      const results = await base44.entities.PlatformSettings.filter({ setting_key: SETTING_KEY });
      if (results && results.length > 0) {
        setSettingId(results[0].id);
        setFees({ ...DEFAULT_FEES, ...results[0].setting_value });
      }
    } catch (err) {
      console.error('Failed to load builder fee settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (settingId) {
        await base44.entities.PlatformSettings.update(settingId, {
          setting_value: fees,
        });
      } else {
        const created = await base44.entities.PlatformSettings.create({
          setting_key: SETTING_KEY,
          setting_value: fees,
          description: 'Platform fees charged to builders',
          category: 'general',
        });
        setSettingId(created.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError('Failed to save settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const set = (key, value) => setFees((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading fee settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Listing Fee */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Listing Fee</CardTitle>
            <button
              onClick={() => set('listing_fee_enabled', !fees.listing_fee_enabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                fees.listing_fee_enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  fees.listing_fee_enabled ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-sm text-gray-500">One-time fee charged when a builder lists/publishes a chip</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="relative w-48">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={fees.listing_fee}
                onChange={(e) => set('listing_fee', parseFloat(e.target.value) || 0)}
                className="pl-9"
                disabled={!fees.listing_fee_enabled}
              />
            </div>
            <span className="text-sm text-gray-500">per chip listing</span>
            {fees.listing_fee_enabled && fees.listing_fee === 0 && (
              <Badge className="bg-green-100 text-green-700">Free</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Fee */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Transaction Fee</CardTitle>
            <button
              onClick={() => set('trx_fee_enabled', !fees.trx_fee_enabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                fees.trx_fee_enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  fees.trx_fee_enabled ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-sm text-gray-500">Fee deducted from each chip sale</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <Button
              variant={fees.trx_fee_type === 'percent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => set('trx_fee_type', 'percent')}
              disabled={!fees.trx_fee_enabled}
            >
              <Percent className="w-3 h-3 mr-1" /> Percentage
            </Button>
            <Button
              variant={fees.trx_fee_type === 'fixed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => set('trx_fee_type', 'fixed')}
              disabled={!fees.trx_fee_enabled}
            >
              <DollarSign className="w-3 h-3 mr-1" /> Fixed Amount
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-48">
              {fees.trx_fee_type === 'percent' ? (
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              ) : (
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              )}
              <Input
                type="number"
                min="0"
                max={fees.trx_fee_type === 'percent' ? 100 : undefined}
                step={fees.trx_fee_type === 'percent' ? '0.1' : '0.01'}
                value={fees.trx_fee_value}
                onChange={(e) => set('trx_fee_value', parseFloat(e.target.value) || 0)}
                className="pl-9"
                disabled={!fees.trx_fee_enabled}
              />
            </div>
            <span className="text-sm text-gray-500">
              {fees.trx_fee_type === 'percent'
                ? '% of each transaction'
                : 'flat fee per transaction'}
            </span>
          </div>

          {fees.trx_fee_enabled && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded p-2">
              Example: A $10 chip sale → platform collects{' '}
              <strong>
                {fees.trx_fee_type === 'percent'
                  ? `$${((10 * fees.trx_fee_value) / 100).toFixed(2)} (${fees.trx_fee_value}%)`
                  : `$${parseFloat(fees.trx_fee_value).toFixed(2)}`}
              </strong>
              , builder receives{' '}
              <strong>
                {fees.trx_fee_type === 'percent'
                  ? `$${(10 - (10 * fees.trx_fee_value) / 100).toFixed(2)}`
                  : `$${(10 - fees.trx_fee_value).toFixed(2)}`}
              </strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Membership Fee */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Membership Fee</CardTitle>
            <button
              onClick={() => set('membership_fee_enabled', !fees.membership_fee_enabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                fees.membership_fee_enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  fees.membership_fee_enabled ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-sm text-gray-500">Recurring fee for builders to maintain their marketplace presence</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative w-48">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={fees.membership_fee}
                onChange={(e) => set('membership_fee', parseFloat(e.target.value) || 0)}
                className="pl-9"
                disabled={!fees.membership_fee_enabled}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={fees.membership_fee_interval === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => set('membership_fee_interval', 'monthly')}
                disabled={!fees.membership_fee_enabled}
              >
                / month
              </Button>
              <Button
                variant={fees.membership_fee_interval === 'yearly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => set('membership_fee_interval', 'yearly')}
                disabled={!fees.membership_fee_enabled}
              >
                / year
              </Button>
            </div>
          </div>

          {fees.membership_fee_enabled && fees.membership_fee > 0 && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded p-2">
              Builders pay{' '}
              <strong>${fees.membership_fee.toFixed(2)}</strong>{' '}
              {fees.membership_fee_interval === 'monthly' ? 'per month' : 'per year'} to access the marketplace.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Fee Settings
        </Button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">✓ Settings saved!</span>
        )}
      </div>
    </div>
  );
}