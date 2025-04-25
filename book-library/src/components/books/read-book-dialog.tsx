"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import PDFJSReader from "./pdf-js-reader";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/components/Providers";
import { Toaster } from "sonner";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthError, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface ReadBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  bookId: number | string;
  onProgressSaved?: () => void;
}

export function ToasterProvider() {
  return <Toaster position="top-center" />;
}

export function ReadBookDialog({ open, onOpenChange, fileUrl, bookId, onProgressSaved }: ReadBookDialogProps) {
  const [initialPage, setInitialPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastPageRef = useRef<number>(1);
  const supabase = useSupabase();
  const [manualPage, setManualPage] = useState("");
  const [initialPageLoaded, setInitialPageLoaded] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [inputPage, setInputPage] = useState<string>("");
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if the component has been mounted to prevent unmounting on render errors
  const isMounted = useRef(true);
  
  // Effect to check authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        setIsAuthenticated(!!session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // Reset error state when dialog opens
  useEffect(() => {
    if (open) {
      setErrorMessage(null);
    }
  }, [open]);

  // Log all state changes for debugging
  useEffect(() => {
    console.log('[READ-DIALOG] State changed - initialPage:', initialPage, 'currentPage:', currentPage, 'lastPageRef:', lastPageRef.current);
  }, [initialPage, currentPage]);

  // Fetch the initial page from database when the dialog opens
  useEffect(() => {
    if (open && !initialPageLoaded) {
      setIsLoading(true);
      loadInitialPage()
        .then(() => {
          setInitialPageLoaded(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Error loading initial page:', err);
          setInitialPageLoaded(true);
          setIsLoading(false);
        });
    }
  }, [open]);

  // If authenticated but no initial page loaded, try to load it
  useEffect(() => {
    if (isAuthenticated && !initialPageLoaded && open) {
      loadInitialPage()
        .then(() => {
          setInitialPageLoaded(true);
        })
        .catch((err) => {
          console.error('Error loading initial page:', err);
          setInitialPageLoaded(true);
        });
    }
  }, [isAuthenticated, initialPageLoaded, open]);

  // Capture messages from PDF viewers about page changes
  useEffect(() => {
    if (!open) return;

    const handleMessage = (event: MessageEvent) => {
      // PDF.js and other viewers often send messages about page changes
      try {
        if (
          event.data && 
          typeof event.data === 'object' && 
          event.data.type === 'pagechange' && 
          typeof event.data.page === 'number'
        ) {
          console.log('[READ-DIALOG] PDF viewer reported page change via message:', event.data.page);
          setCurrentPage(event.data.page);
          lastPageRef.current = event.data.page;
        }
      } catch (err) {
        // Ignore errors
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [open]);

  // Track when the dialog closes to save reading progress
  useEffect(() => {
    if (open) {
      // Fetch the last read page when dialog opens
      loadInitialPage();
    } else if (initialPageLoaded) {
      // Save progress when dialog closes (only if we actually loaded a book)
      console.log('[READ-BOOK-DIALOG] Dialog closing - saving progress');
      console.log('[READ-BOOK-DIALOG] Current page to save:', currentPage);
      saveReadingProgress(currentPage);
    }
  }, [open, initialPageLoaded]);

  // Load initial page from database
  const loadInitialPage = async () => {
    try {
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.error('No user session found');
        setInitialPage(1);
        setCurrentPage(1);
        lastPageRef.current = 1;
        setManualPage("1");
        setInitialPageLoaded(true);
        setIsLoading(false);
        return;
      }

      // Get book details to know total pages
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('page_count')
        .eq('id', bookId)
        .single();

      if (bookError) {
        console.error('Error fetching book details:', bookError);
      }
      
      const totalPages = book?.page_count || 1;

      // Try to find user's reading history for this book
      const { data: readingHistory, error: historyError } = await supabase
        .from('user_reading_history')
        .select('current_page')
        .eq('user_id', session.user.id)
        .eq('book_id', bookId)
        .single();

      if (historyError && historyError.code !== 'PGRST116') { // PGRST116 is not found
        console.error('Error fetching reading history:', historyError);
      }
      
      // Use reading history if available, otherwise default to page 1
      const page = readingHistory?.current_page || 1;
      console.log(`[READ-DIALOG] Loaded initial page ${page} from user history`);
      
      setInitialPage(page);
      setCurrentPage(page);
      lastPageRef.current = page;
      setManualPage(page.toString());
      setInitialPageLoaded(true);
    } catch (err: any) {
      console.error('Error loading initial page:', err);
      setErrorMessage('Failed to load reading progress');
      // Set defaults on error
      setInitialPage(1);
      setCurrentPage(1);
      lastPageRef.current = 1;
      setManualPage("1");
      setInitialPageLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle page changes from PDF reader
  const handlePageChange = useCallback((pageNumber: number) => {
    console.log(`[ReadBookDialog] PDF reported page change to: ${pageNumber}`);
    setCurrentPage(pageNumber);
    lastPageRef.current = pageNumber;
  }, []);

  // Add a new ref to track if the dialog is closing due to user action
  const userInitiatedCloseRef = useRef(false);

  // Function to refresh the books list
  const refreshBooks = async () => {
    try {
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*');
      
      if (booksError) throw booksError;

      // Dispatch a custom event to notify the dashboard to refresh
      window.dispatchEvent(new CustomEvent('refreshBooks', { detail: booksData }));
    } catch (err) {
      console.error('Error refreshing books:', err);
    }
  };

  // Function to save reading progress
  const saveReadingProgress = async (page: number) => {
    // Prevent saving if component is unmounting
    if (!isMounted.current) {
      console.log('[READ-DIALOG] Skipping save as component is unmounting');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.error('No user session found');
        return;
      }

      // Get book details to calculate completion percentage
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('page_count')
        .eq('id', bookId)
        .single();

      if (bookError) {
        console.error('Error fetching book details:', bookError);
      }
      
      const totalPages = book?.page_count || 1;
      const completionPercentage = Math.round((page / totalPages) * 100);
      
      // Check if a reading history record already exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('user_reading_history')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('book_id', bookId)
        .single();
        
      // If record exists, update it; otherwise, insert a new one
      if (existingRecord) {
        const { error: updateError } = await supabase
          .from('user_reading_history')
          .update({
            current_page: page,
            total_pages: totalPages,
            last_read_at: new Date().toISOString(),
            completion_percentage: completionPercentage
          })
          .eq('id', existingRecord.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_reading_history')
          .insert({
            user_id: session.user.id,
            book_id: bookId,
            current_page: page,
            total_pages: totalPages,
            last_read_at: new Date().toISOString(),
            completion_percentage: completionPercentage
          });

        if (insertError) throw insertError;
      }

      // Also update the books table for backward compatibility
      const { error: bookUpdateError } = await supabase
        .from('books')
        .update({ 
          current_page: page,
          page_count: totalPages 
        })
        .eq('id', bookId);

      if (bookUpdateError) {
        console.warn('Error updating book record:', bookUpdateError);
      }

      // Call the onProgressSaved callback if provided
      if (onProgressSaved) {
        onProgressSaved();
      }
      
      console.log('[READ-DIALOG] Progress saved successfully for page:', page);
    } catch (err) {
      console.error('Error saving reading progress:', err);
      setErrorMessage('Failed to save reading progress');
    }
  };

  // Handle document loading error
  const handlePdfError = (error: any) => {
    console.error('[READ-DIALOG] PDF loading error:', error);
    
    // Only update state if component is still mounted
    if (!isMounted.current) {
      console.log('[READ-DIALOG] Error received but component is unmounting - ignoring');
      return;
    }
    
    let message = 'Failed to load PDF. The file may be corrupted or inaccessible.';
    
    // Check for specific error cases
    if (error && error.message) {
      if (error.message.includes('Unauthorized') || error.status === 401 || error.status === 403) {
        message = 'You do not have permission to access this file. Please log in or contact support.';
      } else if (error.message.includes('Worker task was terminated')) {
        message = 'PDF loading was interrupted. This may be due to memory limitations or browser issues. Please try refreshing the page.';
      } else if (error.message.includes('TextLayer task cancelled')) {
        // This is relatively benign, just log it
        console.log('[READ-DIALOG] TextLayer error (suppressed):', error.message);
        return; // Don't show error to user for this case
      }
    }
    
    // Set error message but DON'T close the dialog - let the user decide
    setErrorMessage(message);
    toast.error(message);
    
    // Don't automatically close the dialog on error
    // The user can still close it manually
  };

  // Update the handleClose function
  const handleClose = useCallback(async () => {
    userInitiatedCloseRef.current = true;
    const finalPage = lastPageRef.current;
    console.log(`[ReadBookDialog] Close requested with final page: ${finalPage}`);
    
    try {
      await saveReadingProgress(finalPage);
      console.log(`[ReadBookDialog] Progress saved successfully for page: ${finalPage}`);
      onOpenChange(false);
    } catch (error) {
      console.error(`[ReadBookDialog] Error during close operation:`, error);
      // Still close the dialog even if save fails
      onOpenChange(false);
    }
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('[READ-DIALOG] onOpenChange called with newOpen:', newOpen);
      
      if (!newOpen && open) {
        // This is called when the dialog is being closed
        // It could be from ESC key, clicking outside, or our close button
        const finalPage = Math.max(currentPage, lastPageRef.current);
        console.log('[READ-DIALOG] Dialog closing via onOpenChange - currentPage:', currentPage, 'lastPageRef:', lastPageRef.current, 'finalPage to save:', finalPage);
        
        // Call our explicit close handler which handles saving
        handleClose();
      } else {
        // For all other cases, just update the open state
        onOpenChange(newOpen);
      }
    }}>
      <DialogContent 
        className="max-w-screen-xl h-[90vh] p-0 gap-0"
        hideCloseButton
      >
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <DialogTitle>PDF Document Viewer</DialogTitle>
                
                {/* Manual page input removed as we now have it in the PDF reader control bar */}
              </div>

              {/* Close button only */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost" 
                  size="icon"
                  onClick={handleClose}
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="animate-spin h-12 w-12 border-4 border-primary rounded-full border-t-transparent mb-4"></div>
                <p className="text-muted-foreground">Loading PDF document...</p>
              </div>
            )}
            
            {!isLoading && errorMessage && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-red-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Cannot Load PDF</h3>
                <p className="text-muted-foreground mb-4 max-w-md">{errorMessage}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setErrorMessage('');
                      setIsLoading(true);
                      // Short timeout before retrying
                      setTimeout(() => setIsLoading(false), 500);
                    }}
                  >
                    Retry
                  </Button>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Reload Page
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Create a temporary anchor to download the file
                      const a = document.createElement('a');
                      a.href = fileUrl;
                      a.download = `book_${bookId}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                  >
                    Download PDF
                  </Button>
                  <Button onClick={handleClose} variant="default">
                    Close
                  </Button>
                </div>
              </div>
            )}
            
            {!isLoading && !errorMessage && (
              <div className="h-[80vh]">
                <PDFJSReader
                  fileUrl={fileUrl}
                  bookId={bookId}
                  initialPage={initialPage}
                  onPageChange={handlePageChange}
                  onClose={handleClose}
                  onError={handlePdfError}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 