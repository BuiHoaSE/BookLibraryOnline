import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of public routes that don't require authentication
const publicRoutes = ['/', '/auth/callback', '/auth-error'];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuthenticated = !!token;
  
  // Get the pathname of the request
  const { pathname } = request.nextUrl;

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => pathname === route);

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Protect all other routes - redirect to home if not authenticated
  if (!isAuthenticated) {
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }

  // Allow access to protected routes for authenticated users
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 