import { base44 } from '@/api/base44Client';
import { ToggleLeft } from 'lucide-react';

const ALL_FEATURES = [
  { key: 'pos',              label: 'POS (Core)',              description: 'Point of sale system' },
  { key: 'customers',        label: 'Customers',               description: 'Customer database & profiles' },
  { key: 'loyalty',          label: 'Loyalty Program',         description: 'Points & rewards for customers' },
  { key: 'online_menu',      label: 'Online Menu',             description: 'Public-facing digital menu' },
  { key: 'online_orders',    label: 'Online Orders',           description: 'Accept orders via web' },
  { key: 'reports',          label: 'Reports & Analytics',     description: 'Sales reports and insights' },
  { key: 'inventory',        label: 'Inventory Management',    description: 'Track stock & supplies' },
  { key: 'ai_assistant',     label: 'AI Assistant',            description: 'AI-powered business assistant' },
  { key: 'ai_website',       label: 'AI Website Generator',    description: 'Generate a merchant website with AI' },
  { key: 'customer_display', label: 'Customer Display',        description: 'Secondary customer-facing screen' },
  { key: 'kitchen_display',  label: 'Kitchen Display',         description: 'KDS screen for kitchen staff' },
  { key: 'device_monitor',   label: 'Device Monitor',          description: 'Monitor connected POS devices' },
  { key: 'time_tracking',    label: 'Time Tracking',           description: 'Employee clock-in/out & hours' },
  { key: 'chain_link',       label: 'ChainLINK Pay',           description: 'Payment link generation' },
  { key: 'referral',         label: 'Referral Dashboard',      description: 'Merchant referral program' },
  { key: 'marketing',        label: 'Marketing Tools',         description: 'Campaigns & promotions' },
];

/**
 * Reusable feature toggle grid for merchant info popups.
 * Props:
 *   merchant        - full merchant object
 *   onMerchantUpdate(updatedMerchant) - called after each toggle with the updated merchant obj
 */
export default function MerchantFeatureToggles({ merchant, onMerchantUpdate }) {
  const currentFeatures = merchant.features_enabled || ['pos'];

  const toggle = async (key) => {
    const enabled = currentFeatures.includes(key);
    const updated = enabled
      ? currentFeatures.filter(f => f !== key)
      : [...currentFeatures, key];

    await base44.entities.Merchant.update(merchant.id, { features_enabled: updated });
    onMerchantUpdate({ ...merchant, features_enabled: updated });
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center gap-2 mb-1">
        <ToggleLeft className="w-4 h-4 text-blue-600" />
        <h4 className="font-semibold text-sm">Feature Access</h4>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Toggle features on/off for this merchant. These override chip/subscription requirements.
      </p>
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
        {ALL_FEATURES.map(({ key, label, description }) => {
          const enabled = currentFeatures.includes(key);
          return (
            <div key={key} className="flex items-center justify-between px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{description}</p>
              </div>
              <button
                onClick={() => toggle(key)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}