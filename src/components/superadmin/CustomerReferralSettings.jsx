import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, CheckCircle, AlertCircle } from 'lucide-react';

const SETTING_KEY = 'customer_referral_rewards';
const DEFAULTS = { reward_duc: 50, threshold_usd: 100 };

export default function CustomerReferralSettings() {
  const [reward, setReward] = useState(String(DEFAULTS.reward_duc));
  const [threshold, setThreshold] = useState(String(DEFAULTS.threshold_usd));
  const [settingId, setSettingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const settings = await base44.entities.PlatformSettings.filter({ setting_key: SETTING_KEY });
      if (settings && settings.length > 0) {
        const s = settings[0];
        setSettingId(s.id);
        const v = s.setting_value || {};
        setReward(String(v.reward_duc ?? DEFAULTS.reward_duc));
        setThreshold(String(v.threshold_usd ?? DEFAULTS.threshold_usd));
      }
    } catch {
      setError('Could not load current settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const reward_duc = parseFloat(reward);
    const threshold_usd = parseFloat(threshold);
    if (isNaN(reward_duc) || reward_duc < 0) { setError('Reward must be a positive number.'); return; }
    if (isNaN(threshold_usd) || threshold_usd <= 0) { setError('Threshold must be greater than 0.'); return; }

    setSaving(true); setError(''); setMessage('');
    try {
      const value = { reward_duc, threshold_usd };
      if (settingId) {
        await base44.entities.PlatformSettings.update(settingId, { setting_value: value });
      } else {
        const created = await base44.entities.PlatformSettings.create({
          setting_key: SETTING_KEY,
          setting_value: value,
          description: 'Customer referral reward ($DUC) and processing threshold (USD)',
          category: 'general',
        });
        if (created) setSettingId(created.id);
      }
      setMessage(`Saved. Customers will earn ${reward_duc} $DUC when a referred merchant processes $${threshold_usd}.`);
    } catch (e) {
      setError(e.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Customer Referral Rewards
        </CardTitle>
        <CardDescription>
          Set the $DUC bonus a customer earns when a merchant they referred processes the threshold amount via openTILL Payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}
        {message && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300">{message}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ref-reward">Reward Amount ($DUC)</Label>
            <Input id="ref-reward" type="number" min="0" step="1" value={reward} onChange={(e) => setReward(e.target.value)} disabled={loading || saving} />
            <p className="text-sm text-gray-500">$DUC credited per successful referral</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref-threshold">Processing Threshold (USD)</Label>
            <Input id="ref-threshold" type="number" min="0" step="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} disabled={loading || saving} />
            <p className="text-sm text-gray-500">Referred merchant must process this much to trigger the reward</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? 'Saving...' : (loading ? 'Loading...' : 'Save Settings')}
        </Button>
      </CardContent>
    </Card>
  );
}