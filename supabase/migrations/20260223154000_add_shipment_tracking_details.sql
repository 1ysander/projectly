-- Add richer tracking details to shipments for automatic carrier events

alter table public.shipments
add column if not exists tracking_events jsonb not null default '[]'::jsonb;

alter table public.shipments
add column if not exists return_tracking_number text;

alter table public.shipments
add column if not exists return_to_city text;

alter table public.shipments
add column if not exists return_to_state text;
