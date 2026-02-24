import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Loader2, Tag, Gift } from 'lucide-react';

export default function StepReferral({ formData, onChange, onNext }) {
  const [checking, setChecking] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState(null);
  const [codeError, setCodeError] = useState(null);

  // Auto-check referral code from URL param on mount
  useEffect(() => {
    if (formData.referral_code && formData.referral_code.length >= 4) {
      handleCheckCode(formData.referral_code);
    }
  }, []);

  const handleCheckCode = async (code) => {
    if (!code || code.length < 4) return;
    setChecking(true);
    setReferrerInfo(null);
    setCodeError(null);
    try {
      const merchants = await base44.entities.Merchant.filter({ referral_code: code.toUpperCase().trim() });
      if (merchants && merchants.length > 0) {
        setReferrerInfo(merchants[0]);
      } else {
        setCodeError('No merchant found with this referral code.');
      }
    } catch (e) {
      setCodeError('Could not verify code. You can still continue.');
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (val) => {
    onChange('referral_code', val.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    setReferrerInfo(null);
    setCodeError(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-cyan-50 flex items-center justify-center">
            <Gift className="w-7 h-7 text-cyan-600" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-900">You're Invited!</h2>
        <p className="text-slate-500 text-sm">Enter your referral code to unlock rewards for you and your referrer.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ref_code" className="text-cyan-700 font-semibold flex items-center gap-1">
          <Tag className="w-4 h-4" /> Referral Code
        </Label>
        <div className="flex gap-2">
          <Input
            id="ref_code"
            placeholder="e.g. BESTBIZ1234"
            value={formData.referral_code}
            onChange={(e) => handleChange(e.target.value)}
            className="font-mono tracking-widest text-center text-lg border-cyan-200 focus:border-cyan-500"
            maxLength={20}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => handleCheckCode(formData.referral_code)}
            disabled={checking || !formData.referral_code}
            className="shrink-0 border-cyan-300 text-cyan-700"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
          </Button>
        </div>

        {referrerInfo && (
          <div className="flex items-center gap-3 bg-cyan-50 border border-cyan-200 rounded-xl p-3">
            <CheckCircle className="w-5 h-5 text-cyan-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-cyan-800">Valid referral code!</p>
              <p className="text-xs text-cyan-600">Referred by: <strong>{referrerInfo.business_name}</strong></p>
            </div>
          </div>
        )}

        {codeError && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{codeError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Button
          onClick={onNext}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 text-base font-bold rounded-xl"
        >
          Continue {referrerInfo ? '— Referral Applied ✓' : ''}
        </Button>
        {!formData.referral_code && (
          <Button variant="ghost" onClick={onNext} className="text-slate-400 text-sm">
            I don't have a referral code
          </Button>
        )}
      </div>
    </div>
  );
}