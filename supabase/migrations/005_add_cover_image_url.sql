-- Migration: 005_add_cover_image_url.sql
-- Description: Add cover_image_url column to books table
-- Created: [Current Date]

-- Add cover_image_url column to books table
alter table books
  add column if not exists cover_image_url text;

-- Create index for cover_image_url
create index if not exists books_cover_image_url_idx on books(cover_image_url);

-- Update storage policies to allow access to cover images
create policy "Cover images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'book-files' and (storage.foldername(name))[2] = 'covers');

create policy "Authenticated users can upload cover images"
  on storage.objects for insert
  with check (
    bucket_id = 'book-files' and
    (storage.foldername(name))[2] = 'covers' and
    auth.role() = 'authenticated'
  );

create policy "Users can update their own cover images"
  on storage.objects for update
  using (
    bucket_id = 'book-files' and
    (storage.foldername(name))[2] = 'covers' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own cover images"
  on storage.objects for delete
  using (
    bucket_id = 'book-files' and
    (storage.foldername(name))[2] = 'covers' and
    auth.uid()::text = (storage.foldername(name))[1]
  ); 