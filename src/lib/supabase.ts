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

export const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'Uploads';
