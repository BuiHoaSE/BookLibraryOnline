-- Clean up storage
delete from storage.objects where bucket_id = 'books';

-- Clean up database
truncate table public.books cascade;

-- Reset sequences if any
-- alter sequence if exists books_id_seq restart with 1; 