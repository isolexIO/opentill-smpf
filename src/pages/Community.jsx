import CherryEmbed from '@/components/cherry/CherryEmbed';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Users, LifeBuoy, Sparkles } from 'lucide-react';
import CherryLogo from '@/components/cherry/CherryLogo';
import CommunityLinks from '@/components/shared/CommunityLinks';

export default function Community() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-800 to-cyan-900">
      <div className="container mx-auto max-w-5xl px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 flex items-center justify-center gap-3">
            <CherryLogo className="w-9 h-9" />
            openTILL Community
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Connect wallet-to-wallet with the openTILL community on Cherry. Get support, share feedback, and collaborate — no phone numbers or emails required.
          </p>
          <CommunityLinks className="mt-6" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-white">
            <Users className="w-6 h-6 text-purple-400 mb-2" />
            <h3 className="font-semibold">Community</h3>
            <p className="text-sm text-gray-300">Join merchants, builders, and ambassadors in the conversation.</p>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-white">
            <LifeBuoy className="w-6 h-6 text-green-400 mb-2" />
            <h3 className="font-semibold">Support</h3>
            <p className="text-sm text-gray-300">Reach the team directly for help with your POS setup.</p>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-white">
            <Sparkles className="w-6 h-6 text-pink-400 mb-2" />
            <h3 className="font-semibold">Collab</h3>
            <p className="text-sm text-gray-300">Share ideas, request features, and build with us.</p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-slate-900" style={{ height: '70vh', minHeight: 480 }}>
          <CherryEmbed className="h-full w-full" />
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-300 text-sm mb-4">Cherry works with your existing Solana wallet — no extra signups.</p>
          <Button onClick={() => window.location.href = createPageUrl('MerchantOnboarding')} className="bg-white text-purple-700 hover:bg-gray-100 font-semibold">
            Get Started with openTILL
          </Button>
        </div>
      </div>
    </div>
  );
}