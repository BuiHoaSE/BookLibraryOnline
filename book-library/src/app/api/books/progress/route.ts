import { createServerClient } from '@supabase/ssr';
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Mark route as dynamic and disable caching
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Handler for CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// GET endpoint to fetch reading progress
export async function GET(req: NextRequest) {
  // Initialize response for cookie handling
  const response = NextResponse.next();
  
  try {
    // Get URL search params
    const url = new URL(req.url);
    const bookId = url.searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    // Create Supabase client using the recommended SSR approach
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = cookieStore.get(name)?.value;
            return cookie;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: any) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Get session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get reading progress
    const { data: readingProgress, error } = await supabase
      .from('reading_history')
      .select('current_page, timestamp')
      .eq('user_id', session.user.id)
      .eq('book_id', bookId)
      .single();

    if (error) {
      console.error('Error fetching reading progress:', error);
      // If no record exists, default to page 1
      if (error.code === 'PGRST116') {
        return NextResponse.json({ current_page: 1, last_read_at: null });
      }
      return NextResponse.json({ error: 'Failed to fetch reading progress' }, { status: 500 });
    }

    return NextResponse.json({
      current_page: readingProgress?.current_page || 1,
      last_read_at: readingProgress?.timestamp || null,
    });
  } catch (error) {
    console.error('Error in GET reading progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST endpoint to save reading progress
export async function POST(req: NextRequest) {
  // Initialize response for cookie handling
  const response = NextResponse.next();
  
  try {
    // Create Supabase client using the recommended SSR approach
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = cookieStore.get(name)?.value;
            return cookie;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: any) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Get session and user
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[API] Session check:', session ? 'Session found' : 'No session');

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { bookId, currentPage } = body;
    
    // Ensure currentPage is a number
    const pageNumber = parseInt(String(currentPage), 10);
    
    console.log('[API] Received progress save request:', {
      userId: session.user.id,
      bookId,
      rawCurrentPage: currentPage,
      parsedCurrentPage: pageNumber,
      bodyReceived: JSON.stringify(body)
    });

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }
    
    if (isNaN(pageNumber) || pageNumber <= 0) {
      console.error('[API] Invalid page number received:', { currentPage, pageNumber });
      return NextResponse.json({ error: 'Current page must be a positive number' }, { status: 400 });
    }

    // Check if a record already exists
    const { data: existingRecord, error: queryError } = await supabase
      .from('reading_history')
      .select('id, current_page')
      .eq('user_id', session.user.id)
      .eq('book_id', bookId)
      .single();
      
    if (queryError && queryError.code !== 'PGRST116') {
      console.error('[API] Error checking existing records:', queryError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    let result;

    if (existingRecord) {
      // Update existing record
      console.log('[API] Updating existing record:', {
        recordId: existingRecord.id,
        oldPage: existingRecord.current_page,
        newPage: pageNumber
      });
      
      result = await supabase
        .from('reading_history')
        .update({
          current_page: pageNumber,
          timestamp: new Date().toISOString(),
        })
        .eq('id', existingRecord.id);
    } else {
      // Insert new record
      console.log('[API] Inserting new record with page:', pageNumber);
      result = await supabase
        .from('reading_history')
        .insert({
          user_id: session.user.id,
          book_id: bookId,
          current_page: pageNumber,
          timestamp: new Date().toISOString(),
        });
    }

    if (result.error) {
      console.error('[API] Error saving reading progress:', result.error);
      return NextResponse.json({ error: 'Failed to save reading progress', details: result.error }, { status: 500 });
    }

    console.log('[API] Reading progress saved successfully:', {
      bookId,
      page: pageNumber,
      userId: session.user.id,
      operation: existingRecord ? 'update' : 'insert'
    });

    return NextResponse.json({ 
      success: true,
      page: pageNumber,
      operation: existingRecord ? 'update' : 'insert'
    });
  } catch (error: any) {
    console.error('[API] Error in POST reading progress:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message || 'Unknown error' }, { status: 500 });
  }
} 