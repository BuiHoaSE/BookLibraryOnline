"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookDashboard from "@/components/book-dashboard";
import { useSupabase } from "@/components/Providers";

export default function BooksPage() {
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');  // Redirect to home if not authenticated
      }
    };

    checkAuth();
  }, [supabase, router]);

  return <BookDashboard />;
} 