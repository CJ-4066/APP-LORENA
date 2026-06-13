create table if not exists media_assets (
  id text primary key,
  file_name text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null unique,
  public_url text not null,
  category text not null,
  entity_type text,
  entity_id text,
  uploaded_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists media_assets_category_idx
  on media_assets (category, created_at desc);

create index if not exists media_assets_entity_idx
  on media_assets (entity_type, entity_id, created_at desc);

