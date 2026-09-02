import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo-nextaura.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key-nextaura-2026';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = () => {
  return (
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://demo-nextaura.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
};
