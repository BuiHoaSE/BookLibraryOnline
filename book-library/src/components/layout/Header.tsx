"use client";

import Link from "next/link";
import { BookOpen, User as UserIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupabase } from "../Providers";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser, Session, AuthChangeEvent } from "@supabase/supabase-js";

export function Header() {
  const supabase = useSupabase();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Force loading state to false after a maximum of 3 seconds
    // This prevents UI from being stuck in loading state if auth fails
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log("Force ending loading state after timeout");
        setIsLoading(false);
      }
    }, 3000);
    
    setLoadingTimeout(timeout);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (timeout) clearTimeout(timeout);
    }).catch((error: Error) => {
      console.error("Error getting session:", error);
      setIsLoading(false);
      if (timeout) clearTimeout(timeout);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log("Auth state changed:", event, session ? "has session" : "no session");
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, [supabase]);

  const handleSignIn = async () => {
    setIsLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href // Redirect back to current page
      }
    });
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsLoading(false);
    // Clear cache and prevent back navigation
    if (typeof window !== 'undefined') {
      window.location.href = '/';  // Use window.location instead of router to clear history
    }
  };

  const handleLibraryClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setIsLoading(true);
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/books` // Redirect to /books after auth
        }
      });
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-blue-50">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <Link href="/" className="text-xl font-bold text-blue-800">
            Book Store
          </Link>
        </div>
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-blue-600">
            Home
          </Link>
          <Link 
            href="/books" 
            className="text-sm font-medium transition-colors hover:text-blue-600"
            onClick={handleLibraryClick}
          >
            Library
          </Link>
        </div>
        
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm text-blue-600">Loading...</span>
          </div>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar>
                  <AvatarImage src={user.user_metadata.avatar_url || ""} alt={user.user_metadata.name || ""} />
                  <AvatarFallback>{(user.user_metadata.name as string)?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-blue-800 hidden sm:inline-block">
                  {user.user_metadata.name || "User"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user.user_metadata.name && <p className="font-medium">{user.user_metadata.name}</p>}
                    {user.email && (
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                onSelect={(event) => {
                  event.preventDefault();
                  handleSignOut();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={handleSignIn}
          >
            <UserIcon className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
} 