import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Twitter, Github, Terminal, CheckCircle } from 'lucide-react';
import StepIndicator from '@/components/onboarding/StepIndicator';
import StepReferral from '@/components/onboarding/StepReferral';
import StepBusiness from '@/components/onboarding/StepBusiness';
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
};

export default function MerchantOnboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill referral code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral') || params.get('code');
    if (ref) {
      setFormData((f) => ({ ...f, referral_code: ref.toUpperCase() }));
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
        referral_code: formData.referral_code || null,
        wallet_address: formData.wallet_address || null,
        setup_demo_data: true,
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
              <StepWallet
                formData={formData}
                onChange={onChange}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
              />
            )}
            {step === 4 && (
              <StepReview
                formData={formData}
                onSubmit={handleSubmit}
                onBack={() => setStep(3)}
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
  );
}