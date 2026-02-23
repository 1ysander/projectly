import { supabase, supabaseUrl } from './supabase';

export type ProviderName = 'easypost' | 'shopify' | 'amazon_sp_api';
export type IntegrationAccountStatus = 'active' | 'paused' | 'error';

export interface IntegrationAccount {
  id: string;
  provider: ProviderName;
  external_account_id: string;
  display_name: string | null;
  status: IntegrationAccountStatus;
  config: Record<string, unknown>;
  refresh_interval_minutes: number;
  last_synced_at: string | null;
  last_error: string | null;
  has_secret: boolean;
  secret_fields: string[];
  created_at?: string;
  updated_at?: string;
}

export interface IntegrationSyncRun {
  id: number | string;
  integration_account_id: string | null;
  provider: ProviderName;
  mode: 'manual' | 'open' | 'scheduled' | 'webhook';
  status: 'started' | 'success' | 'error';
  stats: Record<string, unknown>;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

interface ManageIntegrationsListResponse {
  ok: boolean;
  accounts?: IntegrationAccount[];
  runs?: IntegrationSyncRun[];
  error?: string;
}

interface ManageIntegrationsAccountResponse {
  ok: boolean;
  account?: IntegrationAccount;
  error?: string;
}

interface ManageIntegrationsDeleteResponse {
  ok: boolean;
  deleted_id?: string;
  error?: string;
}

interface SyncIntegrationsResponse {
  ok: boolean;
  error?: string;
}

export interface UpsertIntegrationInput {
  provider: ProviderName;
  external_account_id?: string;
  display_name?: string;
  status?: IntegrationAccountStatus;
  refresh_interval_minutes?: number;
  config?: Record<string, unknown>;
  secret?: Record<string, unknown>;
}

export interface UpdateIntegrationInput {
  id: string;
  external_account_id?: string;
  display_name?: string;
  status?: IntegrationAccountStatus;
  refresh_interval_minutes?: number;
  config?: Record<string, unknown>;
  secret?: Record<string, unknown>;
}

const FUNCTIONS_BASE_URL = `${supabaseUrl}/functions/v1`;

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const errorValue = (payload as { error?: unknown }).error;
    if (typeof errorValue === 'string' && errorValue.trim().length > 0) {
      return errorValue;
    }
  }
  return fallback;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || 'Failed to get auth session');
  }

  if (!session?.access_token) {
    throw new Error('You must be signed in to manage integrations');
  }

  return session.access_token;
}

async function callManageIntegrations<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  options?: { query?: string; body?: unknown }
): Promise<T> {
  const accessToken = await getAccessToken();
  const query = options?.query ? `?${options.query}` : '';

  const response = await fetch(`${FUNCTIONS_BASE_URL}/manage-integrations${query}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, `manage-integrations failed (${response.status})`));
  }

  if (payload && typeof payload === 'object' && 'ok' in payload && payload.ok === false) {
    throw new Error(extractErrorMessage(payload, 'manage-integrations returned an error'));
  }

  return payload as T;
}

export async function listIntegrationAccounts(includeRuns = true): Promise<{
  accounts: IntegrationAccount[];
  runs: IntegrationSyncRun[];
}> {
  const payload = await callManageIntegrations<ManageIntegrationsListResponse>('GET', {
    query: `include_runs=${includeRuns ? 'true' : 'false'}`,
  });

  return {
    accounts: payload.accounts || [],
    runs: payload.runs || [],
  };
}

export async function upsertIntegrationAccount(input: UpsertIntegrationInput): Promise<IntegrationAccount> {
  const payload = await callManageIntegrations<ManageIntegrationsAccountResponse>('POST', {
    body: input,
  });

  if (!payload.account) {
    throw new Error('manage-integrations response did not include an account');
  }

  return payload.account;
}

export async function updateIntegrationAccount(input: UpdateIntegrationInput): Promise<IntegrationAccount> {
  const payload = await callManageIntegrations<ManageIntegrationsAccountResponse>('PATCH', {
    body: input,
  });

  if (!payload.account) {
    throw new Error('manage-integrations response did not include an account');
  }

  return payload.account;
}

export async function deleteIntegrationAccount(id: string): Promise<void> {
  const payload = await callManageIntegrations<ManageIntegrationsDeleteResponse>('DELETE', {
    body: { id },
  });

  if (!payload.ok) {
    throw new Error(extractErrorMessage(payload, 'Failed to delete integration account'));
  }
}

export async function syncIntegrations(options?: {
  accountId?: string;
  provider?: ProviderName;
  mode?: 'manual' | 'open' | 'scheduled' | 'webhook';
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke<SyncIntegrationsResponse>(
    'sync-integrations',
    {
      body: {
        mode: options?.mode || 'manual',
        account_id: options?.accountId,
        provider: options?.provider,
      },
    }
  );

  if (error) {
    throw new Error(error.message || 'Failed to sync integrations');
  }

  if (data && data.ok === false) {
    throw new Error(data.error || 'Integration sync returned an error');
  }
}
