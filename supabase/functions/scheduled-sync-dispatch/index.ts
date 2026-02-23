import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8?target=deno';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is required');
}
if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-integration-sync-token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  });
}

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function verifyInternalSchedulerToken(req: Request): Promise<boolean> {
  const providedToken = req.headers.get('x-integration-sync-token') || '';
  if (!providedToken) return false;

  const { data, error } = await admin
    .from('internal_scheduler_tokens')
    .select('token')
    .eq('name', 'sync-integrations-hourly')
    .eq('enabled', true)
    .maybeSingle();

  if (error || !data?.token) {
    return false;
  }

  return secureCompare(providedToken, String(data.token));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  const isAuthorized = await verifyInternalSchedulerToken(req);
  if (!isAuthorized) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-integrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        mode: 'scheduled',
      }),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return jsonResponse(
      {
        ok: response.ok,
        status: response.status,
        payload,
      },
      response.ok ? 200 : 500
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
