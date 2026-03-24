import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Users, Heart, Zap, Globe, TrendingUp, Mail, Link2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-800 to-cyan-900">
      {/* Navbar */}
      <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = createPageUrl('Home')}>
              <Link2 className="w-8 h-8 text-white" />
              <span className="text-2xl font-bold text-white">openTILL</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href={createPageUrl('Home')} className="text-white hover:text-green-300 transition-colors">
                Home
              </a>
              <a href={createPageUrl('About')} className="text-green-300 font-semibold">
                About
              </a>
              <a href={createPageUrl('Contact')} className="text-white hover:text-green-300 transition-colors">
                Contact
              </a>
              <a href={createPageUrl('DeviceShop')} className="text-white hover:text-green-300 transition-colors">
                Device Shop
              </a>
              <Button 
                onClick={() => window.location.href = createPageUrl('EmailLogin')}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Sign In
              </Button>
            </div>
            <div className="md:hidden">
              <Button 
                onClick={() => window.location.href = createPageUrl('EmailLogin')}
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-5xl px-6 py-12">
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">About openTILL</h1>
          <p className="text-xl text-gray-300">Real software, built by a real person, for real merchants.</p>
        </div>

        {/* Origin Story */}
        <Card className="mb-12 bg-white/10 border-white/20 text-white">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <Heart className="w-12 h-12 text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold mb-4">How It Started</h2>
                <p className="leading-relaxed text-lg text-gray-200">
                  openTILL was conceived by <strong className="text-white">Jason Zachrich</strong> of <strong className="text-white">Isolex Corporation</strong> — a one-person operation based out of Toledo, Ohio. 
                  After spending years in the payment processing industry and watching merchants get nickel-and-dimed by legacy POS systems, Jason decided to just build something better.
                </p>
                <p className="leading-relaxed text-lg text-gray-200 mt-4">
                  No boardroom. No VC funding. No team of 50 engineers. Just a guy with 15+ years of payment industry experience, a vision, and <a href="https://base44.com" target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Base44</a> as the development platform to bring it to life fast.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Story */}
        <div className="mb-12 text-white">
          <h2 className="text-3xl font-bold mb-6">The Real Story</h2>
          <div className="space-y-4 text-gray-200 text-lg">
            <p className="leading-relaxed">
              Over years of working with merchants across the country, the same frustrations kept coming up: 
              overpriced hardware, locked-in contracts, clunky software, surprise fees, and zero crypto support. 
              Meanwhile, the payments world was evolving fast — and most POS systems weren't keeping up.
            </p>
            <p className="leading-relaxed">
              openTILL was the answer to that. A full-featured POS that handles cash, cards, EBT/SNAP, and Solana-based crypto — 
              with dual pricing built in, a marketplace for add-on features (Chips), and a reseller (Ambassador) program 
              for people who want to bring it to their own markets.
            </p>
            <p className="leading-relaxed">
              Is it a Fortune 500 company? Not even close — maybe one day 😄. But it's built with real-world experience, 
              honest intent, and a genuine desire to give merchants a better deal.
            </p>
          </div>
        </div>

        {/* What Makes It Different */}
        <Card className="mb-12 bg-white/10 border-white/20 text-white">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6">What Makes It Different</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center flex-shrink-0 mt-1">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Dual Pricing</h3>
                  <p className="text-gray-200">
                    Show cash and card prices side-by-side. Fully compliant with surcharging regulations. 
                    Merchants keep more of what they earn.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green-900 flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Every Payment Method</h3>
                  <p className="text-gray-200">
                    Cash, card, EBT/SNAP, Solana Pay crypto — all in one system. No forcing customers into one lane.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0 mt-1">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">The Motherboard & Chips</h3>
                  <p className="text-gray-200">
                    A marketplace of add-on features built by developers. Install only what you need. 
                    No bloated software, no paying for features you'll never use.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-yellow-900 flex items-center justify-center flex-shrink-0 mt-1">
                  <Users className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Ambassador Program</h3>
                  <p className="text-gray-200">
                    Anyone can become a reseller and build their own merchant network under their own brand. 
                    White-label ready.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Mail className="w-6 h-6 text-purple-400" />
            Get in Touch
          </h2>
          <p className="text-gray-200 leading-relaxed mb-4">
            Questions, partnership ideas, or just want to chat about payments? Jason's happy to talk.
          </p>
          <div className="bg-white/10 p-6 rounded-lg border border-white/20 text-white">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="font-semibold mb-3">General Inquiries</p>
                <p className="text-gray-200">Email: <a href="mailto:info@isolex.io" className="text-purple-400 hover:underline">info@isolex.io</a></p>
                <p className="text-gray-200">Phone: +1 (419) 729-3889</p>
              </div>
              <div>
                <p className="font-semibold mb-3">Sales & Partnerships</p>
                <p className="text-gray-200">Email: <a href="mailto:sales@isolex.io" className="text-purple-400 hover:underline">sales@isolex.io</a></p>
                <p className="text-gray-200">Phone: +1 (419) 729-3889</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="font-semibold mb-2">Based in</p>
              <p className="text-gray-200">Toledo, OH 43606</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-purple-700 to-green-600 text-white border-white/20">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Give It a Try</h2>
            <p className="text-xl mb-8 opacity-90">
              No sales pitch. No long contracts. Just sign up and see if it works for you.
            </p>
            <Button 
              size="lg"
              className="bg-white text-purple-700 hover:bg-gray-100 font-semibold"
              onClick={() => window.location.href = createPageUrl('MerchantOnboarding')}
            >
              Get Started Free
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}