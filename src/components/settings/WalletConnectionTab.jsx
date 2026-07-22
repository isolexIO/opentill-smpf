import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function WalletConnectionTab() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [walletType, setWalletType] = useState('');
  const [connectedWallets, setConnectedWallets] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Extract connected wallets from pos_settings
      const wallets = [];
      if (currentUser.pos_settings?.phantom_wallet) {
        wallets.push({ type: 'phantom', address: currentUser.pos_settings.phantom_wallet });
      }
      if (currentUser.pos_settings?.solflare_wallet) {
        wallets.push({ type: 'solflare', address: currentUser.pos_settings.solflare_wallet });
      }
      if (currentUser.pos_settings?.backpack_wallet) {
        wallets.push({ type: 'backpack', address: currentUser.pos_settings.backpack_wallet });
      }
      if (currentUser.pos_settings?.jupiter_wallet) {
        wallets.push({ type: 'jupiter', address: currentUser.pos_settings.jupiter_wallet });
      }
      if (currentUser.pos_settings?.ethereum_wallet) {
        wallets.push({ type: 'ethereum', address: currentUser.pos_settings.ethereum_wallet });
      }
      
      setConnectedWallets(wallets);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectPhantom = async () => {
    setConnecting(true);
    setWalletType('Phantom');

    try {
      const isPhantomInstalled = window?.solana?.isPhantom;
      
      if (!isPhantomInstalled) {
        window.open('https://phantom.app/', '_blank');
        throw new Error('Phantom wallet is not installed. Please install it and refresh the page.');
      }

      const resp = await window.solana.connect();
      const publicKey = resp.publicKey.toString();

      // Sign a message to verify ownership
      const message = `Link this wallet to openTILL\n\nWallet: ${publicKey}\nUser: ${user.email}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');

      // Link wallet to user account
      await linkWallet(publicKey, 'phantom', {
        signature: Array.from(signedMessage.signature),
        message: message
      });

    } catch (err) {
      console.error('Phantom connection error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to connect Phantom wallet',
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
      setWalletType('');
    }
  };

  const connectSolflare = async () => {
    setConnecting(true);
    setWalletType('Solflare');

    try {
      const provider = window?.solflare;
      
      if (!provider) {
        window.open('https://solflare.com/', '_blank');
        throw new Error('Solflare wallet is not installed. Please install it and refresh the page.');
      }

      await provider.connect();
      const publicKey = provider.publicKey.toString();

      const message = `Link this wallet to openTILL\n\nWallet: ${publicKey}\nUser: ${user.email}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage, 'utf8');

      await linkWallet(publicKey, 'solflare', {
        signature: Array.from(signedMessage.signature),
        message: message
      });

    } catch (err) {
      console.error('Solflare connection error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to connect Solflare wallet',
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
      setWalletType('');
    }
  };

  const connectBackpack = async () => {
    setConnecting(true);
    setWalletType('Backpack');

    try {
      const provider = window?.backpack;
      
      if (!provider) {
        window.open('https://backpack.app/', '_blank');
        throw new Error('Backpack wallet is not installed. Please install it and refresh the page.');
      }

      const resp = await provider.connect();
      const publicKey = resp.publicKey.toString();

      const message = `Link this wallet to openTILL\n\nWallet: ${publicKey}\nUser: ${user.email}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage, 'utf8');

      await linkWallet(publicKey, 'backpack', {
        signature: Array.from(signedMessage.signature),
        message: message
      });

    } catch (err) {
      console.error('Backpack connection error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to connect Backpack wallet',
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
      setWalletType('');
    }
  };

  const connectJupiter = async () => {
    setConnecting(true);
    setWalletType('Jupiter');

    try {
      const provider = window?.jupiter?.solana;
      
      if (!provider) {
        window.open('https://jup.ag/', '_blank');
        throw new Error('Jupiter wallet is not installed. Please install it and refresh the page.');
      }

      const resp = await provider.connect();
      const publicKey = resp.publicKey.toString();

      const message = `Link this wallet to openTILL\n\nWallet: ${publicKey}\nUser: ${user.email}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage, 'utf8');

      await linkWallet(publicKey, 'jupiter', {
        signature: Array.from(signedMessage.signature),
        message: message
      });

    } catch (err) {
      console.error('Jupiter connection error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to connect Jupiter wallet',
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
      setWalletType('');
    }
  };

  const connectMetaMask = async () => {
    setConnecting(true);
    setWalletType('MetaMask');

    try {
      if (typeof window.ethereum === 'undefined') {
        window.open('https://metamask.io/download/', '_blank');
        throw new Error('MetaMask is not installed. Please install it and refresh the page.');
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }

      const address = accounts[0];

      const message = `Link this wallet to openTILL\n\nWallet: ${address}\nUser: ${user.email}\nTimestamp: ${Date.now()}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      await linkWallet(address, 'ethereum', {
        signature: signature,
        message: message
      });

    } catch (err) {
      console.error('MetaMask connection error:', err);
      
      if (err.code === 4001) {
        return; // User rejected
      }
      
      toast({
        title: 'Error',
        description: err.message || 'Failed to connect MetaMask',
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
      setWalletType('');
    }
  };

  const linkWallet = async (walletAddress, walletType, signatureData) => {
    try {
      const { data } = await base44.functions.invoke('linkWalletToUser', {
        wallet_address: walletAddress,
        wallet_type: walletType,
        signature_data: signatureData,
        user_id: user.id
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to link wallet');
      }

      toast({
        title: 'Success',
        description: `${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet connected successfully!`,
        className: 'bg-green-500 text-white'
      });

      // Reload user data
      await loadUser();

    } catch (err) {
      console.error('Wallet linking error:', err);
      throw err;
    }
  };

  const unlinkWallet = async (walletType) => {
    if (!confirm(`Are you sure you want to disconnect your ${walletType} wallet?`)) {
      return;
    }

    try {
      const { data } = await base44.functions.invoke('unlinkWalletFromUser', {
        wallet_type: walletType,
        user_id: user.id
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to unlink wallet');
      }

      toast({
        title: 'Success',
        description: `${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet disconnected`,
      });

      await loadUser();

    } catch (err) {
      console.error('Wallet unlinking error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to disconnect wallet',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const isWalletConnected = (type) => {
    return connectedWallets.some(w => w.type === type);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Wallets</CardTitle>
          <CardDescription>
            Link your crypto wallets for faster login. You can use any connected wallet to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Once connected, you can login instantly using any of your linked wallets without entering a PIN.
            </AlertDescription>
          </Alert>

          {/* Connected Wallets List */}
          {connectedWallets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Your Connected Wallets</h3>
              {connectedWallets.map((wallet) => (
                <div key={wallet.type} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium capitalize">{wallet.type} Wallet</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unlinkWallet(wallet.type)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Connect Wallet Buttons */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Connect a Wallet</h3>
            
            {/* Phantom */}
            {!isWalletConnected('phantom') && (
              <Button
                onClick={connectPhantom}
                disabled={connecting}
                variant="outline"
                className="w-full justify-start h-12"
              >
                {connecting && walletType === 'Phantom' ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <div className="w-5 h-5 mr-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Wallet className="w-3 h-3 text-white" />
                  </div>
                )}
                <span>Connect Phantom Wallet</span>
              </Button>
            )}

            {/* Solflare */}
            {!isWalletConnected('solflare') && (
              <Button
                onClick={connectSolflare}
                disabled={connecting}
                variant="outline"
                className="w-full justify-start h-12"
              >
                {connecting && walletType === 'Solflare' ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <div className="w-5 h-5 mr-2 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                    <Wallet className="w-3 h-3 text-white" />
                  </div>
                )}
                <span>Connect Solflare Wallet</span>
              </Button>
            )}

            {/* Backpack */}
            {!isWalletConnected('backpack') && (
              <Button
                onClick={connectBackpack}
                disabled={connecting}
                variant="outline"
                className="w-full justify-start h-12"
              >
                {connecting && walletType === 'Backpack' ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <div className="w-5 h-5 mr-2 bg-black rounded-lg flex items-center justify-center">
                    <Wallet className="w-3 h-3 text-white" />
                  </div>
                )}
                <span>Connect Backpack Wallet</span>
              </Button>
            )}

            {/* Jupiter */}
            {!isWalletConnected('jupiter') && (
              <Button
                onClick={connectJupiter}
                disabled={connecting}
                variant="outline"
                className="w-full justify-start h-12"
              >
                {connecting && walletType === 'Jupiter' ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <img 
                    src="https://jup.ag/svg/jupiter-logo.svg" 
                    alt="Jupiter" 
                    className="w-5 h-5 mr-2 rounded-full"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <span>Connect Jupiter Wallet</span>
              </Button>
            )}

            {/* MetaMask */}
            {!isWalletConnected('ethereum') && (
              <Button
                onClick={connectMetaMask}
                disabled={connecting}
                variant="outline"
                className="w-full justify-start h-12"
              >
                {connecting && walletType === 'MetaMask' ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                    alt="MetaMask" 
                    className="w-5 h-5 mr-2"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <span>Connect MetaMask / WalletConnect</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}