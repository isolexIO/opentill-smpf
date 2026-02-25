import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function BuilderOnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    bio: '',
    website: '',
    github_url: '',
    twitter_url: '',
    support_email: '',
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser) {
        setUser(currentUser);
        setFormData((prev) => ({
          ...prev,
          full_name: currentUser.full_name || '',
          support_email: currentUser.email,
        }));
      }
    } catch (err) {
      console.error('Not authenticated');
    }
  };

  const handleCreateBuilder = async () => {
    setLoading(true);
    setError('');
    try {
      if (!formData.full_name || !formData.company_name || !formData.support_email) {
        throw new Error('Please fill in all required fields');
      }

      const res = await base44.functions.invoke('createBuilderProfile', {
        user_email: user?.email || formData.support_email,
        full_name: formData.full_name,
        company_name: formData.company_name,
        bio: formData.bio,
        website: formData.website,
        github_url: formData.github_url,
        twitter_url: formData.twitter_url,
        support_email: formData.support_email,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to create profile');
      }

      setStep(2);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('initStripeConnect', {
        user_email: user.email,
      });

      if (!res.data?.url) {
        throw new Error('Failed to initiate Stripe Connect');
      }

      window.location.href = res.data.url;
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-12 pb-10 text-center space-y-6 px-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-white shadow-inner flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Welcome to the Builder Program!</h2>
              <p className="text-slate-500">
                Your account is set up and ready. You can now start submitting Chips to the marketplace.
              </p>
            </div>
            <Button
              onClick={() => (window.location.href = createPageUrl('BuilderDashboard'))}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 font-bold"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-2">Join the Builder Program</h1>
          <p className="text-slate-600">Set up your account in just 2 steps</p>
        </div>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-8">
            {/* Step 1: Profile Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Step 1: Your Profile</h2>
                  <p className="text-slate-600 text-sm">Tell us about yourself</p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                      }
                      placeholder="Your name"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Company/Solo Name *
                    </label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, company_name: e.target.value }))
                      }
                      placeholder="Company or your developer name"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Bio
                    </label>
                    <Input
                      value={formData.bio}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                      placeholder="Brief bio about you"
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Website
                      </label>
                      <Input
                        value={formData.website}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, website: e.target.value }))
                        }
                        placeholder="https://example.com"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        GitHub
                      </label>
                      <Input
                        value={formData.github_url}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, github_url: e.target.value }))
                        }
                        placeholder="github.com/username"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Twitter
                      </label>
                      <Input
                        value={formData.twitter_url}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, twitter_url: e.target.value }))
                        }
                        placeholder="twitter.com/username"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Support Email *
                      </label>
                      <Input
                        value={formData.support_email}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, support_email: e.target.value }))
                        }
                        placeholder="support@example.com"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCreateBuilder}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 font-bold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    'Continue to Payment Setup'
                  )}
                </Button>
              </div>
            )}

            {/* Step 2: Stripe Connect */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Step 2: Payment Setup</h2>
                  <p className="text-slate-600 text-sm">Connect Stripe to receive earnings</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0 font-bold">
                      ✓
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Profile Created</p>
                      <p className="text-sm text-slate-600">{formData.company_name}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-lg p-6">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Why Stripe Connect?</h3>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>✓ Automatic payouts to your bank account</li>
                      <li>✓ Real-time revenue tracking</li>
                      <li>✓ Secure and compliant payment processing</li>
                      <li>✓ Tax reporting and 1099 forms</li>
                    </ul>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    onClick={handleStripeConnect}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 font-bold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redirecting to Stripe...
                      </>
                    ) : (
                      'Connect Stripe Account'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSuccess(true)}
                    className="w-full h-12 text-slate-600"
                    disabled={loading}
                  >
                    Skip for Now
                  </Button>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  You can set up Stripe Connect anytime from your dashboard.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}