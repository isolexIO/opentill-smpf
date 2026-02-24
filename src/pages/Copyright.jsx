import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CopyrightPage() {
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
              © Isolex Corporation
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              All Rights Reserved
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Copyright Notice
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              © {new Date().getFullYear()} Isolex Corporation. All rights reserved.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              The content, design, functionality, and all other materials contained on or within this platform, 
              including but not limited to text, graphics, logos, images, software, and audio/visual files, 
              are the exclusive property of Isolex Corporation or its content suppliers and are protected by 
              international copyright laws.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Intellectual Property Rights
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              All trademarks, service marks, logos, and product names referenced on this platform are the 
              property of Isolex Corporation or their respective owners. Unauthorized use of any of these 
              marks or names is prohibited.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Limited License
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Permission is granted to view, download, and print pages from this platform for personal, 
              non-commercial use, provided that you do not modify the materials and retain all copyright 
              notices and proprietary notices. Any other use of the materials on this platform, including 
              reproduction for purposes other than those noted above, modification, republication, transmission, 
              translation, or any other use is prohibited without the prior written permission of Isolex Corporation.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Contact
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              For inquiries regarding copyright or intellectual property matters, please contact Isolex Corporation.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Disclaimer:</strong> This platform and its contents are provided "as is" without warranty 
              of any kind. Isolex Corporation makes no warranties, express or implied, regarding the accuracy, 
              completeness, or reliability of the information contained herein.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}