const merchantColors: Record<string, string> = {
  Amazon: '#FF9900',
  Nike: '#111',
  Apple: '#555',
  Target: '#CC0000',
  eBay: '#E53238',
  'Shopify Store': '#96BF48',
  'Unknown Merchant': '#9CA3AF',
  UPS: '#351C15',
  USPS: '#333366',
  FedEx: '#4D148C',
  DHL: '#FFCC00',
  Gmail: '#EA4335',
  Outlook: '#0078D4',
  Shopify: '#96BF48',
};

interface MerchantAvatarProps {
  name: string;
  size?: number;
}

export function MerchantAvatar({ name, size = 36 }: MerchantAvatarProps) {
  const bg = merchantColors[name] || '#6B7280';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="rounded-lg flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
      }}
    >
      <span
        className="text-white"
        style={{
          fontSize: size * 0.35,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {initials}
      </span>
    </div>
  );
}
