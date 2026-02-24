import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building2, Mail, Phone, MapPin, User } from 'lucide-react';

export default function StepBusiness({ formData, onChange, onNext, onBack }) {
  const valid =
    formData.business_name.trim() &&
    formData.owner_first_name.trim() &&
    formData.owner_last_name.trim() &&
    formData.owner_email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.owner_email);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (valid) onNext();
  };

  const field = (id, label, icon, props) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-slate-700 font-medium">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <Input id={id} {...props} className="pl-10 h-11" />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center space-y-1 mb-2">
        <h2 className="text-2xl font-black text-slate-900">Business Details</h2>
        <p className="text-slate-500 text-sm">Tell us about your business so we can set things up.</p>
      </div>

      {field('business_name', 'Business Name', <Building2 className="w-4 h-4" />, {
        required: true,
        placeholder: 'Acme Coffee Co.',
        value: formData.business_name,
        onChange: (e) => onChange('business_name', e.target.value)
      })}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="first_name" className="text-slate-700 font-medium">First Name</Label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input id="first_name" required placeholder="John" className="pl-10 h-11"
              value={formData.owner_first_name}
              onChange={(e) => onChange('owner_first_name', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name" className="text-slate-700 font-medium">Last Name</Label>
          <Input id="last_name" required placeholder="Doe" className="h-11"
            value={formData.owner_last_name}
            onChange={(e) => onChange('owner_last_name', e.target.value)} />
        </div>
      </div>

      {field('email', 'Email Address', <Mail className="w-4 h-4" />, {
        required: true,
        type: 'email',
        placeholder: 'john@acme.com',
        value: formData.owner_email,
        onChange: (e) => onChange('owner_email', e.target.value)
      })}

      {field('phone', 'Phone (optional)', <Phone className="w-4 h-4" />, {
        type: 'tel',
        placeholder: '+1 (555) 000-0000',
        value: formData.phone,
        onChange: (e) => onChange('phone', e.target.value)
      })}

      {field('address', 'Business Address (optional)', <MapPin className="w-4 h-4" />, {
        placeholder: '123 Main St, New York, NY',
        value: formData.address,
        onChange: (e) => onChange('address', e.target.value)
      })}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12">Back</Button>
        <Button type="submit" disabled={!valid} className="flex-[2] bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl">
          Continue
        </Button>
      </div>
    </form>
  );
}