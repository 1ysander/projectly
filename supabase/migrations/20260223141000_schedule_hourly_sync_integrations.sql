-- Schedule hourly provider sync via pg_cron + pg_net
-- Requires Vault secret: service_role_key

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

create or replace function public.schedule_sync_integrations_hourly()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  job_name constant text := 'sync-integrations-hourly';
  project_url text;
  service_role_key text;
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

  select decrypted_secret
  into service_role_key
  from vault.decrypted_secrets
  where name in ('service_role_key', 'shippin_service_role_key')
  order by case when name = 'service_role_key' then 0 else 1 end, created_at desc
  limit 1;

  if service_role_key is null or service_role_key = '' then
    raise notice 'Skipping % cron schedule: missing Vault secret service_role_key.', job_name;
    return;
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
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name in ('service_role_key', 'shippin_service_role_key')
            order by case when name = 'service_role_key' then 0 else 1 end, created_at desc
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
