import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function IntegrationCard({ app, onUpdate }) {
  const { name, category, description, icon: Icon, status: initialStatus } = app;
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    enabled: initialStatus === 'Installed',
    api_key: '',
    store_id: '',
    client_id: '',
    client_secret: '',
    auto_accept: false
  });
  
  const handleConnect = () => {
    setShowDialog(true);
  };
  
  const handleSave = async () => {
    setLoading(true);
    try {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      let currentUser = null;
      
      if (pinUserJSON) {
        currentUser = JSON.parse(pinUserJSON);
      } else {
        currentUser = await base44.auth.me();
      }
      
      if (!currentUser?.merchant_id) {
        alert('No merchant account found');
        return;
      }
      
      const merchants = await base44.entities.Merchant.filter({ id: currentUser.merchant_id });
      if (!merchants || merchants.length === 0) {
        alert('Merchant not found');
        return;
      }
      
      const merchant = merchants[0];
      const integrationKey = name.toLowerCase().replace(/\s+/g, '_').replace(/\./g, '');
      
      const updatedSettings = {
        ...merchant.settings,
        marketplace_integrations: {
          ...(merchant.settings?.marketplace_integrations || {}),
          [integrationKey]: {
            enabled: config.enabled,
            api_key: config.api_key,
            store_id: config.store_id,
            client_id: config.client_id,
            client_secret: config.client_secret,
            auto_accept: config.auto_accept,
            last_updated: new Date().toISOString()
          }
        }
      };
      
      await base44.entities.Merchant.update(merchant.id, { settings: updatedSettings });
      
      alert(`${name} ${config.enabled ? 'connected' : 'disconnected'} successfully!`);
      setShowDialog(false);
      
      // Trigger parent refresh
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Integration save error:', error);
      alert('Failed to save integration: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const getConfigFields = () => {
    const integrationKey = name.toLowerCase();
    
    if (integrationKey.includes('stripe') || integrationKey.includes('authorize') || integrationKey.includes('shift4')) {
      return [
        { key: 'api_key', label: 'API Key', type: 'password' },
        { key: 'store_id', label: 'Store/Merchant ID', type: 'text' }
      ];
    } else if (integrationKey.includes('doordash') || integrationKey.includes('grubhub')) {
      return [
        { key: 'api_key', label: 'API Key', type: 'password' },
        { key: 'store_id', label: 'Store ID', type: 'text' }
      ];
    } else if (integrationKey.includes('uber')) {
      return [
        { key: 'client_id', label: 'Client ID', type: 'text' },
        { key: 'client_secret', label: 'Client Secret', type: 'password' },
        { key: 'store_id', label: 'Store ID', type: 'text' }
      ];
    }
    
    return [
      { key: 'api_key', label: 'API Key', type: 'password' }
    ];
  };
  
  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                  <CardTitle>{name}</CardTitle>
                  <Badge variant="secondary">{category}</Badge>
              </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <Badge variant={initialStatus === 'Installed' ? 'default' : 'outline'}>{initialStatus}</Badge>
            <Button 
              variant={initialStatus === 'Installed' ? 'secondary' : 'default'}
              onClick={handleConnect}
            >
              {initialStatus === 'Installed' ? 'Manage' : 'Connect'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {name}</DialogTitle>
            <DialogDescription>
              Set up your {name} integration. Enter your API credentials below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <Label htmlFor="enable-integration">Enable Integration</Label>
              <Switch
                id="enable-integration"
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>
            
            {config.enabled && (
              <>
                {getConfigFields().map(field => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type={field.type}
                      value={config[field.key]}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  </div>
                ))}
                
                {(name.includes('DoorDash') || name.includes('Grubhub') || name.includes('Uber')) && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="auto-accept">Auto-Accept Orders</Label>
                      <p className="text-xs text-muted-foreground">Automatically accept incoming orders</p>
                    </div>
                    <Switch
                      id="auto-accept"
                      checked={config.auto_accept}
                      onCheckedChange={(checked) => setConfig({ ...config, auto_accept: checked })}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}