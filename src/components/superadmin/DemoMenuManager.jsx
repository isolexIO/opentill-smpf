import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

export default function DemoMenuManager() {
  const [email, setEmail] = useState('');
  const [menuType, setMenuType] = useState('restaurant');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleClearData = async () => {
    if (!email) {
      setError('Please enter merchant email');
      return;
    }

    if (!confirm('This will delete ALL departments and products for this merchant. Are you sure?')) {
      return;
    }

    setClearing(true);
    setError('');
    setResult(null);

    try {
      console.log('DemoMenuManager: Clearing data for:', email);
      
      const response = await base44.functions.invoke('clearDemoMenu', { email: email.trim() });

      console.log('DemoMenuManager: Clear response:', response.data);

      if (response.data && response.data.success) {
        setResult(response.data);
      } else {
        setError(response.data?.error || 'Failed to clear data');
      }
    } catch (err) {
      console.error('DemoMenuManager: Error clearing data:', err);
      setError(err.message || 'Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  const handleSetup = async () => {
    if (!email) {
      setError('Please enter merchant email');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('DemoMenuManager: Setting up demo menu for:', email);
      const response = await base44.functions.invoke('setupDemoMenu', { email: email.trim(), menu_type: menuType });

      console.log('DemoMenuManager: Setup response:', response.data);

      if (response.data && response.data.success) {
        setResult(response.data);
      } else {
        setError(response.data?.error || 'Setup failed');
      }
    } catch (err) {
      console.error('DemoMenuManager: Error setting up demo menu:', err);
      setError(err.message || 'Failed to setup demo menu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo Menu Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="email">Merchant Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="merchant@example.com"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Menu Type</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => setMenuType('restaurant')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                menuType === 'restaurant'
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-700 font-semibold'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">🍽️</span>
              <div className="text-left">
                <div className="text-sm font-medium">Restaurant</div>
                <div className="text-xs opacity-70">Appetizers, entrees, etc.</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMenuType('retail')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                menuType === 'retail'
                  ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">🛒</span>
              <div className="text-left">
                <div className="text-sm font-medium">Retail</div>
                <div className="text-xs opacity-70">Groceries, household, etc.</div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleClearData}
            disabled={clearing || loading}
            variant="destructive"
            className="flex-1"
          >
            {clearing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </>
            )}
          </Button>

          <Button
            onClick={handleSetup}
            disabled={loading || clearing}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              `Setup ${menuType === 'retail' ? 'Retail' : 'Restaurant'} Demo Menu`
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {result.message}
              {result.stats && (
                <div className="mt-2 text-sm">
                  <div>Departments: {result.stats.departments}</div>
                  <div>Products: {result.stats.products}</div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-500 mt-4">
          <p className="font-medium mb-2">Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Enter the merchant's email address</li>
            <li>Choose Restaurant or Retail menu type</li>
            <li>Click "Clear All Data" to remove any existing demo data (including duplicates)</li>
            <li>Click "Setup Demo Menu" to create fresh demo data with 10 departments</li>
            <li>Refresh the POS page to see the changes</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}