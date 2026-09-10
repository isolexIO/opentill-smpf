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
  Palette, Mail, Lock, Rocket, Award, ChevronRight, Phone, Chrome, Wallet
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import AmbassadorWalletLogin from '@/components/auth/AmbassadorWalletLogin';
import { useLanguage } from '@/lib/i18n/useLanguage';

export default function DealerLanding() {
  const { t } = useLanguage();
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
        base44.entities.Ambassador.list(),
        base44.entities.Merchant.list()
      ]);
      setStats({
        activeDealers: dealers.filter(d => d.status === 'active').length,
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

    // Returning from Google OAuth: a platform session exists but no dealer token yet.
    try {
      const me = await base44.auth.me();
      if (me && me.email) {
        const { data } = await base44.functions.invoke('dealerAuth', { action: 'google_auth' });
        if (data?.success) {
          localStorage.setItem('dealerToken', data.token);
          localStorage.setItem('dealerData', JSON.stringify(data.dealer));
          if (data.user) localStorage.setItem('pinLoggedInUser', JSON.stringify(data.user));
          window.location.href = createPageUrl('DealerDashboard');
          return;
        }
      }
    } catch { /* not authenticated via platform — continue to the auth card */ }

    setIsChecking(false);
  };

  const handleGoogleAuth = async () => {
    setLoading(true); setError(null);
    try {
      // Redirect to platform Google OAuth, returning here to finish ambassador sign-in/up.
      await base44.auth.redirectToLogin(createPageUrl('DealerLanding'));
    } catch {
      setError(t('dealerLanding.googleFailed'));
      setLoading(false);
    }
  };

  const handleWalletDone = (data) => {
    setSuccess(t('dealerLanding.accountReady'));
    setTimeout(() => { window.location.href = createPageUrl('DealerDashboard'); }, 800);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) { setError(t('dealerLanding.fillAllFields')); return; }
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
      setError(t('dealerLanding.fillRequired')); return;
    }
    if (registerForm.password.length < 8) { setError(t('dealerLanding.passwordMin')); return; }
    if (registerForm.password !== registerForm.confirmPassword) { setError(t('dealerLanding.passwordMismatch')); return; }
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
      setSuccess(t('dealerLanding.accountCreated'));
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
    { icon: Palette, title: t('dealerLanding.benefitBranding'), desc: t('dealerLanding.benefitBrandingDesc') },
    { icon: DollarSign, title: t('dealerLanding.benefitEarn'), desc: t('dealerLanding.benefitEarnDesc') },
    { icon: Users, title: t('dealerLanding.benefitPortal'), desc: t('dealerLanding.benefitPortalDesc') },
    { icon: Globe, title: t('dealerLanding.benefitDomain'), desc: t('dealerLanding.benefitDomainDesc') },
    { icon: BarChart3, title: t('dealerLanding.benefitAnalytics'), desc: t('dealerLanding.benefitAnalyticsDesc') },
    { icon: Shield, title: t('dealerLanding.benefitPci'), desc: t('dealerLanding.benefitPciDesc') },
  ];

  const adminStories = Array.isArray(landingSettings?.success_stories) ? landingSettings.success_stories : [];
  const testimonials = adminStories
    .filter(t => !t.hidden)
    .map(t => ({ ...t, stars: t.stars || 5 }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: Hero */}
          <div className="text-white space-y-8 lg:sticky lg:top-24">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full">
                <Rocket className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 text-sm font-semibold">{t('dealerLanding.badge')}</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-black leading-tight">
                {t('dealerLanding.heroTitle1')}<br />
                <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                  {t('dealerLanding.heroTitle2')}
                </span>
              </h1>

              <p className="text-lg text-white/70 leading-relaxed max-w-lg">
                {t('dealerLanding.heroDesc')}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t('dealerLanding.statAmbassadors'), value: stats.loading ? '–' : `${fmt(stats.activeDealers)}+` },
                { label: t('dealerLanding.statMerchants'), value: stats.loading ? '–' : `${fmt(stats.totalMerchants)}+` },
                { label: t('dealerLanding.statVolume'), value: stats.loading ? '–' : `${fmtMoney(stats.totalProcessed)}+` },
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
                      {t('dealerLanding.tabSignIn')}
                    </TabsTrigger>
                    <TabsTrigger value="register" className="text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white text-sm font-semibold rounded-none rounded-tr-xl">
                      {t('dealerLanding.tabApply')}
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

                    {/* Social sign-in / sign-up — works for both tabs */}
                    <div className="mb-5 space-y-3">
                      <Button
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={loading}
                        className="w-full h-11 bg-white text-gray-800 hover:bg-gray-100 font-semibold"
                      >
                        {loading
                          ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          : <Chrome className="w-4 h-4 mr-2" />}
                        {loading ? t('dealerLanding.redirecting') : t('dealerLanding.continueGoogle')}
                      </Button>
                      <div className="relative flex items-center gap-2">
                        <div className="flex-1 border-t border-white/10" />
                        <span className="text-white/30 text-xs whitespace-nowrap flex items-center gap-1">
                          <Wallet className="w-3 h-3" /> {t('dealerLanding.orWallet')}
                        </span>
                        <div className="flex-1 border-t border-white/10" />
                      </div>
                      <AmbassadorWalletLogin onDone={handleWalletDone} />
                      <div className="relative flex items-center gap-2 pt-1">
                        <div className="flex-1 border-t border-white/10" />
                        <span className="text-white/30 text-xs whitespace-nowrap">{t('dealerLanding.orEmail')}</span>
                        <div className="flex-1 border-t border-white/10" />
                      </div>
                    </div>

                    {/* LOGIN */}
                    <TabsContent value="login" className="mt-0">
                      <div className="mb-5">
                        <h2 className="text-xl font-bold text-white">{t('dealerLanding.welcomeBack')}</h2>
                        <p className="text-white/50 text-sm">{t('dealerLanding.welcomeBackSub')}</p>
                      </div>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1">
                          <Label className="text-white/70 text-xs uppercase tracking-wide">{t('dealerLanding.email')}</Label>
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
                          <Label className="text-white/70 text-xs uppercase tracking-wide">{t('dealerLanding.password')}</Label>
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
                          {loading ? t('dealerLanding.signingIn') : t('dealerLanding.signInBtn')}
                        </Button>
                      </form>
                      <p className="text-center text-white/40 text-xs mt-4">
                        {t('dealerLanding.newAmbassador')}{' '}
                        <button onClick={() => setMode('register')} className="text-emerald-400 hover:underline">{t('dealerLanding.applyNow')}</button>
                      </p>
                    </TabsContent>

                    {/* REGISTER */}
                    <TabsContent value="register" className="mt-0">
                      <div className="mb-5">
                        <h2 className="text-xl font-bold text-white">{t('dealerLanding.trialTitle')}</h2>
                        <p className="text-white/50 text-sm">{t('dealerLanding.trialSub')}</p>
                      </div>
                      <form onSubmit={handleRegister} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-white/70 text-xs">{t('dealerLanding.fullName')}</Label>
                            <Input placeholder="Jane Smith"
                              value={registerForm.name}
                              onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                              className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70 text-xs">{t('dealerLanding.company')}</Label>
                            <Input placeholder="Acme POS Co."
                              value={registerForm.company}
                              onChange={e => setRegisterForm({ ...registerForm, company: e.target.value })}
                              className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-xs">{t('dealerLanding.email')}</Label>
                          <Input type="email" placeholder="jane@acmepos.com"
                            value={registerForm.email}
                            onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                            className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-xs">{t('dealerLanding.phone')}</Label>
                          <Input type="tel" placeholder="(555) 123-4567"
                            value={registerForm.phone}
                            onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })}
                            className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-white/70 text-xs">{t('dealerLanding.password')}</Label>
                            <Input type="password" placeholder="Min. 8 chars"
                              value={registerForm.password}
                              onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                              className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70 text-xs">{t('dealerLanding.confirm')}</Label>
                            <Input type="password" placeholder="Repeat"
                              value={registerForm.confirmPassword}
                              onChange={e => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                              className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-xs">{t('dealerLanding.referralOptional')}</Label>
                          <Input placeholder="e.g. AMB2025"
                            value={registerForm.referralCode}
                            onChange={e => setRegisterForm({ ...registerForm, referralCode: e.target.value })}
                            className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-emerald-500"
                          />
                        </div>
                        <Button type="submit" disabled={loading}
                          className="w-full h-11 bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white font-semibold">
                          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                          {loading ? t('dealerLanding.creatingAccount') : t('dealerLanding.startTrial')}
                        </Button>
                        <p className="text-center text-white/30 text-xs">
                          {t('dealerLanding.agreeTerms')}{' '}
                          <a href={createPageUrl('TermsOfService')} className="text-emerald-400 hover:underline">{t('dealerLanding.terms')}</a> &{' '}
                          <a href={createPageUrl('PrivacyPolicy')} className="text-emerald-400 hover:underline">{t('dealerLanding.privacyPolicy')}</a>
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
            <h2 className="text-4xl font-black text-white mb-3">{t('dealerLanding.howItWorks')}</h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">{t('dealerLanding.howItWorksSub')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Building2, title: t('dealerLanding.step1Title'), desc: t('dealerLanding.step1Desc') },
              { step: '02', icon: Palette, title: t('dealerLanding.step2Title'), desc: t('dealerLanding.step2Desc') },
              { step: '03', icon: DollarSign, title: t('dealerLanding.step3Title'), desc: t('dealerLanding.step3Desc') },
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
        {testimonials.length > 0 && (
        <div id="testimonials" className="mt-24 space-y-10">
          <h2 className="text-4xl font-black text-white text-center">{t('dealerLanding.stories')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
                <div className="flex gap-1 mb-4">
                  {Array(t.stars).fill(0).map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  {t.image && <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full object-cover" />}
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-white/40 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* CTA */}
        <div className="mt-24 text-center bg-gradient-to-r from-emerald-900/40 to-purple-900/40 border border-white/10 rounded-3xl p-12">
          <h2 className="text-4xl font-black text-white mb-4">{t('dealerLanding.ctaTitle')}</h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">{t('dealerLanding.ctaSub')}</p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white font-bold px-10 h-13 text-lg"
            onClick={() => { setMode('register'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <Rocket className="w-5 h-5 mr-2" />
            {t('dealerLanding.applyFree')}
          </Button>
        </div>
      </div>
    </div>
  );
}