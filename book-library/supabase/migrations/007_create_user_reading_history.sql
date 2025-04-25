-- Migration: 007_create_user_reading_history.sql
-- Description: Create user_reading_history table to track reading progress by user
-- Created: 2023-10-25

-- Create user_reading_history table
CREATE TABLE IF NOT EXISTS user_reading_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completion_percentage FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX user_reading_history_user_id_idx ON user_reading_history(user_id);
CREATE INDEX user_reading_history_book_id_idx ON user_reading_history(book_id);
CREATE INDEX user_reading_history_user_book_idx ON user_reading_history(user_id, book_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_reading_history table
CREATE TRIGGER update_user_reading_history_updated_at
  BEFORE UPDATE ON user_reading_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_reading_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own reading history"
  ON user_reading_history FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own reading history"
  ON user_reading_history FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own reading history"
  ON user_reading_history FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Create constraint for unique user_id and book_id combination
ALTER TABLE user_reading_history
  ADD CONSTRAINT user_reading_history_user_book_unique
  UNIQUE (user_id, book_id); 