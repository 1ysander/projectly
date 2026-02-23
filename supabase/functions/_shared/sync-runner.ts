import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8?target=deno';
import {
  IntegrationAccount,
  ProviderName,
  ProviderSyncContext,
  ProviderSyncResult,
  ReturnRow,
  ReturnSyncCandidate,
  ShipmentRow,
  ShipmentSyncCandidate,
  SyncMode,
} from './types.ts';
import { syncEasyPostProvider } from './providers/easypost.ts';
import { syncShopifyProvider } from './providers/shopify.ts';
import { syncAmazonProvider } from './providers/amazon.ts';
import { syncGmailProvider } from './providers/gmail.ts';

type SupabaseAdminClient = ReturnType<typeof createClient>;

interface AccountSyncSummary {
  account_id: string;
  user_id: string;
  provider: ProviderName;
  ok: boolean;
  stats: Record<string, unknown>;
  error?: string;
}

interface SyncRunnerOptions {
  mode: SyncMode;
  userIds?: string[];
  provider?: ProviderName;
  accountId?: string;
  triggerPayload?: Record<string, unknown>;
}

const ALLOWED_RETURN_STATUSES = new Set([
  'Not started',
  'Requested',
  'Label created',
  'Dropped off',
  'In transit',
  'Received',
  'Refund pending',
  'Refunded',
  'Denied',
]);

function shipmentKey(carrier: string, trackingNumber: string): string {
  return `${carrier.toLowerCase().trim()}::${trackingNumber.toLowerCase().trim()}`;
}

function returnKey(merchantName: string, orderNumber: string, firstItem: string): string {
  return `${merchantName.toLowerCase().trim()}::${orderNumber.toLowerCase().trim()}::${firstItem.toLowerCase().trim()}`;
}

function accountScopeKey(account: IntegrationAccount): string {
  return `integration:${account.provider}:${account.external_account_id}`;
}

function normalizeReturnStatus(status: string): string {
  if (ALLOWED_RETURN_STATUSES.has(status)) return status;
  if (status.toLowerCase().includes('refund')) return 'Refund pending';
  if (status.toLowerCase().includes('deny')) return 'Denied';
  if (status.toLowerCase().includes('receive')) return 'Received';
  if (status.toLowerCase().includes('drop')) return 'Dropped off';
  if (status.toLowerCase().includes('label')) return 'Label created';
  return 'Requested';
}

function normalizeReturnMethod(method: string | undefined): 'mail' | 'pickup' | 'in-store' {
  if (!method) return 'mail';
  if (method === 'pickup') return 'pickup';
  if (method === 'in-store') return 'in-store';
  return 'mail';
}

async function getExistingShipments(admin: SupabaseAdminClient, userId: string): Promise<ShipmentRow[]> {
  const { data, error } = await admin
    .from('shipments')
    .select('id,user_id,carrier,tracking_number,linked_order_id,item_name,merchant_name,status,last_scan,eta,delivery_city,delivery_state,return_tracking_number,return_to_city,return_to_state,tracking_events,progress')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to load shipments for sync: ${error.message}`);
  }

  return (data || []) as ShipmentRow[];
}

async function getExistingReturns(admin: SupabaseAdminClient, userId: string): Promise<ReturnRow[]> {
  const { data, error } = await admin
    .from('returns')
    .select('id,user_id,related_order_id,merchant_name,status,method,refund_amount,deadline_return,order_number,items')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to load returns for sync: ${error.message}`);
  }

  return (data || []) as ReturnRow[];
}

