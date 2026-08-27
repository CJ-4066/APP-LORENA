create table if not exists in_app_notifications (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  deep_link text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists in_app_notifications_user_id_idx
  on in_app_notifications (user_id, created_at desc);
