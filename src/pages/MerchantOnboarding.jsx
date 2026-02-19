import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Sparkles, Users, ArrowRight, Building2, Mail, Phone, MapPin } from 'lucide-react';

export default function MerchantOnboarding() {
  const [formData, setFormData] = useState({
    business_name: '',
    owner_first_name: '',
    owner_last_name: '',
    owner_email: '',
    phone: '',
    address: '',
    referral_code: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Logic for registration goes here (API call)
      // For now, simulating a successful submission
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-t-4 border-cyan-500 shadow-2xl bg-white">
          <CardContent className="pt-10 pb-10 text-center space-y-8">
            <div className="flex justify-center">
              <div className="bg-cyan-100 p-4 rounded-full animate-bounce">
                <CheckCircle className="h-16 w-16 text-cyan-600" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Registration Successful!</h2>
              <p className="text-slate-600 text-lg">Welcome to the <strong>openTILL</strong> merchant ecosystem.</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left space-y-4">
              <div className="flex items-start gap-4">
                <Sparkles className="h-6 w-6 text-cyan-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900">Official Launch Update</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Our full product suite and the <strong>$DUC</strong> (Digital Utility Credit) token presale dates are currently <strong>TBD</strong>. You are now officially registered for early priority access.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <p className="font-bold text-slate-800 flex items-center justify-center gap-2">
                <Users className="h-5 w-5 text-cyan-600" /> Join the Community
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="border-2 hover:bg-cyan-50" onClick={() => window.open('https://x.com/openTILL_SMPF')}>X</Button>
                <Button variant="outline" className="border-2 hover:bg-cyan-50" onClick={() => window.open('https://t.me/+TkWQAgyhHVk0YWEx')}>Telegram</Button>
                <Button variant="outline" className="border-2 hover:bg-cyan-50" onClick={() => window.open('https://discord.gg/WXuYRmzf7d')}>Discord</Button>
                <Button variant="outline" className="border-2 hover:bg-cyan-50" onClick={() => window.open('https://social.dscvr.one/p/opentill-smpf')}>DSCVR</Button>
              </div>
            </div>

            <Button 
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-14 text-xl font-bold shadow-lg shadow-cyan-200"
              onClick={() => window.location.href = '/'}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">openTILL</h1>
          <p className="text-cyan-600 font-bold tracking-widest uppercase text-sm">Merchant Empowerment Network</p>
        </div>

        <Card className="shadow-xl border-0 ring-1 ring-slate-200">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Merchant Registration</CardTitle>
            <CardDescription>Request early access to the $DUC ecosystem</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input 
                        id="business_name" 
                        className="pl-10 h-12"
                        placeholder="Your Store Name"
                        required
                        value={formData.business_name}
                        onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input 
                      id="first_name" 
                      className="h-12"
                      placeholder="John"
                      required
                      value={formData.owner_first_name}
                      onChange={(e) => setFormData({...formData, owner_first_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input 
                      id="last_name" 
                      className="h-12"
                      placeholder="Doe"
                      required
                      value={formData.owner_last_name}
                      onChange={(e) => setFormData({...formData, owner_last_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input 
                      id="email" 
                      type="email"
                      className="pl-10 h-12"
                      placeholder="owner@business.com"
                      required
                      value={formData.owner_email}
                      onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input 
                        id="phone" 
                        className="pl-10 h-12"
                        placeholder="(555) 000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Business Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input 
                        id="address" 
                        className="pl-10 h-12"
                        placeholder="123 Main St"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Label htmlFor="referral">Referral Code (Optional)</Label>
                  <Input 
                    id="referral" 
                    className="h-12 border-dashed border-2"
                    placeholder="ENTER-CODE"
                    value={formData.referral_code}
                    onChange={(e) => setFormData({...formData, referral_code: e.target.value})}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 bg-cyan-600 hover:bg-cyan-700 text-white text-lg font-bold"
                disabled={loading}
              >
                {loading ? "Processing..." : "Register for Early Access"}
                {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}