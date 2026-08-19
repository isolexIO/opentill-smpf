import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Twitter, Github, Terminal, CheckCircle } from 'lucide-react';
import StepIndicator from '@/components/onboarding/StepIndicator';
import StepReferral from '@/components/onboarding/StepReferral';
import StepBusiness from '@/components/onboarding/StepBusiness';
import StepStripeIdentity from '@/components/onboarding/StepStripeIdentity';
import { loadOnboardingForm, clearOnboardingForm } from '@/components/onboarding/StepStripeIdentity';
import StepPaymentPrefs from '@/components/onboarding/StepPaymentPrefs';
import StepWallet from '@/components/onboarding/StepWallet';
import StepReview from '@/components/onboarding/StepReview';
import AmbassadorBanner from '@/components/onboarding/AmbassadorBanner';
import SolanaWalletProvider from '@/components/auth/SolanaWalletProvider';

const INITIAL = {
  business_name: '',
  owner_first_name: '',
  owner_last_name: '',
  owner_email: '',
  phone: '',
  address: '',
  referral_code: '',
  wallet_address: '',
  // Stripe Identity
  stripe_verification_session_id: '',
  stripe_identity_verified: false,
  // Payment prefs
  accept_cash: true,
  accept_card: true,
  accept_ebt: false,
  accept_crypto: false,
  pricing_mode: 'surcharge',
};

export default function MerchantOnboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [referralLocked, setReferralLocked] = useState(false);
  const [dealerReferral, setDealerReferral] = useState(false);
  const [dealerId, setDealerId] = useState(null);
  const [ambassador, setAmbassador] = useState(null);

  // Pre-fill referral code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral') || params.get('code');
    const dId = params.get('dealer_id') || params.get('dealerid') || params.get('dealer');

    // Restore form data if returning from Stripe Identity redirect
    const restored = loadOnboardingForm();
    if (restored) {
      setFormData(prev => ({ ...prev, ...restored }));
      // If identity was verified via redirect, jump to the identity step
      // (StepStripeIdentity will detect the params and auto-advance to step 4)
      if (params.get('stripe_identity') === 'verified') {
        setStep(3);
      }
      clearOnboardingForm();
    }

    if (dId) {
      setFormData((f) => ({ ...f, referral_code: dId }));
      setReferralLocked(true);
      setDealerReferral(true);
      setDealerId(dId);
      // Load ambassador branding/contact info for the dealer referral so the
      // merchant knows who they're signing up under. Uses the public
      // getAmbassadorByReferral function (service-role, sanitized fields only).
      base44.functions.invoke('getAmbassadorByReferral', { dealer_id: dId })
        .then((res) => {
          if (res.data?.success && res.data.ambassador) {
            setAmbassador(res.data.ambassador);
          }
        })
        .catch(() => { /* non-fatal: banner is optional */ });
    } else if (ref) {
      setFormData((f) => ({ ...f, referral_code: ref.toUpperCase() }));
      setReferralLocked(true);
    }
  }, []);

  const onChange = (key, value) => setFormData((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const owner_name = `${formData.owner_first_name} ${formData.owner_last_name}`.trim();
      const res = await base44.functions.invoke('createMerchantAccount', {
        business_name: formData.business_name,
        owner_name,
        owner_email: formData.owner_email,
        phone: formData.phone,
        address: formData.address,
        dealer_id: dealerId || null,
        referral_code: dealerReferral ? null : (formData.referral_code || null),
        wallet_address: formData.wallet_address || null,
        setup_demo_data: true,
        // Stripe Identity
        stripe_verification_session_id: formData.stripe_verification_session_id || null,
        // Payment preferences
        payment_prefs: {
          accept_cash: formData.accept_cash,
          accept_card: formData.accept_card,
          accept_ebt: formData.accept_ebt,
          accept_crypto: formData.accept_crypto,
          pricing_mode: formData.pricing_mode,
        },
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Registration failed.');
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SolanaWalletProvider autoConnect={false}>
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl bg-white border-none rounded-3xl overflow-hidden">
          <CardContent className="pt-12 pb-10 text-center space-y-6 px-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-cyan-50 border-4 border-white shadow-inner flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-cyan-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Application Submitted!</h2>
              <p className="text-slate-500">
                Welcome to <span className="font-bold text-slate-800">openTILL</span>. Our team will review your application and activate your account within 24 hours.
              </p>
              {formData.referral_code && (
                <div className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 text-sm font-semibold px-4 py-2 rounded-full border border-cyan-200">
                  <CheckCircle className="w-4 h-4" />
                  Referral code <strong>{formData.referral_code}</strong> applied
                </div>
              )}
            </div>
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Join Our Community</p>
              <div className="grid grid-cols-3 gap-3">
                <a href="https://x.com/opentill" target="_blank" rel="noreferrer"
                   className="flex items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                  <Twitter className="h-5 w-5 text-slate-700" />
                </a>
                <a href="https://github.com/opentill" target="_blank" rel="noreferrer"
                   className="flex items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                  <Github className="h-5 w-5 text-slate-700" />
                </a>
                <a href="https://cmd.opentill.io" target="_blank" rel="noreferrer"
                   className="flex items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                  <Terminal className="h-5 w-5 text-slate-700" />
                </a>
              </div>
              <Button
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 rounded-xl text-base font-bold shadow-lg"
                onClick={() => window.location.href = createPageUrl('EmailLogin')}
              >
                Go to Merchant Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </SolanaWalletProvider>
    );
  }

  return (
    <SolanaWalletProvider autoConnect={false}>
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-10 px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png" alt="openTILL" className="object-contain" style={{ width: '175px', height: '175px' }} />
        </div>
        <div><span className="text-2xl font-black text-slate-900 tracking-tight">openTILL</span>
      </div>

      <div className="w-full max-w-md">
        <AmbassadorBanner ambassador={ambassador} />
        <StepIndicator currentStep={step} />

        <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
          <CardContent className="p-7">
            {step === 1 && (
              <StepReferral
                formData={formData}
                onChange={onChange}
                onNext={() => setStep(2)}
                locked={referralLocked}
                dealerReferral={dealerReferral}
              />
            )}
            {step === 2 && (
              <StepBusiness
                formData={formData}
                onChange={onChange}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <StepStripeIdentity
                formData={formData}
                onChange={onChange}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
              />
            )}
            {step === 4 && (
              <StepPaymentPrefs
                formData={formData}
                onChange={onChange}
                onNext={() => setStep(5)}
                onBack={() => setStep(3)}
              />
            )}
            {step === 5 && (
              <StepWallet
                formData={formData}
                onChange={onChange}
                onNext={() => setStep(6)}
                onBack={() => setStep(4)}
              />
            )}
            {step === 6 && (
              <StepReview
                formData={formData}
                onSubmit={handleSubmit}
                onBack={() => setStep(5)}
                loading={loading}
                error={error}
              />
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-4">
          Already have an account?{' '}
          <a href={createPageUrl('EmailLogin')} className="text-cyan-600 font-semibold hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
    </SolanaWalletProvider>
  );
}