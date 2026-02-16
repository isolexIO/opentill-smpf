import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Vault, Wallet, TrendingUp, Lock, ArrowRightLeft, 
  Loader2, AlertCircle, CheckCircle, ExternalLink, RefreshCw 
} from 'lucide-react';
import PermissionCheck from '@/components/auth/PermissionCheck';
import PriceTicker from '@/components/vault/PriceTicker';
import JupiterChart from '@/components/vault/JupiterChart';

export default function DUCVaultPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [vaultEnabled, setVaultEnabled] = useState(false);
  
  // Balances
  const [totalEarned, setTotalEarned] = useState(0);
  const [available, setAvailable] = useState(0);
  const [staked, setStaked] = useState(0);
  const [pending, setPending] = useState(0);
  
  // History
  const [rewardHistory, setRewardHistory] = useState([]);
  const [stakes, setStakes] = useState([]);
  
  // Actions
  const [claiming, setClaiming] = useState(false);
  const [staking, setStaking] = useState(false);
  const [swapping, setSwapping] = useState(false);
  
  // Forms
  const [claimAmount, setClaimAmount] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapTo, setSwapTo] = useState('USDC');

  useEffect(() => {
    loadVaultData();
  }, []);

  const loadVaultData = async () => {
    setLoading(true);
    try {
      // Check for impersonated user first (from PIN login)
      const impersonatedUserJSON = localStorage.getItem('pinLoggedInUser');
      let currentUser = null;
      let merchantId = null;

      if (impersonatedUserJSON) {
        try {
          currentUser = JSON.parse(impersonatedUserJSON);
          merchantId = currentUser.merchant_id;
        } catch (e) {
          console.error('Error parsing impersonated user:', e);
        }
      }

      // If no impersonated user, get from auth
      if (!currentUser) {
        currentUser = await base44.auth.me();
      }

      merchantId = merchantId || currentUser.merchant_id;
      setUser(currentUser);

      // Check wallet connection
      setWalletConnected(!!currentUser.wallet_address);

      // Check if vault is enabled
      const settings = await base44.entities.cLINKVaultSettings.filter({
        merchant_id: merchantId
      });
      
      const globalSettings = await base44.entities.cLINKVaultSettings.filter({
        merchant_id: null
      });

      const merchantSettings = settings[0];
      const global = globalSettings[0];
      
      setVaultEnabled(
        (merchantSettings?.vault_enabled ?? global?.vault_enabled ?? false)
      );

      // Load rewards
      const rewards = await base44.entities.cLINKReward.filter({
        merchant_id: merchantId
      });

      const total = rewards.reduce((sum, r) => sum + r.amount, 0);
      const avail = rewards.filter(r => r.status === 'available').reduce((sum, r) => sum + r.amount, 0);
      const pend = rewards.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);

      setTotalEarned(total);
      setAvailable(avail);
      setPending(pend);
      setRewardHistory(rewards.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));

      // Load stakes
      const activeStakes = await base44.entities.cLINKStake.filter({
        merchant_id: merchantId,
        status: 'active'
      });

      const stakedTotal = activeStakes.reduce((sum, s) => sum + s.amount, 0);
      setStaked(stakedTotal);
      setStakes(activeStakes);

    } catch (error) {
      console.error('Error loading vault data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setClaiming(true);
    try {
      const impersonatedUserJSON = localStorage.getItem('pinLoggedInUser');
      const merchantId = impersonatedUserJSON ? JSON.parse(impersonatedUserJSON).merchant_id : user.merchant_id;

      const { data } = await base44.functions.invoke('claimCLINKRewards', {
        merchant_id: merchantId,
        amount: parseFloat(claimAmount) || available
      });

      if (data.success) {
        alert(`Successfully claimed ${data.amount} $DUC!\n\nTransaction: ${data.signature}`);
        loadVaultData();
        setClaimAmount('');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Claim error:', error);
      alert('Failed to claim rewards: ' + error.message);
    } finally {
      setClaiming(false);
    }
  };

  const handleStake = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      alert('Please enter a valid stake amount');
      return;
    }

    setStaking(true);
    try {
      const impersonatedUserJSON = localStorage.getItem('pinLoggedInUser');
      const merchantId = impersonatedUserJSON ? JSON.parse(impersonatedUserJSON).merchant_id : user.merchant_id;

      // Step 1: Prepare transaction
      const { data: prepData } = await base44.functions.invoke('stakeCLINK', {
        merchant_id: merchantId,
        amount: parseFloat(stakeAmount),
        action: 'prepare'
      });

      if (!prepData.success) {
        throw new Error(prepData.error);
      }

      // Step 2: Get user to sign transaction
      const provider = window.solana || window.phantom?.solana;
      if (!provider) {
        throw new Error('Wallet not detected. Please ensure your wallet extension is active.');
      }

      const txBuffer = Buffer.from(prepData.transaction, 'base64');
      const signedTx = await provider.signTransaction(txBuffer);
      const signedTxBase64 = Buffer.from(signedTx.serialize()).toString('base64');

      // Step 3: Verify and record on-chain
      const { data: verifyData } = await base44.functions.invoke('stakeCLINK', {
        merchant_id: merchantId,
        amount: parseFloat(stakeAmount),
        action: 'verify',
        signed_transaction: signedTxBase64
      });

      if (verifyData.success) {
        alert(`Successfully staked ${verifyData.amount} $DUC!\n\nAPY: ${verifyData.apy}%\nUnlocks: ${new Date(verifyData.unlocks_at).toLocaleDateString()}\nSignature: ${verifyData.signature}`);
        loadVaultData();
        setStakeAmount('');
      } else {
        throw new Error(verifyData.error);
      }
    } catch (error) {
      console.error('Stake error:', error);
      alert('Failed to stake: ' + error.message);
    } finally {
      setStaking(false);
    }
  };

  const handleSwap = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      alert('Please enter a valid swap amount');
      return;
    }

    setSwapping(true);
    try {
      const impersonatedUserJSON = localStorage.getItem('pinLoggedInUser');
      const merchantId = impersonatedUserJSON ? JSON.parse(impersonatedUserJSON).merchant_id : user.merchant_id;

      // Step 1: Get quote
      const { data: quoteData } = await base44.functions.invoke('swapCLINKViaJupiter', {
        merchant_id: merchantId,
        from_amount: parseFloat(swapAmount),
        to_token: swapTo,
        action: 'quote'
      });

      if (!quoteData.success) {
        throw new Error(quoteData.error);
      }

      // Show quote to user
      const confirmSwap = confirm(
        `Swap Quote:\n\n` +
        `Input: ${swapAmount} $DUC\n` +
        `Output: ~${quoteData.quote.output_amount.toFixed(4)} ${swapTo}\n` +
        `Price Impact: ${quoteData.quote.price_impact_pct.toFixed(2)}%\n` +
        `Slippage: 0.5%\n\n` +
        `Proceed with swap?`
      );

      if (!confirmSwap) {
        setSwapping(false);
        return;
      }

      // Step 2: Prepare transaction
      const { data: prepData } = await base44.functions.invoke('swapCLINKViaJupiter', {
        merchant_id: merchantId,
        from_amount: parseFloat(swapAmount),
        to_token: swapTo,
        action: 'prepare'
      });

      if (!prepData.success) {
        throw new Error(prepData.error);
      }

      // Step 3: Get user to sign
      const provider = window.solana || window.phantom?.solana;
      if (!provider) {
        throw new Error('Wallet not detected. Please ensure your wallet extension is active.');
      }

      const txBuffer = Buffer.from(prepData.transaction, 'base64');
      
      // Jupiter returns serialized VersionedTransaction
      const { VersionedTransaction } = await import('@solana/web3.js');
      const versionedTx = VersionedTransaction.deserialize(txBuffer);
      
      const signedTx = await provider.signTransaction(versionedTx);
      const signedTxBase64 = Buffer.from(signedTx.serialize()).toString('base64');

      // Step 4: Verify transaction
      const { data: verifyData } = await base44.functions.invoke('swapCLINKViaJupiter', {
        merchant_id: merchantId,
        action: 'verify',
        signed_transaction: signedTxBase64
      });

      if (verifyData.success) {
        alert(`Successfully swapped ${swapAmount} $DUC → ${swapTo}!\n\nSignature: ${verifyData.signature}`);
        loadVaultData();
        setSwapAmount('');
      } else {
        throw new Error(verifyData.error);
      }
    } catch (error) {
      console.error('Swap error:', error);
      alert('Failed to swap: ' + error.message);
    } finally {
      setSwapping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <PermissionCheck requiredRole="merchant_admin" showWarning>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Vault className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">$DUC Vault</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your rewards and earnings</p>
              </div>
            </div>
            <Button onClick={loadVaultData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Wallet Check */}
          {!walletConnected && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Connect your wallet</strong> to claim rewards, stake, and swap tokens.
                <Button 
                  variant="link" 
                  className="text-yellow-600 underline p-0 h-auto ml-2"
                  onClick={() => window.location.href = '/Settings'}
                >
                  Go to Settings
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Vault Disabled */}
          {!vaultEnabled && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                The $DUC Vault is currently disabled for your account. Contact support for more information.
              </AlertDescription>
            </Alert>
          )}

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Earned</CardDescription>
                <CardTitle className="text-3xl">{totalEarned.toFixed(2)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">$DUC</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Available to Claim</CardDescription>
                <CardTitle className="text-3xl text-green-600">{available.toFixed(2)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">$DUC</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Staked</CardDescription>
                <CardTitle className="text-3xl text-blue-600">{staked.toFixed(2)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">$DUC</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending</CardDescription>
                <CardTitle className="text-3xl text-orange-600">{pending.toFixed(2)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">$DUC</p>
              </CardContent>
            </Card>
          </div>

          {/* Jupiter Chart */}
          <JupiterChart />

          {/* Actions Tabs */}
          <Tabs defaultValue="claim" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="claim">Claim Rewards</TabsTrigger>
              <TabsTrigger value="stake">Stake</TabsTrigger>
              <TabsTrigger value="swap">Swap</TabsTrigger>
            </TabsList>

            {/* Claim Tab */}
            <TabsContent value="claim">
              <Card>
                <CardHeader>
                  <CardTitle>Claim Your Rewards</CardTitle>
                  <CardDescription>Transfer available $DUC to your connected wallet</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Amount to Claim</Label>
                    <Input
                      type="number"
                      placeholder={`Max: ${available.toFixed(2)}`}
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      max={available}
                    />
                  </div>
                  <Button 
                    onClick={handleClaim} 
                    disabled={claiming || !walletConnected || available <= 0}
                    className="w-full"
                  >
                    {claiming ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Claim {claimAmount || available.toFixed(2)} $DUC
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stake Tab */}
            <TabsContent value="stake">
              <Card>
                <CardHeader>
                  <CardTitle>Stake $DUC</CardTitle>
                  <CardDescription>Earn passive yield by staking your tokens</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      Current APY: <strong>12%</strong> | Lockup: <strong>90 days</strong>
                    </AlertDescription>
                  </Alert>
                  <div>
                    <Label>Amount to Stake</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleStake} 
                    disabled={staking || !walletConnected}
                    className="w-full"
                  >
                    {staking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                    Stake {stakeAmount || '0'} $DUC
                  </Button>

                  {stakes.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h4 className="font-semibold">Your Active Stakes</h4>
                      {stakes.map(stake => (
                        <div key={stake.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{stake.amount} $DUC</p>
                            <p className="text-sm text-gray-500">APY: {stake.apy}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Unlocks</p>
                            <p className="text-sm font-medium">{new Date(stake.unlocks_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Swap Tab */}
            <TabsContent value="swap">
              <Card>
                <CardHeader>
                  <CardTitle>Swap via Jupiter</CardTitle>
                  <CardDescription>Exchange $DUC for other tokens</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Amount to Swap</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Swap To</Label>
                    <select 
                      className="w-full border rounded-md p-2"
                      value={swapTo}
                      onChange={(e) => setSwapTo(e.target.value)}
                    >
                      <option value="USDC">USDC</option>
                      <option value="SOL">SOL</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>
                  <Alert>
                    <ExternalLink className="h-4 w-4" />
                    <AlertDescription>
                      Swaps are powered by Jupiter with our referral code applied
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={handleSwap} 
                    disabled={swapping || !walletConnected}
                    className="w-full"
                  >
                    {swapping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
                    Swap to {swapTo}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Reward History */}
          <Card>
            <CardHeader>
              <CardTitle>Reward History</CardTitle>
              <CardDescription>Your $DUC earnings over time</CardDescription>
            </CardHeader>
            <CardContent>
              {rewardHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No rewards yet</p>
              ) : (
                <div className="space-y-2">
                  {rewardHistory.slice(0, 10).map(reward => (
                    <div key={reward.id} className="flex justify-between items-center p-3 border-b">
                      <div>
                        <p className="font-medium">{reward.amount} $DUC</p>
                        <p className="text-sm text-gray-500">{reward.reward_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm capitalize">{reward.status}</p>
                        <p className="text-xs text-gray-500">{new Date(reward.created_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
        
        {/* Price Ticker at Bottom */}
        <div className="fixed bottom-0 left-0 right-0" style={{ zIndex: 99999 }}>
          <PriceTicker />
        </div>
      </div>
    </PermissionCheck>
  );
}