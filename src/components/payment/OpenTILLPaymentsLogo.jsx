import React from 'react';
import { cn } from '@/lib/utils';

const LOGO_URL =
  'https://media.base44.com/images/public/6970e2871534100b4ebb8d45/5454b9cac_openTILL-Payments.png';

export default function OpenTILLPaymentsLogo({ className, height = 'h-[150px]', width = 'w-[225px]', subtitle, scale = 1.8 }) {
  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <div className={cn('flex items-center justify-center', height, width)}>
        <img
          src={LOGO_URL}
          alt="openTILL Payments"
          className="max-h-full max-w-full object-contain"
        />
      </div>
      {subtitle && (
        <span className="text-xs text-slate-400 mt-1 leading-none">{subtitle}</span>
      )}
    </div>
  );
}