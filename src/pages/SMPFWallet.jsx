import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, LogIn, Lock } from 'lucide-react';

export default function SMPFWallet() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    checkUserAndLoadWallet();
  }, []);

  async function checkUserAndLoadWallet() {
    setLoading(true);
    try {
      // 1. Get current logged-in user from Base44
      const currentUser = await base44.auth.me();
      
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      setUser(currentUser);

      // 2. Query wallet assigned to this specific user account
      const userWallets = await base44.entities.DUCWalletSettings.list({
        user_id: currentUser.id
      }).catch(() => []);

      if (userWallets && userWallets.length > 0) {
        setWallet(userWallets[0]);
      } else {
        // Option to automatically register / bind a wallet entity for new accounts
        console.log('No wallet bound to user yet.');
      }
    } catch (err) {
      console.error('Auth/Wallet load error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle trigger for standard platform login
  const handleLoginRedirect = () => {
    base44.auth.redirectToLogin(); // or custom login route
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Fallback UI when user is not logged in via standard auth
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-white/10 text-white text-center p-6 space-y-4">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Account Authentication Required</h2>
          <p className="text-white/60 text-sm">
            Please log in with your openTILL account to access your wallet, tokens, and keys.
          </p>
          <Button onClick={handleLoginRedirect} className="w-full bg-indigo-600 hover:bg-indigo-500">
            <LogIn className="w-4 h-4 mr-2" /> Log In with openTILL
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      {/* Rest of your Wallet UI */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">openTILL Wallet</h1>
        <span className="text-xs text-white/60">Logged in as: {user.email}</span>
      </div>
      
      {/* Wallet balance, send, receive components... */}
    </div>
  );
}