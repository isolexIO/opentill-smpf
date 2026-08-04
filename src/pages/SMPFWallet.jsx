import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, Lock, Wallet, AlertCircle } from 'lucide-react';

export default function SMPFWallet() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserAndWallet();
  }, []);

  async function loadUserAndWallet() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch current logged in user
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(currentUser);

      // 2. Fetch user's wallet record safely
      const wallets = await base44.entities.DUCWalletSettings.list().catch(() => []);
      
      // Extract backup string safely in case it returned an object
      const userWallet = wallets?.[0] || null;
      setWallet(userWallet);
    } catch (err) {
      console.error('Failed loading SMPF Wallet:', err);
      setError(err.message || 'Error loading wallet data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Fallback if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-white/10 text-white text-center p-6 space-y-4">
          <Lock className="w-12 h-12 text-indigo-400 mx-auto" />
          <h2 className="text-xl font-bold">Authentication Required</h2>
          <p className="text-white/60 text-sm">Please log in to your openTILL account to view your wallet.</p>
          <Button onClick={() => base44.auth.redirectToLogin()} className="w-full bg-indigo-600 hover:bg-indigo-500">
            <LogIn className="w-4 h-4 mr-2" /> Log In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Wallet className="w-6 h-6 text-indigo-400" /> openTILL Wallet
            </h1>
            <p className="text-xs text-white/60">Solana Multi-Purpose Framework (SMPF)</p>
          </div>
          <div className="text-right text-xs">
            <span className="text-white/60">Logged in as: </span>
            <span className="font-mono text-indigo-300">{user.email}</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Wallet Content */}
        <Card className="bg-slate-900 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Wallet Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3 bg-slate-950 border border-white/10 rounded-lg font-mono">
              <span className="text-white/60 block mb-1">User ID:</span>
              <span className="text-indigo-400">{user.id || 'N/A'}</span>
            </div>

            {wallet ? (
              <div className="p-3 bg-slate-950 border border-white/10 rounded-lg space-y-2">
                <span className="text-white/60 block">Wallet Config Loaded</span>
                <p className="text-emerald-400 font-semibold">Active</p>
              </div>
            ) : (
              <div className="p-3 bg-slate-950 border border-white/10 rounded-lg text-amber-400">
                No active wallet configuration found for this account.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}