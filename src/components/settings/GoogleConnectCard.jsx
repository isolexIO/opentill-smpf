import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Link2, Unlink } from 'lucide-react';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

function loadGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(check);
          resolve();
        }
      }, 80);
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Identity script'));
    document.head.appendChild(s);
  });
}

export default function GoogleConnectCard() {
  const [clientId, setClientId] = useState(null);
  const [connectedEmail, setConnectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const buttonRef = useRef(null);
  const renderedRef = useRef(false);

  const pinToken = () => {
    try {
      return localStorage.getItem('pinSessionToken') || undefined;
    } catch {
      return undefined;
    }
  };

  const invoke = useCallback(async (action, extra = {}) => {
    const res = await base44.functions.invoke('connectGoogleAccount', {
      action,
      pin_session_token: pinToken(),
      ...extra,
    });
    const data = res.data;
    if (!data || !data.success) {
      throw new Error((data && data.error) || 'Google account request failed');
    }
    return data;
  }, []);

  const renderGoogleButton = useCallback(() => {
    if (!clientId || !window.google?.accounts?.id || !buttonRef.current || renderedRef.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'connect',
      shape: 'pill',
      width: 300,
    });
    renderedRef.current = true;
  }, [clientId]);

  const handleCredential = useCallback(async (response) => {
    setBusy(true);
    setError(null);
    try {
      const data = await invoke('connect', { id_token: response.credential });
      setConnectedEmail(data.google_email);
      window.google?.accounts?.id?.cancel?.();
    } catch (e) {
      setError(e?.message || 'Could not connect Google account');
    } finally {
      setBusy(false);
    }
  }, [invoke]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await invoke('init');
        if (!mounted) return;
        setClientId(data.client_id || null);
        setConnectedEmail(data.google_email || null);
        if (data.client_id) {
          await loadGis();
          if (!mounted) return;
          renderGoogleButton();
        }
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Google connection is not available');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [invoke, renderGoogleButton]);

  useEffect(() => {
    if (clientId && !loading) renderGoogleButton();
  }, [clientId, loading, renderGoogleButton]);

  const handleDisconnect = async () => {
    if (!confirm('Disconnect this Google account? You can reconnect it later.')) return;
    setBusy(true);
    setError(null);
    try {
      const data = await invoke('disconnect');
      setConnectedEmail(data.google_email || null);
      renderedRef.current = false;
      // Re-render the connect button if GIS is available
      if (clientId && window.google?.accounts?.id) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'connect',
          shape: 'pill',
          width: 300,
        });
        renderedRef.current = true;
      }
    } catch (e) {
      setError(e?.message || 'Could not disconnect');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading Google account settings…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Connected Google Account
        </CardTitle>
        <CardDescription>
          Link a Google account so you can sign in with Google whenever you need — even if it
          uses a different email than your POS login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {connectedEmail ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-900">{connectedEmail}</span>
                  <Badge className="bg-green-100 text-green-800 border-green-300">Connected</Badge>
                </div>
                <p className="text-sm text-green-700 mt-0.5">
                  You can use this Google account to sign in to openTILL.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={busy}
              className="bg-white"
            >
              <Unlink className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        ) : clientId ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              No Google account linked yet. Click below to connect yours.
            </p>
            <div ref={buttonRef} className="min-h-[40px]" />
            {busy && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying with Google…
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
            Google sign-in isn't configured for this app yet. An admin needs to set a Google OAuth
            Client ID before accounts can be linked.
          </div>
        )}
      </CardContent>
    </Card>
  );
}