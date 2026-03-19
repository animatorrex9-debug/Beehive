// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase is temporarily disabled to prioritize Firebase WebSocket stability in the iframe environment.
// It will be re-enabled during final deployment.
export const supabase: any = {
  storage: {
    from: () => ({
      upload: async () => ({ data: { path: 'disabled' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://via.placeholder.com/400?text=Supabase+Disabled' } })
    })
  }
};

export const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'proofs';
