import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, Clock, AlertCircle, Loader2, Zap } from 'lucide-react';

const CADENCES = [
  { value: 'weekly',   label: 'Weekly',    desc: 'Every Monday',             icon: '📅' },
  { value: 'biweekly', label: 'Bi-Weekly', desc: 'Every other Monday',        icon: '📆' },
  { value: 'monthly',  label: 'Monthly',   desc: '1st of every month',        icon: '🗓️' },
];

export default function PayoutScheduler({ dealer, onUpdate }) {
  const [threshold,   setThreshold]   = useState(dealer?.payout_minimum || 20);
  const [cadence,     setCadence]     = useState(dealer?.payout_cadence || 'monthly');
  const [holdDays,    setHoldDays]    = useState(dealer?.payout_hold_days || 7);
  const [autoProcess, setAutoProcess] = useState(dealer?.auto_process_payouts ?? true);
  const [loading,     setLoading]     = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [msg,         setMsg]         = useState(null);

  const handleSave = async () => {
    if (threshold < 1) { alert('Threshold must be at least $1'); return; }
    if (holdDays < 0 || holdDays > 30) { alert('Hold period must be 0–30 days'); return; }
    setLoading(true);
    try {
      await base44.entities.Dealer.update(dealer.id, {
        payout_minimum: parseFloat(threshold),
        payout_cadence: cadence,
        payout_hold_days: parseInt(holdDays),
        auto_process_payouts: autoProcess,
      });
      setSaved(true);
      setMsg({ type: 'success', text: 'Schedule settings saved successfully.' });
      setTimeout(() => { setSaved(false); setMsg(null); }, 3000);
      onUpdate?.();
    } catch (e) {
      setMsg({ type: 'error', text: `Failed to save: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Calculate next payout date based on cadence
  const getNextPayoutDate = () => {
    const now = new Date();
    let next;
    if (cadence === 'weekly') {
      next = new Date(now);
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      next.setDate(now.getDate() + daysUntilMonday);
    } else if (cadence === 'biweekly') {
      next = new Date(now);
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      next.setDate(now.getDate() + daysUntilMonday + 7);
    } else {
      next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    // Add hold days
    next.setDate(next.getDate() + parseInt(holdDays || 0));
    return next.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {msg && (
        <Alert className={msg.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {msg.type === 'success'
            ? <CheckCircle className="h-4 w-4 text-green-600" />
            : <AlertCircle className="h-4 w-4 text-red-600" />}
          <AlertDescription className={msg.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {msg.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Cadence Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /> Payout Frequency</CardTitle>
          <CardDescription>Choose how often automated payouts are calculated and scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CADENCES.map(c => (
              <button
                key={c.value}
                onClick={() => setCadence(c.value)}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                  cadence === c.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <p className={`font-bold text-sm ${cadence === c.value ? 'text-blue-800' : 'text-gray-800'}`}>{c.label}</p>
                  <p className="text-xs text-gray-500">{c.desc}</p>
                </div>
                {cadence === c.value && (
                  <Badge className="bg-blue-500 text-white text-[10px]">Active</Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Threshold & Hold */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-orange-600" /> Payout Rules</CardTitle>
          <CardDescription>Set minimum amount and how long funds are held before release</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="threshold">Minimum Payout Threshold ($)</Label>
              <Input
                id="threshold"
                type="number" min="1" step="1"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
              />
              <p className="text-xs text-gray-500">Amounts below this carry over to the next period</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="holdDays">Hold Period (days)</Label>
              <Input
                id="holdDays"
                type="number" min="0" max="30" step="1"
                value={holdDays}
                onChange={e => setHoldDays(e.target.value)}
              />
              <p className="text-xs text-gray-500">Days after period end before payout is released (0 = immediate)</p>
            </div>
          </div>

          {/* Auto-process toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Automatic Processing
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Automatically process payouts when threshold is met on schedule</p>
            </div>
            <button
              onClick={() => setAutoProcess(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoProcess ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoProcess ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Next Payout Preview */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 text-sm">Estimated Next Payout Date</p>
              <p className="text-blue-700 font-bold">{getNextPayoutDate()}</p>
              <p className="text-blue-600 text-xs mt-0.5">Based on {cadence} cadence + {holdDays} day hold period</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className={saved ? 'bg-green-600 hover:bg-green-600' : ''}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            : saved
              ? <><CheckCircle className="w-4 h-4 mr-2" />Saved!</>
              : 'Save Schedule Settings'}
        </Button>
      </div>
    </div>
  );
}