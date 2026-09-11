import { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import CommunityLinks from '@/components/shared/CommunityLinks';
import { useLanguage } from '@/lib/i18n/useLanguage';

export default function PublicFooter() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsList = await base44.entities.LandingPageSettings.list();
        if (settingsList && settingsList.length > 0) {
          setSettings(settingsList[0]);
        }
      } catch (e) {
        // keep defaults
      }
    };
    loadSettings();
  }, []);

  return (
    <footer className="bg-black/30 backdrop-blur-md border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png" alt="openTILL" className="w-6 h-6" />
              <span className="text-xl font-bold text-white">openTILL</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              {settings?.company_info?.tagline || t('footer.tagline')}
            </p>
            <p className="text-gray-300 text-sm">
              📞 +1 (419) 729-3889
            </p>
            <p className="text-gray-300 text-sm">
              ✉️ SMPF@openTILL.io
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.product')}</h3>
            <ul className="space-y-2">
              <li><a href={`/#features`} className="text-gray-300 hover:text-white text-sm transition-colors">{t('nav.features')}</a></li>
              <li><a href={`/#pricing`} className="text-gray-300 hover:text-white text-sm transition-colors">{t('nav.pricing')}</a></li>
              <li><a href={createPageUrl('DeviceShop')} className="text-gray-300 hover:text-white text-sm transition-colors">{t('footer.deviceShop')}</a></li>
              <li>
                <a href="https://ico.opentill.io/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white text-sm transition-colors">
                  {t('nav.ducPresale')}
                </a>
              </li>
              <li>
                <a href={createPageUrl('DealerLanding')} className="text-gray-300 hover:text-white text-sm transition-colors">
                  {t('footer.becomeAmbassador')}
                </a>
              </li>
              <li>
                <a href="/builders" className="text-gray-300 hover:text-white text-sm transition-colors">
                  {t('footer.buildWithUs')}
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.company')}</h3>
            <ul className="space-y-2">
              <li><a href={createPageUrl('About')} className="text-gray-300 hover:text-white text-sm transition-colors">{t('nav.about')}</a></li>
              <li><a href={createPageUrl('Contact')} className="text-gray-300 hover:text-white text-sm transition-colors">{t('nav.contact')}</a></li>
              <li>
                <a href={createPageUrl('DealerLanding')} className="text-gray-300 hover:text-white text-sm transition-colors">
                  {t('footer.ambassadorPortal')}
                </a>
              </li>
              <li>
                <a href={createPageUrl('CustomerPortal')} className="text-gray-300 hover:text-white text-sm transition-colors">
                  {t('footer.customerPortal')}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.legal')}</h3>
            <ul className="space-y-2">
              <li><a href={createPageUrl('PrivacyPolicy')} className="text-gray-300 hover:text-white text-sm transition-colors">{t('footer.privacyPolicy')}</a></li>
              <li><a href={createPageUrl('TermsOfService')} className="text-gray-300 hover:text-white text-sm transition-colors">{t('footer.termsOfService')}</a></li>
              <li><a href={createPageUrl('License')} className="text-gray-300 hover:text-white text-sm transition-colors">{t('footer.license')}</a></li>
              <li><a href={createPageUrl('Copyright')} className="text-gray-300 hover:text-white text-sm transition-colors">{t('footer.copyright')}</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8">
          <div className="mb-6">
            <p className="text-center text-gray-400 text-xs mb-3 uppercase tracking-widest">{t('footer.community')}</p>
            <div className="flex justify-center mb-4">
              <a href={createPageUrl('Community')} className="text-white hover:text-green-300 text-sm font-medium transition-colors">
                {t('footer.joinCommunity')}
              </a>
            </div>
            <CommunityLinks className="[&_a]:text-gray-300 [&_a]:hover:text-white [&_a]:bg-white/10 [&_a]:hover:bg-white/20 [&_a]:border-white/10" />
          </div>

          <p className="text-gray-400 text-sm text-center">
            {settings?.company_info?.copyright_text || `© ${new Date().getFullYear()} Isolex Corporation. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}