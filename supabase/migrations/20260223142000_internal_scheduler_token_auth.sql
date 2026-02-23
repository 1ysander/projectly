-- Add database-managed internal token auth for scheduled sync job

create extension if not exists pgcrypto;

create table if not exists public.internal_scheduler_tokens (
  name text primary key,
  token text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.internal_scheduler_tokens enable row level security;

drop policy if exists internal_scheduler_tokens_no_direct_access on public.internal_scheduler_tokens;
create policy internal_scheduler_tokens_no_direct_access
on public.internal_scheduler_tokens
for all
to authenticated, anon
using (false)
with check (false);

drop trigger if exists trg_internal_scheduler_tokens_updated_at on public.internal_scheduler_tokens;
create trigger trg_internal_scheduler_tokens_updated_at
before update on public.internal_scheduler_tokens
for each row execute function public.set_updated_at();

insert into public.internal_scheduler_tokens (name, token, enabled)
values ('sync-integrations-hourly', encode(gen_random_bytes(32), 'hex'), true)
on conflict (name) do update
set enabled = true;

create or replace function public.schedule_sync_integrations_hourly()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  job_name constant text := 'sync-integrations-hourly';
  project_url text;
  sync_token text;
  command_sql text;
begin
  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name in ('project_url', 'shippin_project_url')
  order by case when name = 'project_url' then 0 else 1 end, created_at desc
  limit 1;

  if project_url is null or project_url = '' then
    project_url := 'https://sehrjdjnwxaiechsnbfa.supabase.co';
    perform vault.create_secret(
      project_url,
      'project_url',
      'Supabase project URL used by sync-integrations hourly cron'
    );
  end if;

  select token
  into sync_token
  from public.internal_scheduler_tokens
  where name = job_name
    and enabled = true
  limit 1;

  if sync_token is null or sync_token = '' then
    insert into public.internal_scheduler_tokens (name, token, enabled)
    values (job_name, encode(gen_random_bytes(32), 'hex'), true)
    on conflict (name) do update
    set token = excluded.token,
        enabled = true;
  end if;

  if exists (select 1 from cron.job where jobname = job_name) then
    perform cron.unschedule(job_name);
  end if;

  command_sql := $cmd$
    select
      net.http_post(
        url := (select decrypted_secret
                from vault.decrypted_secrets
                where name in ('project_url', 'shippin_project_url')
                order by case when name = 'project_url' then 0 else 1 end, created_at desc
                limit 1) || '/functions/v1/sync-integrations',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-integration-sync-token', (
            select token
            from public.internal_scheduler_tokens
            where name = 'sync-integrations-hourly'
              and enabled = true
            limit 1
          )
        ),
        body := '{"mode":"scheduled"}'::jsonb
      ) as request_id;
  $cmd$;

  perform cron.schedule(job_name, '0 * * * *', command_sql);
end;
$$;

select public.schedule_sync_integrations_hourly();
