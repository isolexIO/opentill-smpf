import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Shield, Loader2, CheckCircle, AlertCircle, Camera, FileCheck2, ExternalLink } from 'lucide-react';

/**
 * Reusable Stripe Identity verification card.
 * Works for both Ambassador ("ambassador") and Builder ("builder") portals.
 *
 * Props:
 *   entityType  - "ambassador" | "builder"
 *   entityId    - the Ambassador or Builder record id
 *   businessName, ownerEmail, ownerName - used to create the Stripe Identity session
 *   verified    - boolean, current verification state
 *   onVerified  - callback after verification is confirmed (e.g. reload parent data)
 */
export default function IdentityVerificationCard({
  entityType,
  entityId,
  businessName,
  ownerEmail,
  ownerName,
  verified,
  onVerified,
}) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('verification_session_id');
    const status = params.get('stripe_identity');
    if (sessionId && status === 'verified' && !verified) {
      confirmIdentity(sessionId);
      const url = new URL(window.location.href);
      url.searchParams.delete('verification_session_id');
      url.searchParams.delete('stripe_identity');
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  const confirmIdentity = async (sessionId) => {
    setVerifying(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('verifyEntityIdentity', {
        entity_type: entityType,
        entity_id: entityId,
        session_id: sessionId,
      });
      if (res.data?.verified) {
        onVerified?.();
      } else if (res.data?.status) {
        setError(`Verification status: ${res.data.status}. Please complete the verification and try again.`);
      } else {
        throw new Error(res.data?.error || 'Verification could not be confirmed');
      }
    } catch (err) {
      const msg = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to confirm identity verification';
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const startVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}?stripe_identity=verified`;
      const res = await base44.functions.invoke('createStripeIdentitySession', {
        business_name: businessName,
        owner_email: ownerEmail,
        owner_name: ownerName,
        entity_type: entityType,
        entity_id: entityId,
        return_url: returnUrl,
      });

      if (!res.data?.success || !res.data?.url) {
        throw new Error(res.data?.error || 'Failed to create verification session');
      }

      window.location.href = res.data.url;
    } catch (err) {
      const msg = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to start identity verification';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${verified ? 'bg-green-50' : 'bg-amber-50'}`}>
          {verified ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Shield className="w-5 h-5 text-amber-600" />}
        </div>
        <div>
          <h4 className="font-bold text-gray-900">Identity Verification</h4>
          <p className="text-sm text-gray-500">
            {verified
              ? 'Your identity has been verified with Stripe.'
              : 'Required before any payouts can be processed.'}
          </p>
        </div>
      </div>

      {verified ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <span className="text-green-700 font-semibold text-sm">Identity Verified</span>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
              <FileCheck2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Government-Issued ID</p>
                <p className="text-xs text-slate-500">Driver's license, passport, or ID card</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
              <Camera className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Selfie Photo</p>
                <p className="text-xs text-slate-500">A live selfie to match your ID</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <Button
            type="button"
            onClick={startVerification}
            disabled={loading || verifying}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing verification...</>
            ) : verifying ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming verification...</>
            ) : (
              <><Shield className="w-4 h-4 mr-2" /> Start Identity Verification <ExternalLink className="w-3 h-3 ml-1" /></>
            )}
          </Button>
          <p className="text-xs text-gray-400 text-center">
            You'll be redirected to Stripe's secure verification page. openTILL receives only the verification result, not your document images.
          </p>
        </>
      )}
    </div>
  );
}