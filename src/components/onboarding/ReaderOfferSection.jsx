import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Gift, CheckCircle2, CreditCard, Info } from 'lucide-react';

const READER_M2_IMG = 'https://b.stripecdn.com/docs-statics-srv/assets/stripem2.bf6a7eabd353369bfa596a81ab51ca9a.png';

export default function ReaderOfferSection({ formData, onChange }) {
  const optedIn = !!formData.wants_free_reader;
  const [showInfo, setShowInfo] = useState(false);

  const toggle = () => {
    const next = !optedIn;
    onChange('wants_free_reader', next);
    onChange('reader_agreement_accepted', next);
    if (!next) setShowInfo(false);
  };

  return (
    <div className="space-y-3 rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-4">
      <div className="flex items-start gap-3">
        <img
          src={READER_M2_IMG}
          alt="Stripe Reader M2"
          className="w-16 h-16 object-contain shrink-0 rounded-lg bg-white p-1 border border-blue-100"
        />
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-blue-600" />
            Free Stripe Reader M2
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Get a compact contactless + chip card reader included with your new account — a $59 value, free.
          </p>
        </div>
      </div>

      <div className="text-xs text-slate-600 space-y-1 bg-white/60 rounded-lg p-3 border border-blue-100">
        <p className="font-semibold text-slate-700 mb-1">Program terms:</p>
        <ul className="space-y-1">
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span>A card must be kept on file to cover a $100 non-return fee.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span>If you cancel, return the reader in good working order within 30 days.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span>Keep the reader at no cost as long as your account stays active.</span>
          </li>
        </ul>
      </div>

      <button
        type="button"
        onClick={toggle}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all',
          optedIn
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-200 bg-white hover:border-slate-300'
        )}
      >
        <div className={cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0',
          optedIn ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
        )}>
          {optedIn && <CheckCircle2 className="w-4 h-4 text-white" />}
        </div>
        <div className="flex-1">
          <p className={cn('text-sm font-semibold', optedIn ? 'text-blue-800' : 'text-slate-700')}>
            {optedIn ? "Yes, send me a free reader" : "I want a free reader (optional)"}
          </p>
          <p className="text-xs text-slate-400">
            {optedIn ? 'You agree to the program terms above.' : 'Skip if you already have hardware or don\'t need one.'}
          </p>
        </div>
      </button>

      {optedIn && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            Put Card on File for Free Reader
          </button>
          {showInfo ? (
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 leading-relaxed">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                After your account is created and activated, log in and visit{' '}
                <strong>openTILL Payments</strong> to securely put your card on file for the
                $100 non-return fee. No charge at enrollment — the card is only charged if the
                reader is not returned within 30 days of cancellation.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 text-center">
              You'll put your card on file after account activation via openTILL Payments.
            </p>
          )}
        </div>
      )}
    </div>
  );
}