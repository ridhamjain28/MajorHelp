import { createClient } from '@supabase/supabase-js';

// These should be configured in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yourapp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
