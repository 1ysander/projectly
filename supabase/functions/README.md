# Integration Edge Functions

This folder contains provider integration wiring for Shippin tracking/returns sync.

## Functions

- `sync-integrations`
  - Triggers provider sync runs and writes updates into `shipments` + `returns`.
  - Used by the app on manual refresh, app-open refresh, and scheduled refresh.

- `manage-integrations`
  - CRUD API for `integration_accounts`.
  - Mirrors integration account status into the existing `connections` table.

- `webhook-integrations`
  - Receives provider webhooks, deduplicates events in `integration_webhook_events`,
    and triggers targeted sync runs.

## Required secrets (Edge Function env vars)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `INTEGRATION_SYNC_TOKEN`
  - Shared token for internal/scheduled sync requests to `sync-integrations`.
  - Optional when internal callers can send `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`.

## Provider account secret/config payloads

### EasyPost (`provider = easypost`)

`secret` fields:
- `api_key` (required)
- `webhook_secret` (required for webhook signature verification)

`config` fields:
- `carriers` (optional array, e.g. `["ups", "usps"]`)

### Shopify (`provider = shopify`)

`secret` fields:
- `store_domain` (required, e.g. `my-store.myshopify.com`)
- `admin_access_token` (required)
- `webhook_secret` (required for webhook signature verification)

`config` fields:
- `api_version` (optional, default `2025-01`)
- `lookback_hours` (optional)
- `max_pages` (optional)

### Amazon SP-API (`provider = amazon_sp_api`)

`secret` fields:
- `lwa_client_id` (required)
- `lwa_client_secret` (required)
- `refresh_token` (required)
- `aws_access_key_id` (required)
- `aws_secret_access_key` (required)
- `aws_session_token` (optional)
- `webhook_secret` (optional shared secret for webhook endpoint)

`config` fields:
- `region` (`na`, `eu`, `fe`)
- `marketplace_ids` (required array)
- `lookback_hours` (optional)
- `max_pages` (optional)

## Scheduling

Recommended hourly schedule:

1. Apply migrations `20260223141000_schedule_hourly_sync_integrations.sql` and
   `20260223142000_internal_scheduler_token_auth.sql`.

2. Run the scheduler function:

```sql
select public.schedule_sync_integrations_hourly();
```

3. The cron job calls `scheduled-sync-dispatch` hourly with:
   - `x-integration-sync-token` sourced from `public.internal_scheduler_tokens`
   - Empty JSON body (`{}`)

```json
{}
```

`scheduled-sync-dispatch` then securely calls `sync-integrations` with service-role auth.
The sync runner checks each account's `refresh_interval_minutes` and only syncs accounts that are due.
