export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-integration-sync-token, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-webhook-id, x-hmac-signature, x-easypost-signature, x-webhook-secret',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders,
      ...(extraHeaders || {}),
    },
  });
}

export function emptyResponse(status = 204): Response {
  return new Response(null, {
    status,
    headers: {
      ...corsHeaders,
    },
  });
}

export async function parseJsonBody<T>(req: Request): Promise<T> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Expected application/json body');
  }
  return (await req.json()) as T;
}

export async function parseOptionalJsonBody<T>(req: Request): Promise<T | null> {
  const contentType = req.headers.get('content-type') || '';
  const hasJsonContentType = contentType.toLowerCase().includes('application/json');
  if (!hasJsonContentType) return null;

  const bodyText = await req.text();
  if (!bodyText.trim()) return null;

  return JSON.parse(bodyText) as T;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toIsoOrNull(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function pickString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
