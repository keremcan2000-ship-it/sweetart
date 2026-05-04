-- ============================================================
-- Sweetart — Storage bucket for profile photos.
-- Files live under: profile-photos/<user_id>/<timestamp>.<ext>
-- Bucket is public-read so getPublicUrl works without signed URLs.
-- ============================================================

-- Create the bucket (idempotent).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- RLS policies for storage.objects (profile-photos bucket)
-- ============================================================

-- Read: anyone can fetch the public URL (bucket is public anyway,
-- but we add an explicit policy for cleanliness).
drop policy if exists "Profile photos are viewable" on storage.objects;
create policy "Profile photos are viewable"
on storage.objects for select
to public
using (bucket_id = 'profile-photos');

-- Insert: authenticated users can only write under their own folder.
drop policy if exists "Users upload to own folder" on storage.objects;
create policy "Users upload to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Update: same scope.
drop policy if exists "Users update own photos" on storage.objects;
create policy "Users update own photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete: same scope.
drop policy if exists "Users delete own photos" on storage.objects;
create policy "Users delete own photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
