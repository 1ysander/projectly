import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  emptyResponse,
  isObject,
  jsonResponse,
  parseJsonBody,
  pickString,
} from '../_shared/http.ts';
import { createAdminClient, getUserIdFromAuthHeader } from '../_shared/supabase.ts';
import { ProviderName } from '../_shared/types.ts';

interface IntegrationMutationBody {
  id?: unknown;
  provider?: unknown;
  external_account_id?: unknown;
  display_name?: unknown;
  status?: unknown;
  refresh_interval_minutes?: unknown;
  config?: unknown;
  secret?: unknown;
}

interface IntegrationAccountRow {
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
  created_at?: string;
  updated_at?: string;
}

const PROVIDERS: ProviderName[] = ['easypost', 'shopify', 'amazon_sp_api'];

type ConnectionType = 'email' | 'merchant' | 'carrier';
type ConnectionStatus = 'Connected' | 'Needs attention' | 'Syncing' | 'Not connected';

const providerMeta: Record<ProviderName, { defaultName: string; type: ConnectionType; logo: string }> = {
  easypost: {
    defaultName: 'EasyPost',
    type: 'carrier',
    logo: 'truck',
  },
  shopify: {
    defaultName: 'Shopify',
    type: 'merchant',
    logo: 'store',
  },
  amazon_sp_api: {
    defaultName: 'Amazon Seller',
    type: 'merchant',
    logo: 'shopping-cart',
  },
};

function isProviderName(value: string): value is ProviderName {
  return PROVIDERS.includes(value as ProviderName);
}

function isAccountStatus(value: string): value is 'active' | 'paused' | 'error' {
  return value === 'active' || value === 'paused' || value === 'error';
}

function parseRefreshInterval(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 60;
  return Math.max(5, Math.round(value));
}

function normalizeObject(raw: unknown): Record<string, unknown> {
  if (!isObject(raw)) return {};
  return raw;
}

function accountScopeKey(account: Pick<IntegrationAccountRow, 'provider' | 'external_account_id'>): string {
  return `integration:${account.provider}:${account.external_account_id}`;
}

function mapConnectionStatus(status: IntegrationAccountRow['status']): ConnectionStatus {
  if (status === 'active') return 'Connected';
  if (status === 'paused') return 'Not connected';
  return 'Needs attention';
}

