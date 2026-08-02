create table if not exists course_catalog (
  course_id text primary key,
  title text not null,
  subtitle text not null default '',
  category text not null default 'General',
  level text not null default 'Inicial',
  premium boolean not null default false,
  featured boolean not null default false,
  removable boolean not null default true,
  estimated_hours numeric not null default 0,
  module_count integer not null default 0,
  lesson_count integer not null default 0,
  progress_percent integer not null default 0,
  streak_days integer not null default 0,
  hook text not null default '',
  description text not null default '',
  outcomes jsonb not null default '[]'::jsonb,
  cover_image_url text,
  status text not null default 'draft',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_modules (
  module_id text primary key,
  course_id text not null references course_catalog (course_id) on delete cascade,
  title text not null,
  summary text not null default '',
  duration_minutes integer not null default 0,
  order_index integer not null default 1,
  status text not null default 'draft',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_lessons (
  lesson_id text primary key,
  course_id text not null references course_catalog (course_id) on delete cascade,
  module_id text not null references course_modules (module_id) on delete cascade,
  title text not null,
  format text not null default 'video',
  duration_minutes integer not null default 0,
  prompt text not null default '',
  content text,
  resource_url text,
  order_index integer not null default 1,
  status text not null default 'draft',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_resources (
  resource_id text primary key,
  course_id text not null references course_catalog (course_id) on delete cascade,
  module_id text,
  lesson_id text,
  title text not null,
  kind text not null default 'link',
  description text not null default '',
  url text not null default '',
  status text not null default 'draft',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists library_pdfs (
  pdf_id text primary key,
  title text not null,
  description text not null default '',
  file_url text not null default '',
  course_id text,
  module_id text,
  lesson_id text,
  category text not null default 'General',
  page_count integer not null default 0,
  status text not null default 'draft',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_catalog_status_idx on course_catalog (status, is_active);
create index if not exists course_modules_course_idx on course_modules (course_id, order_index);
create index if not exists course_lessons_module_idx on course_lessons (module_id, order_index);
create index if not exists course_resources_course_idx on course_resources (course_id, status);
create index if not exists library_pdfs_course_idx on library_pdfs (course_id, status);
