import { posBase44 as base44 } from "@/lib/posClient";
import { createPageUrl } from "@/utils";

// initPOSSession — extracted from POS.jsx. Loads the merchant settings and
// resolves the station for the POS terminal.
//
// Auth model: a PIN/magic-link virtual session (no platform User record) is
// sufficient to run the POS. Entity calls route through posGateway via the
// posClient proxy. We only redirect to login if neither a real platform
// session nor a virtual PIN session exists — and that redirect goes to the
// PIN login (which itself offers email-link/Google), never straight to
// Google, so a merchant admin who signed in via email link isn't bounced
// out of the POS.

const defaultBarcodeScannerSettings = {
  enabled: false,
  type: "keyboard",
  prefix: "",
  playBeep: true,
  autoSearch: false,
  minLength: 4,
  scanTimeout: 150,
};

export async function initPOSSession({ setSettings, setStationId, setStationName, setInitError }) {
  try {
    console.log('POS: Loading settings and merchant...');

    let pinUser = null;
    let sessionUser = null;
    try {
      sessionUser = await base44.auth.me();
    } catch (e) {
      console.warn('POS: No authenticated session.');
    }

    // Station links carry both merchant_id and station_id so the POS can
    // restore the exact merchant context after a login redirect.
    const up = new URLSearchParams(window.location.search);
    const urlStationId = up.get('station_id') || '';
    const urlMerchantId = up.get('merchant_id') || '';

    // A PIN/magic-link virtual session is enough to run the POS — entity
    // calls route through posGateway via the posClient proxy. Only require a
    // login if neither a real platform session nor a virtual PIN session
    // exists, and send the user to the PIN login (not Google directly).
    const pinUserJSON = localStorage.getItem('pinLoggedInUser');
    const pinSessionToken = localStorage.getItem('pinSessionToken');
    if (pinUserJSON) {
      try { pinUser = JSON.parse(pinUserJSON); } catch (e) { /* ignore */ }
    }

    if (!sessionUser || !sessionUser.id) {
      // No real platform session. Require a PIN/magic-link virtual session.
      if (!pinUser || !pinUser.merchant_id || !pinSessionToken) {
        const params = new URLSearchParams();
        if (urlStationId) params.set('station_id', urlStationId);
        if (urlMerchantId) params.set('merchant_id', urlMerchantId);
        const qs = params.toString();
        const next = qs ? `${createPageUrl('POS')}?${qs}` : createPageUrl('POS');
        window.location.href = `${createPageUrl('PinLogin')}?next=${encodeURIComponent(next)}`;
        return;
      }
      // Virtual session — proceed; entity calls route through posGateway.
    } else {
      // Real session exists. Prefer the PIN identity if it belongs to the
      // same merchant as the session.
      if (pinUserJSON) {
        try {
          const local = JSON.parse(pinUserJSON);
          if (local && (local.is_impersonating || (local.merchant_id && local.merchant_id === sessionUser.merchant_id))) {
            pinUser = local;
          }
        } catch (e) { /* ignore malformed snapshot */ }
      }
      if (!pinUser) pinUser = sessionUser;
      if (!pinUser.is_impersonating) localStorage.setItem('pinLoggedInUser', JSON.stringify(pinUser));
    }

    // Prefer the merchant_id from the station link URL when present; otherwise
    // fall back to the session/PIN user's merchant_id.
    const effectiveMerchantId = urlMerchantId || pinUser.merchant_id;
    if (effectiveMerchantId) localStorage.setItem('deviceMerchantId', effectiveMerchantId);

    // Proceed based on whether we are in demo mode or a real merchant
    if (pinUser && effectiveMerchantId && effectiveMerchantId !== 'demo') {
      console.log('POS: Loading merchant with ID:', effectiveMerchantId);

      try {
        // With a virtual session, Merchant.filter routes through posGateway
        // (service role, scoped to the token's merchant). With a real
        // session, it uses the normal SDK (RLS).
        let merchants = [];
        try {
          merchants = await base44.entities.Merchant.filter({ id: effectiveMerchantId });
          console.log('POS: Merchant fetch returned:', merchants.length, 'results');
        } catch (userScopeError) {
          console.warn('POS: Merchant fetch failed:', userScopeError.message);
        }

        if (!merchants || merchants.length === 0) {
          // For real-session users, attempt the repair flow. Virtual users
          // have no platform session, so repair (which calls base44.auth.me)
          // cannot apply — the gateway should already return their merchant.
          if (sessionUser && sessionUser.id) {
            console.log('POS: Merchant not found, attempting repair...');
            try {
              const repairResponse = await base44.functions.invoke('repairMerchantConnection', {
                user_email: pinUser.email,
                user_merchant_id: effectiveMerchantId
              });
              if (repairResponse.data?.success) {
                const updatedUser = await base44.auth.me();
                localStorage.setItem('pinLoggedInUser', JSON.stringify(updatedUser));
                merchants = await base44.entities.Merchant.filter({ id: updatedUser.merchant_id });
                if (merchants && merchants.length > 0) {
                  pinUser = updatedUser;
                }
              } else {
                throw new Error(repairResponse.data?.error || 'Repair failed');
              }
            } catch (repairError) {
              console.error('POS: Repair failed:', repairError);
              throw new Error('Your merchant account could not be found. Please contact support with error code: MERCHANT_NOT_FOUND');
            }
          } else {
            throw new Error('Your merchant account could not be found. Please sign in again.');
          }
        }

        if (merchants && merchants.length > 0) {
          const merchant = merchants[0];
          console.log('POS: Merchant loaded:', merchant.business_name);

          let effectiveStationId = urlStationId || pinUser.pos_settings?.station_id;
          let effectiveStationName = pinUser.pos_settings?.station_name;
          let updatedPinUser = { ...pinUser };
          if (urlStationId) {
            try {
              const st = await base44.entities.Station.filter({ merchant_id: effectiveMerchantId, station_id: urlStationId });
              effectiveStationName = st?.length ? st[0].name : urlStationId;
            } catch { effectiveStationName = urlStationId; }
          }

          if (!effectiveStationId) {
            effectiveStationId = `STATION-${Date.now()}`;
            effectiveStationName = 'Main Station';
            updatedPinUser.pos_settings = {
              ...(updatedPinUser.pos_settings || {}),
              station_id: effectiveStationId,
              station_name: effectiveStationName
            };
            try {
              if (sessionUser && sessionUser.id) {
                await base44.auth.updateMe({ pos_settings: updatedPinUser.pos_settings });
              }
              localStorage.setItem('pinLoggedInUser', JSON.stringify(updatedPinUser));
              pinUser = updatedPinUser;
            } catch (updateError) {
              console.warn('POS: Could not update user with station info:', updateError);
            }
          } else {
            if (!effectiveStationName) {
              effectiveStationName = 'Main Station';
              updatedPinUser.pos_settings = {
                ...(updatedPinUser.pos_settings || {}),
                station_name: effectiveStationName
              };
              try {
                if (sessionUser && sessionUser.id) {
                  await base44.auth.updateMe({ pos_settings: updatedPinUser.pos_settings });
                }
                localStorage.setItem('pinLoggedInUser', JSON.stringify(updatedPinUser));
                pinUser = updatedPinUser;
              } catch (updateError) {
                console.warn('POS: Could not update user with station name:', updateError);
              }
            }
          }

          // Merge merchant settings with user pos_settings
          let currentSettings = {
            ...(merchant.settings || {}),
            ...(pinUser.pos_settings || {}),
            merchant_id: effectiveMerchantId
          };

          currentSettings.hardware = {
            ...currentSettings.hardware,
            barcodeScanner: {
              ...defaultBarcodeScannerSettings,
              ...(currentSettings.hardware?.barcodeScanner || {}),
            }
          };

          if (!currentSettings.blockchain) {
            currentSettings.blockchain = {
              enabled: false,
              network: 'mainnet',
              solana_wallet_address: '',
              btc_address: '',
              eth_address: ''
            };
          }

          if (!currentSettings.age_verification) {
            currentSettings.age_verification = { enabled: true };
          }

          if (!currentSettings.kitchen_display) {
            currentSettings.kitchen_display = { enabled: true };
          }

          setSettings(currentSettings);
          setStationId(effectiveStationId);
          setStationName(effectiveStationName);
          console.log('POS: Settings configured successfully for real merchant.');
        } else {
          throw new Error('Merchant not found after all attempts');
        }
      } catch (merchantError) {
        console.error('POS: Error loading merchant data:', merchantError);
        alert('Failed to load merchant data: ' + merchantError.message + '\n\nPlease contact support or try logging in again.');
        window.location.href = createPageUrl('PinLogin');
        return;
      }
    } else {
      // Demo mode
      console.log('POS: Running in demo mode');
      setSettings({
        merchant_id: 'demo',
        hardware: { barcodeScanner: defaultBarcodeScannerSettings },
        blockchain: { enabled: false },
        age_verification: { enabled: true },
        kitchen_display: { enabled: true }
      });
      setStationId('DEMO-STATION');
      setStationName('Demo Station');
      console.log('POS: Settings configured for demo mode.');
    }
  } catch (error) {
    console.error("POS: Fatal error in initPOSSession:", error);
    setInitError('Failed to load POS settings: ' + error.message);
  }
}