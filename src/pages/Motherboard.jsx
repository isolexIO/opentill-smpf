import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cpu, Wallet, RefreshCw, AlertCircle } from 'lucide-react';
import WalletConnectButton from '@/components/motherboard/WalletConnectButton';
import ChipCard from '@/components/motherboard/ChipCard';

export default function Motherboard() {
  const [user, setUser] = useState(null);
  const [chips, setChips] = useState([]);
  const [walletAddress, setWalletAddress] = useState(null);
  const [unlockedChips, setUnlockedChips] = useState({});
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load user's connected wallet
      if (currentUser.wallet_address) {
        setWalletAddress(currentUser.wallet_address);
      }

      // Load all available chips
      const allChips = await base44.entities.Chip.filter({ is_active: true });
      const sortedChips = allChips.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      setChips(sortedChips);

      // If wallet is connected, verify NFTs
      if (currentUser.wallet_address) {
        await verifyNFTs(currentUser.wallet_address, sortedChips);
      }
    } catch (error) {
      console.error('Error loading motherboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyNFTs = async (wallet, chipsList = chips) => {
    setVerifying(true);
    try {
      // Call backend function to verify NFT ownership
      const response = await base44.functions.invoke('verifyNFTOwnership', {
        wallet_address: wallet,
        chips: chipsList.map(c => ({
          id: c.id,
          collection: c.required_nft_collection,
          required_count: c.required_nft_count
        }))
      });

      if (response.data?.unlocked_chips) {
        setUnlockedChips(response.data.unlocked_chips);
      }
    } catch (error) {
      console.error('Error verifying NFTs:', error);
    } finally {
      setVerifying(false);
    }
  };

  const handleWalletConnected = async (publicKey) => {
    try {
      // Link wallet to user account
      await base44.functions.invoke('linkWalletToUser', {
        wallet_address: publicKey
      });
      
      setWalletAddress(publicKey);
      
      // Verify NFTs
      await verifyNFTs(publicKey);
    } catch (error) {
      console.error('Error linking wallet:', error);
    }
  };

  const handleRefresh = () => {
    if (walletAddress) {
      verifyNFTs(walletAddress);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading Motherboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Cpu className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Motherboard</h1>
              <p className="text-gray-500 dark:text-gray-400">Connect your wallet to unlock features</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {walletAddress && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={verifying}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Wallet Connection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Wallet Connection
            </CardTitle>
            <CardDescription>
              Connect your Solana wallet to verify NFT ownership and unlock features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletConnectButton onWalletConnected={handleWalletConnected} />
          </CardContent>
        </Card>

        {/* No Wallet Warning */}
        {!walletAddress && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Connect your wallet to see which features you can unlock. Each feature requires specific NFTs from authorized collections.
            </AlertDescription>
          </Alert>
        )}

        {/* Chips Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Available Chips
            </h2>
            {walletAddress && (
              <div className="text-sm text-gray-500">
                {Object.values(unlockedChips).filter(Boolean).length} / {chips.length} Unlocked
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chips.map(chip => (
              <ChipCard
                key={chip.id}
                chip={chip}
                isUnlocked={unlockedChips[chip.id]?.unlocked || false}
                nftCount={unlockedChips[chip.id]?.nft_count || 0}
              />
            ))}
          </div>

          {chips.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No chips available yet. Check back soon!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}