import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * PermissionGate Component
 * Wraps content and only displays it if the user has the required permission
 * 
 * Usage:
 * <PermissionGate permission="manage_inventory">
 *   <YourComponent />
 * </PermissionGate>
 */
export default function PermissionGate({ children, permission, fallback = null }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      if (pinUserJSON) {
        const pinUser = JSON.parse(pinUserJSON);
        setCurrentUser(pinUser);
      }
    } catch (error) {
      console.error('Error loading user for permission check:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const hasPermission = () => {
    if (!currentUser) return false;
    
    // Super admin, root admin, and merchant admin have all permissions
    if (currentUser.role === 'admin' || currentUser.role === 'root_admin' || currentUser.role === 'merchant_admin') return true;
    
    if (!Array.isArray(currentUser.permissions)) return false;
    
    return currentUser.permissions.includes(permission);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasPermission()) {
    if (fallback) return fallback;
    
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <Lock className="h-5 w-5" />
            <AlertDescription className="mt-2">
              <p className="font-semibold text-lg mb-2">Access Denied</p>
              <p className="text-sm mb-4">
                You don't have permission to access this feature. Please contact your administrator if you need access.
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="mt-2"
              >
                Go Back
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}