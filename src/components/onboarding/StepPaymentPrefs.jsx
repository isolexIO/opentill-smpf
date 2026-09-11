import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CreditCard, Banknote, Smartphone, Coins, Percent, DollarSign } from 'lucide-react';
import ReaderOfferSection from '@/components/onboarding/ReaderOfferSection';
import { useLanguage } from '@/lib/i18n/useLanguage';

export default function StepPaymentPrefs({ formData, onChange, onNext, onBack }) {
  const { t } = useLanguage();
  const PAYMENT_METHODS = [
    { key: 'accept_cash', icon: <Banknote className="w-5 h-5" />, label: t('pos.cash'), desc: t('onboarding.cashDesc') },
    { key: 'accept_card', icon: <CreditCard className="w-5 h-5" />, label: t('onboarding.creditDebitCards'), desc: t('onboarding.creditDebitDesc') },
    { key: 'accept_ebt', icon: <Smartphone className="w-5 h-5" />, label: t('onboarding.ebtSnap'), desc: t('onboarding.ebtSnapDesc') },
    { key: 'accept_crypto', icon: <Coins className="w-5 h-5" />, label: t('onboarding.solanaPayCrypto'), desc: t('onboarding.solanaPayDesc') },
  ];
  const PRICING_MODES = [
    {
      key: 'surcharge',
      label: t('onboarding.cardSurcharge'),
      desc: t('onboarding.cardSurchargeDesc'),
      icon: <Percent className="w-5 h-5" />,
    },
    {
      key: 'cash_discount',
      label: t('onboarding.cashDiscount'),
      desc: t('onboarding.cashDiscountDesc'),
      icon: <DollarSign className="w-5 h-5" />,
    },
  ];
  const toggle = (key) => onChange(key, !formData[key]);

  const atLeastOne = PAYMENT_METHODS.some(m => formData[m.key]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1 mb-2">
        <h2 className="text-2xl font-black text-slate-900">{t('onboarding.paymentPreferences')}</h2>
        <p className="text-slate-500 text-sm">{t('onboarding.paymentPrefsSub')}</p>
      </div>

      {/* Payment Methods */}
      <div className="space-y-2">
        <Label className="text-slate-700 font-semibold">{t('onboarding.acceptedPaymentMethods')}</Label>
        <div className="grid grid-cols-1 gap-2">
          {PAYMENT_METHODS.map(({ key, icon, label, desc }) => {
            const active = !!formData[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                  active
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
              >
                <span className={cn('shrink-0', active ? 'text-cyan-600' : 'text-slate-400')}>{icon}</span>
                <div className="flex-1">
                  <p className={cn('font-semibold text-sm', active ? 'text-cyan-800' : 'text-slate-700')}>{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                  active ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300'
                )}>
                  {active && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Free Reader Offer (only if cards accepted) */}
      {formData.accept_card && (
        <ReaderOfferSection formData={formData} onChange={onChange} />
      )}

      {/* Dual Pricing Mode (only if cards accepted) */}
      {formData.accept_card && (
        <div className="space-y-2">
          <Label className="text-slate-700 font-semibold">{t('onboarding.dualPricingStrategy')}</Label>
          <p className="text-xs text-slate-400 -mt-1">{t('onboarding.dualPricingSub')}</p>
          <div className="grid grid-cols-1 gap-2">
            {PRICING_MODES.map(({ key, label, desc, icon }) => {
              const active = formData.pricing_mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange('pricing_mode', key)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                    active
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <span className={cn('shrink-0', active ? 'text-purple-600' : 'text-slate-400')}>{icon}</span>
                  <div className="flex-1">
                    <p className={cn('font-semibold text-sm', active ? 'text-purple-800' : 'text-slate-700')}>{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    active ? 'bg-purple-500 border-purple-500' : 'border-slate-300'
                  )}>
                    {active && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12">{t('onboarding.back')}</Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!atLeastOne}
          className="flex-[2] bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl"
        >
          {t('onboarding.continue')}
        </Button>
      </div>
    </div>
  );
}