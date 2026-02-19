import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Sparkles, Users, ArrowRight, Building2, Mail, Phone, MapPin, Terminal } from 'lucide-react';

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

  const ducLogo = "https://opentill.io/$DUC.png";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
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
        <Card className="w-full max-w-2xl border-t-4 border-cyan-500 shadow-2xl bg-white">
          <CardContent className="pt-10 pb-10 text-center space-y-8">
            <div className="flex justify-center">
              <div className="bg-cyan-100 p-4 rounded-full animate-bounce">
                <CheckCircle className="h-16 w-16 text-cyan-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">Welcome to openTILL!</h2>
              <p className="text-slate-600 text-lg">
                Your merchant account for <strong>{formData.business_name}</strong> has been created.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 max-w-md mx-auto pt-4">
              <Button 
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-6 text-lg shadow-lg"
                onClick={() => window.location.href = '/dashboard'}
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <Button 
                variant="outline" 
                className="w-full border-cyan-200 hover:bg-cyan-50 text-cyan-700 py-6"
                onClick={() => window.open('https://cmd.opentill.io', '_blank')}
              >
                <Terminal className="mr-2 h-5 w-5" />
                Launch Whitepaper Terminal
              </Button>
            </div>

            <p className="text-sm text-slate-400">
              Check your email ({formData.owner_email}) for login credentials and setup instructions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-3">
            <img src={ducLogo} alt="$DUC" className="h-12 w-12" />
            <h1 className="text-4xl font-black tracking-tight text-slate-900">openTILL</h1>
          </div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            The next generation of point-of-sale, powered by Digital Utility Credits ($DUC).
          </p>
        </div>

        <Card className="border-none shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5">
            <div className="md:col-span-2 bg-cyan-600 p-8 text-white space-y-8">
              <h3 className="text-2xl font-bold">Why openTILL?</h3>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="bg-cyan-500/30 p-2 rounded-lg shrink-0">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Zero Processing Fees</p>
                    <p className="text-cyan-100 text-sm font-light">Keep 100% of what you earn using our $DUC ecosystem.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-cyan-500/30 p-2 rounded-lg shrink-0">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Referral Rewards</p>
                    <p className="text-cyan-100 text-sm font-light">Earn $DUC for every merchant you bring to the platform.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-cyan-500/30 p-2 rounded-lg shrink-0">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Enterprise Tools</p>
                    <p className="text-cyan-100 text-sm font-light">Full inventory management and AI-powered insights.</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-auto border-t border-cyan-500/50">
                <p className="text-cyan-100 text-xs uppercase tracking-widest font-bold mb-2">Technical Specs</p>
                <button 
                  onClick={() => window.open('https://cmd.opentill.io', '_blank')}
                  className="text-white hover:text-cyan-200 flex items-center gap-2 text-sm underline underline-offset-4 bg-transparent border-none cursor-pointer p-0"
                >
                  <Terminal size={14} /> Read the Whitepaper
                </button>
              </div>
            </div>

            <div className="md:col-span-3 p-8 bg-white">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name" className="text-slate-700">Business Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        id="business_name"
                        required
                        className="pl-10"
                        placeholder="Main Street Cafe"
                        value={formData.business_name}
                        onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name" className="text-slate-700">Owner First Name</Label>
                      <Input 
                        id="first_name"
                        required
                        placeholder="John"
                        value={formData.owner_first_name}
                        onChange={(e) => setFormData({...formData, owner_first_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name" className="text-slate-700">Owner Last Name</Label>
                      <Input 
                        id="last_name"
                        required
                        placeholder="Doe"
                        value={formData.owner_last_name}
                        onChange={(e) => setFormData({...formData, owner_last_name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        id="email"
                        required
                        type="email"
                        className="pl-10"
                        placeholder="john@example.com"
                        value={formData.owner_email}
                        onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        id="phone"
                        required
                        className="pl-10"
                        placeholder="(555) 000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-slate-700">Business Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        id="address"
                        required
                        className="pl-10"
                        placeholder="123 Market St, City, State"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referral" className="text-slate-700 font-bold text-cyan-700">Referral Code (Optional)</Label>
                    <Input 
                      id="referral"
                      placeholder="ENTER-CODE"
                      className="border-cyan-200 focus:ring-cyan-500"
                      value={formData.referral_code}
                      onChange={(e) => setFormData({...formData, referral_code: e.target.value.toUpperCase()})}
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
                  disabled={loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 text-lg font-bold"
                >
                  {loading ? 'Creating Account...' : 'Register Business'}
                </Button>
                
                <p className="text-center text-xs text-slate-500">
                  By registering, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}