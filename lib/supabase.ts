import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Canonical Supabase client for the whole app.
// Values come only from the deployment environment; there are no fallbacks.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Set them in Vercel (Project Settings -> Environment Variables) or in .env.local for local development.'
  )
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  }
})

// Backwards-compatible accessor for modules that previously used
// lib/supabase/client.ts. Returns the same single client instance.
export const createSupabaseClient = (): SupabaseClient => supabase

export interface User {
  id: string
  email: string
  username: string
  created_at: string
  last_login?: string
  mobile_no?: string | null
  auth_id?: string | null
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