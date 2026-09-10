import React from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/useLanguage';

const stepKeys = ['stepReferral', 'stepBusiness', 'stepPayments', 'stepIdentity', 'stepWallet', 'stepReview'];

export default function StepIndicator({ currentStep }) {
  const { t } = useLanguage();
  const steps = stepKeys.map((k, i) => ({ id: i + 1, label: t(`onboarding.${k}`) }));
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