import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Mark the route as dynamic to disable caching
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Log all incoming parameters for debugging
  console.log('Auth callback params:', {
    code: code ? 'present' : 'missing',
    error,
    errorDescription,
    url: request.url
  })

  // If there's an error in the URL, log it and redirect to error page
  if (error || errorDescription) {
    console.error('Auth error from provider:', { error, errorDescription })
    return NextResponse.redirect(`${requestUrl.origin}/auth-error?error=${encodeURIComponent(error || '')}`)
  }

  if (code) {
    try {
      // Get cookie store and initialize response
      const cookieStore = await cookies()
      const response = NextResponse.redirect(`${requestUrl.origin}/dashboard`)
      
      // Create server client with properly configured cookies
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              const cookie = cookieStore.get(name)?.value
              console.log(`Getting cookie in callback: ${name}, exists: ${!!cookie}`)
              return cookie
            },
            set(name: string, value: string, options: any) {
              try {
                console.log(`Setting cookie in callback: ${name}`)
                response.cookies.set({
                  name,
                  value,
                  ...options
                })
              } catch (error) {
                console.error('Error setting cookie:', error)
              }
            },
            remove(name: string, options: any) {
              try {
                console.log(`Removing cookie in callback: ${name}`)
                response.cookies.set({
                  name,
                  value: '',
                  ...options,
                  maxAge: 0
                })
              } catch (error) {
                console.error('Error removing cookie:', error)
              }
            },
          },
        }
      )

      console.log('Attempting to exchange code for session...')
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Session exchange error:', {
          message: exchangeError.message,
          status: exchangeError.status,
          name: exchangeError.name
        })
        return NextResponse.redirect(`${requestUrl.origin}/auth-error?error=session_exchange`)
      }

      console.log('Code exchanged successfully, verifying session...')
      // Get the user session to verify everything worked
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('Session verification error:', sessionError || 'No session found')
        return NextResponse.redirect(`${requestUrl.origin}/auth-error?error=session_verification`)
      }

      console.log('Session verified successfully, redirecting to dashboard...')
      return response
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth-error?error=unexpected`)
    }
  }

  // No code present, redirect to error page
  console.error('No code present in callback URL')
  return NextResponse.redirect(`${requestUrl.origin}/auth-error?error=no_code`)
} 