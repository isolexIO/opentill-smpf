import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-black text-blue-600 dark:text-blue-400 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Page Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => window.history.back()}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button
            size="lg"
            onClick={() => window.location.href = createPageUrl('Home')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}