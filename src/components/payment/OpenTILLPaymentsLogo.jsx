import React from 'react';
import { cn } from '@/lib/utils';

const LOGO_URL =
  'https://media.base44.com/images/public/6970e2871534100b4ebb8d45/5454b9cac_openTILL-Payments.png';

export default function OpenTILLPaymentsLogo({ className, height = 'h-6', subtitle }) {
  return (
    <div className={cn('inline-flex flex-col', className)}>
      <img
        src={LOGO_URL}
        alt="openTILL Payments"
        className={cn(height, 'w-auto object-contain')}
      />
      {subtitle && (
        <span className="text-xs text-slate-400 mt-0.5 leading-none">{subtitle}</span>
      )}
    </div>
  );
}