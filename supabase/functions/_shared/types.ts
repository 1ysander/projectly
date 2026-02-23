export type ProviderName = 'easypost' | 'shopify' | 'amazon_sp_api' | 'gmail';
export type SyncMode = 'manual' | 'open' | 'scheduled' | 'webhook';

export interface IntegrationAccount {
  id: string;
  user_id: string;
  provider: ProviderName;
  external_account_id: string;
  display_name: string | null;
  status: 'active' | 'paused' | 'error';
  config: Record<string, unknown>;
  secret: Record<string, unknown>;
  refresh_interval_minutes: number;
  last_synced_at: string | null;
  last_error: string | null;
}

export interface ShipmentRow {
  id: string;
  user_id: string;
  carrier: string;
  tracking_number: string;
  linked_order_id?: string | null;
  item_name?: string | null;
  merchant_name?: string | null;
  status: string;
  last_scan: string;
  eta?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  return_tracking_number?: string | null;
  return_to_city?: string | null;
  return_to_state?: string | null;
  tracking_events?: TrackingEventCandidate[] | null;
  progress: number;
}

export interface TrackingEventCandidate {
  status: string;
  message: string;
  datetime?: string;
  city?: string | null;
  state?: string | null;
}

export interface ReturnRow {
  id: string;
  user_id: string;
  related_order_id?: string | null;
  merchant_name: string;
  status: string;
  method: 'mail' | 'pickup' | 'in-store';
  refund_amount?: number | null;
  deadline_return?: string | null;
  order_number: string;
  items: string[];
}

export interface ShipmentSyncCandidate {
  tracking_number: string;
  carrier: string;
  status: string;
  progress?: number;
  last_scan?: string;
  eta?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  return_tracking_number?: string | null;
  return_to_city?: string | null;
  return_to_state?: string | null;
  tracking_events?: TrackingEventCandidate[];
  item_name?: string | null;
  merchant_name?: string | null;
}

export interface ReturnSyncCandidate {
  merchant_name: string;
  order_number: string;
  status: string;
  method?: 'mail' | 'pickup' | 'in-store';
  refund_amount?: number | null;
  deadline_return?: string | null;
  items?: string[];
}

export interface ProviderSyncResult {
  shipments: ShipmentSyncCandidate[];
  returns: ReturnSyncCandidate[];
  stats: {
    requested: number;
    updated: number;
    created: number;
    errors: number;
  };
}

export interface ProviderSyncContext {
  userId: string;
  account: IntegrationAccount;
  existingShipments: ShipmentRow[];
  existingReturns: ReturnRow[];
  lastSyncedAt: string | null;
}
