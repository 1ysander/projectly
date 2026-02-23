// ─── TYPE DEFINITIONS FOR UNIFY ─────────────────────────────────────

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  image?: string;
  sku?: string;
}

export interface ShipmentLink {
  carrier: string;
  tracking_number: string;
  status: string;
  eta?: string;
  last_update: string;
}

export interface UnifiedOrder {
  order_id: string;
  merchant_name: string;
  merchant_logo?: string;
  source: 'Amazon' | 'eBay' | 'Shopify' | 'Email' | 'Manual' | 'Other';
  order_number: string;
  order_date: string;
  total_amount: number;
  currency: string;
  payment_method: string;
  items: OrderItem[];
  shipment_links: ShipmentLink[];
  return_window_end_date?: string;
  tags: string[];
  notes: string;
  status: 'Ordered' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Unknown';
  confidence_score?: number;
}

export interface UnifiedReturn {
  return_id: string;
  related_order_id: string;
  merchant_name: string;
  merchant_logo?: string;
  status: 'Not started' | 'Requested' | 'Label created' | 'Dropped off' | 'In transit' | 'Received' | 'Refund pending' | 'Refunded' | 'Denied';
  method: 'mail' | 'pickup' | 'in-store';
  refund_amount?: number;
  refund_timeline_estimate?: string;
  deadline_ship?: string;
  deadline_return?: string;
  order_number: string;
  items: string[];
}

export interface Shipment {
  shipment_id: string;
  carrier: string;
  tracking_number: string;
  linked_order_id?: string;
  item_name?: string;
  merchant_name?: string;
  status: string;
  last_scan: string;
  eta?: string;
  delivery_city?: string;
  delivery_state?: string;
  return_tracking_number?: string;
  return_to_city?: string;
  return_to_state?: string;
  tracking_events?: {
    status: string;
    message: string;
    datetime?: string;
    city?: string;
    state?: string;
  }[];
  progress: number;
}

export interface InboxItem {
  id: string;
  type: 'order_detected' | 'shipment_update' | 'return_deadline' | 'refund_update' | 'needs_review';
  icon: string;
  merchant: string;
  summary: string;
  timestamp: string;
  read: boolean;
  chips: string[];
  linked_id?: string;
}

export interface Notification {
  id: string;
  title: string;
  timestamp: string;
  action: string;
  read: boolean;
}

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  condition: string;
  action: string;
  last_run?: string;
  success_rate?: number;
}

export interface Connection {
  id: string;
  name: string;
  type: 'email' | 'merchant' | 'carrier';
  logo: string;
  status: 'Connected' | 'Needs attention' | 'Syncing' | 'Not connected';
  last_sync?: string;
  data_scope?: string;
}

export interface CopilotSuggestion {
  id: string;
  text: string;
  action: string;
}

// ─── COPILOT SUGGESTIONS ────────────────────────────────────

export const copilotSuggestions: CopilotSuggestion[] = [
  {
    id: 'cp_001',
    text: '3 shipments are missing tracking updates — want me to check carrier sites?',
    action: 'Check tracking',
  },
  {
    id: 'cp_002',
    text: 'Return deadline in 48h for Nike shipment — start return?',
    action: 'Start return',
  },
  {
    id: 'cp_003',
    text: 'This DHL package might belong to your Shopify shipment — link them?',
    action: 'Link shipment',
  },
  {
    id: 'cp_004',
    text: 'You saved $42.18 from your Target return. View refund summary?',
    action: 'View refunds',
  },
];
