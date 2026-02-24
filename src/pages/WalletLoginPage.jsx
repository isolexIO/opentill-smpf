import { useEffect } from 'react';
import { createPageUrl } from '@/utils';

export default function WalletLoginPage() {
  const [dealer, setDealer] = useState(null);

  useEffect(() => {
    loadDealer();
  }, []);

  const loadDealer = async () => {
    try {
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      if (subdomain && !['localhost', 'chainlinkpos', 'www', ''].includes(subdomain.toLowerCase())) {
        const dealers = await base44.entities.Dealer.filter({ slug: subdomain });
        if (dealers && dealers.length > 0) {
          setDealer(dealers[0]);
        }
      }
    } catch (e) {
      console.warn('Could not load dealer:', e);
    }
  };

  const brandName = dealer?.name || 'ChainLINK';
  const primaryColor = dealer?.primary_color || '#7B2FD6';
  const secondaryColor = dealer?.secondary_color || '#0FD17A';
  const logoUrl = dealer?.logo_url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-16 mx-auto mb-4" />
          ) : (
            <div className="flex justify-center mb-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                }}
              >
                <Link2 className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {brandName} POS
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Secure wallet authentication</p>
        </div>

        <WalletLogin />

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = createPageUrl('EmailLogin')}
          >
            <Mail className="w-4 h-4 mr-2" />
            Login with Email
          </Button>
          
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => window.location.href = createPageUrl('PinLogin')}
          >
            <KeyRound className="w-4 h-4 mr-2" />
            Use PIN Login
          </Button>
        </div>
      </div>
    </div>
  );
}