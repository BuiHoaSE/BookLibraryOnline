-- Create storage bucket for books if it doesn't exist
insert into storage.buckets (id, name, public)
values ('books', 'books', true)
on conflict (id) do nothing;

-- Remove existing storage policies if any exist
drop policy if exists "Allow authenticated users to upload files" on storage.objects;
drop policy if exists "Allow users to update their own files" on storage.objects;
drop policy if exists "Allow users to delete their own files" on storage.objects;
drop policy if exists "Allow public read access" on storage.objects;

-- Create storage policies
create policy "Allow authenticated users to upload files"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'books' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Allow users to update their own files"
on storage.objects for update
to authenticated
using (
    bucket_id = 'books'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
    bucket_id = 'books'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Allow users to delete their own files"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'books'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Allow public read access"
on storage.objects for select
to public
using ( bucket_id = 'books' );

-- Enable RLS on storage.objects if not already enabled
alter table storage.objects enable row level security;

-- Drop existing table if it exists
drop table if exists public.books cascade;

-- Create books table with correct schema
create table public.books (
    id uuid default gen_random_uuid() primary key,
    title text,
    author text,
    publisher text,
    upload_date timestamp with time zone default now(),
    file_url text,
    structure jsonb,
    summary text,
    embedding vector,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    cover_image_url text,
    owner_id uuid references auth.users(id) on delete cascade
);

-- Enable RLS on books table
alter table public.books enable row level security;

-- Remove existing policies if any exist
drop policy if exists "Allow users to insert their own books" on books;
drop policy if exists "Allow users to update their own books" on books;
drop policy if exists "Allow users to delete their own books" on books;
drop policy if exists "Allow public read access to books" on books;

-- Create policies for books table
create policy "Allow users to insert their own books"
on books for insert
to authenticated
with check (
    auth.uid() = owner_id
);

create policy "Allow users to update their own books"
on books for update
to authenticated
using (
    auth.uid() = owner_id
)
with check (
    auth.uid() = owner_id
);

create policy "Allow users to delete their own books"
on books for delete
to authenticated
using (
    auth.uid() = owner_id
);

create policy "Allow public read access to books"
on books for select
to public
using (true);

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on public.books to anon, authenticated; 