import { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import CommunityLinks from '@/components/shared/CommunityLinks';

export default function PublicFooter() {
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
              {settings?.company_info?.tagline || 'The next-generation point of sale system for modern businesses.'}
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
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href={`${createPageUrl('Home')}#features`} className="text-gray-300 hover:text-white text-sm transition-colors">Features</a></li>
              <li><a href={`${createPageUrl('Home')}#pricing`} className="text-gray-300 hover:text-white text-sm transition-colors">Pricing</a></li>
              <li><a href={createPageUrl('DeviceShop')} className="text-gray-300 hover:text-white text-sm transition-colors">Device Shop</a></li>
              <li>
                <a href="https://ico.opentill.io/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white text-sm transition-colors">
                  $DUC Presale
                </a>
              </li>
              <li>
                <a href={createPageUrl('DealerLanding')} className="text-gray-300 hover:text-white text-sm transition-colors">
                  Become an Ambassador
                </a>
              </li>
              <li>
                <a href="/builders" className="text-gray-300 hover:text-white text-sm transition-colors">
                  Build with Us
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href={createPageUrl('About')} className="text-gray-300 hover:text-white text-sm transition-colors">About</a></li>
              <li><a href={createPageUrl('Contact')} className="text-gray-300 hover:text-white text-sm transition-colors">Contact</a></li>
              <li>
                <a href={createPageUrl('DealerLanding')} className="text-gray-300 hover:text-white text-sm transition-colors">
                  Ambassador Portal
                </a>
              </li>
              <li>
                <a href={createPageUrl('CustomerPortal')} className="text-gray-300 hover:text-white text-sm transition-colors">
                  Customer Portal
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href={createPageUrl('PrivacyPolicy')} className="text-gray-300 hover:text-white text-sm transition-colors">Privacy Policy</a></li>
              <li><a href={createPageUrl('TermsOfService')} className="text-gray-300 hover:text-white text-sm transition-colors">Terms of Service</a></li>
              <li><a href={createPageUrl('License')} className="text-gray-300 hover:text-white text-sm transition-colors">License</a></li>
              <li><a href={createPageUrl('Copyright')} className="text-gray-300 hover:text-white text-sm transition-colors">Copyright</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8">
          <div className="mb-6">
            <p className="text-center text-gray-400 text-xs mb-3 uppercase tracking-widest">Community</p>
            <CommunityLinks className="[&_a]:text-gray-300 [&_a]:hover:text-white [&_a]:bg-white/10 [&_a]:hover:bg-white/20 [&_a]:border-white/10" />
          </div>

          <p className="text-gray-400 text-sm text-center">
            {settings?.company_info?.copyright_text || `© ${new Date().getFullYear()} openTILL Corporation. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}