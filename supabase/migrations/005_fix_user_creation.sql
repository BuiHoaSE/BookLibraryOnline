-- Migration: 005_fix_user_creation.sql
-- Description: Fix user creation and permissions
-- Created: [Current Date]

-- First, create the tables before trying to do anything with them
create table if not exists public.users (
  id text primary key,  -- Keep as text to match auth.uid()
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists reading_history (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,  -- Keep as text to match users.id
  book_id uuid references books(id) on delete cascade,
  started_at timestamp with time zone default now(),
  finished_at timestamp with time zone,
  pages_read integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Now handle existing policies and triggers safely
do $$
begin
  -- Drop existing trigger and function
  drop trigger if exists on_auth_user_created on auth.users;
  drop function if exists public.handle_new_user();

  -- Drop policies only if tables exist
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
end $$;

-- Handle foreign key constraint
alter table reading_history
  drop constraint if exists reading_history_user_id_fkey;

alter table reading_history
  add constraint reading_history_user_id_fkey
  foreign key (user_id) references public.users(id)
  on delete cascade;

-- Create handle_new_user function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id::text,  -- Convert UUID to text
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = coalesce(excluded.name, users.name),
    avatar_url = coalesce(excluded.avatar_url, users.avatar_url),
    updated_at = now();
  return new;
exception when others then
  -- Log the error (Supabase will capture this in the logs)
  raise warning 'Error in handle_new_user: %', SQLERRM;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.users enable row level security;
alter table reading_history enable row level security;

-- Create policies for users table
create policy "Users can view their own profile"
  on public.users for select
  using (id = auth.uid()::text);

create policy "Users can update their own profile"
  on public.users for update
  using (id = auth.uid()::text);

create policy "New users can insert their profile"
  on public.users for insert
  with check (id = auth.uid()::text);

-- Create policies for reading_history table
create policy "Users can view their own reading history"
  on reading_history for select
  using (user_id = auth.uid()::text);

create policy "Users can insert their own reading history"
  on reading_history for insert
  with check (user_id = auth.uid()::text);

create policy "Users can update their own reading history"
  on reading_history for update
  using (user_id = auth.uid()::text);

-- Grant necessary permissions
grant usage on schema public to authenticated, anon;
grant all on public.users to authenticated, anon;
grant all on reading_history to authenticated, anon; 