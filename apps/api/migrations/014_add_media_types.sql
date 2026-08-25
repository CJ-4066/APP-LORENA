alter table course_lessons add column if not exists media_type text;
alter table course_lessons add column if not exists mime_type text;
alter table course_resources add column if not exists media_type text;
alter table course_resources add column if not exists mime_type text;
