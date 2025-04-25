import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from '@supabase/ssr';
import { testGeminiAccess as checkGeminiAccess, extractBookMetadata } from "@/lib/ai/gemini";
import { Database } from '@/lib/database.types';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export interface BookMetadata {
  title?: string;
  author?: string;
  summary?: string;
  publicationYear?: number;
  genre?: string;
  isbn?: string;
  coverUrl?: string;
}

interface PDFInfo {
  Title?: string;
  Author?: string;
  CreationDate?: string;
  [key: string]: any;
}

/**
 * Route handler for analyzing PDF metadata and text
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  
  // Get the origin from the request headers
  const origin = req.headers.get('origin') || '*';

  // Set CORS headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, X-Client-Data',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  });

  try {
    // Initialize Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Omit<ResponseCookie, 'name' | 'value'>) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              console.error('Error setting cookie:', error)
            }
          },
          remove(name: string, options: Omit<ResponseCookie, 'name' | 'value'>) {
            try {
              cookieStore.delete(name)
            } catch (error) {
              console.error('Error deleting cookie:', error)
            }
          },
        },
      }
    );

    // Get the session directly from cookies
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return new NextResponse(
        JSON.stringify({ error: 'Please sign in to upload books' }),
        { status: 401, headers }
      );
    }

    // Test Gemini API access
    try {
      await checkGeminiAccess();
    } catch (error) {
      console.error("Error accessing Gemini API:", error);
      return new NextResponse(
        JSON.stringify({ error: "Error accessing Gemini API" }),
        { status: 500, headers }
      );
    }

    // Get the PDF data from the request body
    const body = await req.json();
    const { info, text, pageCount, filename } = body;

    if (!text || typeof text !== 'string') {
      return new NextResponse(
        JSON.stringify({ error: "Invalid PDF data provided" }),
        { status: 400, headers }
      );
    }

    try {
      // Use AI to analyze the content and extract metadata
      const aiMetadata = await extractBookMetadata(text);

      // Combine PDF metadata with AI-extracted metadata
      const extractedMetadata = {
        title: info.Title || aiMetadata?.title || filename?.replace('.pdf', '') || '',
        author: info.Author || aiMetadata?.author || '',
        genre: aiMetadata?.genre || '',
        year: info.CreationDate ? extractYear(info.CreationDate) : (aiMetadata?.year || new Date().getFullYear()),
        isbn: aiMetadata?.isbn || extractISBN(text) || '',
        pageCount: pageCount || 0,
        language: aiMetadata?.language || detectLanguage(text),
        summary: aiMetadata?.summary || generateSummary(text),
        publisher: info.Publisher || aiMetadata?.publisher || extractPublisher(text) || ''
      };

      return new NextResponse(
        JSON.stringify({ 
          metadata: extractedMetadata,
          pageCount
        }),
        { headers }
      );
    } catch (error) {
      console.error('Error analyzing PDF:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Error analyzing PDF content.' }),
        { status: 500, headers }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new NextResponse(
      JSON.stringify({ error: `Error processing request: ${error}` }),
      { status: 500, headers }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// Helper functions for metadata extraction
function extractYear(dateStr: string): number {
  const yearMatch = dateStr.match(/\d{4}/);
  return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
}

function extractISBN(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const isbnPatterns = [
    // ISBN with label - matches both ISBN-10 and ISBN-13
    /ISBN[:\s-]*([0-9][-– ]?[0-9][-– ]?[0-9][-– ]?[0-9][-– ]?[0-9][-– ]?[0-9][-– ]?[0-9][-– ]?[0-9][-– ]?[0-9][-– ]?[0-9X](?:[0-9]{3})?)/i,
    // Standalone ISBN-10
    /\b([0-9]{9}[0-9X])\b/i,
    // Standalone ISBN-13
    /\b(97[89][0-9]{10})\b/
  ];

  try {
    for (const pattern of isbnPatterns) {
      const matches = text.match(pattern);
      if (matches && matches[1]) {
        const isbn = matches[1].replace(/[-–\s]/g, '').toUpperCase();
        if (isValidISBN(isbn)) {
          return isbn;
        }
      }
    }
  } catch (error) {
    console.error('Error extracting ISBN:', error);
  }

  return '';
}

function isValidISBN(isbn: string): boolean {
  try {
    // Remove any hyphens, spaces, or dashes and convert to uppercase
    isbn = isbn.replace(/[-–\s]/g, '').toUpperCase();
    
    // Check for ISBN-13
    if (isbn.length === 13) {
      if (!isbn.match(/^(978|979)[0-9]{10}$/)) {
        return false;
      }
      
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(isbn[i]);
        if (isNaN(digit)) return false;
        sum += digit * (i % 2 === 0 ? 1 : 3);
      }
      
      const checkDigit = (10 - (sum % 10)) % 10;
      return checkDigit === parseInt(isbn[12]);
    }
    
    // Check for ISBN-10
    if (isbn.length === 10) {
      if (!isbn.match(/^[0-9]{9}[0-9X]$/)) {
        return false;
      }
      
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        const digit = parseInt(isbn[i]);
        if (isNaN(digit)) return false;
        sum += digit * (10 - i);
      }
      
      const lastChar = isbn[9];
      const checkDigit = lastChar === 'X' ? 10 : parseInt(lastChar);
      if (isNaN(checkDigit) && lastChar !== 'X') return false;
      
      sum += checkDigit;
      return sum % 11 === 0;
    }
    
    return false;
  } catch (error) {
    console.error('Error validating ISBN:', error);
    return false;
  }
}

function extractPublisher(text: string): string {
  // Common patterns for publisher information
  const publisherPatterns = [
    /Published by[:\s]+([^.;\n]+)/i,
    /Publisher[:\s]+([^.;\n]+)/i,
    /(\w+\s+Press)\b/,
    /(\w+\s+Publishing)\b/,
    /(\w+\s+Books)\b/
  ];

  for (const pattern of publisherPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function detectLanguage(text: string): string {
  const sample = text.toLowerCase().slice(0, 1000);
  const englishWords = ['the', 'and', 'of', 'to', 'in'];
  const spanishWords = ['el', 'la', 'de', 'en', 'y'];
  const frenchWords = ['le', 'la', 'de', 'et', 'en'];

  let scores = {
    'English': 0,
    'Spanish': 0,
    'French': 0
  };

  englishWords.forEach(word => {
    scores.English += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  spanishWords.forEach(word => {
    scores.Spanish += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  frenchWords.forEach(word => {
    scores.French += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });

  const language = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  return language;
}

function generateSummary(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, 3).join(' ').trim();
}