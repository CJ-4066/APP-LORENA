create table if not exists badges (
  id text primary key,
  name text not null,
  description text not null,
  category text not null,
  rarity text not null,
  type text not null,
  icon_url text not null default '',
  is_secret boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists badges_category_idx
  on badges (category, rarity, is_active);

create table if not exists user_badges (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  badge_id text not null references badges(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  source text not null default 'system',
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists user_badges_user_id_badge_id_uidx
  on user_badges (user_id, badge_id);

create index if not exists user_badges_user_id_unlocked_at_idx
  on user_badges (user_id, unlocked_at desc);

create table if not exists badge_rules (
  id text primary key,
  badge_id text not null references badges(id) on delete cascade,
  rule_key text not null,
  operator text not null,
  value text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists badge_rules_badge_id_idx
  on badge_rules (badge_id, is_active);

create table if not exists user_badge_metrics (
  user_id text not null references users(id) on delete cascade,
  metric_key text not null,
  metric_value integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, metric_key)
);

create index if not exists user_badge_metrics_updated_at_idx
  on user_badge_metrics (updated_at desc);
