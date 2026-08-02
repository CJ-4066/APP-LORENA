create table if not exists admin_users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  name text not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz null
);

create index if not exists admin_users_role_idx on admin_users (role);
create index if not exists admin_users_is_active_idx on admin_users (is_active);

create table if not exists admin_sessions (
  token_hash text primary key,
  admin_user_id text not null references admin_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists admin_sessions_admin_user_id_idx on admin_sessions (admin_user_id);
create index if not exists admin_sessions_expires_at_idx on admin_sessions (expires_at);
