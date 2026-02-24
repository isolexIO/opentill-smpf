import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  CheckCircle,
  Zap,
  DollarSign,
  Users,
  Shield,
  Globe,
  TrendingUp,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function DealerLanding() {
  // Auth state
  const [isChecking, setIsChecking] = useState(true);

  // Form state
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Stats state
  const [stats, setStats] = useState({
    activeDealers: 0, // Initialize with 0, will be updated
    totalMerchants: 0, // Initialize with 0, will be updated
    totalProcessed: 0, // Initialize with 0, will be updated
    loading: true
  });

  const [landingSettings, setLandingSettings] = useState(null);

  // Login form
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  // Register form
  const [registerForm, setRegisterForm] = useState({
    name: '',
    company: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });

  // Check for existing token on mount
  useEffect(() => {
    checkExistingAuth();
    loadStats();
    loadLandingSettings();
  }, []);

  const loadLandingSettings = async () => {
    try {
      const settingsList = await base44.entities.DealerLandingSettings.list();
      if (settingsList && settingsList.length > 0) {
        setLandingSettings(settingsList[0]);
      }
    } catch (error) {
      console.error('Error loading landing settings:', error);
      // It's okay if settings don't load, defaults will be used
    }
  };

  const loadStats = async () => {
    try {
      // Load dealers
      const dealers = await base44.entities.Dealer.list();
      const activeDealers = dealers.filter(d => d.status === 'active' || d.status === 'trial').length;

      // Load merchants
      const merchants = await base44.entities.Merchant.list();
      const totalMerchants = merchants.length;

      // Load completed orders and calculate total processed
      // Note: base44.entities.Order.filter might not be directly available or work as expected
      // Assuming base44.entities.Order.list() gives all orders and we filter locally
      const orders = await base44.entities.Order.list(); // Or base44.entities.Order.list({ filter: { status: 'completed' } }) if supported
      const completedOrders = orders.filter(order => order.status === 'completed');
      const totalProcessed = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);

      setStats({
        activeDealers,
        totalMerchants,
        totalProcessed,
        loading: false
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Keep default values on error or set to a placeholder
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const checkExistingAuth = async () => {
    try {
      const token = localStorage.getItem('dealerToken');
      if (token) {
        const { data } = await base44.functions.invoke('dealerAuth', {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: { action: 'verify' }
        });

        if (data.success) {
          // Token is valid, redirect to dashboard
          window.location.href = createPageUrl('DealerDashboard');
          return;
        } else {
          // Invalid token, clear it
          localStorage.removeItem('dealerToken');
          localStorage.removeItem('dealerData');
        }
      }
    } catch (error) {
      console.log('No valid session found');
      localStorage.removeItem('dealerToken');
      localStorage.removeItem('dealerData');
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate
      if (!loginForm.email || !loginForm.password) {
        throw new Error('Please fill in all fields');
      }

      // Call login endpoint
      const { data } = await base44.functions.invoke('dealerAuth', {
        email: loginForm.email,
        password: loginForm.password
      }, {
        params: { action: 'login' }
      });

      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // Save token and dealer data
      localStorage.setItem('dealerToken', data.token);
      localStorage.setItem('dealerData', JSON.stringify(data.dealer));

      // Redirect to dashboard
      window.location.href = createPageUrl('DealerDashboard');

    } catch (error) {
      setError(error.message || 'Invalid credentials or inactive account');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!registerForm.name || !registerForm.company || !registerForm.email || !registerForm.password) {
        throw new Error('Please fill in all required fields');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (registerForm.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      if (registerForm.password !== registerForm.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Call register endpoint
      const { data } = await base44.functions.invoke('dealerAuth', {
        name: registerForm.name,
        company: registerForm.company,
        email: registerForm.email,
        password: registerForm.password,
        referral_code: registerForm.referralCode
      }, {
        params: { action: 'register' }
      });

      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      // Save token and dealer data
      localStorage.setItem('dealerToken', data.token);
      localStorage.setItem('dealerData', JSON.stringify(data.dealer));

      // Show success message
      setSuccess('Dealer account created successfully!');

      // Redirect after 1 second
      setTimeout(() => {
        window.location.href = createPageUrl('DealerDashboard');
      }, 1000);

    } catch (error) {
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return num.toString();
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  // Helper function to render icons
  const renderIcon = (iconName, className, color) => {
    const icons = {
      CheckCircle,
      DollarSign,
      Users,
      Globe,
      Shield,
      Zap,
      TrendingUp,
      Building2
    };
    const IconComponent = icons[iconName];

    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found. Using a default.`);
      return <CheckCircle className={className} style={{ color: color }} />; // Fallback to a default icon
    }

    return <IconComponent className={className} style={{ color: color }} />;
  };

  // Get feature boxes from settings or use defaults
  const featureBoxes = landingSettings?.feature_boxes || [
    {
      icon: "CheckCircle",
      icon_color: "#10b981", // emerald-500
      title: "Full White Label",
      description: "Custom branding, domain, and logo"
    },
    {
      icon: "DollarSign",
      icon_color: "#10b981", // emerald-500
      title: "Earn Commissions",
      description: "10-30% recurring revenue"
    },
    {
      icon: "Users",
      icon_color: "#10b981", // emerald-500
      title: "Merchant Portal",
      description: "Your merchants, your brand"
    },
    {
      icon: "Globe",
      icon_color: "#10b981", // emerald-500
      title: "Custom Domain",
      description: "yourcompany.com/pos"
    }
  ];

  const bottomFeatures = landingSettings?.bottom_features || [
    {
      icon: "Zap",
      icon_color: "#facc15", // yellow-400
      title: "Quick Setup",
      description: "Launch your branded POS platform in minutes. No coding required."
    },
    {
      icon: "Shield",
      icon_color: "#60a5fa", // blue-400
      title: "Secure & Compliant",
      description: "PCI-DSS Level 1, SOC 2 Type II, and full EBT/SNAP compliance."
    },
    {
      icon: "TrendingUp",
      icon_color: "#34d399", // emerald-400
      title: "Recurring Revenue",
      description: "Earn 10-30% commission on every merchant subscription, monthly."
    }
  ];

  const heroSettings = landingSettings?.hero || {
    headline: "Welcome to\nopenTILL Dealer Portal", // Added \n to match original line break
    subheadline: "Manage your white-label network, merchants, and commissions from one powerful dashboard.",
    badge_text: "White-Label POS Platform"
  };

  // Show loading spinner while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-green-500 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-green-500">
      {/* Header */}
      <nav className="bg-black/30 backdrop-blur-md border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-emerald-500" />
              <span className="text-2xl font-bold text-white">openTILL <span className="text-emerald-500">Dealers</span></span>
            </div>
            <div className="flex gap-4">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => window.location.href = createPageUrl('Home')}
              >
                Home
              </Button>
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => window.location.href = createPageUrl('Contact')}
              >
                Help
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-200px)]">

          {/* Left side - Brand Info */}
          <div className="text-white space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                <span className="text-emerald-400 text-sm font-semibold">{heroSettings.badge_text}</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                {heroSettings.headline.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <br />}
                    {/* Preserve existing span for "ChainLINK" if it's in the second line */}
                    {line.includes('ChainLINK') ? (
                      <>
                        {line.split('openTILL')[0]}
                        <span className="text-emerald-500">openTILL</span>
                        {line.split('openTILL')[1]}
                      </>
                    ) : (
                      line
                    )}
                  </React.Fragment>
                ))}
              </h1>

              <p className="text-xl text-gray-300">
                {heroSettings.subheadline}
              </p>
            </div>

            {/* Features Grid - Now editable */}
            <div className="grid grid-cols-2 gap-6 pt-8">
              {featureBoxes.map((feature, index) => (
                <div key={index} className="space-y-2">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    {renderIcon(feature.icon, "w-6 h-6", feature.icon_color)}
                  </div>
                  <h3 className="font-bold text-lg">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Stats - Now with live data */}
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-gray-700/50">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-500">
                    {stats.loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : `${formatNumber(stats.activeDealers)}+`}
                  </div>
                  <div className="text-sm text-gray-400">Active Dealers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-500">
                    {stats.loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : `${formatNumber(stats.totalMerchants)}+`}
                  </div>
                  <div className="text-sm text-gray-400">Merchants</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-500">
                    {stats.loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : `${formatCurrency(stats.totalProcessed)}+`}
                  </div>
                  <div className="text-sm text-gray-400">Processed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Auth Forms */}
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md bg-gray-800/50 border-gray-700/50 backdrop-blur-md">
              <Tabs value={mode} onValueChange={setMode} className="w-full">
                <CardHeader>
                  <TabsList className="grid w-full grid-cols-2 bg-gray-900/50">
                    <TabsTrigger value="login" className="data-[state=active]:bg-emerald-500">
                      Login
                    </TabsTrigger>
                    <TabsTrigger value="register" className="data-[state=active]:bg-emerald-500">
                      Register
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                {/* Error/Success Messages */}
                {error && (
                  <div className="px-6">
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </div>
                )}

                {success && (
                  <div className="px-6">
                    <Alert className="bg-emerald-500/10 border-emerald-500/30">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <AlertDescription className="text-emerald-500">{success}</AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Login Form */}
                <TabsContent value="login">
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <Label htmlFor="login-email" className="text-gray-200">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="dealer@company.com"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                          className="bg-gray-900/50 border-gray-700 text-white"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="login-password" className="text-gray-200">Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                          className="bg-gray-900/50 border-gray-700 text-white"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={loginForm.rememberMe}
                          onCheckedChange={(checked) => setLoginForm({...loginForm, rememberMe: checked})}
                          disabled={loading}
                        />
                        <label
                          htmlFor="remember"
                          className="text-sm text-gray-300 cursor-pointer"
                        >
                          Remember me
                        </label>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Authenticating...
                          </>
                        ) : (
                          'Login to Dashboard'
                        )}
                      </Button>

                      <p className="text-xs text-gray-400 text-center">
                        Forgot password? <a href="#" className="text-emerald-500 hover:underline">Reset it here</a>
                      </p>
                    </form>
                  </CardContent>
                </TabsContent>

                {/* Register Form */}
                <TabsContent value="register">
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <Label htmlFor="reg-name" className="text-gray-200">Full Name *</Label>
                        <Input
                          id="reg-name"
                          placeholder="John Smith"
                          value={registerForm.name}
                          onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                          className="bg-gray-900/50 border-gray-700 text-white"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="reg-company" className="text-gray-200">Company Name *</Label>
                        <Input
                          id="reg-company"
                          placeholder="Acme POS Solutions"
                          value={registerForm.company}
                          onChange={(e) => setRegisterForm({...registerForm, company: e.target.value})}
                          className="bg-gray-900/50 border-gray-700 text-white"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="reg-email" className="text-gray-200">Email *</Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="john@acmepos.com"
                          value={registerForm.email}
                          onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                          className="bg-gray-900/50 border-gray-700 text-white"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="reg-password" className="text-gray-200">Password *</Label>
                        <Input
                          id="reg-password"
                          type="password"
                          placeholder="Min. 8 characters"
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                          className="bg-gray-900/50 border-gray-700 text-white"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="reg-confirm" className="text-gray-200">Confirm Password *</Label>
                        <Input
                          id="reg-confirm"
                          type="password"
                          value={registerForm.confirmPassword}
                          onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                          className="bg-gray-900/50 border-gray-700 text-white"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="reg-referral" className="text-gray-200">Referral Code (Optional)</Label>
                        <Input
                          id="reg-referral"
                          placeholder="DEALER2024"
                          value={registerForm.referralCode}
                          onChange={(e) => setRegisterForm({...registerForm, referralCode: e.target.value})}
                          className="bg-gray-900/50 border-gray-700 text-white"
                          disabled={loading}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          'Start Free 30-Day Trial'
                        )}
                      </Button>

                      <p className="text-xs text-gray-400 text-center">
                        By registering, you agree to our <a href="#" className="text-emerald-500 hover:underline">Terms of Service</a> and <a href="#" className="text-emerald-500 hover:underline">Privacy Policy</a>
                      </p>
                    </form>
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>

        {/* Bottom Features Section - Now editable */}
        <div className="mt-20 space-y-12">
          <h2 className="text-4xl font-bold text-white text-center">
            Everything You Need to Build Your POS Business
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {bottomFeatures.map((feature, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-md text-white">
                <CardHeader>
                  <div className="w-12 h-12 mb-4 flex items-center justify-center">
                    {renderIcon(feature.icon, "w-12 h-12", feature.icon_color)}
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-md border-t border-white/10 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-white/80 text-sm">
              © 2024 Isolex Corporation. All rights reserved.
            </div>
            <div className="flex gap-6 text-white/80 text-sm">
              <span>📞 +1 (419) 729-3889</span>
              <span>✉️ dealers@isolex.io</span>
            </div>
            <div className="flex gap-4">
              <a href={createPageUrl('PrivacyPolicy')} className="text-white/80 hover:text-white text-sm transition-colors">
                Privacy
              </a>
              <a href={createPageUrl('TermsOfService')} className="text-white/80 hover:text-white text-sm transition-colors">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}