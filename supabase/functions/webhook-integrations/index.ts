import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  emptyResponse,
  isObject,
  jsonResponse,
  pickString,
} from '../_shared/http.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { IntegrationAccount, ProviderName } from '../_shared/types.ts';

const PROVIDERS: ProviderName[] = ['easypost', 'shopify', 'amazon_sp_api'];

function isProviderName(value: string): value is ProviderName {
  return PROVIDERS.includes(value as ProviderName);
}

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function stripSignaturePrefix(value: string): string {
  return value
    .trim()
    .replace(/^sha256=/i, '')
    .replace(/^hmac-sha256=/i, '')
    .trim();
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function hmacSha256(secret: string, payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return new Uint8Array(signature);
}

function detectProvider(req: Request): ProviderName | null {
  const url = new URL(req.url);
  const providerFromQuery = pickString(url.searchParams.get('provider'));
  if (providerFromQuery && isProviderName(providerFromQuery)) return providerFromQuery;

  const providerFromHeader = pickString(req.headers.get('x-provider'));
  if (providerFromHeader && isProviderName(providerFromHeader)) return providerFromHeader;

  if (req.headers.get('x-shopify-topic') || req.headers.get('x-shopify-hmac-sha256')) {
    return 'shopify';
  }

  if (req.headers.get('x-amz-sns-message-type')) {
    return 'amazon_sp_api';
  }

  if (req.headers.get('x-hmac-signature') || req.headers.get('x-easypost-signature')) {
    return 'easypost';
  }

  return null;
}

function parseJsonPayload(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (isObject(parsed)) return parsed;
    return { payload: parsed };
  } catch {
    return { raw_body: raw };
  }
}

function deriveEventId(
  provider: ProviderName,
  req: Request,
  payload: Record<string, unknown>
): string {
  const candidates = [
    req.headers.get('x-shopify-webhook-id'),
    req.headers.get('x-event-id'),
    pickString(payload.id),
    pickString(payload.event_id),
    pickString(payload.MessageId),
    pickString((payload.NotificationMetadata as Record<string, unknown>)?.NotificationId),
  ];

  for (const candidate of candidates) {
    const normalized = pickString(candidate);
    if (normalized) return normalized;
  }

  return `${provider}:${crypto.randomUUID()}`;
}

function getSecretValue(account: IntegrationAccount | null, key: string): string | null {
  if (!account || !isObject(account.secret)) return null;
  return pickString(account.secret[key]) || null;
}

