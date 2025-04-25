-- Migration: 001_initial_schema.sql
-- Description: Initial database schema setup for book library
-- Created: [Current Date]

-- Enable required extensions
create extension if not exists vector;

-- Create books table
create table books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text,
  publisher text,
  upload_date timestamp with time zone default now(),
  file_url text not null,
  structure jsonb,
  summary text,
  embedding vector(1536),  -- For semantic search
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create reading_history table
create table reading_history (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,  -- NextAuth user ID
  book_id uuid references books(id) on delete cascade,
  timestamp timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Create indexes
create index books_embedding_idx on books using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
create index reading_history_user_id_idx on reading_history(user_id);
create index reading_history_book_id_idx on reading_history(book_id);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for books table
create trigger update_books_updated_at
  before update on books
  for each row
  execute function update_updated_at_column();

-- Enable Row Level Security
alter table books enable row level security;
alter table reading_history enable row level security;

-- Create RLS policies for books
create policy "Books are viewable by everyone"
  on books for select
  using (true);

create policy "Books can be inserted by authenticated users"
  on books for insert
  with check (auth.role() = 'authenticated');

create policy "Books can be updated by authenticated users"
  on books for update
  using (auth.role() = 'authenticated');

-- Create RLS policies for reading history
create policy "Users can view their own reading history"
  on reading_history for select
  using (auth.uid()::text = user_id);

create policy "Users can insert their own reading history"
  on reading_history for insert
  with check (auth.uid()::text = user_id);

-- Create storage bucket for PDF files if it doesn't exist
do $$
begin
  if not exists (select from storage.buckets where id = 'pdfs') then
    insert into storage.buckets (id, name, public)
    values ('pdfs', 'pdfs', true);
  end if;
end $$;

-- Create storage policies for PDF bucket
create policy "PDFs are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'pdfs');

create policy "Authenticated users can upload PDFs"
  on storage.objects for insert
  with check (
    bucket_id = 'pdfs' and
    auth.role() = 'authenticated'
  );

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