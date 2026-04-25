-- Public avatar selection + private profile photo path for talent resources.
-- avatar_key: one of the built-in keys from lib/talent-avatar-library.ts (emoji cards until images exist).
-- profile_photo_path: object path inside Supabase Storage bucket talent-profile-photos (private).
--
-- Storage (manual / Dashboard):
--   Bucket name: talent-profile-photos
--   Access: private recommended. Public profile must NOT read this bucket until unlock logic exists.
--   Uploads are performed server-side with the service role in app/api/upload-talent-profile-photo/route.ts
--   Add RLS / policies as needed for your project (service role bypasses RLS for uploads).

alter table public.resources
  add column if not exists avatar_key text,
  add column if not exists profile_photo_path text;

comment on column public.resources.avatar_key is 'Selected public Lego-style avatar preset key.';
comment on column public.resources.profile_photo_path is 'Storage path in talent-profile-photos; shown only after future unlock/payment logic.';
