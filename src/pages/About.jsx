import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Users, Heart, Zap, Globe, TrendingUp, Mail, Link2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/lib/i18n/useLanguage';

export default function AboutPage() {
  const { t } = useLanguage();
  const differences = [
    { icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-900', title: t('about.dualPricing'), desc: t('about.dualPricingDesc') },
    { icon: Zap, color: 'text-green-400', bg: 'bg-green-900', title: t('about.everyPayment'), desc: t('about.everyPaymentDesc') },
    { icon: Globe, color: 'text-blue-400', bg: 'bg-blue-900', title: t('about.motherboard'), desc: t('about.motherboardDesc') },
    { icon: Users, color: 'text-yellow-400', bg: 'bg-yellow-900', title: t('about.ambassador'), desc: t('about.ambassadorDesc') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-800 to-cyan-900">
      <div className="container mx-auto max-w-5xl px-6 py-12">
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">{t('about.title')}</h1>
          <p className="text-xl text-gray-300">{t('about.subtitle')}</p>
        </div>

        {/* Origin Story */}
        <Card className="mb-12 bg-white/10 border-white/20 text-white">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <Heart className="w-12 h-12 text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold mb-4">{t('about.howItStarted')}</h2>
                <p className="leading-relaxed text-lg text-gray-200">
                  {t('about.originP1')}
                </p>
                <p className="leading-relaxed text-lg text-gray-200 mt-4">
                  {t('about.originP2')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Story */}
        <div className="mb-12 text-white">
          <h2 className="text-3xl font-bold mb-6">{t('about.realStory')}</h2>
          <div className="space-y-4 text-gray-200 text-lg">
            <p className="leading-relaxed">{t('about.storyP1')}</p>
            <p className="leading-relaxed">{t('about.storyP2')}</p>
            <p className="leading-relaxed">{t('about.storyP3')}</p>
          </div>
        </div>

        {/* What Makes It Different */}
        <Card className="mb-12 bg-white/10 border-white/20 text-white">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6">{t('about.different')}</h2>
            <div className="space-y-6">
              {differences.map((d, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full ${d.bg} flex items-center justify-center flex-shrink-0 mt-1`}>
                    <d.icon className={`w-5 h-5 ${d.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{d.title}</h3>
                    <p className="text-gray-200">{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Mail className="w-6 h-6 text-purple-400" />
            {t('about.getInTouch')}
          </h2>
          <p className="text-gray-200 leading-relaxed mb-4">
            {t('about.getInTouchDesc')}
          </p>
          <div className="bg-white/10 p-6 rounded-lg border border-white/20 text-white">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="font-semibold mb-3">{t('about.general')}</p>
                <p className="text-gray-200">Email: <a href="mailto:info@openTILL.io" className="text-purple-400 hover:underline">info@openTILL.io</a></p>
                <p className="text-gray-200">Phone: +1 (419) 729-3889</p>
              </div>
              <div>
                <p className="font-semibold mb-3">{t('about.sales')}</p>
                <p className="text-gray-200">Email: <a href="mailto:sales@openTILL.io" className="text-purple-400 hover:underline">sales@openTILL.io</a></p>
                <p className="text-gray-200">Phone: +1 (419) 729-3889</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="font-semibold mb-2">{t('about.basedIn')}</p>
              <p className="text-gray-200">Toledo, OH 43606</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-purple-700 to-green-600 text-white border-white/20">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">{t('about.giveItTry')}</h2>
            <p className="text-xl mb-8 opacity-90">
              {t('about.giveItTryDesc')}
            </p>
            <Button 
              size="lg"
              className="bg-white text-purple-700 hover:bg-gray-100 font-semibold"
              onClick={() => window.location.href = createPageUrl('MerchantOnboarding')}
            >
              {t('about.getStartedFree')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}