import { createClient } from '@supabase/supabase-js'

// Vercel Supabase integration uses these variable names
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

console.log('[Supabase] Configuration check:', {
  url: supabaseUrl ? '✓ Set' : '✗ Missing',
  key: supabaseAnonKey ? '✓ Set' : '✗ Missing',
  urlPrefix: supabaseUrl?.substring(0, 30),
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] ❌ Missing critical credentials!')
  console.error('[Supabase] URL value:', supabaseUrl || 'NOT SET')
  console.error('[Supabase] Key value:', supabaseAnonKey ? 'SET (hidden)' : 'NOT SET')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'x-application-name': 'life-tracker',
    },
  },
})

// Test connection on initialization
if (typeof window === 'undefined') {
  // Only test connection on server-side initialization
  (async () => {
    try {
      console.log('[Supabase] Testing connection...')
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (error) {
        console.error('[Supabase] ❌ Connection test failed:', error.message)
      } else {
        console.log('[Supabase] ✅ Connected successfully')
      }
    } catch (err: any) {
      console.error('[Supabase] ❌ Connection test exception:', err?.message)
    }
  })()
}

export interface User {
  id: string
  email: string
  username: string
  created_at: string
  last_login?: string
  password_hash?: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  current_streak: number
  best_streak: number
  last_completed: string | null
  color: string
  created_at: string
}

export interface HabitCompletion {
  id: string
  habit_id: string
  user_id: string
  completion_date: string
  completed: boolean
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  amount: number
  category: string
  description: string
  expense_date: string
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  reminder_date: string | null
  reminder_sent: boolean
  tags: string[]
  pinned: boolean
  created_at: string
  updated_at: string
}