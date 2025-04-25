"use client";

import { createBrowserClient } from '@supabase/ssr'
import { createContext, useContext, useEffect, useState } from 'react';

interface ProvidersProps {
  children: React.ReactNode;
}

// Create context for Supabase client
const SupabaseContext = createContext<ReturnType<typeof createBrowserClient> | null>(null);

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export function Providers({ children }: ProvidersProps) {
  const [isReady, setIsReady] = useState(false);
  
  // Create the Supabase client with cookie handling
  const [supabase] = useState(() => {
    console.log('Creating Supabase client...');
    
    // Get the domain safely
    let domain = 'localhost';
    if (typeof window !== 'undefined') {
      domain = window.location.hostname;
    }
    
    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        },
        cookieOptions: {
          name: "sb-ntuoceqwvkbitihavmeq-auth-token",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          domain,
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === "production"
        }
      }
    );
    return client;
  });

  // Check and refresh session on mount (client-side only)
  useEffect(() => {
    console.log('Provider mounted, checking session...');
    
    // Force app to render after a short timeout even if auth is slow
    const readyTimeout = setTimeout(() => {
      if (!isReady) {
        console.log("Forcing app to render after timeout");
        setIsReady(true);
      }
    }, 2000);

    const checkSession = async () => {
      try {
        console.log('Checking session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
        } else {
          console.log('Session state:', session ? 'authenticated' : 'not authenticated');
          if (session) {
            console.log('User ID:', session.user.id);
            console.log('Session expires at:', new Date(session.expires_at! * 1000).toISOString());
          }
        }
        setIsReady(true);
        clearTimeout(readyTimeout);
      } catch (err) {
        console.error('Failed to check session:', err);
        setIsReady(true);
      }
    };
    
    checkSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      console.log('Session state:', session ? 'authenticated' : 'not authenticated');
      if (session) {
        console.log('User ID:', session.user.id);
        console.log('Session expires at:', new Date(session.expires_at! * 1000).toISOString());
      }
    });
    
    return () => {
      subscription.unsubscribe();
      clearTimeout(readyTimeout);
    };
  }, [supabase, isReady]);

  return (
    <SupabaseContext.Provider value={supabase}>
      {isReady ? children : 
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-blue-600 font-medium">Loading BookStore...</p>
          </div>
        </div>
      }
    </SupabaseContext.Provider>
  );
} 