async function applyShipmentCandidates(
  admin: SupabaseAdminClient,
  userId: string,
  existingShipments: ShipmentRow[],
  candidates: ShipmentSyncCandidate[]
) {
  const map = new Map<string, ShipmentRow>();
  for (const shipment of existingShipments) {
    map.set(shipmentKey(shipment.carrier, shipment.tracking_number), shipment);
  }

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const candidate of candidates) {
    if (!candidate.tracking_number || !candidate.carrier) continue;

    const key = shipmentKey(candidate.carrier, candidate.tracking_number);
    const existing = map.get(key);

    const payload = {
      carrier: candidate.carrier,
      tracking_number: candidate.tracking_number,
      status: candidate.status,
      progress: candidate.progress ?? 40,
      last_scan: candidate.last_scan || 'Provider status updated',
      eta: candidate.eta || null,
      delivery_city: candidate.delivery_city || null,
      delivery_state: candidate.delivery_state || null,
      return_tracking_number:
        candidate.return_tracking_number ?? existing?.return_tracking_number ?? null,
      return_to_city: candidate.return_to_city ?? existing?.return_to_city ?? null,
      return_to_state: candidate.return_to_state ?? existing?.return_to_state ?? null,
      tracking_events: candidate.tracking_events ?? existing?.tracking_events ?? [],
      item_name: candidate.item_name || existing?.item_name || null,
      merchant_name: candidate.merchant_name || existing?.merchant_name || null,
    };

    try {
      if (existing) {
        const { error } = await admin
          .from('shipments')
          .update(payload)
          .eq('id', existing.id)
          .eq('user_id', userId);
        if (error) throw error;
        updated += 1;
      } else {
        const { data, error } = await admin
          .from('shipments')
          .insert({
            user_id: userId,
            linked_order_id: null,
            ...payload,
          })
          .select('id,user_id,carrier,tracking_number,linked_order_id,item_name,merchant_name,status,last_scan,eta,delivery_city,delivery_state,return_tracking_number,return_to_city,return_to_state,tracking_events,progress')
          .single();
        if (error) throw error;
        created += 1;
        if (data) {
          map.set(key, data as ShipmentRow);
        }
      }
    } catch (error) {
      errors += 1;
      console.warn('Failed to apply shipment candidate', candidate, error);
    }
  }

  return { created, updated, errors };
}

async function applyReturnCandidates(
  admin: SupabaseAdminClient,
  userId: string,
  existingReturns: ReturnRow[],
  candidates: ReturnSyncCandidate[]
) {
  const map = new Map<string, ReturnRow>();
  for (const returnRow of existingReturns) {
    const firstItem = returnRow.items?.[0] || '';
    map.set(returnKey(returnRow.merchant_name, returnRow.order_number, firstItem), returnRow);
  }

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const candidate of candidates) {
    if (!candidate.merchant_name || !candidate.order_number) continue;

    const firstItem = candidate.items?.[0] || '';
    const key = returnKey(candidate.merchant_name, candidate.order_number, firstItem);
    const existing = map.get(key);

    const payload = {
      merchant_name: candidate.merchant_name,
      order_number: candidate.order_number,
      status: normalizeReturnStatus(candidate.status || 'Requested'),
      method: normalizeReturnMethod(candidate.method),
      items: candidate.items && candidate.items.length > 0 ? candidate.items : ['Return item'],
      refund_amount: candidate.refund_amount ?? null,
      deadline_return: candidate.deadline_return ?? null,
    };

    try {
      if (existing) {
        const { error } = await admin
          .from('returns')
          .update(payload)
          .eq('id', existing.id)
          .eq('user_id', userId);
        if (error) throw error;
        updated += 1;
      } else {
        const { data, error } = await admin
          .from('returns')
          .insert({
            user_id: userId,
            related_order_id: null,
            ...payload,
          })
          .select('id,user_id,related_order_id,merchant_name,status,method,refund_amount,deadline_return,order_number,items')
          .single();
        if (error) throw error;
        created += 1;
        if (data) {
          map.set(key, data as ReturnRow);
        }
      }
    } catch (error) {
      errors += 1;
      console.warn('Failed to apply return candidate', candidate, error);
    }
  }

  return { created, updated, errors };
}

async function runProviderSync(ctx: ProviderSyncContext): Promise<ProviderSyncResult> {
  switch (ctx.account.provider) {
    case 'easypost':
      return syncEasyPostProvider(ctx);
    case 'shopify':
      return syncShopifyProvider(ctx);
    case 'amazon_sp_api':
      return syncAmazonProvider(ctx);
    case 'gmail':
      return syncGmailProvider(ctx);
    default:
      throw new Error(`Unsupported provider: ${ctx.account.provider}`);
  }
}

async function syncConnectionMirrorForAccount(
  admin: SupabaseAdminClient,
  account: IntegrationAccount,
  status: 'Connected' | 'Needs attention',
  lastSync: string | null
) {
  const scopeKey = accountScopeKey(account);
  const payload = {
    status,
    last_sync: lastSync || null,
  };

  const { error } = await admin
    .from('connections')
    .update(payload)
    .eq('user_id', account.user_id)
    .eq('data_scope', scopeKey);

  if (error) {
    console.warn('Failed to update connection mirror from sync runner', error);
  }
}

