import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Log configuration status
console.log('[Supabase] Configuration check:', {
  url: supabaseUrl ? '✓ Set' : '✗ Missing',
  key: supabaseAnonKey ? '✓ Set' : '✗ Missing',
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] ❌ Missing critical environment variables!')
  console.error('[Supabase] URL:', supabaseUrl || 'MISSING')
  console.error('[Supabase] Key:', supabaseAnonKey ? 'Set but hidden' : 'MISSING')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-application-name': 'life-tracker',
      },
    },
  }
)

console.log('[Supabase] Client initialized:', {
  url: supabaseUrl?.substring(0, 20) + '...',
  hasKey: !!supabaseAnonKey,
})