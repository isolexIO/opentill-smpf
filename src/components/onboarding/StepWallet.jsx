import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wallet, CheckCircle, ExternalLink, Info, ChevronRight } from 'lucide-react';

const WALLET_OPTIONS = [
  { id: 'phantom', name: 'Phantom', url: 'https://phantom.app', color: '#ab9ff2' },
  { id: 'solflare', name: 'Solflare', url: 'https://solflare.com', color: '#fc8a16' },
  { id: 'backpack', name: 'Backpack', url: 'https://backpack.app', color: '#e33e3f' },
];

export default function StepWallet({ formData, onChange, onNext, onBack }) {
  const [manualMode, setManualMode] = useState(!!formData.wallet_address);

  const isValidSolana = (addr) => addr && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 mb-2">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-purple-500" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-900">Connect Your Wallet</h2>
        <p className="text-slate-500 text-sm">Your Solana wallet will receive $DUC rewards. You can skip this now.</p>
      </div>

      {!manualMode ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Popular Wallets</p>
          {WALLET_OPTIONS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => window.open(w.url, '_blank')}
              className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs"
                     style={{ background: w.color + '22', color: w.color }}>{w.name[0]}</div>
                <span className="font-semibold text-slate-800">{w.name}</span>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:bg-slate-100 transition-all text-sm"
          >
            <span>I already have a wallet address</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="wallet" className="font-medium text-slate-700">Solana Wallet Address</Label>
            <Input
              id="wallet"
              placeholder="Enter your public wallet address..."
              value={formData.wallet_address || ''}
              onChange={(e) => onChange('wallet_address', e.target.value.trim())}
              className="font-mono text-sm h-11"
            />
            {formData.wallet_address && (
              isValidSolana(formData.wallet_address) ? (
                <p className="flex items-center gap-1 text-xs text-cyan-600">
                  <CheckCircle className="w-3.5 h-3.5" /> Valid Solana address
                </p>
              ) : (
                <p className="text-xs text-amber-600">Address format looks off — double check before continuing.</p>
              )
            )}
          </div>
          <button
            type="button"
            onClick={() => { setManualMode(false); onChange('wallet_address', ''); }}
            className="text-xs text-slate-400 underline"
          >← Back to wallet options</button>
        </div>
      )}

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Your wallet is used only to receive $DUC rewards. You can add or change it later in Settings.</p>
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12">Back</Button>
        <Button
          type="button"
          onClick={onNext}
          className="flex-[2] bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl"
        >
          {formData.wallet_address && isValidSolana(formData.wallet_address) ? 'Continue with Wallet' : 'Skip for Now'}
        </Button>
      </div>
    </div>
  );
}