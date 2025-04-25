import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Database } from '@/lib/database.types';

// Mark route as dynamic and disable caching
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // Get cookies and create Supabase client with proper awaiting
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>(
      { cookies: () => cookieStore }
    );
    
    // Get user session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return NextResponse.json({
        authenticated: false,
        error: error.message
      });
    }
    
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: "No active session"
      });
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        lastSignIn: session.user.last_sign_in_at
      }
    });
  } catch (error) {
    console.error("Auth status error:", error);
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 