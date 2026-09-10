import CherryEmbed from '@/components/cherry/CherryEmbed';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Users, LifeBuoy, Sparkles } from 'lucide-react';
import CherryLogo from '@/components/cherry/CherryLogo';
import CommunityLinks from '@/components/shared/CommunityLinks';
import { useLanguage } from '@/lib/i18n/useLanguage';

export default function Community() {
  const { t } = useLanguage();
  const cards = [
    { icon: Users, color: 'text-purple-400', title: t('community.community'), desc: t('community.communityDesc') },
    { icon: LifeBuoy, color: 'text-green-400', title: t('community.support'), desc: t('community.supportDesc') },
    { icon: Sparkles, color: 'text-pink-400', title: t('community.collab'), desc: t('community.collabDesc') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-800 to-cyan-900">
      <div className="container mx-auto max-w-5xl px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 flex items-center justify-center gap-3">
            <CherryLogo className="w-9 h-9" />
            {t('community.title')}
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            {t('community.subtitle')}
          </p>
          <CommunityLinks className="mt-6" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {cards.map((c, i) => (
            <div key={i} className="bg-white/10 border border-white/20 rounded-xl p-4 text-white">
              <c.icon className={`w-6 h-6 ${c.color} mb-2`} />
              <h3 className="font-semibold">{c.title}</h3>
              <p className="text-sm text-gray-300">{c.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-slate-900" style={{ height: '70vh', minHeight: 480 }}>
          <CherryEmbed className="h-full w-full" />
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-300 text-sm mb-4">{t('community.cherryNote')}</p>
          <Button onClick={() => window.location.href = createPageUrl('MerchantOnboarding')} className="bg-white text-purple-700 hover:bg-gray-100 font-semibold">
            {t('community.getStarted')}
          </Button>
        </div>
      </div>
    </div>
  );
}