import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, Eye, UserCheck, Database, Globe, Link2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function PrivacyPolicyPage() {
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

      <div className="container mx-auto max-w-4xl px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600">Last Updated: December 2024</p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-8 prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Eye className="w-6 h-6 text-purple-600" />
                Introduction
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Isolex Corporation ("we," "us," or "our") operates openTILL Point of Sale ("openTILL," "Service"). 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                We are committed to protecting your privacy and ensuring the security of your personal and business information. 
                Please read this policy carefully to understand our practices regarding your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-purple-600" />
                Information We Collect
              </h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Personal Information</h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                When you register for openTILL, we collect:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Business name and contact information</li>
                <li>Owner name and email address</li>
                <li>Phone number and business address</li>
                <li>Tax identification number (EIN/TIN)</li>
                <li>Payment information for subscription billing</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Transaction Data</h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                To provide our POS services, we process:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Order details and transaction amounts</li>
                <li>Payment method information (last 4 digits of cards)</li>
                <li>Customer information (if provided by you)</li>
                <li>Product and inventory data</li>
                <li>Sales reports and analytics</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Technical Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>IP addresses and device information</li>
                <li>Browser type and version</li>
                <li>Usage data and analytics</li>
                <li>Log files and error reports</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6 text-purple-600" />
                How We Use Your Information
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We use the collected information for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Service Provision:</strong> Processing transactions, managing orders, and providing POS functionality</li>
                <li><strong>Account Management:</strong> Creating and maintaining your merchant account</li>
                <li><strong>Payment Processing:</strong> Facilitating payments through various payment gateways</li>
                <li><strong>Customer Support:</strong> Responding to inquiries and providing technical assistance</li>
                <li><strong>Analytics:</strong> Improving our services and understanding usage patterns</li>
                <li><strong>Compliance:</strong> Meeting legal and regulatory requirements (PCI-DSS, tax laws, etc.)</li>
                <li><strong>Marketing:</strong> Sending promotional materials (with your consent)</li>
                <li><strong>Security:</strong> Detecting and preventing fraud, security breaches, and unauthorized access</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-6 h-6 text-purple-600" />
                Information Sharing and Disclosure
              </h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Third-Party Service Providers</h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                We may share your information with:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Payment Processors:</strong> Stripe, Square, Shift4 (for card payments)</li>
                <li><strong>Blockchain Networks:</strong> Solana network (for crypto payments)</li>
                <li><strong>Cloud Services:</strong> AWS, Google Cloud (for data hosting)</li>
                <li><strong>Analytics Providers:</strong> For service improvement and usage analysis</li>
                <li><strong>Customer Support Tools:</strong> For ticket management and support</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Legal Requirements</h3>
              <p className="text-gray-700 leading-relaxed">
                We may disclose your information when required by law, such as:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Compliance with court orders or subpoenas</li>
                <li>Cooperation with law enforcement investigations</li>
                <li>Protection of our legal rights and safety</li>
                <li>Prevention of fraud or security threats</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Business Transfers</h3>
              <p className="text-gray-700 leading-relaxed">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred 
                to the acquiring entity, subject to the same privacy protections.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Encryption:</strong> All data transmitted is encrypted using TLS/SSL protocols</li>
                <li><strong>PCI-DSS Compliance:</strong> We adhere to Payment Card Industry Data Security Standards</li>
                <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication</li>
                <li><strong>Data Isolation:</strong> Merchant data is strictly segregated by merchant ID</li>
                <li><strong>Regular Audits:</strong> Security assessments and vulnerability testing</li>
                <li><strong>Secure Storage:</strong> Encrypted databases with regular backups</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                However, no method of transmission over the Internet is 100% secure. While we strive to protect 
                your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide services. 
                After account closure, we retain data for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Transaction Records:</strong> 7 years (tax and compliance requirements)</li>
                <li><strong>Account Information:</strong> 90 days after closure (recovery period)</li>
                <li><strong>Audit Logs:</strong> 5 years (security and compliance)</li>
                <li><strong>Analytics Data:</strong> Anonymized and aggregated indefinitely</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-purple-600" />
                Your Rights
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
                <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Restriction:</strong> Limit how we process your data</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                To exercise these rights, contact us at <strong>privacy@isolex.io</strong>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Tracking</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Maintain your login session</li>
                <li>Remember your preferences</li>
                <li>Analyze service usage and performance</li>
                <li>Provide personalized content</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                You can control cookies through your browser settings. Note that disabling cookies may affect 
                service functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                openTILL is not intended for individuals under 18 years of age. We do not knowingly 
                collect personal information from children. If we become aware of such collection, we will 
                delete the information immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">International Data Transfers</h2>
              <p className="text-gray-700 leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place to protect your data in accordance with this 
                Privacy Policy and applicable laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes 
                via email or through our Service. Your continued use of openTILL after changes constitutes 
                acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-purple-600" />
                Contact Us
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-900 mb-2">Isolex Corporation</p>
                <p className="text-gray-700">Email: <a href="mailto:privacy@isolex.io" className="text-purple-600 hover:underline">privacy@isolex.io</a></p>
                <p className="text-gray-700">Support: <a href="mailto:support@isolex.io" className="text-purple-600 hover:underline">support@isolex.io</a></p>
                <p className="text-gray-700 mt-2">Address: Toledo, OH 43606</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}