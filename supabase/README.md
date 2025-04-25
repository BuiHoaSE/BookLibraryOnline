# Book Library Database Schema

This directory contains the database schema and migrations for the Book Library application.

## Schema Overview

### Tables

1. **users**
   - Stores user information from NextAuth
   - Syncs automatically with auth.users
   - Tracks user profile updates
   - Primary key matches NextAuth user ID

2. **books**
   - Stores book metadata and content
   - Includes vector embeddings for semantic search
   - Tracks upload and update timestamps

3. **reading_history**
   - Tracks user reading activity
   - Links users to books they've accessed
   - Records access timestamps
   - References users and books tables

### Storage

1. **pdfs bucket**
   - Stores uploaded PDF files
   - Publicly accessible for reading
   - User-specific upload permissions

## Security

### Row Level Security (RLS)

- Books are publicly viewable
- Only authenticated users can upload/update books
- Users can only view and update their own profile
- Users can only view their own reading history
- PDF storage has user-specific access controls

### Indexes

- Vector search index for semantic search
- User and book ID indexes for performance
- Timestamp indexes for history queries

## Migrations

### 001_initial_schema.sql
- Creates initial database structure
- Sets up RLS policies
- Configures storage buckets
- Creates necessary indexes and triggers

### 002_add_users_table.sql
- Creates users table
- Sets up NextAuth sync
- Configures user-specific RLS policies

### 003_update_reading_history.sql
- Updates reading_history to reference users table
- Maintains data integrity with foreign keys

## Usage

To apply the schema:

1. Connect to your Supabase project
2. Open the SQL editor
3. Run the migration files in order:
   - `001_initial_schema.sql`
   - `002_add_users_table.sql`
   - `003_update_reading_history.sql`

## Maintenance

- Regular backups recommended
- Monitor vector index performance
- Review storage usage periodically
- Check user sync trigger functionality 