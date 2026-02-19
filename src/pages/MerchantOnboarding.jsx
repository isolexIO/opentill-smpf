import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, Sparkles, Users, ArrowRight, Building2, 
  Mail, Phone, MapPin, Terminal, Twitter, Github, Globe 
} from 'lucide-react';

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
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-t-4 border-cyan-500 shadow-2xl bg-white">
          <CardContent className="pt-10 pb-6 text-center space-y-6">
            <div className="flex justify-center mb-2">
              <img src={ducLogo} alt="$DUC" className="h-16 w-16 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome to openTILL!</h2>
              <p className="text-slate-600">
                Your merchant account for <span className="font-bold text-cyan-600">{formData.business_name}</span> has been created.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto pt-4">
              <Button 
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-14 text-lg font-bold shadow-lg group"
                onClick={() => window.location.href = '/dashboard'}
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button 
                variant="outline" 
                className="w-full border-cyan-200 hover:bg-cyan-50 text-cyan-700 h-12 font-mono text-sm"
                onClick={() => window.open('https://cmd.opentill.io', '_blank')}
              >
                <Terminal className="mr-2 h-4 w-4" />
                {"> Launch Whitepaper Terminal"}
              </Button>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 mb-4 font-bold uppercase tracking-[0.2em]">CONNECT WITH ISOLEX</p>
              <div className="flex justify-center gap-8">
                <a href="https://x.com/opentill" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-500 transition-colors">
                  <Twitter className="h-6 w-6" />
                </a>
                <a href="https://dscvr.one/p/isolex" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-500 transition-colors">
                  <img src="https://dscvr.one/favicon.ico" className="h-6 w-6 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100" alt="DSCVR" />
                </a>
                <a href="https://github.com/opentill" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-500 transition-colors">
                  <Github className="h-6 w-6" />
                </a>
                <a href="https://isolex.io" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-500 transition-colors">
                  <Globe className="h-6 w-6" />
                </a>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-[10px] text-slate-400 font-mono tracking-tighter opacity-70">
                SYSTEM_AUTH_CONFIRMED // REF: {Math.random().toString(36).toUpperCase().substring(2, 10)} // SESSION_READY
              </p>
            </div>
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
          <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium">
            Next-gen POS, powered by Digital Utility Credits ($DUC).
          </p>
        </div>

        <Card className="border-none shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5">
            <div className="md:col-span-2 bg-cyan-600 p-8 text-white flex flex-col justify-between">
              <div className="space-y-8">
                <h3 className="text-2xl font-bold">The $DUC Advantage</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-cyan-500/30 p-2 rounded-lg shrink-0"><Sparkles className="h-6 w-6" /></div>
                    <div><p className="font-semibold">Zero Processing Fees</p><p className="text-cyan-100 text-sm font-light">Keep 100% of your $DUC earnings.</p></div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-cyan-500/30 p-2 rounded-lg shrink-0"><Users className="h-6 w-6" /></div>
                    <div><p className="font-semibold">Referral Rewards</p><p className="text-cyan-100 text-sm font-light">Earn $DUC for every onboarding.</p></div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-cyan-500/50">
                <p className="text-cyan-100 text-[10px] uppercase tracking-widest font-bold mb-4">CORE_SYSTEM_ACCESS</p>
                <div className="space-y-3">
                  <button type="button" onClick={() => window.open('https://cmd.opentill.io', '_blank')} className="text-white hover:text-cyan-200 flex items-center gap-2 text-sm underline underline-offset-4 bg-transparent border-none p-0 cursor-pointer font-mono">
                    <Terminal size={14} /> {"> Whitepaper Terminal"}
                  </button>
                  <a href="https://app.isolex.io" target="_blank" rel="noreferrer" className="text-white hover:text-cyan-200 flex items-center gap-2 text-sm underline underline-offset-4 font-mono">
                    <Globe size={14} /> {"> ISOLEX Network"}
                  </a>
                </div>
              </div>
            </div>

            <div className="md:col-span-3 p-8 bg-white">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        id="business_name" 
                        required 
                        className="pl-10" 
                        placeholder="Isolex Corporation" 
                        value={formData.business_name} 
                        onChange={(e) => setFormData({...formData, business_name: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input 
                        id="first_name" 
                        required 
                        placeholder="John" 
                        value={formData.owner_first_name} 
                        onChange={(e) => setFormData({...formData, owner_first_name: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
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
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        id="email" 
                        required 
                        type="email" 
                        className="pl-10" 
                        placeholder="admin@isolex.io" 
                        value={formData.owner_email} 
                        onChange={(e) => setFormData({...formData, owner_email: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referral" className="font-bold text-cyan-700">Referral Code</Label>
                    <Input 
                      id="referral" 
                      placeholder="ENTER-CODE" 
                      className="border-cyan-200 focus:ring-cyan-500" 
                      value={formData.referral_code} 
                      onChange={(e) => setFormData({...formData, referral_code: e.target.value.toUpperCase()})} 
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 text-lg font-bold shadow-lg">
                  {loading ? 'INITIALIZING...' : 'Register Business'}
                </Button>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}