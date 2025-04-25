import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Loader2, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { PDFJS_WORKER_URL, PDF_OPTIONS } from '@/lib/pdf-config';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}${PDFJS_WORKER_URL}`;
}

interface PDFJSReaderProps {
  fileUrl: string;
  bookId: string | number;
  initialPage?: number;
  onPageChange?: (pageNumber: number) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

// Add error boundary class
class PDFErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PDF-READER] Error caught by boundary:', error);
    console.error('[PDF-READER] Component stack:', errorInfo.componentStack);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="text-red-500 mb-4">
            <AlertCircle size={64} />
          </div>
          <h3 className="text-xl font-bold mb-2">PDF Rendering Error</h3>
          <p className="text-muted-foreground mb-2 max-w-md">
            {this.state.error?.message || 'An error occurred while rendering the PDF'}
          </p>
          <div className="text-xs text-muted-foreground mb-4">
            This might be due to a problem with the PDF file or browser limitations.
          </div>
          <Button 
            variant="outline" 
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const PDFJSReader: React.FC<PDFJSReaderProps> = ({
  fileUrl,
  bookId,
  initialPage = 1,
  onPageChange,
  onClose,
  onError,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(initialPage || 1);
  const [scale, setScale] = useState<number>(1.0);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [documentError, setDocumentError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [inputPage, setInputPage] = useState<string>('');
  const [workerInitialized, setWorkerInitialized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Add ref to track unmounting
  const isInternalUnmountRef = useRef(false);
  
  // Use a ref to track if we've called onClose to prevent multiple calls
  const hasCalledOnCloseRef = useRef<boolean>(false);
  
  // Capture previous page for comparison
  const prevPageRef = useRef<number>(initialPage || 1);
  
  // Track loading status for each page
  const [loadingPages, setLoadingPages] = useState<Record<number, boolean>>({});
  
  // Only render a window of pages around the current page for better performance
  const pagesToRender = useMemo(() => {
    if (!numPages) return [];
    
    // Define how many pages to render on each side of the current page
    const pagesAround = 2;
    const pageNumbers: number[] = [];
    
    // CRITICAL: Always include the initialPage if specified
    if (initialPage && initialPage > 0 && initialPage <= numPages) {
      pageNumbers.push(initialPage);
    }
    
    // Always include the first and last page
    if (!pageNumbers.includes(1)) pageNumbers.push(1); 
    if (numPages > 1 && !pageNumbers.includes(numPages)) pageNumbers.push(numPages);
    
    // Add pages around the current page
    for (let i = Math.max(2, pageNumber - pagesAround); i <= Math.min(numPages - 1, pageNumber + pagesAround); i++) {
      if (!pageNumbers.includes(i)) {
        pageNumbers.push(i);
      }
    }
    
    // Sort page numbers
    return pageNumbers.sort((a, b) => a - b);
  }, [numPages, pageNumber, initialPage]);
  
  console.log(`[PDF-READER] Initialized with bookId=${bookId}, initialPage=${initialPage}`);

  // Memoize the options object to prevent unnecessary reloads
  const pdfOptions = useMemo(() => ({
    ...PDF_OPTIONS,
  }), []);

  // Group all useEffect hooks together at the top level
  useEffect(() => {
    const initializeWorker = async () => {
      try {
        if (typeof window !== 'undefined' && !workerInitialized) {
          pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}${PDFJS_WORKER_URL}`;
          setWorkerInitialized(true);
        }
      } catch (error) {
        console.error('[PDF-READER] Error initializing worker:', error);
        setWorkerInitialized(false);
        if (onError) {
          onError(new Error('Failed to initialize PDF worker'));
        }
      }
    };
    initializeWorker();
  }, [onError, workerInitialized]);

  // Loading state component
  const renderLoadingState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2">Initializing PDF viewer...</p>
      </div>
    </div>
  );

  useEffect(() => {
    // Set initial page on mount
    if (initialPage && initialPage > 0) {
      console.log(`[PDF-READER] Setting initial page to ${initialPage}`);
      setPageNumber(initialPage);
      prevPageRef.current = initialPage;
    }
    
    // Add event listener for beforeunload to save progress
    const handleBeforeUnload = () => {
      if (!hasCalledOnCloseRef.current && onClose) {
        console.log('[PDF-READER] Window closing - calling onClose handler');
        hasCalledOnCloseRef.current = true;
        onClose();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // IMPORTANT: Log but DO NOT CALL onClose here at all!
      // This function is being called during normal component lifecycle
      console.log('[PDF-READER] Component in useEffect cleanup - NOT closing dialog');
    };
  }, [initialPage]);

  // Instead, we'll add a separate useEffect specifically for handling user-initiated closes
  useEffect(() => {
    // This function runs only when the user explicitly clicks the close button
    // It's controlled by the hasCalledOnCloseRef ref
    return () => {
      if (hasCalledOnCloseRef.current && onClose) {
        console.log('[PDF-READER] Handling explicit close action');
        // onClose has already been called by the button click handler
      }
    };
  }, [onClose]);

  // Effect to notify parent component of page changes
  useEffect(() => {
    // Don't trigger the callback during first render or when page hasn't actually changed
    if (prevPageRef.current !== pageNumber) {
      console.log(`[PDF-READER] Page changed from ${prevPageRef.current} to ${pageNumber}`);
      
      // Update the ref to the current page
      prevPageRef.current = pageNumber;
      
      // Notify parent component if callback exists
      if (onPageChange) {
        console.log(`[PDF-READER] Calling onPageChange with page ${pageNumber}`);
        onPageChange(pageNumber);
      }
    }
  }, [pageNumber, onPageChange]);

  // Modify onDocumentLoadSuccess to ensure initialPage is strictly honored
  const onDocumentLoadSuccess = useCallback(({ numPages, pdfInfo }: any) => {
    console.log(`[PDF-READER] Document loaded - ${numPages} pages, ID: ${bookId}, initialPage: ${initialPage}`);
    
    // Mark any subsequent unmount as internal (due to state update)
    isInternalUnmountRef.current = true;
    
    // Update state
    setNumPages(numPages);
    setPdfDocument(pdfInfo);
    setIsLoading(false); // Make sure loading indicator is hidden
    
    // CRITICAL FIX: Only render pages after we've properly set the initial page
    // This fixes the issue where incorrect pages are shown initially
    if (initialPage && initialPage > 0 && initialPage <= numPages) {
      console.log(`[PDF-READER] STRICTLY setting page to initial value ${initialPage} after document load`);
      
      // Force page number update with short delay to ensure proper timing
      setTimeout(() => {
        // First update state
        setPageNumber(initialPage);
        prevPageRef.current = initialPage;
        
        // Then scroll to the page
        setTimeout(() => {
          const container = containerRef.current;
          if (container) {
            // Try both approaches to find the target page
            const targetPage = container.querySelector(`[data-page-number="${initialPage}"]`) || 
                              container.querySelector(`#pdf-page-${initialPage}`);
            
            if (targetPage) {
              console.log(`[PDF-READER] Found and scrolling to initial page ${initialPage}`);
              targetPage.scrollIntoView({ behavior: 'auto', block: 'start' });
            } else {
              console.error(`[PDF-READER] Could not find element for initial page ${initialPage}`);
              
              // As fallback, try to force page rendering again
              setPageNumber(1); // Reset to force re-render
              setTimeout(() => {
                console.log(`[PDF-READER] Fallback: retrying to set page to ${initialPage}`);
                setPageNumber(initialPage);
              }, 100);
            }
          }
        }, 150);
      }, 100);
    }
    
    // Reset internal unmount flag after a delay
    setTimeout(() => {
      isInternalUnmountRef.current = false;
      console.log('[PDF-READER] Reset internal unmount flag after successful load');
    }, 1000);
    
    // Don't trigger any callbacks here that might cause close
    console.log('[PDF-READER] Document load complete - NOT calling onClose');
  }, [bookId, initialPage]);

  // Update the hook for tracking page visibility
  useEffect(() => {
    if (!containerRef.current || isLoading || !numPages) return;
    
    const container = containerRef.current;
    let observer: IntersectionObserver;
    let rafId: number | null = null;
    let isUserScrolling = false;
    let scrollTimeout: NodeJS.Timeout;
    
    const checkVisiblePage = () => {
      if (!container || isUserScrolling) return;
      
      // CRITICAL FIX: Check if we're near the end of the document
      // If we're past 90% of the document, don't auto-detect pages
      if (numPages && pageNumber > numPages * 0.9) {
        console.log(`[PDF-READER] Skipping auto page detection near end of document (page ${pageNumber})`);
        return;
      }
      
      // Track all visible pages with their visibility percentage
      const pageWrappers = container.querySelectorAll('[data-page-number]');
      if (!pageWrappers.length) {
        console.log('[PDF-READER] No pages found with data-page-number attribute');
        return;
      }
      
      let maxVisibility = 0;
      let mostVisiblePage = pageNumber;
      
      // Calculate which page is most visible
      pageWrappers.forEach((wrapper) => {
        const rect = wrapper.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate vertical overlap between the page and container
        const topOverlap = Math.max(rect.top, containerRect.top);
        const bottomOverlap = Math.min(rect.bottom, containerRect.bottom);
        
        // Check if there's any vertical overlap
        if (bottomOverlap > topOverlap) {
          const overlapHeight = bottomOverlap - topOverlap;
          const visiblePercent = overlapHeight / rect.height;
          
          if (visiblePercent > maxVisibility) {
            maxVisibility = visiblePercent;
            const pageNum = parseInt(wrapper.getAttribute('data-page-number') || '1', 10);
            
            // CRITICAL FIX: Never automatically jump to last few pages
            if (numPages && pageNum > numPages - 5) {
              console.log(`[PDF-READER] Ignoring last pages detection (page ${pageNum})`);
              return;
            }
            
            mostVisiblePage = pageNum;
          }
        }
      });
      
      // Only update page if different and visibility is significant
      if (mostVisiblePage !== pageNumber && maxVisibility > 0.3) {
        // CRITICAL FIX: Prevent any large jumps in page numbers
        const pageJump = Math.abs(mostVisiblePage - pageNumber);
        
        // Only allow sequential navigation with small jumps (at most 2 pages)
        if (pageJump <= 2) {
          console.log(`[PDF-READER] Most visible page is ${mostVisiblePage} (visibility: ${maxVisibility.toFixed(2)})`);
          
          // Store previous page
          prevPageRef.current = pageNumber;
          
          // Update current page
          setPageNumber(mostVisiblePage);
        } else {
          console.log(`[PDF-READER] Ignoring large page jump from ${pageNumber} to ${mostVisiblePage} (${pageJump} pages)`);
        }
      }
    };
    
    // Run check when scrolling stops
    const handleScroll = () => {
      isUserScrolling = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // CRITICAL FIX: Add an additional check to prevent jumps during rapid scrolling
      const currentScrollTop = container.scrollTop;
      const maxScrollTop = container.scrollHeight - container.clientHeight;
      
      // If we're scrolling near the bottom of the document, don't auto-detect pages
      if (currentScrollTop > maxScrollTop * 0.9) {
        console.log('[PDF-READER] Ignoring scroll detection near end of document');
        return;
      }
      
      // Set new timeout
      scrollTimeout = setTimeout(() => {
        isUserScrolling = false;
        
        // CRITICAL FIX: Add another guard against last pages detection
        if (numPages && pageNumber > numPages * 0.9) {
          console.log(`[PDF-READER] Skipping page detection after scroll for page ${pageNumber} (near end)`);
          return;
        }
        
        rafId = requestAnimationFrame(() => {
          checkVisiblePage();
          rafId = null;
        });
      }, 150); // Wait for scroll to finish
    };
    
    // Set up scroll event for tracking page visibility
    container.addEventListener('scroll', handleScroll);
    
    // Initial check after a short delay
    setTimeout(checkVisiblePage, 300);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [isLoading, numPages, pageNumber]);

  // Add function to save book progress
  const saveBookProgress = useCallback(() => {
    // Ensure we send the correct current page when saving
    if (bookId && pageNumber > 0) {
      console.log(`[PDF-READER] Saving reading progress: bookId=${bookId}, page=${pageNumber}`);
      // This assumes onPageChange is used for saving progress
      if (onPageChange) {
        onPageChange(pageNumber);
      }
    }
  }, [bookId, pageNumber, onPageChange]);

  // Add an effect to save on unmount
  useEffect(() => {
    return () => {
      if (!isInternalUnmountRef.current && !hasCalledOnCloseRef.current) {
        console.log('[PDF-READER] Component unmounting naturally, saving final page:', pageNumber);
        saveBookProgress();
      }
    };
  }, [saveBookProgress]);

  // Enhanced change page function that also scrolls to the page
  const changePage = useCallback((offset: number) => {
    const newPageNumber = pageNumber + offset;
    if (newPageNumber >= 1 && newPageNumber <= (numPages || 1)) {
      console.log(`[PDF-READER] User navigated from page ${pageNumber} to ${newPageNumber}`);
      setPageNumber(newPageNumber);
      
      // Scroll to the selected page
      setTimeout(() => {
        const container = containerRef.current;
        if (container) {
          const targetPage = container.querySelector(`[data-page-number="${newPageNumber}"]`);
          if (targetPage) {
            targetPage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 50);
    }
  }, [pageNumber, numPages]);

  const handleZoom = (zoomFactor: number) => {
    setScale(Math.max(0.5, Math.min(2.5, scale + zoomFactor)));
  };

  // Update handleCloseClick to use the saveBookProgress function
  const handleCloseClick = useCallback(() => {
    if (hasCalledOnCloseRef.current) {
      console.log('[PDF-READER] Already closing, ignoring duplicate close request');
      return;
    }
    
    // Mark as closing to prevent duplicate calls
    hasCalledOnCloseRef.current = true;
    console.log('[PDF-READER] Close button clicked, saving page:', pageNumber);
    
    // Save progress first
    saveBookProgress();
    
    // Then call onClose
    if (onClose) {
      console.log('[PDF-READER] Calling onClose from close button');
      onClose();
    }
  }, [onClose, pageNumber, saveBookProgress]);

  // Handle document loading error with more detailed diagnostics
  const handleDocumentError = useCallback((error: Error) => {
    console.error('[PDF-READER] Error loading document:', error.message);
    console.error('[PDF-READER] Error details:', {
      name: error.name,
      stack: error.stack,
      fileUrl: fileUrl
    });
    setDocumentError(error);
    setIsLoading(false); // Make sure we're not showing the loading indicator
    setRetryCount(prev => prev + 1);
    
    // Don't pass the error to parent component immediately - this might cause dialog closure
    // Instead, show our own error UI first
    // onError?.(error);
  }, [fileUrl]);

  // Track which pages have loaded
  const handlePageLoadSuccess = useCallback((pageIndex: number) => {
    setLoadingPages(prev => ({
      ...prev,
      [pageIndex]: false
    }));
    console.log(`[PDF-READER] Page ${pageIndex} loaded successfully`);
  }, []);

  // Track which pages are loading
  const handlePageLoadStart = useCallback((pageIndex: number) => {
    setLoadingPages(prev => ({
      ...prev,
      [pageIndex]: true
    }));
    console.log(`[PDF-READER] Page ${pageIndex} started loading`);
  }, []);

  // Update input when page changes
  useEffect(() => {
    setInputPage(pageNumber.toString());
  }, [pageNumber]);
  
  // Handle manual page input
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPage(e.target.value);
  };
  
  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newPage = parseInt(inputPage);
      if (!isNaN(newPage) && newPage > 0 && numPages && newPage <= numPages) {
        setPageNumber(newPage);
      } else {
        // Reset input to current page on invalid input
        setInputPage(pageNumber.toString());
      }
    }
  };

  // Add function to handle PDF download
  const handleDownload = useCallback(() => {
    console.log('[PDF-READER] Initiating PDF download');
    try {
      // Create a temporary anchor to download the file
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = `book_${bookId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('[PDF-READER] Error downloading PDF:', error);
    }
  }, [fileUrl, bookId]);

  // Function to retry loading the document after an error
  const handleRetry = useCallback(() => {
    console.log('[PDF-READER] Retrying document load');
    setDocumentError(null);
    setRetryCount(prev => prev + 1);
    
    // Force reinitialize the worker with local file
    try {
      if (typeof window !== 'undefined') {
        const baseUrl = window.location.origin;
        pdfjs.GlobalWorkerOptions.workerSrc = `${baseUrl}/pdf-worker/pdf.worker.min.mjs`;
        console.log('[PDF-READER] Re-initialized worker for retry');
      }
    } catch (error) {
      console.error('[PDF-READER] Error reinitializing worker on retry:', error);
    }
  }, []);

  // Add callback for page render to detect visible page
  const onPageRenderSuccess = useCallback((pageIndex: number) => {
    // This is called when each page is successfully rendered
    console.log(`[PDF-READER] Page ${pageIndex} rendered successfully`);
  }, []);

  // Add a custom error handler for text layer errors
  const handleTextLayerError = useCallback((error: Error) => {
    // Log but don't show to user as this is typically benign
    console.log('[PDF-READER] Text layer error (suppressed):', error.message);
    // Don't propagate this error to prevent component crashes
  }, []);

  // Update fullscreen handler to target the container
  const handleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('[PDF-READER] Fullscreen error:', error);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === container);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Add wheel zoom handler
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      const zoomFactor = 0.1;
      
      setScale(prevScale => {
        const newScale = delta > 0 
          ? Math.min(2.5, prevScale + zoomFactor)
          : Math.max(0.5, prevScale - zoomFactor);
        return newScale;
      });
    }
  }, []);

  // Add and remove wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  return (
    <div className={`relative h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-2">Loading PDF...</p>
            {loadingProgress > 0 && (
              <p className="text-sm text-muted-foreground">{Math.round(loadingProgress * 100)}%</p>
            )}
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center p-2 border-b bg-background/95 backdrop-blur-sm shadow-md">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => changePage(-1)} 
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center">
            <span className="text-sm mr-2">Page</span>
            <Input
              type="text"
              value={inputPage}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputKeyDown}
              className="w-16 h-8 text-sm text-center"
              aria-label="Go to page"
            />
            <span className="text-sm ml-2">of {numPages || '?'}</span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => changePage(1)} 
            disabled={numPages === null || pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleZoom(-0.1)} title="Zoom Out (Ctrl + Mouse Wheel)">
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          
          <Button variant="outline" size="sm" onClick={() => handleZoom(0.1)} title="Zoom In (Ctrl + Mouse Wheel)">
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={handleFullscreen}>
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleCloseClick}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-auto p-4" 
        ref={containerRef}
        onContextMenu={(e) => {
          // Prevent context menu when using Ctrl + wheel
          if (e.ctrlKey) {
            e.preventDefault();
          }
        }}
      >
        {!workerInitialized && !documentError ? (
          renderLoadingState()
        ) : documentError ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Error Loading PDF</h3>
            <p className="text-muted-foreground mb-2 max-w-md">
              {documentError.message}
            </p>
            <div className="text-xs text-muted-foreground mb-4">
              This may be due to network issues or problems with the PDF viewer.
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" onClick={handleRetry}>
                Try Again
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                Download PDF
              </Button>
              <Button onClick={handleCloseClick} variant="default">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <PDFErrorBoundary onError={(error) => {
            console.error('[PDF-READER] Error caught by boundary:', error);
          }}>
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={handleDocumentError}
              onLoadProgress={({ loaded, total }) => {
                console.log(`[PDF-READER] Loading progress: ${loaded}/${total} bytes (${Math.round(loaded/total*100)}%)`);
                setLoadingProgress(loaded / total);
              }}
              loading={null}
              className="flex-1 mt-2"
              options={pdfOptions}
              externalLinkTarget="_blank"
              key={`pdf-doc-${retryCount}`}
              onItemClick={({ pageNumber }) => {
                if (pageNumber) {
                  console.log(`[PDF-READER] Internal link clicked, navigating to page ${pageNumber}`);
                  // Update both state and ref immediately
                  setPageNumber(pageNumber);
                  prevPageRef.current = pageNumber;
                  
                  // Find and scroll to the target page with a small delay
                  setTimeout(() => {
                    const container = containerRef.current;
                    if (container) {
                      const targetPage = container.querySelector(`[data-page-number="${pageNumber}"]`);
                      if (targetPage) {
                        targetPage.scrollIntoView({ behavior: 'auto', block: 'start' });
                      }
                    }
                  }, 50);
                }
              }}
            >
              {numPages && pagesToRender.map((pageIndex) => (
                <div 
                  key={`page_${pageIndex}`}
                  className={`mb-4 ${isFullscreen ? 'flex justify-center' : ''}`}
                  data-page-number={pageIndex}
                  id={`pdf-page-${pageIndex}`}
                >
                  <Page 
                    pageNumber={pageIndex} 
                    scale={scale}
                    className="shadow-md"
                    renderTextLayer={false}
                    renderAnnotationLayer={true}
                    onLoadSuccess={() => handlePageLoadSuccess(pageIndex)}
                    onRenderSuccess={() => onPageRenderSuccess(pageIndex)}
                    onLoadStart={() => handlePageLoadStart(pageIndex)}
                    onRenderError={handleTextLayerError}
                    data-page-number={pageIndex}
                    loading={
                      <div className="flex items-center justify-center h-[300px] w-full bg-muted/20">
                        <div className="text-center">
                          <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent mx-auto mb-2"></div>
                          <div className="text-xs text-muted-foreground">Loading page {pageIndex}...</div>
                        </div>
                      </div>
                    }
                  />
                </div>
              ))}
            </Document>
          </PDFErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default PDFJSReader; 