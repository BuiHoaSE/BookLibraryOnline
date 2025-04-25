-- First, migrate existing reading progress to books table
UPDATE books
SET current_page = (
  SELECT current_page
  FROM reading_history
  WHERE reading_history.book_id = books.id
  ORDER BY timestamp DESC
  LIMIT 1
);

-- Add current_page column to books table if it doesn't exist
ALTER TABLE books
ADD COLUMN IF NOT EXISTS current_page INTEGER;

-- Drop the reading_history table
DROP TABLE IF EXISTS reading_history;

-- Add a comment to the current_page column
COMMENT ON COLUMN books.current_page IS 'Current reading progress (page number) for the book';

-- Update RLS policies for books table
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Allow users to view all books
CREATE POLICY "Books are viewable by everyone" ON books
    FOR SELECT
    USING (true);

-- Allow authenticated users to update their reading progress
CREATE POLICY "Users can update their reading progress" ON books
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert new books
CREATE POLICY "Users can insert new books" ON books
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated'); 