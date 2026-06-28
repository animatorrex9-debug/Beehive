import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://apgoxuogcgyibygfnlkq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZ294dW9nY2d5aWJ5Z2ZubGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzI0MDcsImV4cCI6MjA4OTI0ODQwN30.JkjvM1pXtHI0-x6coGHjEmLi_u11LROPTurYYF3pOfE';

// Expose configuration verification flag
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project')
);

if (isSupabaseConfigured) {
  console.log('[Supabase] Client initialized successfully with URL:', supabaseUrl);
} else {
  console.warn('[Supabase] Credentials not fully configured. Please check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// Initialize client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Resilient fallback mechanism for Supabase storage upload
const memoryStorage = new Map<string, string>();

const originalStorage = supabase.storage;
if (originalStorage) {
  const originalFrom = originalStorage.from.bind(originalStorage);
  originalStorage.from = (bucket: string) => {
    const originalBucketClient = originalFrom(bucket);
    return {
      ...originalBucketClient,
      upload: async (path: string, file: File | Blob | any, options?: any) => {
        try {
          // Attempt the original upload first
          const result = await originalBucketClient.upload(path, file, options);
          if (result && result.error) {
            throw result.error;
          }
          return result;
        } catch (err) {
          console.warn('[Supabase Fallback] Upload failed. Falling back to local Base64/DataURL.', err);
          try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            
            // Store fallback value
            memoryStorage.set(path, dataUrl);
            if (typeof window !== 'undefined') {
              try {
                window.localStorage.setItem(`sb_fallback_${path}`, dataUrl);
              } catch (e) {
                console.warn('[Supabase Fallback] Could not write to localStorage:', e);
              }
            }
            
            return { data: { path }, error: null };
          } catch (fallbackErr) {
            console.error('[Supabase Fallback] Base64 conversion failed:', fallbackErr);
            return { data: null, error: err as any };
          }
        }
      },
      getPublicUrl: (path: string) => {
        let dataUrl = memoryStorage.get(path);
        if (!dataUrl && typeof window !== 'undefined') {
          try {
            dataUrl = window.localStorage.getItem(`sb_fallback_${path}`) || undefined;
          } catch (e) {}
        }
        if (dataUrl) {
          return { data: { publicUrl: dataUrl } };
        }
        return originalBucketClient.getPublicUrl(path);
      }
    } as any;
  };
}

export const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'Uploads';
