-- =============================================================
-- STORAGE: profile photos bucket + policies
-- Supabase Dashboard -> SQL Editor -> ye file paste karke Run.
--
-- Kyun zaroori hai: bucket (profile-photos) public hai, magar upload ke liye
-- storage.objects par RLS policy chahiye — warna client upload par 403
-- "new row violates row-level security policy" aata hai aur app base64
-- fallback par chali jati hai.
--
-- Access: sirf LOGGED-IN users (role = authenticated) upload/update/delete
-- kar sakte hain. Bucket public hai is liye photos <img> mein sabko dikhti
-- hain, lekin naya photo sirf login-user hi daal sakta hai.
--
-- Idempotent: dobara chalana safe.
-- =============================================================

-- 1) Bucket (public read, 2 MB per file, sirf images) ---------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  2097152,
  array['image/webp', 'image/png', 'image/jpeg', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) Policies — sirf authenticated (logged-in) users
drop policy if exists "profile_photos_read" on storage.objects;
create policy "profile_photos_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_insert" on storage.objects;
create policy "profile_photos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_update" on storage.objects;
create policy "profile_photos_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-photos')
  with check (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_delete" on storage.objects;
create policy "profile_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photos');
-- =============================================================
-- END
-- =============================================================
