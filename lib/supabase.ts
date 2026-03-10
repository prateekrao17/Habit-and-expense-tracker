import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
})

// Test connection
if (typeof window !== 'undefined') {
  supabase
    .from('users')
    .select('count', { count: 'exact', head: true })
    .then(({ error }) => {
      if (error) {
        console.error('❌ Supabase connection failed:', error.message)
      } else {
        console.log('✅ Supabase connected successfully')
      }
    })
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