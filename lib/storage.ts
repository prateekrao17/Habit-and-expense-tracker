import { supabase } from './supabase'
import { getCurrentUserId } from './auth'

export interface Habit {
  id: string
  name: string
  current_streak: number
  best_streak: number
  last_completed: string
  color?: string
  completions?: Array<{ date: string }>
}

export interface Expense {
  id: string
  amount: number
  category: string
  description: string
  date?: string
  expense_date: string
  created_at?: string
}

export let EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Entertainment',
  'Bills',
  'Rent',
  'Trip',
  'Health',
  'Shopping',
  'Education',
  'Investment',
  'Other'
]

function getUserKey(baseKey: string, userId?: string): string {
  const id = userId || getCurrentUserId()
  if (!id) return baseKey
  return `${baseKey}_user_${id}`
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

function isDateAllowed(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)
  
  // Calculate 3 days ago
  const threeDaysAgo = new Date(today)
  threeDaysAgo.setDate(today.getDate() - 3)
  
  // Date must be between 3 days ago and today (inclusive)
  return checkDate >= threeDaysAgo && checkDate <= today
}

export function isDateAllowedExport(dateString: string): boolean {
  return isDateAllowed(dateString)
}

// Helper to generate date strings
function getDateStr(date: Date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

// Helper to get week dates
export function getCurrentWeekDates(): string[] {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const firstDay = new Date(today)
  firstDay.setDate(today.getDate() - dayOfWeek)
  
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(firstDay)
    date.setDate(firstDay.getDate() + i)
    dates.push(getDateStr(date))
  }
  return dates
}

// Get all dates in a month
export function getMonthDates(year: number, month: number): string[] {
  const dates: string[] = []
  const lastDay = new Date(year, month + 1, 0).getDate()
  
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day)
    dates.push(getDateStr(date))
  }
  return dates
}

// Get month info for year view
export function getYearMonths(year: number): Array<{ month: number; name: string }> {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  return months.map((name, index) => ({
    month: index,
    name
  }))
}

// Habits
export async function getHabits(): Promise<Habit[]> {
  const userId = getCurrentUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getHabits] Error:', error)
    return []
  }

  console.log('[getHabits] Found', data?.length || 0, 'habits')
  return data || []
}

export async function addHabit(name: string): Promise<Habit | null> {
  const userId = getCurrentUserId()
  if (!userId) {
    console.error('[addHabit] No user ID found')
    return null
  }

  console.log('[addHabit] Creating habit for user:', userId)

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      name,
      current_streak: 0,
      best_streak: 0,
      color: '#3b82f6'
    })
    .select()
    .single()

  if (error) {
    console.error('[addHabit] Error:', error)
    return null
  }

  console.log('[addHabit] Success:', data)
  return data
}

export async function tickHabit(habitId: string, date?: string): Promise<boolean> {
  const userId = getCurrentUserId()
  if (!userId) return false

  const today = new Date().toISOString().split('T')[0]
  const dateToTick = date || today

  // Validate date is allowed
  if (!isDateAllowed(dateToTick)) {
    console.log('[tickHabit] Date not allowed:', dateToTick)
    alert('You can only mark habits for today or the past 3 days')
    return false
  }

  console.log('[tickHabit] Ticking habit:', habitId, 'for date:', dateToTick)

  // Check if already completed
  const { data: existing } = await supabase
    .from('habit_completions')
    .select('id')
    .eq('habit_id', habitId)
    .eq('completion_date', dateToTick)
    .single()

  if (existing) {
    console.log('[tickHabit] Already completed')
    return true
  }

  // Add completion
  const { error: insertError } = await supabase
    .from('habit_completions')
    .insert({
      habit_id: habitId,
      user_id: userId,
      completion_date: dateToTick,
      completed: true
    })

  if (insertError) {
    console.error('[tickHabit] Error:', insertError)
    return false
  }

  // Update streak
  const { data: habit } = await supabase
    .from('habits')
    .select('current_streak, best_streak, last_completed')
    .eq('id', habitId)
    .single()

  if (!habit) return false

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const lastDate = habit.last_completed?.split('T')[0]

  const isConsecutive = lastDate === yesterdayStr || lastDate === today
  const newStreak = isConsecutive ? habit.current_streak + 1 : 1
  const newBest = Math.max(newStreak, habit.best_streak)

  await supabase
    .from('habits')
    .update({
      current_streak: newStreak,
      best_streak: newBest,
      last_completed: new Date().toISOString()
    })
    .eq('id', habitId)

  console.log('[tickHabit] Success! New streak:', newStreak)
  return true
}

