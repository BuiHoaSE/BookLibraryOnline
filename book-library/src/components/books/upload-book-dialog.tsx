"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabase } from "@/components/Providers";
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { useToast } from "@/components/ui/use-toast";
import { extractPDFData, PDFData } from '@/lib/pdf-processor';

interface BookMetadata {
  title: string;
  author: string;
  genre?: string;
  year?: number;
  isbn?: string;
  pageCount?: number;
  language?: string;
  summary?: string;
  publisher?: string;
}

interface FormState extends BookMetadata {
  coverImage: string;
  coverImageFile?: File;
}

interface UploadBookDialogProps {
  onUploadComplete?: () => void;
}

export function UploadBookDialog({ onUploadComplete }: UploadBookDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const supabase = useSupabase();
  const [formState, setFormState] = useState<FormState>({
    title: "",
    author: "",
    genre: "",
    year: undefined,
    isbn: "",
    pageCount: undefined,
    language: "",
    summary: "",
    publisher: "",
    coverImage: "",
  });
  const { toast } = useToast();
  const [pdfData, setPdfData] = useState<PDFData | null>(null);
  const [previewCoverImage, setPreviewCoverImage] = useState<string>("");

  useEffect(() => {
    // Check for session when component mounts
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      console.log('Initial session state:', session ? 'authenticated' : 'not authenticated');
      setSession(session);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state changed:', session ? 'authenticated' : 'not authenticated');
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    if (!session) {
      setError('Please sign in to upload books');
    } else {
      setError(null);
    }
  }, [session]);

  const handleCoverImageSelect = async (file: File) => {
    if (!session) {
      setError('Please sign in to upload images');
      return;
    }

    try {
      setError(null);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setPreviewCoverImage(previewUrl);
      
      // Store the file for later upload
      setFormState(prev => ({
        ...prev,
        coverImageFile: file
      }));

    } catch (error) {
      console.error('Error handling cover:', error);
      setError(error instanceof Error ? error.message : 'Failed to handle cover image');
    }
  };

  // Update paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!open) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            await handleCoverImageSelect(file);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [open]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        setFormState(prev => ({
          ...prev,
          title: "",
          author: "",
          genre: "",
          year: undefined,
          isbn: "",
          pageCount: undefined,
          language: "",
          summary: "",
          publisher: "",
        }));
        return;
      }

      setError(null);
      
      try {
        // Extract PDF data
        setExtracting(true);
        const pdfData = await extractPDFData(selectedFile);
        
        // Send extracted data to the server for metadata analysis
        const response = await fetch('/api/books/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            info: pdfData.info,
            text: pdfData.text,
            pageCount: pdfData.numPages,
            filename: selectedFile.name
          }),
          credentials: 'include'
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to analyze PDF');
        }

        const { metadata: extractedMetadata } = await response.json();
        
        // Update form with extracted metadata
        setFormState(prev => ({
          ...prev,
          title: extractedMetadata.title || pdfData.title,
          author: extractedMetadata.author || pdfData.author,
          genre: extractedMetadata.genre || '',
          year: extractedMetadata.year || undefined,
          isbn: extractedMetadata.isbn || '',
          pageCount: extractedMetadata.pageCount || pdfData.numPages,
          language: extractedMetadata.language || '',
          summary: extractedMetadata.summary || '',
          publisher: extractedMetadata.publisher || '',
        }));

        // Store the PDF data for upload
        setPdfData(pdfData);
      } catch (error) {
        console.error('Error processing PDF:', error);
        setError(error instanceof Error ? error.message : 'Failed to process PDF');
      } finally {
        setExtracting(false);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session || !pdfData) {
      setError('Missing session or PDF data');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      console.log('Starting upload process...');
      
      // Upload cover image if one was selected
      let coverUrl = "";
      if (formState.coverImageFile) {
        const coverFormData = new FormData();
        coverFormData.append('file', formState.coverImageFile);
        
        console.log('Uploading cover image...');
        const coverResponse = await fetch('/api/books/cover', {
          method: 'POST',
          body: coverFormData,
          credentials: 'include'
        });

        if (!coverResponse.ok) {
          const errorData = await coverResponse.json();
          throw new Error(`Failed to upload cover image: ${errorData.error || coverResponse.statusText}`);
        }

        const coverData = await coverResponse.json();
        coverUrl = coverData.url;
      }

      // Check if file already exists
      const { data: existingFiles } = await supabase.storage
        .from('books')
        .list(`${session.user.id}`);

      const fileExists = existingFiles?.some((file: { name: string }) => pdfData.file.name === file.name);
      
      if (fileExists) {
        toast({
          title: "File exists",
          description: "A file with this name already exists in your library.",
        });
        setError("Please choose a different file or rename the file before uploading.");
        return;
      }

      // Upload the book file to Supabase Storage
      console.log('Uploading PDF to Supabase storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('books')
        .upload(`${session.user.id}/${pdfData.file.name}`, pdfData.file);

      if (uploadError) {
        console.error('Storage upload error:', {
          message: uploadError.message,
          details: uploadError.details,
          statusCode: uploadError.statusCode,
          error: uploadError.error
        });
        throw uploadError;
      }

      console.log('PDF uploaded successfully:', uploadData);

      // Get the public URL for the uploaded book
      const { data: { publicUrl: bookUrl } } = supabase.storage
        .from('books')
        .getPublicUrl(uploadData.path);

      console.log('Book public URL:', bookUrl);

      // Check if book already exists in database
      const { data: existingBooks } = await supabase
        .from('books')
        .select()
        .eq('owner_id', session.user.id)
        .eq('file_name', pdfData.file.name)
        .single();

      if (existingBooks) {
        // Delete the uploaded file since we won't be using it
        await supabase.storage
          .from('books')
          .remove([`${session.user.id}/${pdfData.file.name}`]);

        toast({
          title: "Book exists",
          description: "This book is already in your library.",
        });
        setError("This book already exists in your library.");
        return;
      }

      // Create a new book record in the database
      console.log('Creating database record with data:', {
        title: formState.title,
        author: formState.author,
        publisher: formState.publisher || null,
        summary: formState.summary || null,
        file_url: bookUrl,
        cover_image_url: coverUrl,
        owner_id: session.user.id,
        page_count: formState.pageCount,
        structure: {
          isbn: formState.isbn,
          language: formState.language,
          genre: formState.genre,
          publicationYear: formState.year
        }
      });

      const { error: dbError } = await supabase
        .from('books')
        .insert({
          title: formState.title,
          author: formState.author,
          publisher: formState.publisher || null,
          summary: formState.summary || null,
          file_url: bookUrl,
          cover_image_url: coverUrl,
          owner_id: session.user.id,
          page_count: formState.pageCount,
          structure: {
            isbn: formState.isbn,
            language: formState.language,
            genre: formState.genre,
            publicationYear: formState.year
          }
        });

      if (dbError) {
        console.error('Database insert error:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        });
        throw dbError;
      }

      console.log('Book record created successfully');

      toast({
        title: "Success!",
        description: "Book uploaded successfully",
      });

      setOpen(false);
      setFormState({
        title: "",
        author: "",
        genre: "",
        year: undefined,
        isbn: "",
        pageCount: undefined,
        language: "",
        summary: "",
        publisher: "",
        coverImage: "",
      });
      setPdfData(null);
      onUploadComplete?.();

      // Clean up the preview URL
      if (previewCoverImage) {
        URL.revokeObjectURL(previewCoverImage);
      }

    } catch (error) {
      console.error('Upload error:', {
        name: error instanceof Error ? error.name : 'Unknown Error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        details: (error as any)?.details,
        code: (error as any)?.code
      });
      setError(error instanceof Error ? error.message : 'Failed to upload book');
      toast({
        title: "Error!",
        description: error instanceof Error ? error.message : 'Failed to upload book'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden md:flex">
          <BookPlus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload New Book</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-upload">PDF File</Label>
              <Input
                id="pdf-upload"
                name="file"
                type="file"
                accept=".pdf"
                className="cursor-pointer"
                disabled={uploading || extracting || generatingCover}
                required
                onChange={handleFileChange}
              />
              {extracting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting book information...
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formState.title}
                onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter book title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                name="author"
                value={formState.author}
                onChange={(e) => setFormState(prev => ({ ...prev, author: e.target.value }))}
                placeholder="Enter author name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Input
                id="genre"
                name="genre"
                value={formState.genre || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, genre: e.target.value }))}
                placeholder="Enter book genre"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Publication Year</Label>
              <Input
                id="year"
                name="year"
                type="number"
                min="1000"
                max={new Date().getFullYear()}
                value={formState.year || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, year: parseInt(e.target.value) || undefined }))}
                placeholder="Enter publication year"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                name="isbn"
                value={formState.isbn || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, isbn: e.target.value }))}
                placeholder="Enter ISBN"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageCount">Page Count</Label>
              <Input
                id="pageCount"
                name="pageCount"
                type="number"
                value={formState.pageCount || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, pageCount: parseInt(e.target.value) || undefined }))}
                placeholder="Enter page count"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                name="language"
                value={formState.language || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, language: e.target.value }))}
                placeholder="Enter language"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                name="publisher"
                value={formState.publisher || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, publisher: e.target.value }))}
                placeholder="Enter publisher"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <textarea
                id="summary"
                name="summary"
                value={formState.summary || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Book summary"
                className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Updated cover image section */}
            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image</Label>
              <div className="flex flex-col items-center gap-4">
                <div 
                  className="relative aspect-[2/3] w-48 mx-auto border rounded-lg overflow-hidden bg-muted hover:bg-muted/80 transition-colors"
                  onClick={() => document.getElementById('cover-upload')?.click()}
                  style={{ cursor: uploading ? 'wait' : 'pointer' }}
                >
                  {previewCoverImage ? (
                    <div className="w-full h-full">
                      <img
                        src={previewCoverImage}
                        alt="Book cover preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center p-4">
                        <BookPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          Click to upload or paste from clipboard
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-48">
                  <Input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleCoverImageSelect(file);
                      }
                    }}
                    disabled={uploading}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Click the box above to upload or paste an image from clipboard
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Supported: PNG, JPG, JPEG, GIF
                  </p>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Clear any error state
                  setError(null);
                  // Reset form state
                  setFormState({
                    title: "",
                    author: "",
                    genre: "",
                    year: undefined,
                    isbn: "",
                    pageCount: undefined,
                    language: "",
                    summary: "",
                    publisher: "",
                    coverImage: "",
                  });
                  setOpen(false);
                }}
                disabled={uploading || extracting || generatingCover}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading || extracting || generatingCover || !!error}
              >
                {uploading ? "Uploading..." : "Upload Book"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
} 