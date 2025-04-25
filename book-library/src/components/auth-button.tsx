'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { useSupabase } from './Providers'

export function AuthButton() {
  const router = useRouter()
  const supabase = useSupabase()
  const [isLoading, setIsLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<null | { authenticated: boolean; user?: any; message?: string; error?: string }>(null)

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    setIsLoading(false)
    router.refresh()
  }

  const checkAuthStatus = async () => {
    setIsLoading(true)
    try {
      // First check client-side auth
      const { data: clientAuth, error: clientError } = await supabase.auth.getSession()
      console.log('Client-side auth:', clientAuth)
      
      if (clientError) {
        console.error('Client auth error:', clientError)
        setAuthStatus({ authenticated: false, error: clientError.message })
        setIsLoading(false)
        return
      }
      
      // Then check server-side auth
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      })
      
      const data = await response.json()
      console.log('Server-side auth:', data)
      
      setAuthStatus(data)
    } catch (error) {
      console.error('Auth check error:', error)
      setAuthStatus({ 
        authenticated: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4">
        <Button onClick={handleSignIn} variant="outline" disabled={isLoading}>
          Sign In with Google
        </Button>
        <Button onClick={handleSignOut} variant="outline" disabled={isLoading}>
          Sign Out
        </Button>
      </div>
      
      <Button onClick={checkAuthStatus} variant="outline" size="sm" disabled={isLoading} className="mt-2">
        {isLoading ? "Checking..." : "Verify Auth Status"}
      </Button>
      
      {authStatus && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
          <p>Status: {authStatus.authenticated ? 'Authenticated ✅' : 'Not authenticated ❌'}</p>
          {authStatus.user && (
            <p>User: {authStatus.user.email}</p>
          )}
          {authStatus.message && (
            <p>Message: {authStatus.message}</p>
          )}
          {authStatus.error && (
            <p className="text-red-500">Error: {authStatus.error}</p>
          )}
        </div>
      )}
    </div>
  )
} 