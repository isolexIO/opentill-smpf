import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Store, CheckCircle, Loader2, AlertCircle, Sparkles, TrendingUp, Users, BarChart3, Shield, Clock } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function MerchantOnboarding() {
  const [dealerId, setDealerId] = useState(null);
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    owner_email: '',
    phone: '',
    address: '',
    setup_demo_data: false
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dealer_id = urlParams.get('dealer_id');
    if (dealer_id) {
      setDealerId(dealer_id);
    }
  }, []);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Submitting merchant signup...', formData);
      const response = await base44.functions.invoke('createMerchantAccount', {
        ...formData,
        ...(dealerId && { dealer_id: dealerId })
      });
      console.log('Response received:', response);

      if (response.data?.success) {
        setSuccess(true);
      } else {
        setError(response.data?.error || 'Failed to submit registration');
      }
    } catch (err) {
      console.error('Merchant signup error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to submit registration. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-overlay filter blur-3xl animate-pulse delay-700"></div>
        </div>

        <Card className="w-full max-w-2xl shadow-2xl relative z-10">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              Registration Received!
            </CardTitle>
            <p className="text-gray-600 mt-2">We'll set up your account shortly</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-inner">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                What Happens Next?
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <p className="font-medium text-gray-900">Account Review</p>
                    <p className="text-sm text-gray-600">Our team will review your application within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <p className="font-medium text-gray-900">Account Activation</p>
                    <p className="text-sm text-gray-600">We'll create your admin account and send you login credentials via email</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <p className="font-medium text-gray-900">Start Your Free Trial</p>
                    <p className="text-sm text-gray-600">Log in and begin your 30-day free trial immediately</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-yellow-900 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span><strong>Check your inbox:</strong> We've sent a confirmation email to <strong>{formData.owner_email}</strong></span>
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-700 mb-3">
                <strong>Questions?</strong> Contact our support team at support@chainlinkpos.com
              </p>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg h-14 shadow-lg" 
              onClick={() => window.location.href = createPageUrl('Home')}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-overlay filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-300 rounded-full mix-blend-overlay filter blur-3xl animate-pulse delay-500"></div>
      </div>

      <Card className="w-full max-w-4xl shadow-2xl relative z-10">
        <CardHeader className="text-center pb-6 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg transform hover:scale-110 transition-transform">
            <Store className="w-11 h-11 text-white" />
          </div>
          <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {dealerId ? 'Add Your Business' : 'Start Your POS Journey'}
          </CardTitle>
          <p className="text-gray-600 mt-3 text-lg">
            {dealerId 
              ? 'Complete your registration to get started' 
              : 'Join thousands of merchants. Start your 30-day free trial today!'}
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-shake">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-900 text-sm font-semibold">Unable to submit registration</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="business_name" className="text-gray-700 font-medium">Business Name *</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Acme Coffee Shop"
                  required
                  className="mt-1.5 h-12 border-2 focus:border-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="owner_name" className="text-gray-700 font-medium">Your Name *</Label>
                <Input
                  id="owner_name"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="mt-1.5 h-12 border-2 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="owner_email" className="text-gray-700 font-medium">Email Address *</Label>
              <Input
                id="owner_email"
                type="email"
                value={formData.owner_email}
                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                placeholder="you@business.com"
                required
                className="mt-1.5 h-12 border-2 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="phone" className="text-gray-700 font-medium">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="mt-1.5 h-12 border-2 focus:border-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="address" className="text-gray-700 font-medium">Business Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, City, State"
                  className="mt-1.5 h-12 border-2 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-purple-50 p-4 rounded-xl border border-purple-200">
              <Checkbox
                id="setup_demo_data"
                checked={formData.setup_demo_data}
                onCheckedChange={(checked) => setFormData({ ...formData, setup_demo_data: checked })}
                className="mt-1"
              />
              <label htmlFor="setup_demo_data" className="text-sm font-medium leading-relaxed cursor-pointer">
                <span className="text-purple-900">Set up demo products</span>
                <p className="text-purple-700 font-normal mt-1">Get started quickly with sample menu items and products</p>
              </label>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
              <p className="font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Everything You Need to Succeed
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span>Real-time sales analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Customer loyalty programs</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <span>Advanced reporting</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span>Multi-location support</span>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting Registration...
                </>
              ) : (
                <>
                  Submit Registration
                  <Sparkles className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <a href={createPageUrl('PinLogin')} className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                Sign in here
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}