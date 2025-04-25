-- Migration: 000_cleanup.sql
-- Description: Clean up all existing tables and functions
-- Created: [Current Date]

do $$ 
begin
  -- Drop policies if the tables exist
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'users') then
    drop policy if exists "Users can view their own profile" on public.users;
    drop policy if exists "Users can update their own profile" on public.users;
    drop policy if exists "New users can insert their profile" on public.users;
  end if;

  if exists (select from pg_tables where schemaname = 'public' and tablename = 'reading_history') then
    drop policy if exists "Users can view their own reading history" on reading_history;
    drop policy if exists "Users can insert their own reading history" on reading_history;
    drop policy if exists "Users can update their own reading history" on reading_history;
  end if;

  if exists (select from pg_tables where schemaname = 'public' and tablename = 'books') then
    drop policy if exists "Books are viewable by everyone" on books;
    drop policy if exists "Books can be inserted by authenticated users" on books;
    drop policy if exists "Books can be updated by authenticated users" on books;
    drop policy if exists "Users can update book metadata" on books;
  end if;

  -- Drop storage policies
  drop policy if exists "PDFs are publicly accessible" on storage.objects;
  drop policy if exists "Authenticated users can upload PDFs" on storage.objects;
  drop policy if exists "Users can update their own PDFs" on storage.objects;
  drop policy if exists "Users can delete their own PDFs" on storage.objects;

  -- Drop triggers if the tables exist
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'users') then
    drop trigger if exists update_users_updated_at on public.users;
  end if;

  if exists (select from pg_tables where schemaname = 'public' and tablename = 'books') then
    drop trigger if exists update_books_updated_at on books;
  end if;

  if exists (select from pg_tables where schemaname = 'public' and tablename = 'reading_history') then
    drop trigger if exists update_reading_history_updated_at on reading_history;
  end if;

  -- Drop auth trigger if exists
  drop trigger if exists on_auth_user_created on auth.users;
end $$;

-- Drop functions
drop function if exists public.handle_new_user();
drop function if exists public.update_updated_at_column();
drop function if exists auth.uid_to_uuid();

-- Drop tables (in correct order due to dependencies)
drop table if exists reading_history;
drop table if exists public.users;
drop table if exists books;

-- Drop extensions
drop extension if exists vector; 