export async function untickHabit(habitId: string, date: string): Promise<boolean> {
  const userId = getCurrentUserId()
  if (!userId) return false

  // Validate date is allowed
  if (!isDateAllowed(date)) {
    console.log('[untickHabit] Date not allowed:', date)
    alert('You can only modify habits for today or the past 3 days')
    return false
  }

  console.log('[untickHabit] Unticking habit:', habitId, 'for date:', date)

  // Delete the completion
  const { error } = await supabase
    .from('habit_completions')
    .delete()
    .eq('habit_id', habitId)
    .eq('completion_date', date)

  if (error) {
    console.error('[untickHabit] Error:', error)
    return false
  }

  // Recalculate streak (simplified)
  const { data: completions } = await supabase
    .from('habit_completions')
    .select('completion_date')
    .eq('habit_id', habitId)
    .order('completion_date', { ascending: false })

  const streak = calculateStreak(completions?.map(c => c.completion_date) || [])

  await supabase
    .from('habits')
    .update({
      current_streak: streak,
      last_completed: completions?.[0]?.completion_date || null
    })
    .eq('id', habitId)

  console.log('[untickHabit] Success!')
  return true
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  
  let streak = 0
  const today = new Date().toISOString().split('T')[0]
  const sortedDates = [...dates].sort().reverse()
  
  for (let i = 0; i < sortedDates.length; i++) {
    const expectedDate = new Date()
    expectedDate.setDate(expectedDate.getDate() - i)
    const expectedStr = expectedDate.toISOString().split('T')[0]
    
    if (sortedDates[i] === expectedStr) {
      streak++
    } else {
      break
    }
  }
  
  return streak
}

export async function deleteHabit(habitId: string): Promise<boolean> {
  const userId = getCurrentUserId()
  if (!userId) return false

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', userId)

  if (error) {
    console.error('[deleteHabit] Error:', error)
    return false
  }

  return true
}

// Habit stats
export function getHabitStats(habitId: string): {
  currentStreak: number
  monthCompletions: number
  monthTotal: number
  monthPercentage: number
  yearCompletions: number
} | null {
  // Note: This is synchronous, called from useEffect
  // In real implementation, would need to be async
  return null
}

// Expenses
export async function getExpenses(): Promise<Expense[]> {
  const userId = getCurrentUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getExpenses] Error:', error)
    return []
  }

  console.log('[getExpenses] Found', data?.length || 0, 'expenses')
  return data || []
}

export async function addExpense(
  amount: number,
  category: string,
  description: string
): Promise<Expense | null> {
  const userId = getCurrentUserId()
  if (!userId) {
    console.error('[addExpense] No user ID found')
    return null
  }

  console.log('[addExpense] Creating expense for user:', userId)

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: userId,
      amount,
      category,
      description,
      expense_date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single()

  if (error) {
    console.error('[addExpense] Error:', error)
    return null
  }

  console.log('[addExpense] Success:', data)
  return data
}

export async function deleteExpense(expenseId: string): Promise<boolean> {
  const userId = getCurrentUserId()
  if (!userId) return false

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', userId)

  if (error) {
    console.error('[deleteExpense] Error:', error)
    return false
  }

  return true
}

export function getMonthExpenses(expenses: Expense[]): Expense[] {
  const now = new Date()
  const month = now.toISOString().slice(0, 7)
  
  return expenses.filter(e => {
    const expenseMonth = (e.expense_date || e.date || '').slice(0, 7)
    return expenseMonth === month
  })
}

export function getYearExpenses(expenses: Expense[], year: number): Expense[] {
  return expenses.filter(e => {
    const expenseYear = new Date(e.expense_date || e.date || '').getFullYear()
    return expenseYear === year
  })
}

export function getMonthlyExpenseBreakdown(expenses: Expense[]): Record<string, number> {
  const breakdown: Record<string, number> = {}
  
  expenses.forEach(e => {
    const month = (e.expense_date || e.date || '').slice(0, 7)
    breakdown[month] = (breakdown[month] || 0) + Number(e.amount)
  })
  
  return breakdown
}

export function getCategoryBreakdown(
  expenses: Expense[]
): Array<{ category: string; total: number; percentage: number }> {
  const breakdown: Record<string, number> = {}
  let total = 0
  
  expenses.forEach(e => {
    const amount = Number(e.amount)
    breakdown[e.category] = (breakdown[e.category] || 0) + amount
    total += amount
  })
  
  return Object.entries(breakdown)
    .map(([category, amount]) => ({
      category,
      total: amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)
}

// Custom Category Management (localStorage for local user preferences)
export function getCustomCategories(): string[] {
  if (typeof window === 'undefined') return []
  const userId = getCurrentUserId()
  if (!userId) return []
  
  const stored = localStorage.getItem(`custom_categories_${userId}`)
  return stored ? JSON.parse(stored) : []
}

export function saveCustomCategory(category: string): boolean {
  if (typeof window === 'undefined') return false
  const userId = getCurrentUserId()
  if (!userId) return false
  
  const custom = getCustomCategories()
  if (custom.includes(category) || EXPENSE_CATEGORIES.includes(category)) {
    return false // Already exists
  }
  
  custom.push(category)
  localStorage.setItem(`custom_categories_${userId}`, JSON.stringify(custom))
  return true
}

export function getAllExpenseCategories(): string[] {
  return [...EXPENSE_CATEGORIES, ...getCustomCategories()]
}

export function deleteCustomCategory(category: string): boolean {
  if (typeof window === 'undefined') return false
  const userId = getCurrentUserId()
  if (!userId) return false
  
  const custom = getCustomCategories()
  const filtered = custom.filter(c => c !== category)
  localStorage.setItem(`custom_categories_${userId}`, JSON.stringify(filtered))
  return true
}
