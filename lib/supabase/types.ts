// TypeScript types for Supabase database schema

export interface User {
  id: string
  email: string
  username: string
  password_hash: string
  email_verified: boolean
  created_at: string
  last_login: string
}

export interface OtpCode {
  id: string
  email: string
  otp_code: string
  purpose: 'signup' | 'password_reset'
  expires_at: string
  used: boolean
  created_at: string
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
  description: string | null
  expense_date: string
  created_at: string
}

export type GoalType = 'series' | 'duration' | 'count'
export type HealthCategory = 'fitness' | 'meals' | 'sunlight' | 'screentime'

export interface HabitSeries {
  id: string
  user_id: string
  habit_name: string
  current_sequence: number
  best_sequence: number
  last_ticked_at: string | null
  goal_type: GoalType
  color: string
  target_number: number | null
  created_at: string
  updated_at: string
}

export interface DailyLog {
  id: string
  user_id: string
  habit_id: string
  log_date: string
  sequence_number: number
  completed: boolean
  notes: string | null
  created_at: string
}

export interface HealthTracking {
  id: string
  user_id: string
  log_date: string
  category: HealthCategory
  value: Record<string, any> // JSONB type
  created_at: string
  updated_at: string
}

export interface QuickNote {
  id: string
  user_id: string
  content: string
  tags: string[]
  pinned: boolean
  created_at: string
  updated_at: string
}

// Helper type for habit with recent logs
export interface HabitWithLogs extends HabitSeries {
  recent_logs?: DailyLog[]
}
