import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LicensePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" size="sm" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Software License Agreement
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Isolex Corporation
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Grant of License
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Isolex Corporation ("Licensor") grants you a non-exclusive, non-transferable, limited license to use this software 
              and associated documentation ("Software") solely for your own business purposes, subject to the terms and conditions 
              of this agreement. You may not lease, sell, assign, pledge, or transfer the license or the Software. Any attempt to 
              do so is void.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Restrictions
            </h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">
              <p>You may not:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Reverse engineer, decompile, disassemble, or modify the Software</li>
                <li>Rent, lease, or lend the Software</li>
                <li>Transfer the Software to another party without written consent from Isolex Corporation</li>
                <li>Remove or alter any proprietary notices, labels, or marks on the Software</li>
                <li>Use the Software for any unlawful purpose or in violation of any applicable laws</li>
                <li>Attempt to circumvent any licensing, security, or other technological features of the Software</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Intellectual Property
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              The Software and all copies thereof are proprietary to Isolex Corporation. All intellectual property rights, 
              including but not limited to copyright, patent, trademark, and trade secret rights, are owned by or licensed to 
              Isolex Corporation. Your possession, use, or copying of the Software does not transfer any ownership rights to you.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Warranty Disclaimer
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
              THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. ISOLEX CORPORATION DOES 
              NOT WARRANT THAT THE SOFTWARE WILL MEET YOUR REQUIREMENTS OR THAT THE SOFTWARE WILL OPERATE UNINTERRUPTED OR ERROR-FREE.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Limitation of Liability
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              IN NO EVENT SHALL ISOLEX CORPORATION BE LIABLE FOR ANY SPECIAL, INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE 
              DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION, EVEN IF ISOLEX CORPORATION HAS BEEN ADVISED 
              OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              THE TOTAL LIABILITY OF ISOLEX CORPORATION UNDER THIS AGREEMENT SHALL NOT EXCEED THE AMOUNT PAID BY YOU FOR THE SOFTWARE 
              IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Support and Maintenance
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Isolex Corporation may provide updates, patches, and upgrades to the Software at its sole discretion. Isolex Corporation 
              is not obligated to provide technical support unless such support is included in your subscription or service agreement.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Termination
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              This license is effective until terminated. Your rights under this license will terminate automatically without notice 
              if you fail to comply with any term(s) of this agreement.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Upon termination of this license, you must cease all use of the Software and destroy all copies, full or partial, of 
              the Software.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Compliance with Laws
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              You agree to use the Software in compliance with all applicable laws and regulations. You are solely responsible for 
              determining the appropriateness of using the Software and assume all risks associated with its use.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Entire Agreement
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              This Software License Agreement constitutes the entire agreement between you and Isolex Corporation concerning the 
              Software and supersedes all prior negotiations, representations, or agreements, whether written or oral.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              10. Contact Information
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              For questions or concerns regarding this Software License Agreement, please contact Isolex Corporation. 
              Please refer to our Terms of Service for information on how to reach us.
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}