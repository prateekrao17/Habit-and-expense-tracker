import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL - using localStorage fallback')
}
if (!supabaseAnonKey) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY - using localStorage fallback')
}

let supabase: ReturnType<typeof createClient> | null = null

// Initialize Supabase if environment variables are configured
if (supabaseUrl && supabaseAnonKey && 
    !supabaseUrl.includes('your_supabase') && 
    !supabaseAnonKey.includes('your_supabase')) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export { supabase }