function pickEventTimestamp(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function sanitizeAccount(row: IntegrationAccountRow) {
  const secret = row.secret || {};
  return {
    id: row.id,
    provider: row.provider,
    external_account_id: row.external_account_id,
    display_name: row.display_name,
    status: row.status,
    config: row.config || {},
    refresh_interval_minutes: row.refresh_interval_minutes,
    last_synced_at: row.last_synced_at,
    last_error: row.last_error,
    has_secret: Object.keys(secret).length > 0,
    secret_fields: Object.keys(secret),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getAccountById(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  id: string
): Promise<IntegrationAccountRow | null> {
  const { data, error } = await admin
    .from('integration_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load integration account: ${error.message}`);
  }

  return (data as IntegrationAccountRow | null) || null;
}

async function syncConnectionMirror(
  admin: ReturnType<typeof createAdminClient>,
  account: IntegrationAccountRow
): Promise<void> {
  const meta = providerMeta[account.provider];
  const scopeKey = accountScopeKey(account);
  const displayName = account.display_name || meta.defaultName;

  const payload = {
    user_id: account.user_id,
    name: displayName,
    type: meta.type,
    logo: meta.logo,
    status: mapConnectionStatus(account.status),
    last_sync: pickEventTimestamp(account.last_synced_at) || (account.status === 'active' ? 'Just now' : null),
    data_scope: scopeKey,
  };

  const { data: existing, error: loadError } = await admin
    .from('connections')
    .select('id')
    .eq('user_id', account.user_id)
    .eq('data_scope', scopeKey)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to query connection mirror: ${loadError.message}`);
  }

  if (existing?.id) {
    const { error: updateError } = await admin
      .from('connections')
      .update(payload)
      .eq('id', existing.id)
      .eq('user_id', account.user_id);

    if (updateError) {
      throw new Error(`Failed to update connection mirror: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await admin.from('connections').insert(payload);
    if (insertError) {
      throw new Error(`Failed to create connection mirror: ${insertError.message}`);
    }
  }
}

async function deleteConnectionMirror(
  admin: ReturnType<typeof createAdminClient>,
  account: IntegrationAccountRow
): Promise<void> {
  const scopeKey = accountScopeKey(account);
  const { error } = await admin
    .from('connections')
    .delete()
    .eq('user_id', account.user_id)
    .eq('data_scope', scopeKey);

  if (error) {
    throw new Error(`Failed to delete connection mirror: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return emptyResponse(204);
  }

  const userId = await getUserIdFromAuthHeader(req);
  if (!userId) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  const admin = createAdminClient();

  try {
    if (req.method === 'GET') {
      const includeRuns = new URL(req.url).searchParams.get('include_runs') === 'true';

      const { data: accounts, error: accountError } = await admin
        .from('integration_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (accountError) {
        throw new Error(`Failed to list integration accounts: ${accountError.message}`);
      }

      let runs: unknown[] = [];
      if (includeRuns) {
        const { data, error } = await admin
          .from('integration_sync_runs')
          .select('id,integration_account_id,provider,mode,status,stats,error,started_at,finished_at')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(50);

        if (error) {
          throw new Error(`Failed to list sync runs: ${error.message}`);
        }

        runs = data || [];
      }

      return jsonResponse({
        ok: true,
        accounts: ((accounts || []) as IntegrationAccountRow[]).map(sanitizeAccount),
        runs,
      });
    }

    if (req.method === 'POST') {
      const body = await parseJsonBody<IntegrationMutationBody>(req);

      const provider = pickString(body.provider);
      if (!provider || !isProviderName(provider)) {
        return jsonResponse({ ok: false, error: 'provider is required and must be valid' }, 400);
      }

      const externalAccountId =
        pickString(body.external_account_id) || `${provider}-${crypto.randomUUID()}`;

      const displayName = pickString(body.display_name) || providerMeta[provider].defaultName;
      const statusRaw = pickString(body.status) || 'active';
      if (!isAccountStatus(statusRaw)) {
        return jsonResponse({ ok: false, error: 'status must be active, paused, or error' }, 400);
      }

      const providedConfig = body.config !== undefined ? normalizeObject(body.config) : null;
      const providedSecret = body.secret !== undefined ? normalizeObject(body.secret) : null;

      const { data: existingByKey, error: existingByKeyError } = await admin
        .from('integration_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('external_account_id', externalAccountId)
        .maybeSingle();

      if (existingByKeyError) {
        throw new Error(
          `Failed to check existing integration account: ${existingByKeyError.message}`
        );
      }

      let account: IntegrationAccountRow;

      if (existingByKey) {
        const existingAccount = existingByKey as IntegrationAccountRow;
        const { data, error } = await admin
          .from('integration_accounts')
          .update({
            display_name: displayName,
            status: statusRaw,
            refresh_interval_minutes: parseRefreshInterval(body.refresh_interval_minutes),
            config: providedConfig
              ? { ...(existingAccount.config || {}), ...providedConfig }
              : existingAccount.config || {},
            secret: providedSecret
              ? { ...(existingAccount.secret || {}), ...providedSecret }
              : existingAccount.secret || {},
          })
          .eq('id', existingAccount.id)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) {
          throw new Error(`Failed to update integration account: ${error.message}`);
        }

        account = data as IntegrationAccountRow;
      } else {
        const { data, error } = await admin
          .from('integration_accounts')
          .insert({
            user_id: userId,
            provider,
            external_account_id: externalAccountId,
            display_name: displayName,
            status: statusRaw,
            refresh_interval_minutes: parseRefreshInterval(body.refresh_interval_minutes),
            config: providedConfig || {},
            secret: providedSecret || {},
          })
          .select('*')
          .single();

        if (error) {
          throw new Error(`Failed to create integration account: ${error.message}`);
        }

        account = data as IntegrationAccountRow;
      }

      await syncConnectionMirror(admin, account);

      return jsonResponse({ ok: true, account: sanitizeAccount(account) });
    }

    if (req.method === 'PATCH') {
      const body = await parseJsonBody<IntegrationMutationBody>(req);
      const id = pickString(body.id);
      if (!id) {
        return jsonResponse({ ok: false, error: 'id is required' }, 400);
      }

      const existing = await getAccountById(admin, userId, id);
      if (!existing) {
        return jsonResponse({ ok: false, error: 'Account not found' }, 404);
      }

      const updates: Record<string, unknown> = {};

      const displayName = pickString(body.display_name);
      if (displayName) updates.display_name = displayName;

      const externalAccountId = pickString(body.external_account_id);
      if (externalAccountId) updates.external_account_id = externalAccountId;

      const statusRaw = pickString(body.status);
      if (statusRaw) {
        if (!isAccountStatus(statusRaw)) {
          return jsonResponse({ ok: false, error: 'status must be active, paused, or error' }, 400);
        }
        updates.status = statusRaw;
      }

      if (body.refresh_interval_minutes !== undefined) {
        updates.refresh_interval_minutes = parseRefreshInterval(body.refresh_interval_minutes);
      }

      if (body.config !== undefined) {
        updates.config = {
          ...(existing.config || {}),
          ...normalizeObject(body.config),
        };
      }

      if (body.secret !== undefined) {
        updates.secret = {
          ...(existing.secret || {}),
          ...normalizeObject(body.secret),
        };
      }

      if (Object.keys(updates).length === 0) {
        return jsonResponse({ ok: false, error: 'No updates provided' }, 400);
      }

      const { data, error } = await admin
        .from('integration_accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to update integration account: ${error.message}`);
      }

      const account = data as IntegrationAccountRow;
      await syncConnectionMirror(admin, account);

      return jsonResponse({ ok: true, account: sanitizeAccount(account) });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const queryId = pickString(url.searchParams.get('id'));

      let bodyId: string | null = null;
      if (!queryId) {
        try {
          const body = await parseJsonBody<IntegrationMutationBody>(req);
          bodyId = pickString(body.id);
        } catch {
          bodyId = null;
        }
      }

      const id = queryId || bodyId;
      if (!id) {
        return jsonResponse({ ok: false, error: 'id is required' }, 400);
      }

      const existing = await getAccountById(admin, userId, id);
      if (!existing) {
        return jsonResponse({ ok: false, error: 'Account not found' }, 404);
      }

      const { error } = await admin
        .from('integration_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to delete integration account: ${error.message}`);
      }

      await deleteConnectionMirror(admin, existing);

      return jsonResponse({ ok: true, deleted_id: id });
    }

    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('manage-integrations error', error);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
