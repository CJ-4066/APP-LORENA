create table if not exists community_chat_moderations (
  user_id text primary key references users(id) on delete cascade,
  muted_until timestamptz,
  banned_until timestamptz,
  reason text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists community_chat_moderations_muted_until_idx
  on community_chat_moderations (muted_until);

create index if not exists community_chat_moderations_banned_until_idx
  on community_chat_moderations (banned_until);

create table if not exists support_tickets (
  id text primary key,
  ticket_number text not null unique,
  user_id text not null references users(id) on delete cascade,
  subject text not null,
  category text not null default 'general',
  status text not null default 'open',
  priority text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx
  on support_tickets (user_id, updated_at desc);

create index if not exists support_tickets_status_idx
  on support_tickets (status, updated_at desc);

create table if not exists support_ticket_messages (
  id text primary key,
  ticket_id text not null references support_tickets(id) on delete cascade,
  author_type text not null,
  author_id text not null,
  author_name text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_id_idx
  on support_ticket_messages (ticket_id, created_at);

create table if not exists push_engagement_logs (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  template_id text not null,
  title text not null,
  body text not null,
  audience text not null,
  deep_link text not null default '',
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create index if not exists push_engagement_logs_user_id_idx
  on push_engagement_logs (user_id, created_at desc);
