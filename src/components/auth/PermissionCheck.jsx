import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

/**
 * Component to check user permissions and display appropriate UI
 * Used to protect admin-only features
 */
export default function PermissionCheck({ 
  requiredRole = 'admin',
  children,
  fallback = null,
  showWarning = false
}) {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkPermission();
  }, [requiredRole]);

  const checkPermission = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Check if user has required role
      let hasAccess = false;
      if (requiredRole === 'admin') {
        hasAccess = currentUser.role === 'admin';
      } else if (requiredRole === 'merchant_admin') {
        hasAccess = currentUser.role === 'merchant_admin' || currentUser.role === 'admin';
      } else if (requiredRole === 'dealer_admin') {
        hasAccess = currentUser.role === 'dealer_admin' || currentUser.role === 'admin';
      }

      setHasPermission(hasAccess);
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return fallback;
    }

    if (showWarning) {
      return (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Access Restricted:</strong> This feature requires {requiredRole} permissions.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
}