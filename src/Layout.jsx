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

const PUBLIC_PAGES = ['Home', 'PinLogin', 'EmailLogin', 'WalletLoginPage', 'OnlineMenu', 'CustomerDisplay', 'KitchenDisplay', 'MerchantOnboarding', 'POS', 'PrivacyPolicy', 'TermsOfService', 'About', 'Contact', 'DeviceShop', 'DealerLanding', 'DealerDashboard'];

function PublicLayout({ children }) {
  return <div className="min-h-screen">{children}</div>;
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [pinUser, setPinUser] = useState(null);
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState(null);
  const [merchantStatus, setMerchantStatus] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Chat Widget
  useEffect(() => {
    // Don't load chat widget on Customer Display, Kitchen Display, or mobile devices
    if (currentPageName === 'CustomerDisplay' || currentPageName === 'KitchenDisplay') {
      return;
    }
    
    // Skip chat widget on mobile devices (screen width < 768px)
    if (window.innerWidth < 768) {
      return;
    }

    const openSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" class="design-iconfont">\n' +
        '  <path d="M27.8832966,16.887873 C27.8094879,16.8666413 27.7342507,16.8550603 27.660442,16.8492698 C27.6742514,16.6663873 27.6537754,16.4864 27.6023474,16.3204063 C27.639966,15.9363048 27.6666324,15.5497905 27.6666324,15.1555556 C27.6666324,8.62631111 22.4433584,3.33333333 16.0000982,3.33333333 C9.55636184,3.33333333 4.33356399,8.62631111 4.33356399,15.1555556 C4.33356399,15.5497905 4.35975417,15.9363048 4.39784898,16.3204063 C4.34594481,16.4864 4.32546885,16.6663873 4.33927822,16.8492698 C4.26546953,16.8550603 4.19070847,16.8666413 4.11689979,16.887873 L3.54452533,17.0519365 C2.91310393,17.2333714 2.5378701,17.9287111 2.70739198,18.6052317 L3.93356854,23.5044571 C4.10261424,24.1804952 4.75213067,24.5819683 5.38355207,24.4010159 L5.95545034,24.2374349 C5.98925948,24.2273016 6.01973533,24.2104127 6.05211591,24.1978667 L6.08925835,24.3561397 C6.20497132,24.8468825 6.56068156,25.1885206 6.97448639,25.2681397 C9.50064818,28.5822222 13.7929804,28.6932063 14.8982059,28.6628063 C14.9120153,28.6632889 14.9248723,28.6666667 14.9386817,28.6666667 L17.0962762,28.6666667 C17.8910291,28.6666667 18.5353075,28.0996825 18.5353075,27.4 C18.5353075,26.7008 17.8910291,26.1333333 17.0962762,26.1333333 L14.9386817,26.1333333 C14.1439288,26.1333333 13.5001266,26.7008 13.5001266,27.4 C13.5001266,27.5119492 13.5220311,27.6181079 13.5525069,27.7213714 C10.7211105,27.3300317 8.98255883,25.9687873 8.10447356,25.0447238 L8.51304035,24.9207111 C9.10303365,24.7407238 9.45350586,24.0506921 9.29541242,23.3794794 L7.57733669,16.0887873 C7.44210013,15.5136 6.9773435,15.142527 6.47639681,15.1594159 L6.47639681,15.1555556 C6.47639681,9.82542222 10.7401579,5.5047619 16.0000982,5.5047619 C21.2600385,5.5047619 25.5237996,9.82542222 25.5237996,15.1555556 L25.5237996,15.1594159 C25.0223767,15.142527 24.5576201,15.5136 24.4223835,16.0887873 L22.704784,23.3794794 C22.5466905,24.0506921 22.8966866,24.7407238 23.4866799,24.9207111 L24.5557153,25.2454603 C25.1457086,25.4259302 25.7523684,25.0273524 25.9104619,24.3561397 L25.9476043,24.1978667 C25.9804611,24.2104127 26.0104607,24.2273016 26.044746,24.2374349 L26.6166443,24.4010159 C27.2480657,24.5819683 27.897106,24.1804952 28.0666279,23.5044571 L29.2928044,18.6052317 C29.4618501,17.9287111 29.0866163,17.2333714 28.4551949,17.0519365 L27.8832966,16.887873 Z" fill="#FFF" fill-rule="evenodd"/>\n' +
        '</svg>';
    const closeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" class="design-iconfont">\n' +
        '  <path d="M6.95955989,6.95955989 C7.35008418,6.56903559 7.98324916,6.56903559 8.37377345,6.95955989 L15.9996667,14.5846667 L23.6262266,6.95955989 C24.0167508,6.56903559 24.6499158,6.56903559 25.0404401,6.95955989 C25.4309644,7.35008418 25.4309644,7.98324916 25.0404401,8.37377345 L17.4136667,15.9996667 L25.0404401,23.6262266 C25.4009241,23.9867105 25.4286536,24.5539416 25.1236287,24.9462328 L25.0404401,25.0404401 C24.6499158,25.4309644 24.0167508,25.4309644 23.6262266,25.0404401 L15.9996667,17.4136667 L8.37377345,25.0404401 C7.98324916,25.4309644 7.35008418,25.4309644 6.95955989,25.0404401 C6.56903559,24.6499158 6.56903559,24.0167508 6.95955989,23.6262266 L14.5846667,15.9996667 L6.95955989,8.37377345 C6.59907592,8.01328949 6.57134639,7.44605843 6.87637128,7.05376722 Z" fill="#FFF" fill-rule="evenodd"/>\n' +
        '</svg>';
    
    const config = {
      parentClass: "",
      btnSize: 56,
      btnLeft: "",
      btnRight: 16,
      btnTop: "",
      btnBottom: 30,
      liveChatUrl: 'https://071be2.c.myucm.cloud/liveChat?liveChatAccess=MF83MDA2N2YzNDg5OTQ0OWI0OTdiMzhlMWQyNDhkNTg5Ml8wMDBiODIwNzFiZTImNmI3ODBlYzM4ZThmMWQyYjNiNDcwMTliMWM1OWM2MzA=',
      liveChatWidth: Math.min(400, window.innerWidth - 32),
      liveChatHeight: Math.min(680, window.innerHeight - 100),
      expandDire: ""
    };

    const initLiveChat = (config) => {
      let bodyDom = document.body;
      if (config.parentClass) {
        bodyDom = document.querySelector('.' + config.parentClass);
      }
      if (!bodyDom.style.position) {
        bodyDom.style.position = 'relative';
      }

      const entryBtn = document.createElement('div');
      entryBtn.className = 'live-chat-entry close';
      entryBtn.style.position = 'fixed';
      entryBtn.style.top = typeof config.btnTop === 'number' && config.btnTop >= 0 ? config.btnTop + 'px' : config.btnTop;
      entryBtn.style.left = typeof config.btnLeft === 'number' && config.btnLeft >= 0 ? config.btnLeft + 'px' : config.btnLeft;
      entryBtn.style.bottom = typeof config.btnBottom === 'number' && config.btnBottom >= 0 ? config.btnBottom + 'px' : config.btnBottom;
      entryBtn.style.right = typeof config.btnRight === 'number' && config.btnRight >= 0 ? config.btnRight + 'px' : config.btnRight;
      entryBtn.style.width = config.btnSize >= 0 ? config.btnSize + 'px' : '50px';
      entryBtn.style.height = config.btnSize >= 0 ? config.btnSize + 'px' : '50px';
      entryBtn.style.borderRadius = config.btnSize >= 0 ? config.btnSize / 2 + 'px' : '25px';
      entryBtn.style.backgroundColor = '#3F8EF0';
      entryBtn.style.padding = '12px';
      entryBtn.style.cursor = 'pointer';
      entryBtn.style.userSelect = 'none';
      entryBtn.style.boxSizing = 'border-box';
      entryBtn.style.zIndex = '100000';
      entryBtn.innerHTML = openSvg + closeSvg;
      
      entryBtn.querySelectorAll('svg')[0].style.display = 'block';
      entryBtn.querySelectorAll('svg')[1].style.display = 'none';

      bodyDom.appendChild(entryBtn);

      entryBtn.onclick = function () {
        const liveChatIframe = document.getElementById('liveChatIframe');
        if (this.classList.contains('close')) {
          this.classList.remove('close');
          this.classList.add('open');
          this.querySelectorAll('svg')[0].style.display = 'none';
          this.querySelectorAll('svg')[1].style.display = 'block';
          
          if (liveChatIframe) {
            liveChatIframe.style.display = 'block';
          } else {
            const iframeBox = document.createElement('iframe');
            const iframeWidth = typeof config.liveChatWidth === 'number' && config.liveChatWidth >= 0 ? config.liveChatWidth : '';
            const iframeHeight = typeof config.liveChatHeight === 'number' && config.liveChatHeight >= 0 ? config.liveChatHeight : '';
            const btnSize = config.btnSize > 0 ? config.btnSize : 50;
            
            iframeBox.id = 'liveChatIframe';
            iframeBox.src = config.liveChatUrl;
            iframeBox.width = iframeWidth ? iframeWidth + 'px' : config.liveChatWidth;
            iframeBox.height = iframeHeight ? iframeHeight + 'px' : config.liveChatHeight;
            iframeBox.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups allow-downloads';
            iframeBox.allow = 'camera; microphone; autoplay; speaker; speaker-selection';
            iframeBox.style.position = 'fixed';
            iframeBox.style.width = iframeWidth ? iframeWidth + 'px' : config.liveChatWidth;
            iframeBox.style.minWidth = iframeWidth ? iframeWidth + 'px' : config.liveChatWidth;
            iframeBox.style.bottom = '-6px';
            iframeBox.style.right = (btnSize + 20) + 'px';
            iframeBox.style.backgroundColor = '#F5F7FA';
            iframeBox.style.boxShadow = '0 2px 16px 0 #00000029';
            iframeBox.style.borderRadius = '12px';
            iframeBox.style.background = '#fff';
            iframeBox.style.border = 'none';
            iframeBox.style.zIndex = '99999';
            
            entryBtn.appendChild(iframeBox);
          }
        } else {
          this.classList.remove('open');
          this.classList.add('close');
          this.querySelectorAll('svg')[0].style.display = 'block';
          this.querySelectorAll('svg')[1].style.display = 'none';
          
          if (liveChatIframe) {
            liveChatIframe.style.display = 'none';
          }
        }
      };

      entryBtn.addEventListener('mouseover', () => {
        entryBtn.style.backgroundColor = '#4299FC';
      });

      entryBtn.addEventListener('mouseout', () => {
        entryBtn.style.backgroundColor = '#3F8EF0';
      });
    };

    initLiveChat(config);
  }, [currentPageName]);

  useEffect(() => {
    loadAuth();
  }, []);

  // Apply theme on mount and listen for system theme changes
  useEffect(() => {
    const applyTheme = (theme) => {
      const root = document.documentElement;
      const savedTheme = theme || localStorage.getItem('theme') || 'system';
      
      if (savedTheme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      } else if (savedTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    // Apply theme immediately
    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const savedTheme = localStorage.getItem('theme') || 'system';
      if (savedTheme === 'system') {
        applyTheme('system'); // Re-apply to respect system preference
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
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
          
          // Load dealer branding if user has dealer_id
          if (parsedUser.dealer_id) {
            try {
              const dealers = await base44.entities.Dealer.filter({ id: parsedUser.dealer_id });
              if (dealers && dealers.length > 0) {
                foundDealer = dealers[0];
              }
            } catch (dealerError) {
              console.warn('Could not load dealer from user dealer_id:', dealerError);
              // Continue without dealer branding
            }
          }
        } catch (e) {
          console.error('Error parsing pinLoggedInUser:', e);
          localStorage.removeItem('pinLoggedInUser');
        }
      }
      
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Load dealer branding from authenticated user if not already loaded
        if (!foundDealer && currentUser.dealer_id) {
          try {
            const dealers = await base44.entities.Dealer.filter({ id: currentUser.dealer_id });
            if (dealers && dealers.length > 0) {
              foundDealer = dealers[0];
            }
          } catch (dealerError) {
            console.warn('Could not load dealer from authenticated user:', dealerError);
            // Continue without dealer branding
          }
        }
      } catch (e) {
        console.log('No authenticated user');
        // This is OK for public pages
      }
      
      // If no dealer from user, check subdomain
      if (!foundDealer) {
        try {
          const hostname = window.location.hostname;
          const subdomain = hostname.split('.')[0];
          
          if (subdomain && !['localhost', 'chainlinkpos', 'www', ''].includes(subdomain.toLowerCase())) {
            try {
              const dealers = await base44.entities.Dealer.filter({ slug: subdomain });
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
      
      // If user is authenticated via base44 auth, logout from that too
      base44.auth.logout(createPageUrl('Home'));
    }
  };

  const handleExitImpersonation = () => {
    localStorage.removeItem('pinLoggedInUser');
    window.location.href = createPageUrl('SuperAdmin');
  };

  // If user is not authenticated (via base44.auth.me) and is trying to access a non-authentication
  // or non-home page, redirect them to the Home page.
  // Allow root_admin to access dealer pages
  if (!user && !['EmailLogin', 'MerchantOnboarding', 'PinLogin', 'WalletLoginPage', 'Home', 'PrivacyPolicy', 'TermsOfService', 'About', 'Contact', 'CustomerDisplay', 'KitchenDisplay', 'OnlineMenu', 'DeviceShop', 'DealerOnboarding', 'DealerDashboard', 'DealerLanding'].includes(currentPageName)) {
    return <Home />;
  }

  // Always allow public pages to render, including 'Home' if accessed directly
  if (PUBLIC_PAGES.includes(currentPageName)) {
    return <PublicLayout>{children}</PublicLayout>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
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
    window.location.href = createPageUrl('PinLogin');
    return null;
  }

  // Block inactive merchants from accessing the platform
  if (pinUser && pinUser.merchant_id && pinUser.role !== 'admin' && merchantStatus === 'inactive' && !PUBLIC_PAGES.includes(currentPageName)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Pending Activation</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
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

  const primaryColor = dealer?.primary_color || '#7B2FD6';
  const secondaryColor = dealer?.secondary_color || '#0FD17A';
  const brandName = dealer?.name || 'ChainLINK';
  const logoUrl = dealer?.logo_url;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
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
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-[10px] z-40 shadow-sm"
             style={{marginTop: '-10px', marginLeft: '-10px', marginRight: '-10px'}}>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to={createPageUrl('SystemMenu')} className="flex items-center space-x-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt={brandName} className="h-10" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                         style={{background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`}}>
                      <Link2 className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {brandName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block -mt-1">
                      Point of Sale
                    </span>
                  </div>
                </Link>
              </div>

              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
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

        <main className="flex-1">
          {children}
        </main>
      </div>

      {!dealer?.settings?.hide_chainlink_branding && !PUBLIC_PAGES.includes(currentPageName) && (
        <a 
          href="https://isolex.io" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 text-xs text-gray-500 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm hover:shadow-md transition-shadow z-50"
        >
          © Isolex Corporation
        </a>
      )}
    </div>
    
  );
}