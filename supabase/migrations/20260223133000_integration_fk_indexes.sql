-- Performance indexes for integration foreign keys

create index if not exists integration_sync_runs_account_id_idx
  on public.integration_sync_runs (integration_account_id);

create index if not exists integration_webhook_events_account_id_idx
  on public.integration_webhook_events (integration_account_id);
