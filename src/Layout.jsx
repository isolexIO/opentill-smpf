import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User,
  LogOut,
  Settings,
  Clock,
  AlertCircle,
  Menu,
  HelpCircle,
  Link2
} from 'lucide-react';
// Assuming Home component is located at '@/pages/Home' or a similar path
// This import is necessary for the `return <Home />` statement to be valid.
import Home from '@/pages/Home';
import NotificationBanner from '@/components/notifications/NotificationBanner';
import MobileBottomNav from '@/components/mobile/MobileBottomNav';
import { useNavigate } from 'react-router-dom';

const PUBLIC_PAGES = ['Home', 'Login', 'PinLogin', 'EmailLogin', 'WalletLoginPage', 'OnlineMenu', 'CustomerDisplay', 'KitchenDisplay', 'MerchantOnboarding', 'POS', 'PrivacyPolicy', 'TermsOfService', 'License', 'Copyright', 'About', 'Contact', 'DeviceShop', 'DealerLanding', 'DealerDashboard', 'DealerHome', 'SuperAdmin', 'Marketplace', 'ChipDetail', 'Builders', 'BuilderOnboarding', 'DriverDashboard', 'PayInvoice', 'OpenTILLPayments', 'MobileStationDisplay', 'CustomerPortal'];

function PublicLayout({ children }) {
  return <div className="min-h-screen">{children}</div>;
}

