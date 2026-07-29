import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Smartphone,
  Copy,
  CheckCircle,
  QrCode,
  RefreshCw,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  Wifi,
  Clock,
  Power,
  Link2,
} from 'lucide-react';
import QRCodeLib from 'qrcode';

export default function MobileStationSettings({ station, merchantId }) {
  const [copied, setCopied] = useState(false);
  const [qrSrc, setQrSrc] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeSessions, setActiveSessions] = useState(0);
  const [localStation, setLocalStation] = useState(station);

  useEffect(() => {
    setLocalStation(station);
  }, [station]);

  useEffect(() => {
    if (localStation?.mobile_access_enabled) {
      loadActiveSessions();
    }
  }, [localStation?.mobile_access_enabled, localStation?.id]);

  const loadActiveSessions = async () => {
    if (!localStation?.station_id) return;
    try {
      const sessions = await base44.entities.DeviceSession.filter({
        merchant_id: merchantId,
        station_id: localStation.station_id,
        device_type: 'mobile',
        status: 'online',
      });
      setActiveSessions(sessions?.length || 0);
    } catch (e) {
      // non-fatal
    }
  };

  const origin = window.location.origin;
  const mobileUrl = localStation?.mobile_station_token
    ? `${origin}/mobile/station/${localStation.mobile_station_token}`
    : null;

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('manageStationMobile', {
        action: 'generate_token',
        station_id: localStation.id,
      });
      if (res.data?.success) {
        setLocalStation({
          ...localStation,
          mobile_station_token: res.data.token,
          mobile_token_created_at: res.data.mobile_token_created_at,
          mobile_access_enabled: true,
        });
      } else {
        alert(res.data?.error || 'Failed to generate link');
      }
    } catch (e) {
      alert('Failed: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerating the secure link will immediately disconnect all mobile devices using the current link. Continue?')) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke('manageStationMobile', {
        action: 'regenerate_token',
        station_id: localStation.id,
      });
      if (res.data?.success) {
        setLocalStation({
          ...localStation,
          mobile_station_token: res.data.token,
          mobile_token_created_at: res.data.mobile_token_created_at,
          mobile_token_expires_at: null,
        });
      } else {
        alert(res.data?.error || 'Failed to regenerate link');
      }
    } catch (e) {
      alert('Failed: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleToggleAccess = async (enabled) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('manageStationMobile', {
        action: 'toggle_mobile_access',
        station_id: localStation.id,
        config: { enabled },
      });
      if (res.data?.success) {
        setLocalStation({ ...localStation, mobile_access_enabled: enabled });
      }
    } catch (e) {
      alert('Failed: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleSavePin = async () => {
    setPinError(null);
    if (pinInput && (pinInput.length < 4 || pinInput.length > 8)) {
      setPinError('PIN must be 4-8 characters');
      return;
    }
    if (pinInput !== pinConfirm) {
      setPinError('PINs do not match');
      return;
    }
    setBusy(true);
    try {
      const res = await base44.functions.invoke('manageStationMobile', {
        action: 'set_pin',
        station_id: localStation.id,
        pin: pinInput || null,
      });
      if (res.data?.success) {
        setLocalStation({ ...localStation, mobile_pin_hash: pinInput ? 'set' : null });
        setShowPinDialog(false);
        setPinInput('');
        setPinConfirm('');
      }
    } catch (e) {
      setPinError('Failed: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnectAll = async () => {
    if (!confirm('Disconnect all mobile devices for this station?')) return;
    setBusy(true);
    try {
      await base44.functions.invoke('manageStationMobile', {
        action: 'disconnect_all_mobile',
        station_id: localStation.id,
      });
      setActiveSessions(0);
    } catch (e) {
      alert('Failed: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleToggleQr = async () => {
    if (showQr) {
      setShowQr(false);
      return;
    }
    if (!mobileUrl) return;
    try {
      const src = await QRCodeLib.toDataURL(mobileUrl, { width: 200, margin: 1 });
      setQrSrc(src);
      setShowQr(true);
    } catch (e) {
      alert('Could not generate QR code');
    }
  };

  const handleCopy = async () => {
    if (!mobileUrl) return;
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Could not copy:\n' + mobileUrl);
    }
  };

  const formatDate = (d) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleString();
  };

  return (
    <div className="border-t border-slate-200 pt-3 mt-3 space-y-3">
      <div className="flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-gray-800">Mobile POS &amp; Customer Display</h4>
      </div>

      {!mobileUrl ? (
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <Link2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500 mb-3">
            No mobile link generated yet. Generate a secure link to use this station as a mobile customer display.
          </p>
          <Button onClick={handleGenerate} disabled={busy} size="sm">
            <Smartphone className="w-4 h-4 mr-1" />
            Generate Mobile Link
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Unique Mobile POS URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={mobileUrl} className="flex-1 font-mono text-xs h-9" />
              <Button variant="outline" size="sm" onClick={handleCopy} className="h-9">
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.open(mobileUrl, '_blank')} className="h-9" title="Open Mobile Display">
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToggleQr} className="h-9" title="Generate QR Code">
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {showQr && qrSrc && (
            <div className="flex justify-center bg-slate-50 rounded-lg py-3">
              <img src={qrSrc} alt="Mobile POS QR Code" className="w-40 h-40 border rounded p-1 bg-white" />
            </div>
          )}

          {/* Enable/disable + regenerate */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={localStation.mobile_access_enabled}
                onCheckedChange={handleToggleAccess}
                disabled={busy}
              />
              <span className="text-xs font-medium">
                {localStation.mobile_access_enabled ? 'Access Enabled' : 'Access Disabled'}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={busy} className="h-8 text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Regenerate Secure Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPinDialog(!showPinDialog)} className="h-8 text-xs">
              <KeyRound className="w-3.5 h-3.5 mr-1" />
              {localStation.mobile_pin_hash ? 'Change PIN' : 'Set PIN'}
            </Button>
          </div>

          {/* PIN dialog */}
          {showPinDialog && (
            <div className="border rounded-lg p-3 space-y-2 bg-slate-50">
              <Label className="text-xs text-gray-500">
                {localStation.mobile_pin_hash ? 'Change Station PIN (leave blank to remove)' : 'Set Station PIN'}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="password"
                  placeholder="Enter PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  type="password"
                  placeholder="Confirm PIN"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              {pinError && <p className="text-xs text-red-600">{pinError}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowPinDialog(false); setPinInput(''); setPinConfirm(''); setPinError(null); }}>Cancel</Button>
                <Button size="sm" onClick={handleSavePin} disabled={busy}>Save PIN</Button>
              </div>
            </div>
          )}

          {/* Connection status */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant={activeSessions > 0 ? 'default' : 'secondary'} className="gap-1">
              <Wifi className="w-3 h-3" />
              {activeSessions} active {activeSessions === 1 ? 'device' : 'devices'}
            </Badge>
            {activeSessions > 0 && (
              <Button variant="ghost" size="sm" onClick={handleDisconnectAll} disabled={busy} className="h-7 text-xs text-red-600">
                <Power className="w-3 h-3 mr-1" />
                Disconnect All
              </Button>
            )}
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              Last: {formatDate(localStation.last_mobile_connection_at)}
            </Badge>
            {localStation.mobile_pin_hash && (
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="w-3 h-3" />
                PIN Protected
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}