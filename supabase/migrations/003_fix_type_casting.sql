-- Migration: 003_fix_type_casting.sql
-- Description: Fix type casting issues in RLS policies
-- Created: [Current Date]

-- Drop existing RLS policies
drop policy if exists "Users can view their own reading history" on reading_history;
drop policy if exists "Users can insert their own reading history" on reading_history;
drop policy if exists "Users can update their own reading history" on reading_history;
drop policy if exists "Users can delete their own PDFs" on storage.objects;
drop policy if exists "Users can update their own PDFs" on storage.objects;

-- Create a helper function to convert auth.uid() to UUID safely
create or replace function auth.uid_to_uuid()
returns uuid
language sql
stable
as $$
  select auth.uid()::uuid;
$$;

-- Recreate RLS policies with proper type casting
create policy "Users can view their own reading history"
  on reading_history for select
  using (user_id = auth.uid()::text);

create policy "Users can insert their own reading history"
  on reading_history for insert
  with check (user_id = auth.uid()::text);

create policy "Users can update their own reading history"
  on reading_history for update
  using (user_id = auth.uid()::text);

create policy "Users can update their own PDFs"
  on storage.objects for update
  using (
    bucket_id = 'pdfs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own PDFs"
  on storage.objects for delete
  using (
    bucket_id = 'pdfs' and
    auth.uid()::text = (storage.foldername(name))[1]
  ); 