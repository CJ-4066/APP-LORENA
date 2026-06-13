alter table badges
  add column if not exists path_id text not null default 'despertar_path',
  add column if not exists path_order integer not null default 1,
  add column if not exists step_index integer not null default 1,
  add column if not exists step_title text not null default 'Activación inicial',
  add column if not exists step_description text not null default '',
  add column if not exists prerequisite_badge_ids jsonb not null default '[]'::jsonb,
  add column if not exists locked_reason text not null default '',
  add column if not exists is_path_visible boolean not null default true,
  add column if not exists is_condition_hidden boolean not null default false;

create index if not exists badges_path_order_idx
  on badges (path_order, step_index, is_active);
