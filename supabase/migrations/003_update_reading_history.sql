-- Migration: 003_update_reading_history.sql
-- Description: Update reading_history to reference users table
-- Created: [Current Date]

-- Drop existing reading_history table
drop table if exists reading_history;

-- Recreate reading_history table with proper foreign key
create table reading_history (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  timestamp timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Recreate indexes
create index reading_history_user_id_idx on reading_history(user_id);
create index reading_history_book_id_idx on reading_history(book_id);

-- Enable RLS
alter table reading_history enable row level security;

-- Recreate RLS policies
create policy "Users can view their own reading history"
  on reading_history for select
  using (auth.uid()::text = user_id);

create policy "Users can insert their own reading history"
  on reading_history for insert
  with check (auth.uid()::text = user_id); 