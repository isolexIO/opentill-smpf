import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, ShoppingCart, Package, Users, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', icon: Home, page: 'SystemMenu' },
  { label: 'Orders', icon: ShoppingCart, page: 'Orders' },
  { label: 'Inventory', icon: Package, page: 'Inventory' },
  { label: 'Staff', icon: Users, page: 'Users' },
  { label: 'Settings', icon: Settings, page: 'Settings' },
];

export default function MobileBottomNav({ currentPageName }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex md:hidden"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {NAV_ITEMS.map(({ label, icon: Icon, page }) => {
        const active = currentPageName === page;
        return (
          <Link
            key={page}
            to={createPageUrl(page)}
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors ${
              active
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}