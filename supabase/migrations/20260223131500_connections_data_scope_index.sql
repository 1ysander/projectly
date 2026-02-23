-- Support integration-to-connection mirroring from edge functions

create unique index if not exists connections_user_data_scope_uidx
  on public.connections (user_id, data_scope)
  where data_scope is not null;
