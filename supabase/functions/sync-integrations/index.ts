import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  emptyResponse,
  isObject,
  jsonResponse,
  parseOptionalJsonBody,
  pickString,
} from '../_shared/http.ts';
import { createAdminClient, getUserIdFromAuthHeader } from '../_shared/supabase.ts';
import { runIntegrationSync } from '../_shared/sync-runner.ts';
import { ProviderName, SyncMode } from '../_shared/types.ts';

interface SyncRequestBody {
  mode?: unknown;
  provider?: unknown;
  account_id?: unknown;
  user_ids?: unknown;
  trigger_payload?: unknown;
}

const PROVIDERS: ProviderName[] = ['easypost', 'shopify', 'amazon_sp_api'];
const MODES: SyncMode[] = ['manual', 'open', 'scheduled', 'webhook'];

function isProviderName(value: string): value is ProviderName {
  return PROVIDERS.includes(value as ProviderName);
}

function isSyncMode(value: string): value is SyncMode {
  return MODES.includes(value as SyncMode);
}

function parseUserIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => pickString(value))
    .filter((value): value is string => Boolean(value));
}

function parseTriggerPayload(raw: unknown): Record<string, unknown> {
  if (!isObject(raw)) return {};
  return raw;
}

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function getProvidedSyncToken(req: Request): string {
  const url = new URL(req.url);
  return req.headers.get('x-integration-sync-token') || url.searchParams.get('token') || '';
}

async function verifyInternalRequest(
  req: Request,
  admin: ReturnType<typeof createAdminClient>
): Promise<boolean> {
  const providedToken = getProvidedSyncToken(req);

  const expectedToken = Deno.env.get('INTEGRATION_SYNC_TOKEN');
  if (expectedToken && providedToken.length > 0 && secureCompare(providedToken, expectedToken)) {
    return true;
  }

  if (providedToken) {
    try {
      const { data, error } = await admin
        .from('internal_scheduler_tokens')
        .select('token')
        .eq('name', 'sync-integrations-hourly')
        .eq('enabled', true)
        .maybeSingle();

      if (!error) {
        const dbToken = pickString((data as { token?: unknown } | null)?.token) || '';
        if (dbToken && secureCompare(providedToken, dbToken)) {
          return true;
        }
      }
    } catch (error) {
      console.warn('Failed to validate internal scheduler token:', error);
    }
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('authorization') || '';
  if (serviceRoleKey && authorization.length > 0) {
    if (secureCompare(authorization, serviceRoleKey)) return true;
    if (secureCompare(authorization, `Bearer ${serviceRoleKey}`)) return true;
  }

  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return emptyResponse(204);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  const admin = createAdminClient();
  const authUserId = await getUserIdFromAuthHeader(req);
  const isInternal = await verifyInternalRequest(req, admin);

  if (!authUserId && !isInternal) {
    return jsonResponse(
      {
        ok: false,
        error:
          'Unauthorized. Provide a valid user Authorization header or x-integration-sync-token.',
      },
      401
    );
  }

  let body: SyncRequestBody = {};
  try {
    const parsed = await parseOptionalJsonBody<SyncRequestBody>(req);
    body = parsed || {};
  } catch (error) {
    return jsonResponse(
      { ok: false, error: `Invalid JSON body: ${String(error)}` },
      400
    );
  }

  const requestedMode = pickString(body.mode) || (authUserId ? 'manual' : 'scheduled');
  if (!isSyncMode(requestedMode)) {
    return jsonResponse({ ok: false, error: 'Invalid mode' }, 400);
  }
  if (authUserId && requestedMode === 'webhook') {
    return jsonResponse({ ok: false, error: 'webhook mode is internal-only' }, 403);
  }

  const providerRaw = pickString(body.provider);
  if (providerRaw && !isProviderName(providerRaw)) {
    return jsonResponse({ ok: false, error: 'Invalid provider' }, 400);
  }

  const accountId = pickString(body.account_id) || undefined;
  const internalUserIds = parseUserIds(body.user_ids);
  const userIds = authUserId ? [authUserId] : internalUserIds;

  const triggerPayload = {
    source: authUserId ? 'app' : 'internal',
    requested_at: new Date().toISOString(),
    requested_mode: requestedMode,
    ...parseTriggerPayload(body.trigger_payload),
  };

  try {
    const result = await runIntegrationSync(admin, {
      mode: requestedMode,
      provider: providerRaw,
      accountId,
      userIds,
      triggerPayload,
    });

    return jsonResponse({
      ok: result.ok,
      mode: requestedMode,
      accounts_processed: result.accounts_processed,
      results: result.results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('sync-integrations error', error);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