function shouldSyncAccount(account: IntegrationAccount, mode: SyncMode, now: Date): boolean {
  if (mode !== 'scheduled') return true;
  if (!account.last_synced_at) return true;

  const lastSyncedAt = new Date(account.last_synced_at);
  if (Number.isNaN(lastSyncedAt.getTime())) return true;

  const refreshMinutes = Math.max(5, Number(account.refresh_interval_minutes || 60));
  const elapsedMs = now.getTime() - lastSyncedAt.getTime();
  return elapsedMs >= refreshMinutes * 60 * 1000;
}

async function syncSingleAccount(
  admin: SupabaseAdminClient,
  account: IntegrationAccount,
  mode: SyncMode,
  triggerPayload: Record<string, unknown>
): Promise<AccountSyncSummary> {
  const { data: runRow, error: runInsertError } = await admin
    .from('integration_sync_runs')
    .insert({
      user_id: account.user_id,
      integration_account_id: account.id,
      provider: account.provider,
      mode,
      status: 'started',
      trigger_payload: triggerPayload,
    })
    .select('id')
    .single();

  const syncRunId = runRow?.id as number | undefined;
  if (runInsertError) {
    console.warn('Failed to create integration_sync_runs started row', runInsertError);
  }

  try {
    const [existingShipments, existingReturns] = await Promise.all([
      getExistingShipments(admin, account.user_id),
      getExistingReturns(admin, account.user_id),
    ]);

    const providerResult = await runProviderSync({
      userId: account.user_id,
      account,
      existingShipments,
      existingReturns,
      lastSyncedAt: account.last_synced_at,
    });

    const [shipmentApplied, returnApplied] = await Promise.all([
      applyShipmentCandidates(admin, account.user_id, existingShipments, providerResult.shipments),
      applyReturnCandidates(admin, account.user_id, existingReturns, providerResult.returns),
    ]);

    const mergedStats = {
      provider_requested: providerResult.stats.requested,
      provider_updates: providerResult.stats.updated,
      provider_errors: providerResult.stats.errors,
      shipments_created: shipmentApplied.created,
      shipments_updated: shipmentApplied.updated,
      shipments_errors: shipmentApplied.errors,
      returns_created: returnApplied.created,
      returns_updated: returnApplied.updated,
      returns_errors: returnApplied.errors,
    };

    await admin
      .from('integration_accounts')
      .update({
        status: 'active',
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', account.id);

    await syncConnectionMirrorForAccount(
      admin,
      account,
      'Connected',
      new Date().toISOString()
    );

    if (syncRunId) {
      await admin
        .from('integration_sync_runs')
        .update({
          status: 'success',
          stats: mergedStats,
          finished_at: new Date().toISOString(),
        })
        .eq('id', syncRunId);
    }

    return {
      account_id: account.id,
      user_id: account.user_id,
      provider: account.provider,
      ok: true,
      stats: mergedStats,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await admin
      .from('integration_accounts')
      .update({
        status: 'error',
        last_error: message,
      })
      .eq('id', account.id);

    await syncConnectionMirrorForAccount(admin, account, 'Needs attention', null);

    if (syncRunId) {
      await admin
        .from('integration_sync_runs')
        .update({
          status: 'error',
          error: message,
          finished_at: new Date().toISOString(),
        })
        .eq('id', syncRunId);
    }

    return {
      account_id: account.id,
      user_id: account.user_id,
      provider: account.provider,
      ok: false,
      stats: {},
      error: message,
    };
  }
}

export async function runIntegrationSync(
  admin: SupabaseAdminClient,
  options: SyncRunnerOptions
): Promise<{ accounts_processed: number; ok: boolean; results: AccountSyncSummary[] }> {
  let query = admin
    .from('integration_accounts')
    .select('*')
    .eq('status', 'active');

  if (options.userIds && options.userIds.length > 0) {
    query = query.in('user_id', options.userIds);
  }

  if (options.provider) {
    query = query.eq('provider', options.provider);
  }

  if (options.accountId) {
    query = query.eq('id', options.accountId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load integration accounts: ${error.message}`);
  }

  const accounts = (data || []) as IntegrationAccount[];
  const now = new Date();
  const accountsToSync = accounts.filter((account) =>
    shouldSyncAccount(account, options.mode, now)
  );
  const results: AccountSyncSummary[] = [];

  for (const account of accountsToSync) {
    const summary = await syncSingleAccount(
      admin,
      account,
      options.mode,
      options.triggerPayload || {}
    );
    results.push(summary);
  }

  return {
    accounts_processed: accountsToSync.length,
    ok: results.every((result) => result.ok),
    results,
  };
}
