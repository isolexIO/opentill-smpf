import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function SubmitChipPage() {
  const [user, setUser] = useState(null);
  const [builder, setBuilder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    short_description: '',
    description: '',
    category: 'other',
    repository_url: '',
    documentation_url: '',
    demo_url: '',
    logo_url: '',
    pricing_model: 'free',
    price: 0,
    billing_period: 'monthly',
    keywords: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        window.location.href = createPageUrl('EmailLogin');
        return;
      }
      setUser(currentUser);

      const builders = await base44.entities.Builder.filter({ user_email: currentUser.email });
      if (!builders || builders.length === 0) {
        window.location.href = createPageUrl('BuilderOnboarding');
        return;
      }
      setBuilder(builders[0]);
    } catch (err) {
      setError('Failed to load builder data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!formData.name || !formData.description || !formData.repository_url) {
        throw new Error('Please fill in all required fields');
      }

      const res = await base44.functions.invoke('submitChip', {
        builder_id: builder.id,
        builder_email: user.email,
        name: formData.name,
        short_description: formData.short_description,
        description: formData.description,
        category: formData.category,
        repository_url: formData.repository_url,
        documentation_url: formData.documentation_url,
        demo_url: formData.demo_url,
        logo_url: formData.logo_url,
        pricing_model: formData.pricing_model,
        price: formData.pricing_model !== 'free' ? parseFloat(formData.price) : 0,
        billing_period: formData.billing_period,
        keywords: formData.keywords.split(',').map((k) => k.trim()),
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Submission failed');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black">Submission Received!</h2>
              <p className="text-gray-600">
                Your Chip has been submitted for review. We'll notify you when it's published.
              </p>
            </div>
            <Button
              onClick={() => (window.location.href = createPageUrl('BuilderDashboard'))}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-4"
          >
            ← Back
          </Button>
          <h1 className="text-4xl font-black text-gray-900">Submit a New Chip</h1>
          <p className="text-gray-600 mt-2">
            Share your innovation with thousands of merchants
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900">Chip Information</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chip Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Advanced Inventory Manager"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short Description (one-liner) *
                  </label>
                  <Input
                    value={formData.short_description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, short_description: e.target.value }))
                    }
                    placeholder="Brief tagline for your chip"
                    disabled={submitting}
                    maxLength="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Detailed description of your chip, features, and benefits"
                    disabled={submitting}
                    rows="6"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  >
                    <option value="payment">Payment</option>
                    <option value="inventory">Inventory</option>
                    <option value="reporting">Reporting</option>
                    <option value="integration">Integration</option>
                    <option value="productivity">Productivity</option>
                    <option value="security">Security</option>
                    <option value="customization">Customization</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Links */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900">Documentation & Demo</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GitHub/Repository URL *
                  </label>
                  <Input
                    type="url"
                    value={formData.repository_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, repository_url: e.target.value }))
                    }
                    placeholder="https://github.com/username/chip"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documentation URL
                  </label>
                  <Input
                    type="url"
                    value={formData.documentation_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, documentation_url: e.target.value }))
                    }
                    placeholder="https://docs.example.com"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Live Demo URL
                  </label>
                  <Input
                    type="url"
                    value={formData.demo_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, demo_url: e.target.value }))}
                    placeholder="https://demo.example.com"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo URL
                  </label>
                  <Input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, logo_url: e.target.value }))
                    }
                    placeholder="https://example.com/logo.png"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900">Pricing</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pricing Model
                  </label>
                  <select
                    value={formData.pricing_model}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, pricing_model: e.target.value }))
                    }
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="one-time">One-time Purchase</option>
                    <option value="subscription">Subscription</option>
                    <option value="freemium">Freemium</option>
                  </select>
                </div>

                {formData.pricing_model !== 'free' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price (USD)
                      </label>
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, price: e.target.value }))
                        }
                        placeholder="9.99"
                        disabled={submitting}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Billing Period
                      </label>
                      <select
                        value={formData.billing_period}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, billing_period: e.target.value }))
                        }
                        disabled={submitting}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="one-time">One-time</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords (comma-separated)
                </label>
                <Input
                  value={formData.keywords}
                  onChange={(e) => setFormData((prev) => ({ ...prev, keywords: e.target.value }))}
                  placeholder="inventory, payment, integration"
                  disabled={submitting}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Chip'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}