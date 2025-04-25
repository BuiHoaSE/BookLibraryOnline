-- Migration: 008_create_books_with_reading_history_function.sql
-- Description: Create function to join books with reading history
-- Created: 2023-10-25

-- Create function to get books with reading history
CREATE OR REPLACE FUNCTION get_books_with_reading_history(user_id_param TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  genre TEXT,
  year INTEGER,
  isbn TEXT,
  publisher TEXT,
  file_url TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  page_count INTEGER,
  current_page INTEGER,
  completion_percentage FLOAT,
  last_read_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    (b.structure->>'genre')::TEXT AS genre,
    (b.structure->>'publicationYear')::INTEGER AS year,
    (b.structure->>'isbn')::TEXT AS isbn,
    b.publisher,
    b.file_url,
    b.cover_image_url,
    b.created_at,
    b.updated_at,
    COALESCE(b.page_count, urh.total_pages, 0) AS page_count,
    COALESCE(urh.current_page, 0) AS current_page,
    COALESCE(urh.completion_percentage, 0) AS completion_percentage,
    urh.last_read_at
  FROM 
    books b
  LEFT JOIN 
    user_reading_history urh ON b.id = urh.book_id AND urh.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql; 