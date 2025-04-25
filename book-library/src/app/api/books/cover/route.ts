import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'covers'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const origin = req.headers.get('origin') || '*';

  // Set CORS headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, X-Client-Data',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  });

  try {
    // Initialize Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Omit<ResponseCookie, 'name' | 'value'>) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              console.error('Error setting cookie:', error)
            }
          },
          remove(name: string, options: Omit<ResponseCookie, 'name' | 'value'>) {
            try {
              cookieStore.delete(name)
            } catch (error) {
              console.error('Error deleting cookie:', error)
            }
          },
        },
      }
    );

    // Get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return new NextResponse(
        JSON.stringify({ error: 'Please sign in to upload images' }),
        { status: 401, headers }
      );
    }

    // Check if bucket exists and create it if it doesn't
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      const { error: createBucketError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
        fileSizeLimit: 5242880, // 5MB
      });

      if (createBucketError) {
        console.error('Error creating bucket:', createBucketError);
        return new NextResponse(
          JSON.stringify({ error: 'Failed to create storage bucket' }),
          { status: 500, headers }
        );
      }
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new NextResponse(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Please upload an image file' }),
        { status: 400, headers }
      );
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;

    // Upload the image
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to upload image' }),
        { status: 500, headers }
      );
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return new NextResponse(
      JSON.stringify({ url: publicUrl }),
      { headers }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
} 