-- Private verification documents for talent (CV + ID). Never expose on public profile reads.
-- TODO: Admin verification UI should list these securely (signed URLs / service role only).
-- TODO: Tighten Storage RLS and table policies before production; talent owner vs admin access model.

alter table public.resources
  add column if not exists cv_document_path text,
  add column if not exists id_front_document_path text,
  add column if not exists id_back_document_path text;

comment on column public.resources.cv_document_path is 'Private CV path in Storage bucket talent-documents. Not publicly displayed.';
comment on column public.resources.id_front_document_path is 'Private ID front path in talent-documents. Not publicly displayed.';
comment on column public.resources.id_back_document_path is 'Private ID back path in talent-documents. Not publicly displayed.';

-- Storage bucket (create in Supabase Dashboard if missing):
--   Name: talent-documents
--   Access: private
--   Uploads: server-side service role in app/api/upload-talent-document/route.ts
--   Max ~10MB per file; CV: PDF/DOC/DOCX; ID: JPG/PNG/WEBP/PDF
