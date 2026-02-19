import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const ducLogo = "https://opentill.io/$DUC.png";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
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
            
            <div className="space-y-3">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Registration Successful!</h2>
              <p className="text-slate-600 text-lg">Welcome to the <strong>openTILL</strong> ecosystem.</p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-cyan-50 p-6 rounded-2xl border border-cyan-100 text-left relative overflow-hidden">
              <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white p-1 rounded-full shadow-md border border-cyan-200 flex-shrink-0">
                  <img src={ducLogo} alt="$DUC Token" className="h-16 w-16 object-contain rounded-full" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xl flex items-center gap-2">
                    $DUC <span className="text-[10px] bg-cyan-600 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter font-medium">Priority Access</span>
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Official product launch and <strong>Digital Utility Credit ($DUC)</strong> token presale dates are <strong>TBD</strong>. You are now first in line.
                  </p>
                </div>
              </div>
              <img src={ducLogo} alt="" className="absolute -right-6 -bottom-6 h-32 w-32 opacity-10 grayscale rotate-12 pointer-events-none" />
            </div>

            <div className="space-y-5">
              <p className="font-bold text-slate-800 flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                <Users className="h-4 w-4 text-cyan-600" /> Join Our Community
              </p>
              <div className="grid grid-cols-4 gap-4">
                <Button variant="outline" className="border-2 hover:bg-slate-50 p-0 h-12 flex items-center justify-center" onClick={() => window.open('https://x.com/openTILL_SMPF')}>
                  <svg role="img" viewBox="0 0 24 24" className="h-5 w-5 fill-current text-slate-900" xmlns="http://www.w3.org/2000/svg"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
                </Button>
                <Button variant="outline" className="border-2 hover:bg-sky-50 p-0 h-12 flex items-center justify-center" onClick={() => window.open('https://t.me/+TkWQAgyhHVk0YWEx')}>
                  <svg role="img" viewBox="0 0 24 24" className="h-6 w-6 fill-current text-sky-500" xmlns="http://www.w3.org/2000/svg"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.303.48-.429-.012-1.253-.245-1.865-.444-.754-.245-1.354-.374-1.302-.789.027-.216.325-.437.893-.663 3.508-1.523 5.848-2.529 7.022-3.018 3.343-1.394 4.038-1.635 4.49-1.644z"/></svg>
                </Button>
                <Button variant="outline" className="border-2 hover:bg-indigo-50 p-0 h-12 flex items-center justify-center" onClick={() => window.open('https://discord.gg/WXuYRmzf7d')}>
                  <svg role="img" viewBox="0 0 24 24" className="h-6 w-6 fill-current text-indigo-500" xmlns="http://www.w3.org/2000/svg"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 11.721 11.721 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </Button>
                <Button variant="outline" className="border-2 hover:bg-orange-50 p-0 h-12 text-orange-600 font-black text-[10px]" onClick={() => window.open('https://social.dscvr.one/p/opentill-smpf')}>
                  DSCVR
                </Button>
              </div>
            </div>

            <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-14 text-xl font-bold" onClick={() => setSuccess(false)}>
              Back to Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-2">
             <img 
               src={ducLogo} 
               alt="openTILL Logo" 
               className="object-contain drop-shadow-sm" 
               style={{ width: '175px', height: '175px' }}
             />
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">openTILL</h1>
          <p className="text-cyan-600 font-bold tracking-widest uppercase text-sm">SMPF</p>
        </div>

        <Card className="shadow-xl border-0 ring-1 ring-slate-200 bg-white">
          <CardHeader className="space-y-1 text-center border-b border-slate-50 pb-6">
            <CardTitle className="text-2xl">Merchant Registration</CardTitle>
            <CardDescription>Request early access to the $DUC ecosystem</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input id="business_name" className="pl-10 h-12" placeholder="Your Store Name" required value={formData.business_name} onChange={(e) => setFormData({...formData, business_name: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" className="h-12" placeholder="John" required value={formData.owner_first_name} onChange={(e) => setFormData({...formData, owner_first_name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" className="h-12" placeholder="Doe" required value={formData.owner_last_name} onChange={(e) => setFormData({...formData, owner_last_name: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input id="email" type="email" className="pl-10 h-12" placeholder="owner@business.com" required value={formData.owner_email} onChange={(e) => setFormData({...formData, owner_email: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input id="phone" className="pl-10 h-12" placeholder="(555) 000-0000" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Business Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input id="address" className="pl-10 h-12" placeholder="123 Main St" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Label htmlFor="referral">Referral Code (Optional)</Label>
                  <Input id="referral" className="h-12 border-dashed border-2" placeholder="ENTER-CODE" value={formData.referral_code} onChange={(e) => setFormData({...formData, referral_code: e.target.value})} />
                </div>
              </div>

              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}

              <Button type="submit" className="w-full h-14 bg-cyan-600 hover:bg-cyan-700 text-white text-lg font-bold" disabled={loading}>
                {loading ? "Processing..." : "Register for Early Access"}
                {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
               <Button variant="ghost" size="sm" className="text-slate-400 hover:text-cyan-600 text-[10px]" onClick={() => setSuccess(true)}>
                 DEBUG: Click to test Success View
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}