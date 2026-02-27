import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import {
  BookOpen, Code, CheckCircle, ArrowRight, ExternalLink, Package, DollarSign,
  Upload, FileText, ChevronDown, ChevronUp
} from 'lucide-react';

const STEPS = [
  {
    num: 1,
    icon: Code,
    title: 'Build Your Chip',
    color: 'bg-blue-50 text-blue-600',
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>A Chip is a self-contained feature module that integrates with the openTILL POS platform.</p>
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <p className="font-semibold text-gray-800">Required files in your repo:</p>
          <ul className="space-y-1 font-mono text-xs">
            <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 shrink-0" /> <code>README.md</code> — Clear description & setup instructions</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 shrink-0" /> <code>package.json</code> — Dependencies & entry point</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 shrink-0" /> <code>index.js</code> — Main export</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 shrink-0" /> <code>CHANGELOG.md</code> — Version history</li>
          </ul>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 space-y-1">
          <p className="font-semibold text-blue-800">Integration points:</p>
          <ul className="list-disc list-inside text-xs text-blue-700 space-y-0.5">
            <li>Access merchant data via the openTILL SDK</li>
            <li>Hook into POS events (order created, payment completed, etc.)</li>
            <li>Render UI panels inside the POS interface</li>
            <li>Use the feature flags system to gate functionality</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    num: 2,
    icon: FileText,
    title: 'Write Documentation',
    color: 'bg-purple-50 text-purple-600',
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>Good documentation is <strong>required</strong> for approval. Merchants need to understand what your chip does before purchasing.</p>
        <div className="space-y-2">
          <p className="font-semibold text-gray-800">Your documentation must include:</p>
          <ul className="space-y-1.5">
            {[
              'What the chip does and the problem it solves',
              'Setup & configuration instructions',
              'Screenshots or a demo video',
              'API keys or external services required',
              'Pricing justification',
              'Support contact information',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-gray-500">Host docs on GitHub Pages, Notion, GitBook, or any public URL.</p>
      </div>
    ),
  },
  {
    num: 3,
    icon: Upload,
    title: 'Submit for Review',
    color: 'bg-amber-50 text-amber-600',
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>Click <strong>Submit New Chip</strong> and fill out the submission form with:</p>
        <ul className="space-y-1.5">
          {[
            'Chip name, description, and category',
            'GitHub repository URL',
            'Documentation URL',
            'Pricing model (Free, One-time, or Subscription)',
            'Logo / screenshots',
            'Demo URL (optional but strongly recommended)',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <ArrowRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <strong>Review timeline:</strong> Our team reviews submissions within 3–5 business days. You'll receive feedback via email and see status updates in your dashboard.
        </div>
      </div>
    ),
  },
  {
    num: 4,
    icon: DollarSign,
    title: 'Earn Revenue',
    color: 'bg-green-50 text-green-600',
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>Once published, merchants can purchase and install your chip from the Marketplace.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-green-700">70%</p>
            <p className="text-xs text-green-600 font-medium">Your revenue share</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-blue-700">30%</p>
            <p className="text-xs text-blue-600 font-medium">Platform fee</p>
          </div>
        </div>
        <ul className="space-y-1 text-sm">
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Payouts via Stripe Connect</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Monthly automatic payouts</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Real-time analytics in your dashboard</li>
        </ul>
        <p className="text-xs text-gray-500">Make sure to connect your Stripe account in Settings to receive payouts.</p>
      </div>
    ),
  },
];

function StepCard({ step }) {
  const [open, setOpen] = useState(false);
  const Icon = step.icon;
  return (
    <Card className="border border-gray-200">
      <button
        className="w-full text-left"
        onClick={() => setOpen(!open)}
      >
        <CardHeader className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${step.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Step {step.num}</p>
                <CardTitle className="text-base">{step.title}</CardTitle>
              </div>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="px-5 pb-5 pt-0">
          {step.content}
        </CardContent>
      )}
    </Card>
  );
}

export default function ChipSubmissionDocs() {
  return (
    <CardContent className="p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">How to Submit a Chip</h2>
          <p className="text-gray-500 text-sm">Follow these steps to build, document, and publish your chip on the openTILL marketplace.</p>
        </div>

        <div className="space-y-3">
          {STEPS.map(step => <StepCard key={step.num} step={step} />)}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4" /> Review Criteria
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Functionality', 'Chip works as described'],
              ['Security', 'No malicious code or data leaks'],
              ['Documentation', 'Clear setup & usage instructions'],
              ['Performance', 'Doesn\'t degrade POS performance'],
              ['Design', 'UI fits the openTILL design system'],
              ['Pricing', 'Fair value for merchants'],
            ].map(([label, desc]) => (
              <div key={label} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800 text-xs">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={() => window.location.href = createPageUrl('SubmitChip')}
          >
            Submit a Chip <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button variant="outline" asChild>
            <a href="https://docs.opentill.io" target="_blank" rel="noreferrer">
              Full Docs <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </Button>
        </div>
      </div>
    </CardContent>
  );
}