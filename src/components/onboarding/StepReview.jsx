import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Building2, Mail, Phone, MapPin, Wallet, Tag, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/useLanguage';

export default function StepReview({ formData, onSubmit, onBack, loading, error }) {
  const { t } = useLanguage();
  const paymentLabels = [
    formData.accept_cash && t('pos.cash'),
    formData.accept_card && t('onboarding.creditDebitCards'),
    formData.accept_ebt && t('pos.ebtSnap'),
    formData.accept_crypto && t('onboarding.solanaPayCrypto'),
  ].filter(Boolean).join(', ');

  const rows = [
    { icon: <Building2 className="w-4 h-4" />, label: t('onboarding.business'), value: formData.business_name },
    { icon: <Mail className="w-4 h-4" />, label: t('onboarding.email'), value: formData.owner_email },
    { icon: <span className="w-4 h-4 text-xs font-bold flex items-center justify-center">👤</span>, label: t('onboarding.owner'), value: `${formData.owner_first_name} ${formData.owner_last_name}`.trim() },
    formData.phone && { icon: <Phone className="w-4 h-4" />, label: t('onboarding.phone'), value: formData.phone },
    formData.address && { icon: <MapPin className="w-4 h-4" />, label: t('onboarding.address'), value: formData.address },
    formData.stripe_identity_verified && { icon: <span className="w-4 h-4">🛡️</span>, label: t('onboarding.identity'), value: t('onboarding.stripeVerified') },
    paymentLabels && { icon: <span className="w-4 h-4">💳</span>, label: t('onboarding.payments'), value: paymentLabels },
    formData.pricing_mode && { icon: <span className="w-4 h-4">💱</span>, label: t('onboarding.pricing'), value: formData.pricing_mode === 'surcharge' ? t('onboarding.cardSurcharge') : t('onboarding.cashDiscount') },
    formData.accept_card && formData.wants_free_reader && { icon: <span className="w-4 h-4">🎁</span>, label: 'Free Reader', value: 'Stripe Reader M2 included' },
    formData.wallet_address && { icon: <Wallet className="w-4 h-4" />, label: t('onboarding.wallet'), value: formData.wallet_address.slice(0, 6) + '...' + formData.wallet_address.slice(-4) },
    formData.referral_code && { icon: <Tag className="w-4 h-4" />, label: t('onboarding.referral'), value: formData.referral_code },
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 mb-2">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-900">{t('onboarding.reviewSubmit')}</h2>
        <p className="text-slate-500 text-sm">{t('onboarding.reviewSub')}</p>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-3 px-4 py-3">
            <span className="text-slate-400 shrink-0">{row.icon}</span>
            <span className="text-xs font-semibold text-slate-400 w-16 shrink-0">{row.label}</span>
            <span className="text-sm text-slate-800 font-medium truncate">{row.value}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-3 text-xs text-cyan-700">
        {t('onboarding.reviewNote')}
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} disabled={loading} className="flex-1 h-12">{t('onboarding.back')}</Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="flex-[2] bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('onboarding.submitting')}</> : t('onboarding.submitApplication')}
        </Button>
      </div>
    </div>
  );
}