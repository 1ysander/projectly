-- Add editable item name to shipments

alter table public.shipments
add column if not exists item_name text;
