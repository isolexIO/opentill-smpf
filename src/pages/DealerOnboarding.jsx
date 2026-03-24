import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, CheckCircle, Loader2, AlertCircle, ArrowRight, Rocket, Shield, DollarSign, Globe } from 'lucide-react';
import { createPageUrl } from '@/utils';

const STEPS = ['Account Info', 'Your Brand', 'Review'];

export default function DealerOnboarding() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    dealer_name: '', owner_name: '', owner_email: '', contact_phone: '', slug: '',
    primary_color: '#10b981', secondary_color: '#7c3aed'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState('');

  const handleSlugChange = (value) => {
    setFormData({ ...formData, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) });
  };

  const nextStep = () => {
    setError('');
    if (step === 0) {
      if (!formData.dealer_name || !formData.owner_name || !formData.owner_email) {
        setError('Please fill in all required fields'); return;
      }
    }
    if (step === 1 && formData.slug.length < 3) {
      setError('Slug must be at least 3 characters'); return;
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await base44.functions.invoke('createDealerAccount', formData);
      if (data?.success || data?.dealer) {
        setCredentials({
          pin: data.credentials?.pin,
          email: data.user?.email,
          temp_password: data.credentials?.temp_password,
          slug: data.dealer?.slug
        });
        setSuccess(true);
      } else {
        setError(data?.error || 'Failed to create account');
      }
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally { setLoading(false); }
  };

  if (success && credentials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-white/8 border-white/15 backdrop-blur-xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-1">You're In! 🎉</h2>
              <p className="text-white/50 text-sm">Your ambassador account is ready. Here are your credentials.</p>
            </div>
            <div className="space-y-3 text-left">
              {[
                { label: 'Email', value: credentials.email },
                { label: '6-Digit POS PIN', value: credentials.pin },
                { label: 'Your Portal URL', value: `https://${credentials.slug}.chainlinkpos.isolex.io` },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="text-white/40 text-xs uppercase tracking-wide mb-1">{item.label}</div>
                  <div className="text-white font-mono text-sm break-all">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-blue-200 text-xs text-left">
              <strong>Check your email!</strong> You'll receive an invitation to set up your account. Log in with Google or the magic link — no password needed.
            </div>
            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm text-left">Next Steps:</h4>
              <ol className="text-left space-y-1 text-white/50 text-sm">
                {['Log in and complete your branding', 'Set up Stripe Connect for payouts', 'Customize your landing page', 'Start inviting merchants!'].map((s, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="text-emerald-400 font-bold">{i + 1}.</span> {s}</li>
                ))}
              </ol>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white font-semibold"
              onClick={() => window.location.href = createPageUrl('EmailLogin')}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png" alt="openTILL" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-black text-white">Become an openTILL Ambassador</h1>
          <p className="text-white/50 text-sm mt-1">White-label POS · Recurring commissions · 30-day free trial</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                i === step ? 'bg-emerald-500 text-white' : i < step ? 'bg-emerald-900/50 text-emerald-400' : 'bg-white/5 text-white/30'
              }`}>
                {i < step ? <CheckCircle className="w-3 h-3" /> : <span>{i + 1}</span>}
                {s}
              </div>
              {i < STEPS.length - 1 && <div className={`h-px w-6 ${i < step ? 'bg-emerald-500' : 'bg-white/10'}`} />}
            </React.Fragment>
          ))}
        </div>

        <Card className="bg-white/8 border-white/15 backdrop-blur-xl">
          <CardContent className="p-6">
            {error && (
              <Alert className="mb-4 bg-red-500/15 border-red-400/30">
                <AlertCircle className="h-4 w-4 text-red-300" />
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}

            {/* STEP 0: Account Info */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Account Information</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">Company Name *</Label>
                    <Input placeholder="Acme POS Co."
                      value={formData.dealer_name}
                      onChange={e => setFormData({ ...formData, dealer_name: e.target.value })}
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/20 focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">Your Name *</Label>
                    <Input placeholder="Jane Smith"
                      value={formData.owner_name}
                      onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/60 text-xs">Email Address *</Label>
                  <Input type="email" placeholder="jane@acmepos.com"
                    value={formData.owner_email}
                    onChange={e => setFormData({ ...formData, owner_email: e.target.value })}
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/20 focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/60 text-xs">Phone</Label>
                  <Input type="tel" placeholder="(555) 123-4567"
                    value={formData.contact_phone}
                    onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/20 focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { icon: DollarSign, text: '10–30% recurring commission' },
                    { icon: Globe, text: 'Custom domain & SSL' },
                    { icon: Shield, text: '30-day free trial' },
                  ].map((b, i) => (
                    <div key={i} className="flex flex-col items-center text-center gap-1 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                      <b.icon className="w-5 h-5 text-emerald-400" />
                      <span className="text-white/50 text-xs">{b.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 1: Branding */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Your Brand Identity</h2>
                <div className="space-y-1">
                  <Label className="text-white/60 text-xs">Portal Slug (URL) *</Label>
                  <Input placeholder="yourcompany"
                    value={formData.slug}
                    onChange={e => handleSlugChange(e.target.value)}
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/20 focus:border-emerald-500"
                  />
                  <p className="text-white/30 text-xs">
                    Portal URL: https://<span className="text-emerald-400">{formData.slug || 'yourcompany'}</span>.chainlinkpos.isolex.io
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">Primary Color</Label>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-md px-3 py-2">
                      <input type="color" value={formData.primary_color}
                        onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-white font-mono text-sm">{formData.primary_color}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">Secondary Color</Label>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-md px-3 py-2">
                      <input type="color" value={formData.secondary_color}
                        onChange={e => setFormData({ ...formData, secondary_color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-white font-mono text-sm">{formData.secondary_color}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-white/10" style={{
                  background: `linear-gradient(135deg, ${formData.primary_color}22, ${formData.secondary_color}22)`
                }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                      background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})`
                    }}>
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{formData.dealer_name || 'Your Company'}</div>
                      <div className="text-white/40 text-xs">Point of Sale</div>
                    </div>
                  </div>
                  <p className="text-white/40 text-xs mt-2">Preview of your branded navbar</p>
                </div>
              </div>
            )}

            {/* STEP 2: Review */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Review & Confirm</h2>
                <div className="space-y-2">
                  {[
                    { label: 'Company', value: formData.dealer_name },
                    { label: 'Owner', value: formData.owner_name },
                    { label: 'Email', value: formData.owner_email },
                    { label: 'Phone', value: formData.contact_phone || 'Not provided' },
                    { label: 'Portal Slug', value: formData.slug },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-white/40 text-sm">{item.label}</span>
                      <span className="text-white text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-white/40 text-sm">Brand Colors</span>
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full border border-white/20" style={{ background: formData.primary_color }} />
                      <div className="w-5 h-5 rounded-full border border-white/20" style={{ background: formData.secondary_color }} />
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-300 text-xs">
                  ✓ 30-day free trial · No credit card required · 10–30% recurring commissions
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}
                  className="flex-1 bg-white/5 border-white/15 text-white hover:bg-white/10">
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={nextStep}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white font-semibold">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : <><Rocket className="w-4 h-4 mr-2" /> Launch My Platform</>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-white/30 text-xs">
          Already an ambassador?{' '}
          <a href={createPageUrl('DealerLanding')} className="text-emerald-400 hover:underline">Sign in →</a>
        </p>
      </div>
    </div>
  );
}