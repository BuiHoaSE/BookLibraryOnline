-- Migration: 004_update_books_table.sql
-- Description: Update books table with additional fields for the dashboard
-- Created: [Current Date]

-- Drop existing policy if it exists
drop policy if exists "Users can update book metadata" on books;

-- Add new columns to books table
alter table books
  add column if not exists genre text,
  add column if not exists coverImage text,
  add column if not exists rating numeric(3,1) check (rating >= 0 and rating <= 5),
  add column if not exists year integer,
  add column if not exists isbn text,
  add column if not exists pageCount integer,
  add column if not exists language text;

-- Update existing columns to be not null where appropriate
alter table books
  alter column author set not null,
  alter column genre set not null;

-- Add indexes for commonly queried fields
create index if not exists books_genre_idx on books(genre);
create index if not exists books_year_idx on books(year);
create index if not exists books_rating_idx on books(rating);

-- Update RLS policies to allow authenticated users to update book metadata
create policy "Users can update book metadata"
  on books for update
  using (auth.role() = 'authenticated'); 