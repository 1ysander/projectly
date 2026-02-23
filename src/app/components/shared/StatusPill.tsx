interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusStyles: Record<string, string> = {
  // Order statuses
  'Ordered': 'bg-info-light text-info',
  'Shipped': 'bg-cobalt-light text-cobalt',
  'Delivered': 'bg-success-light text-success',
  'Cancelled': 'bg-danger-light text-danger',
  'Unknown': 'bg-[#F3F4F6] text-muted-foreground',
  // Shipment statuses
  'Out for delivery': 'bg-success-light text-success',
  'In transit': 'bg-cobalt-light text-cobalt',
  'Label created': 'bg-warning-light text-warning',
  'Returning to sender': 'bg-warning-light text-warning',
  'Issue': 'bg-danger-light text-danger',
  'Pending': 'bg-[#F3F4F6] text-muted-foreground',
  // Return statuses
  'Not started': 'bg-[#F3F4F6] text-muted-foreground',
  'Requested': 'bg-info-light text-info',
  'Dropped off': 'bg-cobalt-light text-cobalt',
  'Received': 'bg-success-light text-success',
  'Refund pending': 'bg-warning-light text-warning',
  'Refunded': 'bg-success-light text-success',
  'Denied': 'bg-danger-light text-danger',
  // Generic
  'Connected': 'bg-success-light text-success',
  'Needs attention': 'bg-warning-light text-warning',
  'Syncing': 'bg-cobalt-light text-cobalt',
  'Not connected': 'bg-[#F3F4F6] text-muted-foreground',
  'Needs review': 'bg-warning-light text-warning',
};

export function StatusPill({ status, size = 'sm' }: StatusPillProps) {
  const style = statusStyles[status] || 'bg-[#F3F4F6] text-muted-foreground';
  const sizeClasses = size === 'sm' ? 'text-[0.7rem] px-2 py-0.5' : 'text-[0.78rem] px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full whitespace-nowrap ${style} ${sizeClasses}`}
      style={{ fontWeight: 500 }}
    >
      {status}
    </span>
  );
}
