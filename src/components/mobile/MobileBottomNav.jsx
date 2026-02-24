import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, ShoppingCart, Package, Users, Settings } from 'lucide-react';
import { useEffect, useRef } from 'react';

const NAV_ITEMS = [
  { label: 'Home', icon: Home, page: 'SystemMenu' },
  { label: 'Orders', icon: ShoppingCart, page: 'Orders' },
  { label: 'Inventory', icon: Package, page: 'Inventory' },
  { label: 'Staff', icon: Users, page: 'Users' },
  { label: 'Settings', icon: Settings, page: 'Settings' },
];

export default function MobileBottomNav({ currentPageName }) {
  const location = useLocation();
  const stackRef = useRef({
    SystemMenu: { url: createPageUrl('SystemMenu'), scroll: 0 },
    Orders: { url: createPageUrl('Orders'), scroll: 0 },
    Inventory: { url: createPageUrl('Inventory'), scroll: 0 },
    Users: { url: createPageUrl('Users'), scroll: 0 },
    Settings: { url: createPageUrl('Settings'), scroll: 0 },
  });

  // Store navigation state when leaving a tab
  useEffect(() => {
    if (currentPageName && NAV_ITEMS.some(item => item.page === currentPageName)) {
      stackRef.current[currentPageName] = {
        url: location.pathname + location.search,
        scroll: window.scrollY || 0
      };
    }
  }, [currentPageName, location.pathname, location.search]);

  // Restore navigation state when entering a tab
  useEffect(() => {
    const timer = setTimeout(() => {
      const stack = stackRef.current[currentPageName];
      if (stack) {
        window.scrollTo(0, stack.scroll);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [currentPageName]);

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