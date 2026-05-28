# Photo Sharing and Recommendation Gallery Design

## Goal

Build a QR/link-friendly web page where guests can choose a nickname, upload optimized photos, browse an SNS-style gallery, and anonymously recommend up to three photos total. Provide a separate administrator page that lists uploads by recommendation count in real time and lets the administrator delete individual photos or all photos.

## Deployment Model

- Frontend: React/Vite static app deployed with GitHub Pages.
- Backend services: Supabase Postgres, Storage, Realtime, and Edge Functions.
- Public routes:
  - `/`: guest upload and gallery experience.
  - `/admin`: password-protected administrator dashboard.

## Guest Flow

Guests enter a nickname before uploading. The browser validates the selected image, resizes and compresses it to stay within 5MB, and uploads the optimized image to Supabase Storage. After upload, the app inserts a row in `photos` with the nickname, storage path, original display metadata, recommendation count, and upload timestamp.

The gallery shows uploaded photos in a feed/grid layout with the photo, nickname, upload time, and recommendation count. Each browser gets a generated anonymous `visitor_id` saved in local storage. Recommendations are stored without exposing the recommender identity in the UI.

Each visitor can recommend at most three photos total. A visitor also cannot recommend the same photo more than once. Attempts beyond those limits return a friendly client-side message.

## Administrator Flow

The admin page asks for a shared administrator password. The password is sent only to Supabase Edge Functions over HTTPS and is never stored in the frontend source. Edge Functions compare it with a deployed secret and use the service role key server-side for privileged reads and deletes.

The dashboard lists photos sorted by recommendation count descending, then upload time descending. Each row shows a thumbnail, nickname, upload time, storage path or short ID, and recommendation count. The admin can delete one photo or delete all photos. Deletes remove both the database rows and Storage objects.

## Data Model

`photos`

- `id uuid primary key`
- `nickname text not null`
- `storage_path text not null unique`
- `public_url text not null`
- `mime_type text not null`
- `file_size integer not null`
- `recommendation_count integer not null default 0`
- `created_at timestamptz not null default now()`

`recommendations`

- `id uuid primary key`
- `photo_id uuid not null references photos(id) on delete cascade`
- `visitor_id text not null`
- `created_at timestamptz not null default now()`
- Unique constraint on `(photo_id, visitor_id)`.

A database function handles recommendation creation in one transaction: it checks that the visitor has fewer than three recommendations, inserts the recommendation, and increments `photos.recommendation_count`.

## Security and Policies

The frontend uses only the Supabase public key. The service role key is used only in Edge Functions.

RLS is enabled on public tables. Anonymous users can read photos and insert photos. Anonymous users can call the recommendation RPC, but direct writes to `recommendations` are restricted so the three-recommendation limit cannot be bypassed from the browser. Admin delete operations happen only through Edge Functions after password validation.

Storage uses a public bucket for photo display. Uploads are allowed through a constrained policy or an upload Edge Function; deletes are admin-only through Edge Functions. File type and size are validated on the client and should also be constrained by Supabase Storage policies where possible.

The migration explicitly grants required access to `anon` and `authenticated` roles because newly-created tables may not be automatically exposed to the Supabase Data API.

## Realtime

The guest gallery subscribes to `photos` changes and refreshes or patches gallery state after inserts, updates, and deletes. The admin page subscribes to `photos` changes so recommendation counts and deleted rows update live.

The recommendation RPC updates the denormalized `photos.recommendation_count`, which gives both pages a single real-time table to watch for sorting and display.

## Error Handling

The upload form reports invalid nickname, unsupported image type, optimization failure, files that still exceed 5MB after compression, upload failure, and database insert failure. Recommendation errors distinguish duplicate recommendations from the three-recommendation limit. Admin errors distinguish incorrect password, delete failure, and network failure.

## Testing

Unit tests cover image optimization sizing behavior, visitor ID persistence, recommendation limit UI logic, and Supabase API wrappers. Database SQL should be reviewed for RLS coverage and verified against a Supabase project or local Supabase instance before deployment. Manual browser verification covers upload, realtime gallery updates, three-recommendation enforcement, admin sorting, single delete, and delete all.

## Open Assumptions

- The app is intended for a small to medium event-style gallery, not a high-volume public social network.
- Login is not required for guests.
- The administrator password will be configured as a Supabase Edge Function secret during deployment.
- QR codes will point to the deployed GitHub Pages URL.
