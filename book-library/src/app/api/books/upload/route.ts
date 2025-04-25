import { createServerClient } from '@supabase/ssr';
import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import { Database } from '@/lib/database.types';

// Define the type for book insertion
type BookInsert = Database['public']['Tables']['books']['Insert'];

// Mark route as dynamic and disable caching
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Handle CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // Initialize response with appropriate headers for CORS with credentials
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    // Get cookies using server-side client
    const cookieStore = await cookies();
    
    // Create Supabase client using server-side approach
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookie = cookieStore.get(name)?.value;
            console.log(`Getting cookie in upload: ${name}, exists: ${!!cookie}`);
            return cookie;
          },
          set(name: string, value: string, options: any) {
            try {
              console.log(`Setting cookie in upload: ${name}`);
              response.cookies.set({
                name,
                value,
                ...options
              });
            } catch (error) {
              console.error('Error setting cookie:', error);
            }
          },
          remove(name: string, options: any) {
            try {
              console.log(`Removing cookie in upload: ${name}`);
              response.cookies.set({
                name,
                value: '',
                ...options,
                maxAge: 0
              });
            } catch (error) {
              console.error('Error removing cookie:', error);
            }
          },
        },
      }
    );
    
    // Get user session to get user_id
    const { data, error: sessionError } = await supabase.auth.getSession();
    
    // Add CORS headers to an error response
    function createErrorResponse(message: string, status: number) {
      const errorResponse = NextResponse.json({ error: message }, { status });
      errorResponse.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
      errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      return errorResponse;
    }

    if (sessionError) {
      console.error('Session error:', sessionError);
      return createErrorResponse("Authentication error: " + sessionError.message, 401);
    }
    
    if (!data.session) {
      console.error('No authenticated session found');
      return createErrorResponse("Authentication required", 401);
    }
    
    const userId = data.session.user.id;
    console.log('Authenticated user ID:', userId);
    
    // Process form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return createErrorResponse("No file provided", 400);
    }
    
    // Get book metadata from form
    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const genre = formData.get("genre") as string;
    const yearStr = formData.get("year") as string;
    const year = parseInt(yearStr);
    
    // Optional fields
    const isbn = formData.get("isbn") as string || null;
    const pageCountStr = formData.get("pageCount") as string || null;
    const pageCount = pageCountStr ? parseInt(pageCountStr) : null;
    const language = formData.get("language") as string || null;
    const summary = formData.get("summary") as string || null;
    const publisher = formData.get("publisher") as string || null;
    
    // Check required fields - title and author should be sufficient
    if (!title || !author) {
      return createErrorResponse("Missing required fields (title and author)", 400);
    }
    
    // Use a fixed bucket name - let's avoid the 'books' name as it might be reserved
    const bucketName = 'book-files';
    let targetBucket = bucketName;
    
    try {
      // First try to list buckets to see if our bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        console.log(`Creating ${bucketName} storage bucket`);
        try {
          // Try to create the bucket
          const { data: newBucket, error: bucketError } = await supabase.storage.createBucket(bucketName, {
            public: true, // Make it public to avoid RLS issues
            fileSizeLimit: 20971520, // 20MB
          });
          
          if (bucketError) {
            console.error(`Failed to create ${bucketName} bucket:`, bucketError);
            // Try creating a user-specific bucket as fallback
            const userBucketName = `files-${userId.substring(0, 8)}`;
            console.log(`Attempting to create user-specific bucket: ${userBucketName}`);
            
            const { error: userBucketError } = await supabase.storage.createBucket(userBucketName, {
              public: true,
              fileSizeLimit: 20971520, // 20MB
            });
            
            if (userBucketError) {
              console.error(`Failed to create user bucket:`, userBucketError);
              return createErrorResponse("Could not create storage bucket", 500);
            } else {
              console.log(`Successfully created user bucket ${userBucketName}`);
              targetBucket = userBucketName;
            }
          } else {
            console.log(`Successfully created ${bucketName} bucket`);
          }
        } catch (bucketError) {
          console.error('Exception creating bucket:', bucketError);
          return createErrorResponse("Could not set up storage bucket", 500);
        }
      } else {
        console.log(`Bucket ${bucketName} already exists`);
      }
      
      // Upload PDF file to storage
      const timestamp = Date.now();
      const fileExt = "pdf";
      const filePath = `${userId}/${timestamp}.${fileExt}`;
      
      console.log(`Uploading file to ${targetBucket}/${filePath}`);
      const { data: fileData, error: fileError } = await supabase.storage
        .from(targetBucket)
        .upload(filePath, file);
        
      if (fileError) {
        console.error("Storage error:", fileError);
        return createErrorResponse("Failed to upload file", 500);
      }
      
      // Try to reset the schema cache
      try {
        await supabase.rpc('reset_schema_cache');
        console.log("Schema cache reset successful");
      } catch (cacheError) {
        console.error("Failed to reset schema cache:", cacheError);
        // Continue anyway
      }
      
      // Insert book record
      const bookInsert: BookInsert = {
        title,
        author,
        publisher,
        summary,
        file_url: `${targetBucket}/${filePath}`,
        cover_image_url: formData.get('coverImage')?.toString() || null,
        // Store additional metadata as JSON structure
        structure: {
          genre,
          year,
          isbn,
          pageCount,
          language
        }
      };
      
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .insert(bookInsert)
        .select()
        .single();
      
      if (bookError) {
        console.error("Database error:", bookError);
        console.error("Database error details:", JSON.stringify(bookError, null, 2));
        // Clean up the uploaded file
        await supabase.storage.from(targetBucket).remove([filePath]);
        return createErrorResponse("Failed to create book record", 500);
      }
      
      const jsonResponse = NextResponse.json({ 
        success: true, 
        book: bookData 
      });
      
      // Add CORS headers
      jsonResponse.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
      jsonResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      
      // Copy over Set-Cookie headers from the response
      const setCookieHeader = response.headers.get('Set-Cookie');
      if (setCookieHeader) {
        jsonResponse.headers.set('Set-Cookie', setCookieHeader);
      }
      
      return jsonResponse;
    } catch (error) {
      console.error("Upload error:", error);
      const errorResponse = NextResponse.json(
        { error: "Failed to process upload" },
        { status: 500 }
      );
      
      // Add CORS headers to error response
      errorResponse.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
      errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return errorResponse;
    }
  } catch (error) {
    console.error("Upload error:", error);
    const errorResponse = NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
    
    // Add CORS headers to error response
    errorResponse.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return errorResponse;
  }
} 