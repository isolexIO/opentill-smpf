import { Button } from '@/components/ui/button';
import { FileText, AlertTriangle, Scale, Shield, Mail, Link2 } from 'lucide-react'; // Added Link2
import { createPageUrl } from '@/utils';

export default function TermsOfServicePage() {
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
              <a href={createPageUrl('About')} className="text-white hover:text-green-300 transition-colors">
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

      {/* Main Content Area */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-purple-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
            <p className="text-gray-600 dark:text-gray-400">Last Updated: December 2024</p>
          </div>

          {/* Section 1: Acceptance of Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              By accessing or using openTILL services, you acknowledge that you have read, 
              understood, and agree to be bound by these Terms of Service and our Privacy Policy. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          {/* Section 2: Eligibility */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Eligibility</h2>
            <p className="text-gray-700 leading-relaxed mb-3 dark:text-gray-300">
              To use openTILL, you must:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Be at least 18 years of age</li>
              <li>Have the authority to bind your business to these Terms</li>
              <li>Operate a legitimate business with necessary licenses and permits</li>
              <li>Provide accurate and complete registration information</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          {/* Section 3: Account Registration */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Account Registration</h2>
            <p className="text-gray-700 leading-relaxed mb-3 dark:text-gray-300">
              When you register for openTILL:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>You must provide accurate, current, and complete information</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You agree to notify us immediately of any unauthorized access</li>
              <li>You accept responsibility for all activities under your account</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
            </ul>
          </section>

          {/* Section 4: Subscription and Billing */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Subscription and Billing</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Subscription Plans</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              openTILL offers various subscription plans with different features and pricing. 
              You may select a plan during registration and can upgrade or downgrade at any time.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Free Trial</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              New accounts receive a 14-day free trial. You will not be charged during the trial period. 
              After the trial ends, you will be charged according to your selected plan unless you cancel.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Billing</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Subscription fees are billed monthly or annually in advance</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>We may change pricing with 30 days' notice</li>
              <li>Failed payments may result in service suspension</li>
              <li>You are responsible for all applicable taxes</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Transaction Fees</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              In addition to subscription fees, payment processing fees apply based on the payment method used 
              (card, crypto, EBT, etc.). These fees are separate from your subscription and are deducted from 
              each transaction.
            </p>
          </section>

          {/* Section 5: Acceptable Use */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Acceptable Use</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Permitted Use</h3>
            <p className="text-gray-700 leading-relaxed mb-3 dark:text-gray-300">
              You may use openTILL to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Process legitimate business transactions</li>
              <li>Manage inventory and products</li>
              <li>Generate sales reports and analytics</li>
              <li>Accept various payment methods (cash, card, crypto, EBT)</li>
              <li>Integrate with third-party marketplaces</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Prohibited Use</h3>
            <p className="text-gray-700 leading-relaxed mb-3 dark:text-gray-300">
              You may NOT use openTILL to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Process fraudulent or illegal transactions</li>
              <li>Sell prohibited goods (weapons, illegal drugs, stolen items, etc.)</li>
              <li>Engage in money laundering or terrorist financing</li>
              <li>Violate any laws, regulations, or third-party rights</li>
              <li>Circumvent payment processing fees or security measures</li>
              <li>Resell or sublicense the Service without authorization</li>
              <li>Reverse engineer or attempt to access source code</li>
              <li>Interfere with system security or integrity</li>
            </ul>
          </section>

          {/* Section 6: Payment Processing */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              6. Payment Processing
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Dual Pricing</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              Our signature dual pricing feature allows you to display different prices for cash and card payments. 
              You are responsible for ensuring compliance with applicable surcharging laws in your jurisdiction.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Payment Gateways</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              You may integrate third-party payment gateways (Stripe, Square, Shift4, etc.). You are responsible 
              for complying with each provider's terms of service and maintaining valid credentials.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Cryptocurrency Payments</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              Crypto payments via Solana Pay are final and irreversible. You assume all risks associated with 
              cryptocurrency volatility and blockchain transactions.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">EBT/SNAP Benefits</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              If you accept EBT, you must comply with USDA SNAP regulations and only process EBT for eligible items.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">PCI-DSS Compliance</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              You are responsible for maintaining PCI-DSS compliance when handling cardholder data. We provide 
              tools to help, but ultimate responsibility rests with you.
            </p>
          </section>

          {/* Section 7: Data and Privacy */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Data and Privacy</h2>
            <p className="text-gray-700 leading-relaxed mb-3 dark:text-gray-300">
              Our Privacy Policy (incorporated by reference) governs how we collect and use your data. Key points:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>We implement industry-standard security measures</li>
              <li>Your merchant data is isolated from other merchants</li>
              <li>You own your business data and can export it at any time</li>
              <li>We may use anonymized data for analytics and service improvement</li>
              <li>You are responsible for your customers' data privacy compliance (GDPR, CCPA, etc.)</li>
            </ul>
          </section>

          {/* Section 8: Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Our Rights</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              All rights, title, and interest in openTILL, including software, trademarks, logos, and content, 
              are owned by Isolex Corporation. These Terms do not grant you any ownership rights.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Your License</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              We grant you a limited, non-exclusive, non-transferable license to use openTILL for your 
              business operations, subject to these Terms.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Your Content</h3>
            <p className="text-700 leading-relaxed dark:text-gray-300">
              You retain ownership of content you upload (products, images, etc.). By uploading content, you grant 
              us a license to store, process, and display it as necessary to provide the Service.
            </p>
          </section>

          {/* Section 9: Disclaimers and Limitations */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              9. Disclaimers and Limitations
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Service "As Is"</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              openTILL is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express 
              or implied, including but not limited to merchantability, fitness for a particular purpose, or 
              non-infringement.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">No Guarantee of Uptime</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              While we strive for maximum uptime, we do not guarantee uninterrupted or error-free service. 
              Scheduled maintenance and unexpected outages may occur.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Limitation of Liability</h3>
            <p className="text-gray-700 leading-relaxed mb-3 dark:text-gray-300">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, ISOLEX CORPORATION SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Indirect, incidental, special, or consequential damages</li>
              <li>Loss of profits, revenue, data, or business opportunities</li>
              <li>Service interruptions or data loss</li>
              <li>Third-party payment gateway failures</li>
              <li>Cryptocurrency volatility or blockchain issues</li>
              <li>Errors in transaction processing</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4 dark:text-gray-300">
              Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          {/* Section 10: Indemnification */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              You agree to indemnify and hold harmless Isolex Corporation, its officers, directors, employees, and 
              agents from any claims, damages, losses, or expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any law or third-party rights</li>
              <li>Your business operations and transactions</li>
              <li>Your customer data or privacy practices</li>
            </ul>
          </section>

          {/* Section 11: Termination */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Termination</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">By You</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              You may cancel your subscription at any time through your account settings. Cancellation takes 
              effect at the end of your current billing period. No refunds for partial periods.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">By Us</h3>
            <p className="text-gray-700 leading-relaxed mb-3 dark:text-gray-300">
              We may suspend or terminate your account immediately if:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>You violate these Terms</li>
              <li>You engage in fraudulent or illegal activity</li>
              <li>Your account poses a security risk</li>
              <li>You fail to pay subscription fees</li>
              <li>We cease operations or discontinue the Service</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Effect of Termination</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              Upon termination, your access to openTILL ends immediately. You may export your data within 
              90 days of termination, after which we may delete it.
            </p>
          </section>

          {/* Section 12: Dispute Resolution */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Scale className="w-6 h-6 text-purple-600" />
              12. Dispute Resolution
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Informal Resolution</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              Before filing a legal claim, you agree to first contact us at <a href="mailto:legal@isolex.io" className="text-purple-600 hover:underline">legal@isolex.io</a> to attempt 
              informal resolution. We commit to working in good faith to resolve disputes.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Arbitration Agreement</h3>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              Any disputes that cannot be resolved informally shall be resolved through binding arbitration, 
              except for claims related to intellectual property rights. Arbitration precludes class action lawsuits.
            </p>
            {/* The "Governing Law" subsection was moved to its own section 13 */}
          </section>

          {/* Section 13: Governing Law (New standalone section) */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              13. Governing Law
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              These Terms are governed by and construed in accordance with the laws of the State of Ohio, 
              United States, without regard to its conflict of law principles. Any legal action or proceeding 
              arising under these Terms will be brought exclusively in the federal or state courts located 
              in Lucas County, Ohio, and the parties hereby consent to the personal jurisdiction and venue therein.
            </p>
          </section>

          {/* Section 14: Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">14. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed dark:text-gray-300">
              We may modify these Terms at any time. Material changes will be communicated via email or through 
              the Service. Your continued use after changes constitutes acceptance. If you disagree with changes, 
              you must cancel your subscription.
            </p>
          </section>

          {/* Section 15: General Provisions */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">15. General Provisions</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and Isolex Corporation</li>
              <li><strong>Severability:</strong> If any provision is invalid, the rest remains in effect</li>
              <li><strong>Waiver:</strong> Our failure to enforce a right does not waive that right</li>
              <li><strong>Assignment:</strong> You may not assign these Terms without our consent</li>
              <li><strong>Force Majeure:</strong> We are not liable for delays caused by events beyond our control</li>
              <li><strong>No Agency:</strong> These Terms do not create a partnership or agency relationship</li>
            </ul>
          </section>

          {/* Section 16: Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6 text-purple-600" />
              16. Contact Information
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4 dark:text-gray-300">
              For questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
              <p className="font-semibold text-gray-900 dark:text-white mb-2">Isolex Corporation</p>
              <p className="text-gray-700 dark:text-gray-300">Email: <a href="mailto:legal@isolex.io" className="text-purple-600 hover:underline">legal@isolex.io</a></p>
              <p className="text-gray-700 dark:text-gray-300">Support: <a href="mailto:support@isolex.io" className="text-purple-600 hover:underline">support@isolex.io</a></p>
              <p className="text-gray-700 mt-2 dark:text-gray-300">Address: Toledo, OH 43606</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}