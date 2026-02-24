import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, CheckCircle, Zap, DollarSign, Users, Shield, Globe,
  TrendingUp, Loader2, AlertCircle, Star, ArrowRight, BarChart3,
  Palette, Link2, Mail, Lock, Rocket, Award, ChevronRight, Phone
} from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function DealerLanding() {
  const [isChecking, setIsChecking] = useState(true);
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState({ activeDealers: 0, totalMerchants: 0, totalProcessed: 0, loading: true });
  const [landingSettings, setLandingSettings] = useState(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '', company: '', email: '', password: '', confirmPassword: '', referralCode: '', phone: ''
  });

  useEffect(() => {
    checkExistingAuth();
    loadStats();
    loadLandingSettings();
  }, []);

  const loadLandingSettings = async () => {
    try {
      const list = await base44.entities.DealerLandingSettings.list();
      if (list?.length > 0) setLandingSettings(list[0]);
    } catch { /* use defaults */ }
  };

  const loadStats = async () => {
    try {
      const [dealers, merchants] = await Promise.all([
        base44.entities.Dealer.list(),
        base44.entities.Merchant.list()
      ]);
      setStats({
        activeDealers: dealers.filter(d => ['active','trial'].includes(d.status)).length,
        totalMerchants: merchants.length,
        totalProcessed: merchants.reduce((s, m) => s + (m.total_revenue || 0), 0),
        loading: false
      });
    } catch {
      setStats(p => ({ ...p, loading: false }));
    }
  };

  const checkExistingAuth = async () => {
    try {
      const token = localStorage.getItem('dealerToken');
      if (token) {
        const { data } = await base44.functions.invoke('dealerAuth', { action: 'verify' });
        if (data?.success) { window.location.href = createPageUrl('DealerDashboard'); return; }
        localStorage.removeItem('dealerToken');
        localStorage.removeItem('dealerData');
      }
    } catch { localStorage.removeItem('dealerToken'); }
    finally { setIsChecking(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await base44.functions.invoke('dealerAuth', {
        email: loginForm.email, password: loginForm.password, action: 'login'
      });
      if (!data.success) throw new Error(data.error || 'Login failed');
      localStorage.setItem('dealerToken', data.token);
      localStorage.setItem('dealerData', JSON.stringify(data.dealer));
      // Also set pinLoggedInUser for layout compatibility
      if (data.user) localStorage.setItem('pinLoggedInUser', JSON.stringify(data.user));
      window.location.href = createPageUrl('DealerDashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerForm.name || !registerForm.company || !registerForm.email || !registerForm.password) {
      setError('Please fill in all required fields'); return;
    }
    if (registerForm.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (registerForm.password !== registerForm.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await base44.functions.invoke('dealerAuth', {
        name: registerForm.name, company: registerForm.company,
        email: registerForm.email, password: registerForm.password,
        phone: registerForm.phone, referral_code: registerForm.referralCode, action: 'register'
      });
      if (!data.success) throw new Error(data.error || 'Registration failed');
      localStorage.setItem('dealerToken', data.token);
      localStorage.setItem('dealerData', JSON.stringify(data.dealer));
      if (data.user) localStorage.setItem('pinLoggedInUser', JSON.stringify(data.user));
      setSuccess('Account created! Redirecting to your dashboard...');
      setTimeout(() => { window.location.href = createPageUrl('DealerDashboard'); }, 1200);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const fmt = (n) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : n.toString();
  const fmtMoney = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n.toFixed(0)}`;

  if (isChecking) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
    </div>
  );

  const benefits = [
    { icon: Palette, title: 'Full White Label', desc: 'Your brand, your domain, your colors' },
    { icon: DollarSign, title: 'Earn 10–30%', desc: 'Recurring commissions monthly' },
    { icon: Users, title: 'Merchant Portal', desc: 'Manage all your merchants in one place' },
    { icon: Globe, title: 'Custom Domain', desc: 'yourcompany.com with SSL included' },
    { icon: BarChart3, title: 'Analytics', desc: 'Revenue, engagement & growth insights' },
    { icon: Shield, title: 'PCI Compliant', desc: 'SOC 2 Type II, EBT/SNAP ready' },
  ];

  const testimonials = [
    { name: 'Marcus T.', role: 'Tech Reseller, Miami', quote: 'Went from 0 to 22 merchants in 4 months. The white-label setup took under an hour.', stars: 5 },
    { name: 'Sandra K.', role: 'POS Consultant, Chicago', quote: 'My commission checks have replaced my old salary. The dashboard makes everything easy.', stars: 5 },
    { name: 'Derek A.', role: 'MSP Owner, Atlanta', quote: "openTILL's crypto payments and AI tools are a huge selling point for my clients.", stars: 5 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-purple-600 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">openTILL <span className="text-emerald-400">Ambassadors</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Success Stories</a>
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-white"
              onClick={() => setMode('register')}
            >
              Apply Now
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: Hero */}
          <div className="text-white space-y-8 lg:sticky lg:top-24">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full">
                <Rocket className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 text-sm font-semibold">White-Label POS Ambassador Program</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-black leading-tight">
                Build Your Own<br />
                <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                  POS Empire
                </span>
              </h1>

              <p className="text-lg text-white/70 leading-relaxed max-w-lg">
                Resell openTILL under your own brand. Earn 10–30% recurring commissions. Launch in under an hour with full white-label support, AI marketing tools, and Solana-native payments.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Active Ambassadors', value: stats.loading ? '–' : `${fmt(stats.activeDealers)}+` },
                { label: 'Merchants Onboarded', value: stats.loading ? '–' : `${fmt(stats.totalMerchants)}+` },
                { label: 'Volume Processed', value: stats.loading ? '–' : `${fmtMoney(stats.totalProcessed)}+` },
              ].map((s, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-emerald-400">{s.value}</div>
                  <div className="text-xs text-white/50 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Benefits grid */}
            <div id="features" className="grid grid-cols-2 gap-3">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-emerald-500/40 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <b.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{b.title}</div>
                    <div className="text-xs text-white/50">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Auth Card */}
          <div>
            <Card className="bg-white/8 backdrop-blur-xl border-white/15 shadow-2xl">
              <CardContent className="p-0">
                <Tabs value={mode} onValueChange={setMode}>
                  <TabsList className="grid grid-cols-2 w-full bg-white/5 rounded-t-xl rounded-b-none border-b border-white/10 h-14">
                    <TabsTrigger value="login" className="text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white text-sm font-semibold rounded-none rounded-tl-xl">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="register" className="text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white text-sm font-semibold rounded-none rounded-tr-xl">
                      Apply Now
                    </TabsTrigger>
                  </TabsList>

                  <div className="p-6">
                    {error && (
                      <Alert className="mb-4 bg-red-500/15 border-red-400/30">
                        <AlertCircle className="h-4 w-4 text-red-300" />
                        <AlertDescription className="text-red-200">{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert className="mb-4 bg-emerald-500/15 border-emerald-400/30">
                        <CheckCircle className="h-4 w-4 text-emerald-300" />
                        <AlertDescription className="text-emerald-200">{success}</AlertDescription>
                      </Alert>
                    )}

                    {/* LOGIN */}
                    <TabsContent value="login" className="mt-0">
                      <div className="mb-5">
                        <h2 className="text-xl font-bold text-white">Welcome back</h2>
                        <p className="text-white/50 text-sm">Sign in to your ambassador dashboard</p>
                      </div>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1">
                          <Label className="text-white/70 text-xs uppercase tracking-wide">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <Input
                              type="email" placeholder="you@company.com"
                              value={loginForm.email}
                              onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                              className="pl-10 bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-xs uppercase tracking-wide">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <Input
                              type="password" placeholder="••••••••"
                              value={loginForm.password}
                              onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                              className="pl-10 bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        <Button type="submit" disabled={loading}
                          className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold">
                          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                          {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                        </Button>
                      </form>
                      <p className="text-center text-white/40 text-xs mt-4">
                        New ambassador?{' '}
                        <button onClick={() => setMode('register')} className="text-emerald-400 hover:underline">Apply now →</button>
                      </p>
                    </TabsContent>

                    {/* REGISTER */}
                    <TabsContent value="register" className="mt-0">
                      <div className="mb-5">
                        <h2 className="text-xl font-bold text-white">Start your 30-day trial</h2>
                        <p className="text-white/50 text-sm">No credit card required. Launch in minutes.</p>
                      </div>
                      <form onSubmit={handleRegister} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-white/70 text-xs">Full Name *</Label>
                            <Input placeholder="Jane Smith"
                              value={registerForm.name}
                              onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                              className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70 text-xs">Company *</Label>
                            <Input placeholder="Acme POS Co."
                              value={registerForm.company}
                              onChange={e => setRegisterForm({ ...registerForm, company: e.target.value })}
                              className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-xs">Email *</Label>
                          <Input type="email" placeholder="jane@acmepos.com"
                            value={registerForm.email}
                            onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                            className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-xs">Phone</Label>
                          <Input type="tel" placeholder="(555) 123-4567"
                            value={registerForm.phone}
                            onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })}
                            className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-white/70 text-xs">Password *</Label>
                            <Input type="password" placeholder="Min. 8 chars"
                              value={registerForm.password}
                              onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                              className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70 text-xs">Confirm *</Label>
                            <Input type="password" placeholder="Repeat"
                              value={registerForm.confirmPassword}
                              onChange={e => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                              className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-xs">Referral Code (optional)</Label>
                          <Input placeholder="e.g. AMB2025"
                            value={registerForm.referralCode}
                            onChange={e => setRegisterForm({ ...registerForm, referralCode: e.target.value })}
                            className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                          />
                        </div>
                        <Button type="submit" disabled={loading}
                          className="w-full h-11 bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white font-semibold">
                          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                          {loading ? 'Creating Account...' : 'Start Free 30-Day Trial'}
                        </Button>
                        <p className="text-center text-white/30 text-xs">
                          By applying you agree to our{' '}
                          <a href={createPageUrl('TermsOfService')} className="text-emerald-400 hover:underline">Terms</a> &{' '}
                          <a href={createPageUrl('PrivacyPolicy')} className="text-emerald-400 hover:underline">Privacy Policy</a>
                        </p>
                      </form>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>

            {/* Trust badges */}
            <div className="mt-4 flex items-center justify-center gap-6 text-white/30 text-xs">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> PCI-DSS L1</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> SOC 2</span>
              <span className="flex items-center gap-1"><Award className="w-3 h-3" /> EBT Ready</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Solana Native</span>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="mt-28 text-center space-y-12">
          <div>
            <h2 className="text-4xl font-black text-white mb-3">How It Works</h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">Launch your branded POS business in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Building2, title: 'Apply & Get Approved', desc: 'Fill out the form above. Most applications are reviewed within 24 hours. You\'ll get a welcome email with your dashboard credentials.' },
              { step: '02', icon: Palette, title: 'Brand Your Platform', desc: 'Upload your logo, set your brand colors, configure your domain, and customize your merchant-facing pages.' },
              { step: '03', icon: DollarSign, title: 'Earn Recurring Revenue', desc: 'Onboard merchants and earn 10–30% of every subscription, every month. Track everything in your analytics dashboard.' },
            ].map((item, i) => (
              <div key={i} className="relative bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-emerald-500/40 transition-all group">
                <div className="text-6xl font-black text-white/5 absolute top-4 right-6 group-hover:text-emerald-500/10 transition-colors">{item.step}</div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                {i < 2 && <ChevronRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 text-emerald-500/40 z-10" />}
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div id="testimonials" className="mt-24 space-y-10">
          <h2 className="text-4xl font-black text-white text-center">Ambassador Success Stories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
                <div className="flex gap-1 mb-4">
                  {Array(t.stars).fill(0).map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                <div>
                  <div className="text-white font-semibold text-sm">{t.name}</div>
                  <div className="text-white/40 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 text-center bg-gradient-to-r from-emerald-900/40 to-purple-900/40 border border-white/10 rounded-3xl p-12">
          <h2 className="text-4xl font-black text-white mb-4">Ready to Build Your POS Business?</h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">Join our ambassador network. No setup fees, no coding required. Start earning in days.</p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white font-bold px-10 h-13 text-lg"
            onClick={() => { setMode('register'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <Rocket className="w-5 h-5 mr-2" />
            Apply for Free Trial
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm">
          <span>© {new Date().getFullYear()} Isolex Corporation</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> +1 (419) 729-3889</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> ambassadors@isolex.io</span>
          </div>
          <div className="flex gap-4">
            <a href={createPageUrl('PrivacyPolicy')} className="hover:text-white transition-colors">Privacy</a>
            <a href={createPageUrl('TermsOfService')} className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}