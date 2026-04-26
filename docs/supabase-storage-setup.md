# Supabase Storage Setup

This project requires three buckets for uploads.

## Required Buckets

- `company-logos`
  - Visibility: public or private for MVP (both supported)
  - Used by:
    - `app/api/upload-company-logo/route.ts`
    - `app/api/company-logo-signed-url/route.ts`
  - Max file size: 5MB
  - Allowed file types: `jpg`, `jpeg`, `png`, `webp`, `svg`

- `talent-profile-photos`
  - Visibility: private
  - Used by:
    - `app/api/upload-talent-profile-photo/route.ts`
    - `app/api/talent-profile-photo-signed-url/route.ts`
  - Max file size: 5MB
  - Allowed file types: `jpg`, `jpeg`, `png`, `webp`

- `talent-documents`
  - Visibility: private
  - Used by:
    - `app/api/upload-talent-document/route.ts`
    - `app/api/talent-document-signed-url/route.ts`
  - Max file size: 10MB
  - Allowed file types:
    - CV: `pdf`, `doc`, `docx`
    - ID front/back: `jpg`, `jpeg`, `png`, `webp`, `pdf`

## Bucket Names Must Match Exactly

- `company-logos`
- `talent-profile-photos`
- `talent-documents`

If a required bucket is missing, upload APIs return HTTP 503 with a clear bucket-specific message.