const ROOT_PAGES = ['Home', 'SystemMenu', 'PinLogin', 'EmailLogin', 'WalletLoginPage', 'MerchantOnboarding'];

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pinUser, setPinUser] = useState(null);
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState(null);
  const [merchantStatus, setMerchantStatus] = useState(null);
  const [merchant, setMerchant] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadAuth();
  }, []);

  // Google Analytics
  useEffect(() => {
    // Load gtag.js
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-THS8JRL2G6';
    document.head.appendChild(script1);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-THS8JRL2G6');
  }, []);

  // Always force light theme
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const loadAuth = async () => {
    setLoading(true);
    setError(null);
    let foundDealer = null;
    
    try {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      if (pinUserJSON) {
        try {
          const parsedUser = JSON.parse(pinUserJSON);
          setPinUser(parsedUser);
          
          // Load dealer branding if user has dealer_id (skip if invalid format)
          if (parsedUser.dealer_id && parsedUser.dealer_id.length > 10) {
            try {
              const dealers = await base44.entities.Ambassador.filter({ legacy_dealer_id: parsedUser.dealer_id });
              if (dealers && dealers.length > 0) {
                foundDealer = dealers[0];
              }
            } catch (dealerError) {
              // Silently continue without dealer branding
            }
          }
        } catch (e) {
          console.error('Error parsing pinLoggedInUser:', e);
          localStorage.removeItem('pinLoggedInUser');
        }
      }
      
      let currentUser = null;
      try {
        currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.log('No authenticated user');
        // This is OK for public pages
      }

      // Load dealer branding from authenticated user if not already loaded
      if (currentUser && !foundDealer && currentUser.dealer_id && currentUser.dealer_id.length > 10) {
        try {
          const dealers = await base44.entities.Ambassador.filter({ legacy_dealer_id: currentUser.dealer_id });
          if (dealers && dealers.length > 0) {
            foundDealer = dealers[0];
          }
        } catch (dealerError) {
          // Silently continue without dealer branding
        }
      }
      
      // If no dealer from user, check subdomain
      if (!foundDealer) {
        try {
          const hostname = window.location.hostname;
          const subdomain = hostname.split('.')[0];
          
          if (subdomain && !['localhost', 'chainlinkpos', 'www', ''].includes(subdomain.toLowerCase())) {
            try {
              const dealers = await base44.entities.Ambassador.filter({ slug: subdomain });
              if (dealers && dealers.length > 0) {
                foundDealer = dealers[0];
              }
            } catch (e) {
              console.log('Could not load dealer from subdomain', e);
              // Continue without dealer branding
            }
          }
        } catch (e) {
          console.warn('Error checking subdomain:', e);
          // Continue without dealer branding
        }
      }
      
      setDealer(foundDealer);

      // Load merchant status if user has merchant_id
      if (pinUser?.merchant_id) {
        try {
          const merchants = await base44.entities.Merchant.filter({ id: pinUser.merchant_id });
          if (merchants && merchants.length > 0) {
            setMerchantStatus(merchants[0].status);
            setMerchant(merchants[0]);
          }
        } catch (e) {
          console.warn('Could not load merchant status:', e);
        }
      }
      } catch (error) {
      console.error('Auth load error:', error);
      setError('Unable to load authentication. Please check your connection and try again.');
      // Don't break the app - allow public pages to still load
      } finally {
      setLoading(false);
      }
  };

  const handlePinLogout = () => {
    if (confirm('Are you sure you want to clock out?')) {
      localStorage.removeItem('pinLoggedInUser');
      localStorage.removeItem('pinSessionToken');
      base44.auth.logout(createPageUrl('Home'));
    }
  };

  const handleExitImpersonation = () => {
    localStorage.removeItem('pinLoggedInUser');
    localStorage.removeItem('pinSessionToken');
    localStorage.removeItem('impersonationData');
    navigate(createPageUrl('SuperAdmin'));
  };

  // If user is not authenticated (via base44.auth.me) and is trying to access a non-authentication
  // or non-home page, redirect them to the Home page.
  // Allow root_admin to access dealer pages
  if (!user && !['EmailLogin', 'MerchantOnboarding', 'PinLogin', 'WalletLoginPage', 'Home', 'PrivacyPolicy', 'TermsOfService', 'License', 'Copyright', 'About', 'Contact', 'CustomerDisplay', 'KitchenDisplay', 'OnlineMenu', 'DeviceShop', 'DealerOnboarding', 'DealerDashboard', 'DealerLanding', 'Marketplace', 'ChipDetail', 'DriverDashboard', 'PayInvoice', 'POS', 'MobileStationDisplay', 'CustomerPortal', 'SystemMenu', 'SuperAdmin', 'Settings', 'Products', 'Inventory', 'Orders', 'Customers', 'Reports', 'Users', 'Departments', 'Modifiers', 'Devices', 'Subscriptions', 'Support', 'Motherboard', 'DUCVault', 'LoyaltyProgram', 'OnlineOrders', 'DeviceMonitor', 'AIAssistant', 'AIWebsiteGenerator', 'ReferralDashboard'].includes(currentPageName)) {
    return <Home />;
  }

  // Always allow public pages to render, including 'Home' if accessed directly
  if (PUBLIC_PAGES.includes(currentPageName)) {
    return <PublicLayout>{children}</PublicLayout>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state but don't break the app
  if (error) {
    console.warn('Layout error (non-fatal):', error);
    // Continue rendering with default branding or a fallback UI if desired
  }

  // If no pinUser and not a public page, redirect to login
  if (!pinUser && !PUBLIC_PAGES.includes(currentPageName)) {
    window.location.href = createPageUrl('Login');
    return null;
  }

  // Block inactive merchants from accessing the platform
  if (pinUser && pinUser.merchant_id && pinUser.role !== 'admin' && merchantStatus === 'inactive' && !PUBLIC_PAGES.includes(currentPageName)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Activation</h2>
          <p className="text-gray-600 mb-6">
            Your merchant account is currently being reviewed by our team. 
            You'll receive an email once your account has been activated.
          </p>
          <Button onClick={() => base44.auth.logout(createPageUrl('Home'))} className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const primaryColor = dealer?.primary_color || '#42A5F5';
  const secondaryColor = dealer?.secondary_color || '#C6EF50';
  const brandName = dealer?.name || 'openTILL';
  const logoUrl = dealer?.logo_url;

  const showBackButton = !PUBLIC_PAGES.includes(currentPageName) && !ROOT_PAGES.includes(currentPageName);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="fixed inset-0 pointer-events-none z-50">
        <div className="absolute top-0 left-0 right-0 h-[10px]" 
             style={{
               background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
               borderTopLeftRadius: '10px',
               borderTopRightRadius: '10px'
             }}>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-[10px]"
             style={{
               background: `linear-gradient(90deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
               borderBottomLeftRadius: '10px',
               borderBottomRightRadius: '10px'
             }}>
        </div>
        
        <div className="absolute top-[10px] bottom-[10px] left-0 w-[10px]"
             style={{background: `linear-gradient(180deg, ${primaryColor} 0%, ${secondaryColor} 100%)`}}>
        </div>
        
        <div className="absolute top-[10px] bottom-[10px] right-0 w-[10px]"
             style={{background: `linear-gradient(180deg, ${secondaryColor} 0%, ${primaryColor} 100%)`}}>
        </div>

        <div className="absolute top-0 left-0 w-[10px] h-[10px]" 
             style={{background: primaryColor, borderTopLeftRadius: '10px'}}></div>
        <div className="absolute top-0 right-0 w-[10px] h-[10px]" 
             style={{background: secondaryColor, borderTopRightRadius: '10px'}}></div>
        <div className="absolute bottom-0 left-0 w-[10px] h-[10px]" 
             style={{background: secondaryColor, borderBottomLeftRadius: '10px'}}></div>
        <div className="absolute bottom-0 right-0 w-[10px] h-[10px]" 
             style={{background: primaryColor, borderBottomRightRadius: '10px'}}></div>
      </div>

      <div className="relative min-h-screen" style={{padding: '10px'}}>
        <nav className="bg-white border-b border-gray-200 sticky top-[10px] z-40 shadow-sm"
             style={{marginTop: '-10px', marginLeft: '-10px', marginRight: '-10px'}}>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-2">
                {showBackButton && (
                  <button
                    onClick={() => navigate(-1)}
                    className="mr-1 p-2 rounded-md hover:bg-gray-100 transition-colors"
                    aria-label="Go back"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <Link to={createPageUrl('SystemMenu')} className="flex items-center space-x-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt={brandName} className="h-10" />
                  ) : (
                    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png" alt="openTILL" className="w-10 h-10" />
                  )}
                  <div>
                    <span className="text-xl font-bold text-gray-900">
                      {brandName}
                    </span>
                    <span className="text-xs text-gray-500 block -mt-1">
                      Point of Sale
                    </span>
                  </div>
                </Link>
              </div>

              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{currentTime.toLocaleTimeString()}</span>
                </div>

                {pinUser?.is_impersonating && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExitImpersonation}
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Exit Impersonation
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.location.href = createPageUrl('Support')}
                  title="Help & Support"
                >
                  <HelpCircle className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.location.href = createPageUrl('SystemMenu')}
                  title="System Menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>

                {pinUser && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2">
                        <User className="w-5 h-5" />
                        <div className="text-left">
                          <div className="text-sm font-medium">{pinUser.full_name || 'User'}</div>
                          <div className="text-xs text-gray-500">{pinUser.role || 'user'}</div>
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.location.href = createPageUrl('Settings')}>
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handlePinLogout} className="text-red-600">
                        <LogOut className="w-4 h-4 mr-2" />
                        Clock Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="md:hidden flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.location.href = createPageUrl('SystemMenu')}
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Notification Banner - Below Nav */}
        {!PUBLIC_PAGES.includes(currentPageName) && <NotificationBanner />}

        {/* Merchant Indicator */}
        {!PUBLIC_PAGES.includes(currentPageName) && pinUser?.merchant_id && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 text-center text-sm font-medium shadow-md">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
              <span>Connected as:</span>
              <span className="font-bold">{dealer?.name || 'Merchant'}</span>
              {merchant && (
                <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs">
                  {merchant.business_name}
                </span>
              )}
            </div>
          </div>
        )}

        <main className="flex-1 pb-safe">
          {children}
        </main>

        {/* Mobile Bottom Nav (only for authenticated non-public pages) */}
        {!PUBLIC_PAGES.includes(currentPageName) && pinUser && (
          <MobileBottomNav currentPageName={currentPageName} />
        )}
      </div>

      <div className="fixed bottom-20 right-4 flex flex-col items-end gap-2 z-50 md:bottom-4">
        {!dealer?.settings?.hide_opentill_branding && (
          <div className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
            © Isolex Corporation
          </div>
        )}
        <div className="text-xs bg-white rounded-full shadow-sm overflow-hidden">
          <Link to={createPageUrl('CustomerPortal')} className="px-3 py-1 inline-block text-blue-600 hover:text-blue-700 transition-colors">
            Customer Portal
          </Link>
          {!dealer?.settings?.hide_opentill_branding && (
            <>
              <span className="text-gray-300">|</span>
              <Link to={createPageUrl('License')} className="px-3 py-1 inline-block text-blue-600 hover:text-blue-700 transition-colors">
                License
              </Link>
              <span className="text-gray-300">|</span>
              <Link to={createPageUrl('Copyright')} className="px-3 py-1 inline-block text-blue-600 hover:text-blue-700 transition-colors">
                Copyright
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
    
  );
}