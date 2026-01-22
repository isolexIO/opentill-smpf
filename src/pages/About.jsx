import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Users, Heart, Zap, Globe, TrendingUp, Mail, Link2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-green-900">
      {/* Navbar */}
      <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = createPageUrl('Home')}>
              <Link2 className="w-8 h-8 text-white" />
              <span className="text-2xl font-bold text-white">ChainLINK</span>
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
          <h1 className="text-5xl font-bold text-white mb-4">About ChainLINK POS</h1>
          <p className="text-xl text-gray-300">Revolutionizing point of sale for the modern era</p>
        </div>

        {/* Mission */}
        <Card className="mb-12 bg-white/10 border-white/20 text-white">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <Target className="w-12 h-12 text-purple-400 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="leading-relaxed text-lg text-gray-200">
                  At Isolex Corporation, we're on a mission to empower businesses with cutting-edge payment 
                  technology that's accessible, transparent, and future-proof. ChainLINK POS combines traditional 
                  payment methods with innovative blockchain technology, giving merchants the flexibility to accept 
                  payments however their customers prefer.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Story */}
        <div className="mb-12 text-white">
          <h2 className="text-3xl font-bold mb-6">Our Story</h2>
          <div className="prose prose-lg max-w-none text-gray-200 space-y-4">
            <p className="leading-relaxed">
              Founded in 2009, Isolex Corporation was built on a vision to simplify and modernize the way businesses handle payments. With over 15 years of experience in the payment processing industry—partnering with major merchant service providers across the country—our founder saw firsthand the frustrations merchants faced daily.

Over time, one problem became clear: businesses were being forced to choose between traditional payment systems and the emerging world of cryptocurrency. On top of that, they were buried under endless fees, long-term contracts, and confusing legal fine print that left them constantly guessing what would come next.

We knew there had to be a better way.
            </p>
            <p className="leading-relaxed">
              Our team of payment industry veterans and blockchain engineers came together to create ChainLINK POS—a 
              comprehensive point of sale system that doesn't discriminate against any payment method. Whether your 
              customers want to pay with cash, cards, EBT benefits, or Solana-based crypto, ChainLINK has them covered.
            </p>
            <p className="leading-relaxed">
              But we didn't stop at payment acceptance. We built a full-featured POS ecosystem with inventory management, 
              customer displays, kitchen integration, reporting, and marketplace connections—everything a modern business 
              needs to thrive.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-6 text-center">
                <Zap className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Innovation</h3>
                <p className="text-gray-300">
                  We're constantly pushing boundaries, integrating the latest payment technologies while maintaining 
                  reliability and ease of use.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-6 text-center">
                <Heart className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Merchant-First</h3>
                <p className="text-gray-300">
                  Every feature we build starts with the question: "Will this help our merchants succeed?" 
                  Your success is our success.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-6 text-center">
                <Globe className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Accessibility</h3>
                <p className="text-gray-300">
                  Advanced technology shouldn't be complicated. We make enterprise-grade POS accessible to 
                  businesses of all sizes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* What Makes Us Different */}
        <Card className="mb-12 bg-white/10 border-white/20 text-white">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6">What Makes Us Different</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center flex-shrink-0 mt-1">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">ChainLINK Dual Pricing</h3>
                  <p className="text-gray-200">
                    Our signature feature lets you display cash and card prices side-by-side, fully compliant with 
                    surcharging regulations. Save thousands on processing fees.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green-900 flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">True Multi-Payment Support</h3>
                  <p className="text-gray-200">
                    Cash, credit/debit cards, Solana Pay crypto, EBT/SNAP benefits—all in one system. Your customers 
                    pay their way.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0 mt-1">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Built for Real Businesses</h3>
                  <p className="text-gray-200">
                    From food trucks to multi-location restaurants, from retail stores to service businesses—ChainLINK 
                    adapts to your needs.
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
            Have questions? Want to learn more about ChainLINK POS? We'd love to hear from you.
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
              <p className="font-semibold mb-2">Headquarters</p>
              <p className="text-gray-200">Toledo, OH 43606</p>
            </div>
          </div>
        </section>

        {/* Team */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Our Team</h2>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">
            ChainLINK POS is built by a diverse team of payment industry experts, software engineers, blockchain developers, 
            and customer success professionals who are passionate about helping businesses thrive in the digital economy.
          </p>
        </div>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-purple-700 to-green-600 text-white border-white/20">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Join Thousands of Merchants</h2>
            <p className="text-xl mb-8 opacity-90">
              Experience the future of point of sale technology today
            </p>
            <Button 
              size="lg"
              className="bg-white text-purple-700 hover:bg-gray-100 font-semibold"
              onClick={() => window.location.href = createPageUrl('MerchantOnboarding')}
            >
              Start Your Free Trial
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}