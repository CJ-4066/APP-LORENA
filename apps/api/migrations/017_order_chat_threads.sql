alter table chat_threads
  add column if not exists order_id text;

create index if not exists chat_threads_order_id_idx
  on chat_threads (order_id);
