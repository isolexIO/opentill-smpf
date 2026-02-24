import { useEffect } from 'react';
import { createPageUrl } from '@/utils';

// Redirect to the unified login page, preserving any QR session params
export default function WalletLoginPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    const mode = params.get('mode');
    let url = createPageUrl('EmailLogin');
    if (session || mode) url += `?session=${session || ''}&mode=${mode || 'mobile_connect'}`;
    url += '#wallet';
    window.location.replace(url);
  }, []);

  return null;
}