-- Add owner_id column to books table
ALTER TABLE books ADD COLUMN owner_id UUID NOT NULL REFERENCES auth.users(id);

-- Create an index on owner_id for better query performance
CREATE INDEX books_owner_id_idx ON books(owner_id);

-- Add RLS policies for owner-based access
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own books" ON books
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own books" ON books
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own books" ON books
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own books" ON books
  FOR DELETE
  USING (auth.uid() = owner_id); 