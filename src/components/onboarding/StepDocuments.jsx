import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { Upload, FileCheck2, Loader2, X, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/useLanguage';

export default function StepDocuments({ formData, onChange, onNext, onBack }) {
  const { t } = useLanguage();
  const DOCS = [
    { key: 'gov_id_url', label: t('onboarding.govId'), hint: t('onboarding.govIdHint'), required: true },
    { key: 'business_license_url', label: t('onboarding.businessLicense'), hint: t('onboarding.businessLicenseHint'), required: false },
    { key: 'void_check_url', label: t('onboarding.voidedCheck'), hint: t('onboarding.voidedCheckHint'), required: false },
  ];
  const [uploading, setUploading] = useState({});
  const [errors, setErrors] = useState({});

  const handleFile = async (key, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrors(e => ({ ...e, [key]: t('onboarding.fileUnder10mb') }));
      return;
    }
    setErrors(e => ({ ...e, [key]: null }));
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(key, file_url);
    } catch {
      setErrors(e => ({ ...e, [key]: t('onboarding.uploadFailed') }));
    } finally {
      setUploading(u => ({ ...u, [key]: false }));
    }
  };

  const valid = formData.gov_id_url; // only gov ID is required

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 mb-2">
        <h2 className="text-2xl font-black text-slate-900">{t('onboarding.documentUpload')}</h2>
        <p className="text-slate-500 text-sm">{t('onboarding.documentUploadSub')}</p>
      </div>

      {DOCS.map(({ key, label, hint, required }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-slate-700 font-medium flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
            <span className="text-slate-400 font-normal text-xs ml-1">— {hint}</span>
          </Label>

          {formData[key] ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <FileCheck2 className="w-5 h-5 text-green-600 shrink-0" />
              <span className="text-green-700 text-sm font-medium flex-1 truncate">{t('onboarding.uploadedSuccessfully')}</span>
              <button
                type="button"
                onClick={() => onChange(key, '')}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-5 cursor-pointer hover:border-cyan-400 hover:bg-cyan-50/30 transition-all">
              {uploading[key] ? (
                <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-slate-400" />
              )}
              <span className="text-sm text-slate-500">
                {uploading[key] ? t('onboarding.uploading') : t('onboarding.clickToUpload')}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                disabled={uploading[key]}
                onChange={e => handleFile(key, e.target.files[0])}
              />
            </label>
          )}

          {errors[key] && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors[key]}
            </p>
          )}
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12">{t('onboarding.back')}</Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!valid || Object.values(uploading).some(Boolean)}
          className="flex-[2] bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl"
        >
          {t('onboarding.continue')}
        </Button>
      </div>
    </div>
  );
}