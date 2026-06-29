alter table community_chat_messages
  add column if not exists author_user_id text;

create index if not exists community_chat_messages_author_user_id_idx
  on community_chat_messages (author_user_id);
