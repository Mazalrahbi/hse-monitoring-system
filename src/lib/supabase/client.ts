import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ksgoinbgtcnlxlitvedz.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZ29pbmJndGNubHhsaXR2ZWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDU5NTEsImV4cCI6MjA3MjMyMTk1MX0.qFaXdJdrBSuRtrKErTF8niNjK4HUSGuayqv4f1VfzrU'

// Validate configuration
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration:', { 
    url: !!supabaseUrl, 
    key: !!supabaseKey 
  });
  throw new Error('Supabase configuration is missing. Please check your environment variables.');
}

export const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// For backward compatibility
export const supabase = supabaseClient

// Test connection on initialization
supabaseClient.auth.getSession().catch((error) => {
  console.error('Supabase connection test failed:', error);
});
