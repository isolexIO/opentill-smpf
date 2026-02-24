import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Building2, Mail, Phone, MapPin, Wallet, Tag, CheckCircle } from 'lucide-react';

export default function StepReview({ formData, onSubmit, onBack, loading, error }) {
  const rows = [
    { icon: <Building2 className="w-4 h-4" />, label: 'Business', value: formData.business_name },
    { icon: <Mail className="w-4 h-4" />, label: 'Email', value: formData.owner_email },
    { icon: <span className="w-4 h-4 text-xs font-bold flex items-center justify-center">👤</span>, label: 'Owner', value: `${formData.owner_first_name} ${formData.owner_last_name}`.trim() },
    formData.phone && { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: formData.phone },
    formData.address && { icon: <MapPin className="w-4 h-4" />, label: 'Address', value: formData.address },
    formData.wallet_address && { icon: <Wallet className="w-4 h-4" />, label: 'Wallet', value: formData.wallet_address.slice(0, 6) + '...' + formData.wallet_address.slice(-4) },
    formData.referral_code && { icon: <Tag className="w-4 h-4" />, label: 'Referral', value: formData.referral_code },
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 mb-2">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-900">Review & Submit</h2>
        <p className="text-slate-500 text-sm">Double-check your details before submitting your application.</p>
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
        By submitting, our team will review your application and activate your account within 24 hours. You'll receive an email once you're approved.
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} disabled={loading} className="flex-1 h-12">Back</Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="flex-[2] bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Application'}
        </Button>
      </div>
    </div>
  );
}