import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Loader2, Tag, Gift, Lock, Phone, Mail, Globe, Building2 } from 'lucide-react';

export default function StepReferral({ formData, onChange, onNext, locked, dealerReferral }) {
  const [checking, setChecking] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState(null);
  const [dealerInfo, setDealerInfo] = useState(null);
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
    if (locked) return;
    onChange('referral_code', val.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    setReferrerInfo(null);
    setCodeError(null);
  };

  // Auto-verify a referral code that was pre-filled from a referral link
  useEffect(() => {
    if (locked && !dealerReferral && formData.referral_code && formData.referral_code.length >= 4 && !referrerInfo && !checking) {
      handleCheckCode(formData.referral_code);
    }
  }, [locked, dealerReferral, formData.referral_code]);

  // Resolve an ambassador referral (ambassador or legacy dealer id pre-filled from the invite link).
  // Uses a public backend function so logged-out visitors can see the trust card without
  // exposing any sensitive dealer record fields.
  useEffect(() => {
    if (locked && dealerReferral && formData.referral_code && !dealerInfo) {
      (async () => {
        try {
          const res = await base44.functions.invoke('getAmbassadorByReferral', { referral_id: formData.referral_code });
          if (res.data?.success && res.data.ambassador) {
            setDealerInfo(res.data.ambassador);
          }
        } catch (e) {
          // ignore — keep field locked regardless
        }
      })();
    }
  }, [locked, dealerReferral, formData.referral_code, dealerInfo]);

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
            readOnly={locked}
            className={`font-mono tracking-widest text-center text-lg border-cyan-200 focus:border-cyan-500 ${locked ? 'bg-cyan-50 text-cyan-800 cursor-not-allowed' : ''}`}
            maxLength={20}
          />
          {!locked && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCheckCode(formData.referral_code)}
              disabled={checking || !formData.referral_code}
              className="shrink-0 border-cyan-300 text-cyan-700"
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
            </Button>
          )}
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

        {dealerReferral && dealerInfo && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-cyan-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-cyan-800">Ambassador referral applied!</p>
                <p className="text-xs text-cyan-600">You were invited by a verified openTILL Ambassador.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/70 rounded-lg p-3">
              {dealerInfo.logo_url ? (
                <img src={dealerInfo.logo_url} alt={dealerInfo.name} className="w-12 h-12 rounded-lg object-cover border border-cyan-200 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-cyan-600" />
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-bold text-slate-900 truncate">{dealerInfo.name}</p>
                <div className="space-y-1">
                  {dealerInfo.contact_phone && (
                    <a href={`tel:${dealerInfo.contact_phone}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-cyan-700">
                      <Phone className="w-3.5 h-3.5 shrink-0" /> {dealerInfo.contact_phone}
                    </a>
                  )}
                  {dealerInfo.contact_email && (
                    <a href={`mailto:${dealerInfo.contact_email}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-cyan-700 truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{dealerInfo.contact_email}</span>
                    </a>
                  )}
                  {dealerInfo.domain && (
                    <a href={dealerInfo.domain.startsWith('http') ? dealerInfo.domain : `https://${dealerInfo.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-cyan-700 truncate">
                      <Globe className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{dealerInfo.domain.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {codeError && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{codeError}</p>
        )}

        {locked && formData.referral_code && (
          <p className="text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <Lock className="w-3 h-3 shrink-0" /> Referral code applied via your invite link and locked.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Button
          onClick={onNext}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 text-base font-bold rounded-xl"
        >
          Continue {(referrerInfo || dealerInfo) ? '— Referral Applied ✓' : ''}
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