import React from 'react';
import { Building2, Mail, Phone, Globe } from 'lucide-react';

export default function AmbassadorBanner({ ambassador }) {
  if (!ambassador) return null;

  const primary = ambassador.primary_color || '#42A5F5';

  return (
    <div
      className="w-full max-w-md mb-4 rounded-2xl border shadow-sm overflow-hidden bg-white"
      style={{ borderColor: `${primary}33` }}
    >
      <div className="h-1.5" style={{ background: primary }} />
      <div className="p-4 flex items-center gap-3">
        {ambassador.logo_url ? (
          <img
            src={ambassador.logo_url}
            alt={ambassador.name}
            className="w-12 h-12 rounded-xl object-contain border border-slate-100 bg-slate-50"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${primary}1a` }}
          >
            <Building2 className="w-6 h-6" style={{ color: primary }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 truncate">
            {ambassador.name || 'Ambassador'}
          </p>
          <p className="text-xs text-slate-500">Your referral partner</p>
        </div>
      </div>
      <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {ambassador.contact_email && (
          <a
            href={`mailto:${ambassador.contact_email}`}
            className="flex items-center gap-1 hover:text-slate-700"
          >
            <Mail className="w-3 h-3" /> {ambassador.contact_email}
          </a>
        )}
        {ambassador.contact_phone && (
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" /> {ambassador.contact_phone}
          </span>
        )}
        {ambassador.domain && (
          <a
            href={ambassador.domain.startsWith('http') ? ambassador.domain : `https://${ambassador.domain}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-slate-700"
          >
            <Globe className="w-3 h-3" /> Website
          </a>
        )}
      </div>
    </div>
  );
}