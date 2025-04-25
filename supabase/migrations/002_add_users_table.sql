-- Migration: 002_add_users_table.sql
-- Description: Add users table for Supabase Auth and update reading_history schema
-- Created: [Current Date]

-- Drop existing objects first (with CASCADE to handle dependencies)
drop trigger if exists update_users_updated_at on public.users;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.update_updated_at_column() cascade;
drop function if exists public.handle_new_user() cascade;

-- Backup existing reading_history data
create table if not exists public.reading_history_backup as 
select * from public.reading_history;

-- Drop existing policies
drop policy if exists "Users can view their own reading history" on public.reading_history;
drop policy if exists "Users can insert their own reading history" on public.reading_history;
drop policy if exists "Users can update their own reading history" on public.reading_history;

-- Create users table if it doesn't exist
create table if not exists public.users (
  id uuid references auth.users(id) primary key,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create updated_at trigger function if it doesn't exist
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for users table
drop trigger if exists update_users_updated_at on public.users;
create trigger update_users_updated_at
  before update on public.users
  for each row
  execute function public.update_updated_at_column();

-- Enable RLS on users table
alter table public.users enable row level security;

-- Create helper function to convert auth.uid() to UUID safely
create or replace function auth.uid_to_uuid()
returns uuid
language sql
stable
as $$
  select auth.uid()::uuid;
$$;

-- Create RLS policies for users
create policy "Users can view their own profile"
  on public.users for select
  using (id = auth.uid_to_uuid());

create policy "Users can update their own profile"
  on public.users for update
  using (id = auth.uid_to_uuid());

create policy "New users can insert their profile"
  on public.users for insert
  with check (id = auth.uid_to_uuid());

-- Create function to handle user creation/update from Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for Supabase Auth user sync
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- Update reading_history table schema
alter table public.reading_history 
  alter column user_id type uuid using user_id::uuid,
  add column if not exists finished_at timestamp with time zone,
  add column if not exists pages_read integer default 0,
  add column if not exists updated_at timestamp with time zone default now();

-- Add foreign key constraint to reading_history
alter table public.reading_history 
  drop constraint if exists reading_history_user_id_fkey,
  add constraint reading_history_user_id_fkey 
    foreign key (user_id) references public.users(id) on delete cascade;

-- Rename timestamp column to started_at if it exists
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'reading_history' 
    and column_name = 'timestamp'
  ) then
    alter table public.reading_history rename column "timestamp" to started_at;
  end if;
end $$;

-- Create trigger for reading_history updated_at
drop trigger if exists update_reading_history_updated_at on public.reading_history;
create trigger update_reading_history_updated_at
  before update on public.reading_history
  for each row
  execute function public.update_updated_at_column();

-- Create RLS policies for reading_history
create policy "Users can view their own reading history"
  on public.reading_history for select
  using (user_id = auth.uid_to_uuid());

create policy "Users can update their own reading history"
  on public.reading_history for update
  using (user_id = auth.uid_to_uuid());

create policy "Users can insert their own reading history"
  on public.reading_history for insert
  with check (user_id = auth.uid_to_uuid());

-- Drop backup table if it exists
drop table if exists public.reading_history_backup; 