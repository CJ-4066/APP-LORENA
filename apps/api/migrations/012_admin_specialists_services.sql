create table if not exists specialist_overrides (
  specialist_id text primary key,
  public_name text,
  headline text,
  specialties jsonb not null default '[]'::jsonb,
  bio text,
  avatar_url text,
  is_active boolean not null default true,
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table service_offer_overrides
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists description text,
  add column if not exists delivery_modes jsonb not null default '[]'::jsonb,
  add column if not exists premium_included boolean not null default false,
  add column if not exists specialist_ids jsonb not null default '[]'::jsonb,
  add column if not exists is_active boolean not null default true,
  add column if not exists is_visible boolean not null default true;

create index if not exists specialist_overrides_public_idx
  on specialist_overrides (is_public, is_active);
