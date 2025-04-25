import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

export type Book = {
  id: number;
  title: string;
  author: string;
  genre?: string;
  year?: number;
  isbn?: string;
  pageCount?: number;
  language?: string;
  summary?: string;
  publisher?: string;
  file_url?: string;
  cover_image_url?: string;
  created_at?: string;
  updated_at?: string;
  current_page?: number;
  page_count?: number;
  completion_percentage?: number;
  last_read_at?: string;
}; 