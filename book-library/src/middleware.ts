import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of public routes that don't require authentication
const publicRoutes = ['/', '/auth/callback', '/auth-error', '/test'];

// Also add API routes and other paths that should be accessible without auth
const allowedPaths = [
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/public/',
  '/images/',
  '/assets/',
  '/static/'
];

export async function middleware(request: NextRequest) {
  try {
    // Check if the path should be allowed without authentication
    const { pathname } = request.nextUrl;
    
    // Always allow certain paths
    if (allowedPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.next();
    }
    
    // Check if the route is a public route
    const isPublicRoute = publicRoutes.some(route => pathname === route);
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // Create a response object that we'll use to pass the cookies
    const res = NextResponse.next();
    
    // Create a Supabase client using the request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value;
          },
          set(name, value, options) {
            res.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name, options) {
            res.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Check if the user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthenticated = !!session;

    // Protect all other routes - redirect to home if not authenticated
    if (!isAuthenticated) {
      const url = new URL('/', request.url);
      return NextResponse.redirect(url);
    }

    // Allow access to protected routes for authenticated users
    return res;
  } catch (error) {
    // Log error but don't block the request
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/ (Next.js files)
     * - favicon.ico (favicon file)
     * - public/ (public assets)
     * - images/ (image files)
     * - assets/ (static assets)
     * - static/ (static files)
     * - api/ (API routes)
     */
    '/((?!_next/|favicon\\.ico|public/|images/|assets/|static/|api/).*)',
  ],
}; 