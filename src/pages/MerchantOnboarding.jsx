import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Twitter, Github, Terminal, CheckCircle } from 'lucide-react';
import StepIndicator from '@/components/onboarding/StepIndicator';
import StepReferral from '@/components/onboarding/StepReferral';
import StepBusiness from '@/components/onboarding/StepBusiness';
import StepDocuments from '@/components/onboarding/StepDocuments';
import StepPaymentPrefs from '@/components/onboarding/StepPaymentPrefs';
import StepWallet from '@/components/onboarding/StepWallet';
import StepReview from '@/components/onboarding/StepReview';
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
  // Documents
  gov_id_url: '',
  business_license_url: '',
  void_check_url: '',
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [referralLocked, setReferralLocked] = useState(false);

  // Pre-fill and lock referral code from URL on mount (?ref= / ?referral= / ?code=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral') || params.get('code');
    if (ref) {
      const code = ref.toUpperCase().replace(/[^A-Z0-9]/g, '');
      setFormData((f) => ({ ...f, referral_code: code }));
      setReferralLocked(true);
    }
  }, []);

  const onChange = (key, value) => setFormData((f) => ({ ...f, [key]: value }));

  // Client-side validation: returns a list of human-readable field issues
  const validateForm = () => {
    const errs = {};
    if (!formData.business_name?.trim()) errs.business_name = 'Business name is required';
    if (!formData.owner_first_name?.trim()) errs.owner_first_name = 'Owner first name is required';
    if (!formData.owner_last_name?.trim()) errs.owner_last_name = 'Owner last name is required';
    if (!formData.owner_email?.trim()) {
      errs.owner_email = 'Owner email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.owner_email.trim())) {
      errs.owner_email = 'Enter a valid email address';
    }
    return errs;
  };

  // Translate backend error strings into clear, field-specific messages
  const parseBackendError = (msg) => {
    const m = (msg || '').toLowerCase();
    if (m.includes('already exists')) {
      return { message: 'An account with this email already exists. Please sign in or use a different email.', fields: { owner_email: 'Email already registered' } };
    }
    if (m.includes('business name') || m.includes('owner name') || m.includes('email are required')) {
      return {
        message: 'Missing required fields: business name, owner name, and email are required to submit.',
        fields: { business_name: 'Required', owner_first_name: 'Required', owner_last_name: 'Required', owner_email: 'Required' },
      };
    }
    return { message: msg || 'Registration failed. Please try again.', fields: {} };
  };

  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});
    const errs = validateForm();
    if (Object.keys(errs).length) {
      setError(`Please fix the following before submitting: ${Object.values(errs).join('; ')}.`);
      setFieldErrors(errs);
      // Jump to the first step containing an error so the applicant can fix it
      if (errs.business_name) setStep(2);
      else if (errs.owner_email || errs.owner_first_name || errs.owner_last_name) setStep(2);
      return;
    }
    setLoading(true);
    try {
      const owner_name = `${formData.owner_first_name} ${formData.owner_last_name}`.trim();
      const res = await base44.functions.invoke('createMerchantAccount', {
        business_name: formData.business_name,
        owner_name,
        owner_email: formData.owner_email,
        phone: formData.phone,
        address: formData.address,
        referral_code: formData.referral_code || null,
        wallet_address: formData.wallet_address || null,
        setup_demo_data: true,
        // Documents
        gov_id_url: formData.gov_id_url || null,
        business_license_url: formData.business_license_url || null,
        void_check_url: formData.void_check_url || null,
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
        const parsed = parseBackendError(res.data?.error);
        setError(parsed.message);
        setFieldErrors(parsed.fields);
        setLoading(false);
        setStep(2);
        return;
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
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
          <Link2 className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-black text-slate-900 tracking-tight">openTILL</span>
      </div>

      <div className="w-full max-w-md">
        <StepIndicator currentStep={step} />

        <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
          <CardContent className="p-7">
            {step === 1 && (
              <StepReferral
                formData={formData}
                onChange={onChange}
                onNext={() => setStep(2)}
                locked={referralLocked}
              />
            )}
            {step === 2 && (
              <StepBusiness
                formData={formData}
                onChange={onChange}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
                fieldErrors={fieldErrors}
              />
            )}
            {step === 3 && (
              <StepDocuments
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