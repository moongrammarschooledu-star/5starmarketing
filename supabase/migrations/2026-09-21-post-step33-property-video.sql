-- =====================================================================
-- Post-STEP-33 — optional property walkthrough video.
-- Uploaded directly from the admin's own browser session straight to
-- Supabase Storage (never through a server action's body, which is far
-- too small for typical video file sizes) — see VideoUploader.tsx.
-- =====================================================================

alter table public.properties add column if not exists video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-videos', 'property-videos', true, 104857600, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "property_videos_public_read" on storage.objects;
create policy "property_videos_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'property-videos');

drop policy if exists "property_videos_admin_write" on storage.objects;
create policy "property_videos_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'property-videos' and public.is_admin());

drop policy if exists "property_videos_admin_update" on storage.objects;
create policy "property_videos_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'property-videos' and public.is_admin());

drop policy if exists "property_videos_admin_delete" on storage.objects;
create policy "property_videos_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-videos' and public.is_admin());
