import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase is re-enabled for file uploads.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'proofs';
