import React from 'react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { Gift, CreditCard, CheckCircle2, ArrowRight, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const READER_M2_IMG = 'https://b.stripecdn.com/docs-statics-srv/assets/stripem2.bf6a7eabd353369bfa596a81ab51ca9a.png';

export default function FreeReaderAdvert() {
  return (
    <section className="py-12 bg-gradient-to-r from-blue-600 to-indigo-700">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="rounded-3xl bg-white shadow-2xl overflow-hidden"
        >
          <div className="grid md:grid-cols-2 items-center">
            {/* Left: Content */}
            <div className="p-8 md:p-12 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-bold">
                <Gift className="w-4 h-4" />
                Limited Time Offer
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                Get a <span className="text-blue-600">FREE Stripe Reader M2</span> with your new account
              </h2>
              <p className="text-slate-600 text-lg">
                A compact contactless + chip card reader — a <strong>$59 value</strong>, included free when you sign up for openTILL Payments.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <span>Free reader shipped with your new account</span>
                </li>
                <li className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <span>No charge at enrollment — just keep a card on file</span>
                </li>
                <li className="flex items-start gap-2 text-slate-700">
                  <Package className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <span>Return within 30 days of cancellation or pay $100 non-return fee</span>
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  onClick={() => window.location.href = createPageUrl('MerchantOnboarding')}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Claim Your Free Reader
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold"
                  onClick={() => window.location.href = createPageUrl('OpenTILLPayments')}
                >
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Right: Product Image */}
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 p-8 md:p-12 flex items-center justify-center min-h-[280px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-white/40 rounded-full blur-3xl"></div>
              </div>
              <img
                src={READER_M2_IMG}
                alt="Stripe Reader M2 — contactless and chip card reader"
                className="relative z-10 max-h-64 w-auto object-contain drop-shadow-2xl"
              />
              <div className="absolute top-6 right-6 z-20 bg-green-500 text-white text-sm font-black px-4 py-2 rounded-full shadow-lg">
                FREE
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}