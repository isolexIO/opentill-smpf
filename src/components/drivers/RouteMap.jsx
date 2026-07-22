import React from 'react';

export default function RouteMap({ pickup, delivery, height = 300 }) {
  if (!pickup || !delivery) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200 text-gray-400 text-sm" style={{ height }}>
        No route available
      </div>
    );
  }
  const src = `https://maps.google.com/maps?saddr=${encodeURIComponent(pickup)}&daddr=${encodeURIComponent(delivery)}&output=embed`;
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 w-full" style={{ height }}>
      <iframe
        key={src}
        title="Delivery route"
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}