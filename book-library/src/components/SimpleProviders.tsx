"use client";

import { createBrowserClient } from '@supabase/ssr';
import { createContext, useContext, useState, useEffect } from 'react';

// Create context for Supabase client
const SupabaseContext = createContext<any>(null);

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export function SimpleProviders({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;
    
    try {
      // Create the client
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            flowType: 'pkce',
          }
        }
      );
      
      setClient(supabase);
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
    }
  }, []);

  // When no client exists yet (server-side rendering), just render children without context
  if (!client) {
    return <>{children}</>;
  }

  // Once client exists, provide it via context
  return (
    <SupabaseContext.Provider value={client}>
      {children}
    </SupabaseContext.Provider>
  );
} 