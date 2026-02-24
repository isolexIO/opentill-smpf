import React from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, label: 'Referral' },
  { id: 2, label: 'Business' },
  { id: 3, label: 'Wallet' },
  { id: 4, label: 'Review' },
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full mb-8">
      {steps.map((step, idx) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                done ? 'bg-cyan-500 border-cyan-500 text-white' :
                active ? 'bg-white border-cyan-500 text-cyan-600' :
                'bg-white border-slate-200 text-slate-400'
              )}>
                {done ? <CheckCircle className="w-5 h-5" /> : step.id}
              </div>
              <span className={cn(
                'text-[10px] font-semibold uppercase tracking-wide',
                active ? 'text-cyan-600' : done ? 'text-cyan-500' : 'text-slate-400'
              )}>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-1 mb-5 transition-all',
                done ? 'bg-cyan-400' : 'bg-slate-200'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}