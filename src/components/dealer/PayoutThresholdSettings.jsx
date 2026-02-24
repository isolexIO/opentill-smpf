import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function PayoutThresholdSettings({ dealer, onUpdate }) {
  const [payoutThreshold, setPayoutThreshold] = useState(dealer?.payout_minimum || 20);
  const [payoutCadence, setPayoutCadence] = useState(dealer?.payout_cadence || 'monthly');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      setSaved(false);

      if (payoutThreshold < 1) {
        alert('Minimum payout threshold must be at least $1');
        return;
      }

      await base44.entities.Dealer.update(dealer.id, {
        payout_minimum: parseFloat(payoutThreshold),
        payout_cadence: payoutCadence
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payout Thresholds & Schedule</CardTitle>
          <CardDescription>
            Set your minimum payout amount and how often you want to receive payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Minimum Payout Threshold */}
          <div>
            <Label htmlFor="threshold">Minimum Payout Threshold ($)</Label>
            <div className="flex items-end gap-2 mt-2">
              <div className="flex-1">
                <Input
                  id="threshold"
                  type="number"
                  min="1"
                  step="0.01"
                  value={payoutThreshold}
                  onChange={(e) => setPayoutThreshold(e.target.value)}
                  placeholder="20"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Payouts below this amount will carry over to the next payout period
            </p>
          </div>

          {/* Payout Cadence */}
          <div>
            <Label htmlFor="cadence">Payout Frequency</Label>
            <select
              id="cadence"
              value={payoutCadence}
              onChange={(e) => setPayoutCadence(e.target.value)}
              className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
            >
              <option value="weekly">Weekly (every Monday)</option>
              <option value="biweekly">Bi-weekly (every other Monday)</option>
              <option value="monthly">Monthly (1st of the month)</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              How frequently you'd like to receive your commission payouts
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Example:</strong> If your threshold is $100 and cadence is weekly, payouts will only be processed when your pending commission reaches $100 or at the next weekly cutoff, whichever is higher.
            </AlertDescription>
          </Alert>

          {/* Save Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={loading}
              className={saved ? 'bg-green-600 hover:bg-green-600' : ''}
            >
              {loading ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout Schedule Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout Schedule Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <div>
                <strong>Processing Time:</strong> Payouts typically process within 2-3 business days
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <div>
                <strong>Minimum Amount:</strong> Must meet your configured threshold
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <div>
                <strong>Fees:</strong> Standard payment processing fees apply (see payout details)
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <div>
                <strong>Holds:</strong> Potential holds may apply per our fraud prevention policy
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}