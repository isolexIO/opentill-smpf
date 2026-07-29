import SNSSubdomainRegistration from '@/components/dealer/SNSSubdomainRegistration';

export default function Web3IdentityTab({ merchant }) {
  return (
    <SNSSubdomainRegistration
      ownerType="merchant"
      ownerId={merchant.id}
      onUpdate={async () => {
        // Refresh the settings page so the new subdomain status shows
        try {
          const refreshed = await import('@/api/base44Client').then((m) =>
            m.base44.entities.Merchant.get(merchant.id)
          );
          if (refreshed) {
            // Trigger a soft reload to pick up the updated merchant
            window.dispatchEvent(new CustomEvent('merchant-updated', { detail: refreshed }));
          }
        } catch {
          /* ignore */
        }
      }}
    />
  );
}