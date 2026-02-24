import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: ReturnType<typeof createClient>

// For MVP development, use dummy values when not configured
if (!supabaseUrl || !supabaseAnonKey ||
    supabaseUrl.includes('your_supabase') ||
    supabaseAnonKey.includes('your_supabase')) {
  supabase = createClient(
    'https://dummy.supabase.co',
    'dummy-anon-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }