-- Create the storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('covers', 'covers', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload files to their own folder
create policy "Users can upload their own covers"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'covers' 
    and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own files
create policy "Users can update their own covers"
on storage.objects for update
to authenticated
using (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read all covers
create policy "Authenticated users can view all covers"
on storage.objects for select
to authenticated
using (bucket_id = 'covers');

-- Allow authenticated users to delete their own files
create policy "Users can delete their own covers"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
); 