async function findIntegrationAccount(
  admin: ReturnType<typeof createAdminClient>,
  provider: ProviderName,
  req: Request,
  payload: Record<string, unknown>
): Promise<IntegrationAccount | null> {
  const url = new URL(req.url);
  const accountId = pickString(url.searchParams.get('account_id'));
  if (accountId) {
    const { data, error } = await admin
      .from('integration_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('provider', provider)
      .maybeSingle();

    if (error) throw new Error(`Failed to load integration account by id: ${error.message}`);
    return (data as IntegrationAccount | null) || null;
  }

  if (provider === 'shopify') {
    const shopDomain =
      pickString(req.headers.get('x-shopify-shop-domain')) ||
      pickString(payload.shop_domain) ||
      pickString(payload.shop);

    if (!shopDomain) return null;

    const { data, error } = await admin
      .from('integration_accounts')
      .select('*')
      .eq('provider', 'shopify')
      .eq('status', 'active')
      .filter('secret->>store_domain', 'eq', shopDomain)
      .maybeSingle();

    if (error) throw new Error(`Failed to load Shopify integration account: ${error.message}`);
    return (data as IntegrationAccount | null) || null;
  }

  if (provider === 'amazon_sp_api') {
    const metadata = isObject(payload.NotificationMetadata)
      ? payload.NotificationMetadata
      : {};

    const sellerId =
      pickString(metadata.SellerId) ||
      pickString(payload.seller_id) ||
      pickString(payload.SellerId);

    if (!sellerId) return null;

    const { data, error } = await admin
      .from('integration_accounts')
      .select('*')
      .eq('provider', 'amazon_sp_api')
      .eq('external_account_id', sellerId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw new Error(`Failed to load Amazon integration account: ${error.message}`);
    return (data as IntegrationAccount | null) || null;
  }

  const externalAccountId =
    pickString(new URL(req.url).searchParams.get('external_account_id')) ||
    pickString(payload.external_account_id) ||
    pickString(payload.account_id);

  if (externalAccountId) {
    const { data, error } = await admin
      .from('integration_accounts')
      .select('*')
      .eq('provider', provider)
      .eq('external_account_id', externalAccountId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw new Error(`Failed to load ${provider} integration account: ${error.message}`);
    return (data as IntegrationAccount | null) || null;
  }

  const providedWebhookSecret =
    pickString(req.headers.get('x-webhook-secret')) ||
    pickString(new URL(req.url).searchParams.get('webhook_secret'));

  if (providedWebhookSecret) {
    const { data, error } = await admin
      .from('integration_accounts')
      .select('*')
      .eq('provider', provider)
      .eq('status', 'active')
      .filter('secret->>webhook_secret', 'eq', providedWebhookSecret)
      .maybeSingle();

    if (error) throw new Error(`Failed to load ${provider} integration account by webhook secret: ${error.message}`);
    return (data as IntegrationAccount | null) || null;
  }

  return null;
}

async function verifyWebhookSignature(
  provider: ProviderName,
  req: Request,
  rawBody: string,
  account: IntegrationAccount | null
): Promise<{ ok: boolean; reason?: string }> {
  const webhookSecret = getSecretValue(account, 'webhook_secret');

  if (provider === 'shopify') {
    if (!account) return { ok: false, reason: 'No matching Shopify integration account' };
    if (!webhookSecret) {
      return { ok: false, reason: 'Shopify account missing secret.webhook_secret' };
    }

    const received = stripSignaturePrefix(req.headers.get('x-shopify-hmac-sha256') || '');
    if (!received) {
      return { ok: false, reason: 'Missing x-shopify-hmac-sha256 header' };
    }

    const signatureBytes = await hmacSha256(webhookSecret, rawBody);
    const expected = toBase64(signatureBytes);
    if (!secureCompare(received, expected)) {
      return { ok: false, reason: 'Shopify HMAC signature mismatch' };
    }

    return { ok: true };
  }

  if (provider === 'easypost') {
    if (!account) return { ok: false, reason: 'No matching EasyPost integration account' };
    if (!webhookSecret) {
      return { ok: false, reason: 'EasyPost account missing secret.webhook_secret' };
    }

    const received = stripSignaturePrefix(
      req.headers.get('x-hmac-signature') || req.headers.get('x-easypost-signature') || ''
    );
    if (!received) {
      return { ok: false, reason: 'Missing EasyPost signature header' };
    }

    const signatureBytes = await hmacSha256(webhookSecret, rawBody);
    const expectedHex = toHex(signatureBytes);
    const expectedBase64 = toBase64(signatureBytes);

    if (!secureCompare(received, expectedHex) && !secureCompare(received, expectedBase64)) {
      return { ok: false, reason: 'EasyPost signature mismatch' };
    }

    return { ok: true };
  }

  if (!account) {
    return { ok: false, reason: 'No matching Amazon integration account' };
  }

  if (!webhookSecret) {
    return { ok: true };
  }

  const receivedSecret =
    pickString(req.headers.get('x-webhook-secret')) ||
    pickString(new URL(req.url).searchParams.get('webhook_secret'));

  if (!receivedSecret) {
    return { ok: false, reason: 'Missing x-webhook-secret for Amazon webhook' };
  }

  if (!secureCompare(receivedSecret, webhookSecret)) {
    return { ok: false, reason: 'Amazon webhook secret mismatch' };
  }

  return { ok: true };
}

async function triggerWebhookSync(
  provider: ProviderName,
  accountId: string,
  eventId: string,
  topic: string | null
): Promise<{ ok: boolean; payload?: Record<string, unknown>; error?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const integrationSyncToken = Deno.env.get('INTEGRATION_SYNC_TOKEN');

  if (!supabaseUrl) {
    return { ok: false, error: 'Missing SUPABASE_URL environment variable' };
  }
  if (!serviceRoleKey) {
    return { ok: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceRoleKey}`,
  };
  if (integrationSyncToken) {
    headers['x-integration-sync-token'] = integrationSyncToken;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/sync-integrations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      mode: 'webhook',
      account_id: accountId,
      trigger_payload: {
        source: 'webhook',
        provider,
        event_id: eventId,
        webhook_topic: topic,
      },
    }),
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    return {
      ok: false,
      payload,
      error: `sync-integrations returned ${response.status}`,
    };
  }

  const ok = payload.ok === true;
  return {
    ok,
    payload,
    error: ok ? undefined : 'sync-integrations completed with errors',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return emptyResponse(204);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  const provider = detectProvider(req);
  if (!provider) {
    return jsonResponse({ ok: false, error: 'Unable to determine provider' }, 400);
  }

  const rawBody = await req.text();
  const payload = parseJsonPayload(rawBody);
  const eventId = deriveEventId(provider, req, payload);

  try {
    const admin = createAdminClient();
    const account = await findIntegrationAccount(admin, provider, req, payload);

    const { data: insertedEvent, error: insertError } = await admin
      .from('integration_webhook_events')
      .insert({
        provider,
        event_id: eventId,
        integration_account_id: account?.id || null,
        payload,
      })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return jsonResponse({ ok: true, duplicate: true, provider, event_id: eventId });
      }
      throw new Error(`Failed to store webhook event: ${insertError.message}`);
    }

    const eventRowId = insertedEvent?.id as number | undefined;

    const signatureResult = await verifyWebhookSignature(provider, req, rawBody, account);
    if (!signatureResult.ok) {
      if (eventRowId) {
        await admin
          .from('integration_webhook_events')
          .update({ process_error: signatureResult.reason || 'Signature verification failed' })
          .eq('id', eventRowId);
      }

      return jsonResponse(
        {
          ok: false,
          provider,
          event_id: eventId,
          error: signatureResult.reason || 'Signature verification failed',
        },
        401
      );
    }

    if (!account) {
      if (eventRowId) {
        await admin
          .from('integration_webhook_events')
          .update({
            processed_at: new Date().toISOString(),
            process_error: 'No matching integration account',
          })
          .eq('id', eventRowId);
      }

      return jsonResponse({
        ok: true,
        provider,
        event_id: eventId,
        skipped: true,
        reason: 'No matching integration account',
      });
    }

    const syncResult = await triggerWebhookSync(
      provider,
      account.id,
      eventId,
      req.headers.get('x-shopify-topic')
    );

    if (eventRowId) {
      await admin
        .from('integration_webhook_events')
        .update({
          processed_at: new Date().toISOString(),
          process_error: syncResult.ok ? null : syncResult.error || 'Sync run completed with errors',
        })
        .eq('id', eventRowId);
    }

    return jsonResponse({
      ok: syncResult.ok,
      provider,
      event_id: eventId,
      account_id: account.id,
      sync: syncResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('webhook-integrations error', error);
    return jsonResponse({ ok: false, provider, event_id: eventId, error: message }, 500);
  }
});
