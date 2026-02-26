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

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Healthcare',
  'Education',
  'Travel',
  'Utilities',
  'Other',
  'Subscriptions'
]

function getUserKey(baseKey: string, userId?: string): string {
  const id = userId || getCurrentUserId()
  if (!id) return baseKey
  return `${baseKey}_user_${id}`
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
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
  if (typeof window === 'undefined') return []
  
  const userId = getCurrentUserId()
  if (!userId) return []
  
  const key = getUserKey('habits', userId)
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : []
}

export async function addHabit(name: string): Promise<Habit | null> {
  if (typeof window === 'undefined') return null
  
  const userId = getCurrentUserId()
  if (!userId) return null
  
  const habit: Habit = {
    id: generateId(),
    name,
    current_streak: 0,
    best_streak: 0,
    last_completed: '',
    completions: []
  }
  
  const habits = await getHabits()
  habits.push(habit)
  
  const key = getUserKey('habits', userId)
  localStorage.setItem(key, JSON.stringify(habits))
  
  return habit
}

export async function tickHabit(habitId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const userId = getCurrentUserId()
  if (!userId) return false
  
  const habits = await getHabits()
  const habit = habits.find(h => h.id === habitId)
  
  if (!habit) return false
  
  const today = getDateStr()
  
  if (!habit.completions) {
    habit.completions = []
  }
  
  const alreadyCompleted = habit.completions.some(c => c.date === today)
  if (alreadyCompleted) return false
  
  habit.completions.push({ date: today })
  habit.last_completed = today
  
  // Calculate streak
  let streak = 1
  let checkDate = new Date(today)
  
  for (let i = 1; i <= 365; i++) {
    checkDate.setDate(checkDate.getDate() - 1)
    const checkStr = getDateStr(checkDate)
    
    if (!habit.completions.some(c => c.date === checkStr)) {
      break
    }
    streak++
  }
  
  habit.current_streak = streak
  if (streak > habit.best_streak) {
    habit.best_streak = streak
  }
  
  const key = getUserKey('habits', userId)
  localStorage.setItem(key, JSON.stringify(habits))
  
  return true
}

export async function deleteHabit(habitId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const userId = getCurrentUserId()
  if (!userId) return false
  
  let habits = await getHabits()
  habits = habits.filter(h => h.id !== habitId)
  
  const key = getUserKey('habits', userId)
  localStorage.setItem(key, JSON.stringify(habits))
  
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
  if (typeof window === 'undefined') return []
  
  const userId = getCurrentUserId()
  if (!userId) return []
  
  const key = getUserKey('expenses', userId)
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : []
}

export async function addExpense(
  amount: number,
  category: string,
  description: string
): Promise<Expense | null> {
  if (typeof window === 'undefined') return null
  
  const userId = getCurrentUserId()
  if (!userId) return null
  
  const expense: Expense = {
    id: generateId(),
    amount,
    category,
    description,
    expense_date: getDateStr(),
    created_at: new Date().toISOString()
  }
  
  const expenses = await getExpenses()
  expenses.push(expense)
  
  const key = getUserKey('expenses', userId)
  localStorage.setItem(key, JSON.stringify(expenses))
  
  return expense
}

export async function deleteExpense(expenseId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const userId = getCurrentUserId()
  if (!userId) return false
  
  let expenses = await getExpenses()
  expenses = expenses.filter(e => e.id !== expenseId)
  
  const key = getUserKey('expenses', userId)
  localStorage.setItem(key, JSON.stringify(expenses))
  
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
