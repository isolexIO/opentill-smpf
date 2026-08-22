import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import CommunityLinks from '@/components/shared/CommunityLinks';

export default function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subscriptionPlansEnabled, setSubscriptionPlansEnabled] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsList = await base44.entities.LandingPageSettings.list();
        if (settingsList && settingsList.length > 0) {
          setSubscriptionPlansEnabled(settingsList[0].subscription_plans_enabled !== false);
        }
      } catch (e) {
        // keep default
      }
    };
    const checkAuth = async () => {
      try {
        const authed = await base44.auth.isAuthenticated();
        setIsAuthenticated(authed);
      } catch (e) {
        setIsAuthenticated(false);
      }
    };
    loadSettings();
    checkAuth();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('pinLoggedInUser');
    localStorage.removeItem('pinSessionToken');
    base44.auth.logout(createPageUrl('Home'));
  };

  const buildOnboardingUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral') || params.get('code');
    const dealerId = params.get('dealer_id') || params.get('dealerid') || params.get('dealer');
    const qs = new URLSearchParams();
    if (ref) qs.set('ref', ref);
    if (dealerId) qs.set('dealer_id', dealerId);
    const query = qs.toString();
    return query ? `${createPageUrl('MerchantOnboarding')}?${query}` : createPageUrl('MerchantOnboarding');
  };

  return (
    <>
      <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = createPageUrl('Home')}>
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png" alt="openTILL" className="w-8 h-8" />
              <span className="text-2xl font-bold text-white">openTILL</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href={createPageUrl('Home')} className="text-green-300 font-semibold">
                Home
              </a>
              <a href={createPageUrl('Marketplace')} className="text-white hover:text-green-300 transition-colors">
                Marketplace
              </a>
              <a href={`${createPageUrl('Home')}#features`} className="text-white hover:text-green-300 transition-colors">
                Features
              </a>
              <a href={`${createPageUrl('Home')}#pricing`} className="text-white hover:text-green-300 transition-colors">
                Pricing
              </a>
              {subscriptionPlansEnabled && (
                <a href={`${createPageUrl('Home')}#support-tiers`} className="text-white hover:text-green-300 transition-colors">
                  Support Tiers
                </a>
              )}
              <a href={createPageUrl('About')} className="text-white hover:text-green-300 transition-colors">
                About
              </a>
              <a href={createPageUrl('Contact')} className="text-white hover:text-green-300 transition-colors">
                Contact
              </a>
              <a href="https://ico.opentill.io/" target="_blank" rel="noopener noreferrer" className="text-green-300 font-semibold hover:text-green-200 transition-colors">
                $DUC Presale
              </a>
              {isAuthenticated ? (
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10 hover:text-white"
                >
                  Sign Out
                </Button>
              ) : (
                <Button
                  onClick={() => window.location.href = createPageUrl('EmailLogin')}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Sign In
                </Button>
              )}
            </div>
            <div className="md:hidden flex items-center gap-2">
              {isAuthenticated ? (
                <Button onClick={handleSignOut} size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/10 hover:text-white text-xs px-3">
                  Sign Out
                </Button>
              ) : (
                <Button onClick={() => window.location.href = createPageUrl('EmailLogin')} size="sm" className="bg-green-500 hover:bg-green-600 text-white text-xs px-3">
                  Sign In
                </Button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2 rounded-md hover:bg-white/10 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 space-y-3">
          <a href={createPageUrl('Home')} className="block text-green-300 font-semibold py-2">Home</a>
          <a href={createPageUrl('Marketplace')} className="block text-white hover:text-green-300 py-2">Marketplace</a>
          <a href={`${createPageUrl('Home')}#features`} onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-green-300 py-2">Features</a>
          <a href={`${createPageUrl('Home')}#pricing`} onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-green-300 py-2">Pricing</a>
          {subscriptionPlansEnabled && (
            <a href={`${createPageUrl('Home')}#support-tiers`} onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-green-300 py-2">Support Tiers</a>
          )}
          <a href={createPageUrl('About')} className="block text-white hover:text-green-300 py-2">About</a>
          <a href={createPageUrl('Contact')} className="block text-white hover:text-green-300 py-2">Contact</a>
          <a href="https://ico.opentill.io/" target="_blank" rel="noopener noreferrer" className="block text-green-300 font-semibold py-2">$DUC Presale</a>
          <div className="pt-2 border-t border-white/10">
            <CommunityLinks variant="compact" className="[&_a]:text-gray-300 [&_a]:hover:text-white justify-start" />
          </div>
          {isAuthenticated ? (
            <Button onClick={handleSignOut} variant="outline" className="w-full border-white/40 text-white hover:bg-white/10 hover:text-white font-semibold mt-2">
              Sign Out
            </Button>
          ) : (
            <Button onClick={() => window.location.href = buildOnboardingUrl()} className="w-full bg-white text-purple-700 hover:bg-gray-100 font-semibold mt-2">
              Get Started Free
            </Button>
          )}
        </div>
      )}
    </>
  );
}