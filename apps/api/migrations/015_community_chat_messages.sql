create table if not exists community_chat_messages (
  id text primary key,
  author_name text not null,
  author_role text not null default 'member',
  body text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists community_chat_messages_created_at_idx
  on community_chat_messages (created_at desc);
