import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from './supabase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets a public URL for a book file stored in Supabase storage
 * Handles different formats of file_url
 */
export function getBookFileUrl(fileUrl: string | null | undefined): string {
  console.log('Original fileUrl:', fileUrl);
  
  if (!fileUrl) {
    console.log('No fileUrl provided');
    return '';
  }

  try {
    // If it's already a fully qualified URL, return it
    if (fileUrl.startsWith('http')) {
      console.log('Using already qualified URL');
      return fileUrl;
    }
    
    // Check for a full Supabase storage URL pattern
    if (fileUrl.includes('storage/v1/object/public/')) {
      console.log('Using existing storage URL');
      return fileUrl;
    }
    
    // Handle "bucket_name/path/to/file.pdf" format
    if (fileUrl.includes('/')) {
      const [bucketName, ...pathParts] = fileUrl.split('/');
      const filePath = pathParts.join('/');
      const publicUrl = supabase.storage.from(bucketName).getPublicUrl(filePath).data.publicUrl;
      console.log(`Generated URL from "${bucketName}/${filePath}":`, publicUrl);
      return publicUrl;
    }
    
    // Try with default bucket if no bucket specified
    const publicUrl = supabase.storage.from('book-files').getPublicUrl(fileUrl).data.publicUrl;
    console.log('Generated URL with default bucket:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error generating file URL:', error);
    console.error('Original fileUrl was:', fileUrl);
    return '';
  }
}
