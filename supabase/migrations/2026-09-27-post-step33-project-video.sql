-- =====================================================================
-- Post-STEP-33 — optional project video (mirrors the property video
-- feature): a `video_url` column on projects plus a public-read /
-- admin-write `project-videos` storage bucket. Uploaded directly from
-- the admin's browser session (see VideoUploader.tsx).
-- =====================================================================

alter table public.projects add column if not exists video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-videos', 'project-videos', true, 104857600, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project_videos_public_read" on storage.objects;
create policy "project_videos_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-videos');

drop policy if exists "project_videos_admin_write" on storage.objects;
create policy "project_videos_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-videos' and public.is_admin());

drop policy if exists "project_videos_admin_update" on storage.objects;
create policy "project_videos_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-videos' and public.is_admin());

drop policy if exists "project_videos_admin_delete" on storage.objects;
create policy "project_videos_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-videos' and public.is_admin());
