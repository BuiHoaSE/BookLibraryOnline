export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          title: string | null
          author: string | null
          publisher: string | null
          upload_date: string | null
          file_url: string | null
          cover_image_url: string | null
          structure: Json | null
          summary: string | null
          embedding: unknown | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title?: string | null
          author?: string | null
          publisher?: string | null
          upload_date?: string | null
          file_url?: string | null
          cover_image_url?: string | null
          structure?: Json | null
          summary?: string | null
          embedding?: unknown | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string | null
          author?: string | null
          publisher?: string | null
          upload_date?: string | null
          file_url?: string | null
          cover_image_url?: string | null
          structure?: Json | null
          summary?: string | null
          embedding?: unknown | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      reading_history: {
        Row: {
          id: string
          created_at: string
          user_id: string
          book_id: string
          pages_read: number
          reading_time: number
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          book_id: string
          pages_read: number
          reading_time: number
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          book_id?: string
          pages_read?: number
          reading_time?: number
          notes?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 