import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Shield, Loader2, CheckCircle, AlertCircle, Camera, FileCheck2, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'opentill_onboarding_form';

export function saveOnboardingForm(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
}

export function loadOnboardingForm() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export function clearOnboardingForm() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

export default function StepStripeIdentity({ formData, onChange, onNext, onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Detect returning from Stripe Identity redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('verification_session_id');
    const status = params.get('stripe_identity');
    if (sessionId && status === 'verified') {
      onChange('stripe_verification_session_id', sessionId);
      onChange('stripe_identity_verified', true);
      // Clean the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('verification_session_id');
      url.searchParams.delete('stripe_identity');
      window.history.replaceState({}, document.title, url.toString());
      // Auto-advance to the next step now that identity is verified
      const t = setTimeout(() => { if (typeof onNext === 'function') onNext(); }, 400);
      return () => clearTimeout(t);
    }
  }, []);

  const startVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      // Save form state so we can restore after the redirect
      saveOnboardingForm(formData);

      const returnUrl = `${window.location.origin}${window.location.pathname}?stripe_identity=verified`;
      const res = await base44.functions.invoke('createStripeIdentitySession', {
        business_name: formData.business_name,
        owner_email: formData.owner_email,
        owner_name: `${formData.owner_first_name || ''} ${formData.owner_last_name || ''}`.trim(),
        return_url: returnUrl,
      });

      if (!res.data?.success || !res.data?.url) {
        throw new Error(res.data?.error || 'Failed to create verification session');
      }

      // Redirect to Stripe-hosted verification page
      window.location.href = res.data.url;
    } catch (err) {
      const msg = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to start identity verification';
      setError(msg);
      setLoading(false);
    }
  };

  const alreadyVerified = formData.stripe_identity_verified;

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 mb-2">
        <div className="flex justify-center mb-2">
          <div className="w-14 h-14 rounded-full bg-cyan-50 flex items-center justify-center">
            <Shield className="w-7 h-7 text-cyan-500" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-900">Identity Verification</h2>
        <p className="text-slate-500 text-sm">
          Verify your identity with Stripe's secure verification. You'll need a government-issued ID and a selfie.
        </p>
      </div>

      {alreadyVerified ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-4">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="text-green-700 font-semibold text-sm">Identity Verified</p>
            <p className="text-green-600 text-xs">Your identity has been verified with Stripe.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
              <FileCheck2 className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Government-Issued ID</p>
                <p className="text-xs text-slate-500">Driver's license, passport, or ID card</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
              <Camera className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
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
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing verification...</>
            ) : (
              <><Shield className="w-4 h-4 mr-2" /> Start Identity Verification <ExternalLink className="w-3 h-3 ml-1" /></>
            )}
          </Button>
        </>
      )}

      <div className="bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-3 text-xs text-cyan-700">
        You'll be redirected to Stripe's secure verification page. Your ID and selfie are processed by Stripe — openTILL receives only the verification result, not your document images.
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12" disabled={loading}>Back</Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!alreadyVerified || loading}
          className="flex-[2] bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}