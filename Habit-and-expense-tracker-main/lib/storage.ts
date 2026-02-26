export interface HabitCompletion {
  date: string // YYYY-MM-DD format
  completed: boolean
}

export interface Habit {
  id: string
  name: string
  currentStreak: number
  bestStreak: number
  lastCompleted: string | null
  color: string
  createdAt: string
  completions?: HabitCompletion[] // Track all completions
}

export interface Expense {
  id: string
  amount: number // Always in INR (₹)
  category: string
  description: string
  date: string
  createdAt: string
}

export const EXPENSE_CATEGORIES = [
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

// Helper to get user-specific key
function getUserKey(baseKey: string, userId: string): string {
  return `${baseKey}_${userId}`
}

// Helper to get current user ID
function getCurrentUserId(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem('current_user_id') || ''
}

// Habit Functions
export function getHabits(): Habit[] {
  if (typeof window === 'undefined') return []
  const userId = getCurrentUserId()
  if (!userId) return []
  
  const stored = localStorage.getItem(getUserKey('habits', userId))
  return stored ? JSON.parse(stored) : []
}

export function saveHabits(habits: Habit[]): void {
  const userId = getCurrentUserId()
  if (!userId) return
  
  localStorage.setItem(getUserKey('habits', userId), JSON.stringify(habits))
}

export function addHabit(name: string): Habit {
  const habits = getHabits()
  const newHabit: Habit = {
    id: Date.now().toString(),
    name,
    currentStreak: 0,
    bestStreak: 0,
    lastCompleted: null,
    color: '#3b82f6',
    createdAt: new Date().toISOString(),
    completions: []
  }
  habits.push(newHabit)
  saveHabits(habits)
  return newHabit
}

export function tickHabit(habitId: string): Habit | null {
  const habits = getHabits()
  const habit = habits.find(h => h.id === habitId)
  if (!habit) return null

  const today = new Date().toISOString().split('T')[0]
  
  // Initialize completions array if not exists
  if (!habit.completions) habit.completions = []
  
  const existingCompletion = habit.completions.find(c => c.date === today)
  
  if (existingCompletion) {
    return habit // Already completed
  }

  // Add completion
  habit.completions.push({ date: today, completed: true })

  // Calculate streak
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const lastDate = habit.lastCompleted?.split('T')[0]

  const isConsecutive = lastDate === yesterdayStr
  habit.currentStreak = isConsecutive ? habit.currentStreak + 1 : 1
  habit.bestStreak = Math.max(habit.currentStreak, habit.bestStreak)
  habit.lastCompleted = new Date().toISOString()

  saveHabits(habits)
  return habit
}

export function deleteHabit(habitId: string): void {
  const habits = getHabits().filter(h => h.id !== habitId)
  saveHabits(habits)
}

// Get completions for a specific date range
export function getHabitCompletions(
  habitId: string, 
  startDate: string, 
  endDate: string
): HabitCompletion[] {
  const habits = getHabits()
  const habit = habits.find(h => h.id === habitId)
  if (!habit || !habit.completions) return []

  return habit.completions.filter(c => 
    c.date >= startDate && c.date <= endDate
  )
}

// Get current week dates (Mon-Sun)
export function getCurrentWeekDates(): string[] {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }
  return dates
}

// Get month dates
export function getMonthDates(year: number, month: number): string[] {
  const dates = []
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    dates.push(date.toISOString().split('T')[0])
  }
  return dates
}

// Get year months
export function getYearMonths(year: number): { month: number; name: string }[] {
  return [
    { month: 0, name: 'Jan' },
    { month: 1, name: 'Feb' },
    { month: 2, name: 'Mar' },
    { month: 3, name: 'Apr' },
    { month: 4, name: 'May' },
    { month: 5, name: 'Jun' },
    { month: 6, name: 'Jul' },
    { month: 7, name: 'Aug' },
    { month: 8, name: 'Sep' },
    { month: 9, name: 'Oct' },
    { month: 10, name: 'Nov' },
    { month: 11, name: 'Dec' },
  ]
}

// Calculate habit stats for dashboard
export function getHabitStats(habitId: string) {
  const habits = getHabits()
  const habit = habits.find(h => h.id === habitId)
  if (!habit) return null

  const now = new Date()
  const thisMonth = getMonthDates(now.getFullYear(), now.getMonth())
  const thisYear = Array.from({ length: 12 }, (_, i) => 
    getMonthDates(now.getFullYear(), i)
  ).flat()

  const monthCompletions = habit.completions?.filter(c => 
    thisMonth.includes(c.date)
  ).length || 0

  const yearCompletions = habit.completions?.filter(c => 
    thisYear.includes(c.date)
  ).length || 0

  return {
    currentStreak: habit.currentStreak,
    bestStreak: habit.bestStreak,
    monthCompletions,
    monthTotal: thisMonth.length,
    monthPercentage: Math.round((monthCompletions / thisMonth.length) * 100),
    yearCompletions,
    yearTotal: 365,
    yearPercentage: Math.round((yearCompletions / 365) * 100),
  }
}

// Expense Functions
export function getExpenses(): Expense[] {
  if (typeof window === 'undefined') return []
  const userId = getCurrentUserId()
  if (!userId) return []
  
  const stored = localStorage.getItem(getUserKey('expenses', userId))
  return stored ? JSON.parse(stored) : []
}

export function saveExpenses(expenses: Expense[]): void {
  const userId = getCurrentUserId()
  if (!userId) return
  
  localStorage.setItem(getUserKey('expenses', userId), JSON.stringify(expenses))
}

export function addExpense(
  amount: number, 
  category: string, 
  description: string
): Expense {
  const expenses = getExpenses()
  const newExpense: Expense = {
    id: Date.now().toString(),
    amount,
    category,
    description,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  }
  expenses.push(newExpense)
  saveExpenses(expenses)
  return newExpense
}

export function deleteExpense(expenseId: string): void {
  const expenses = getExpenses().filter(e => e.id !== expenseId)
  saveExpenses(expenses)
}

export function getTodayExpenses(): Expense[] {
  const today = new Date().toISOString().split('T')[0]
  return getExpenses().filter(e => e.date === today)
}

export function getMonthExpenses(): Expense[] {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0]
  
  return getExpenses().filter(e => e.date >= monthStart)
}

export function getCategoryTotal(category: string): number {
  return getMonthExpenses()
    .filter(e => e.category === category)
    .reduce((sum, e) => sum + e.amount, 0)
}

// Get expenses by year
export function getYearExpenses(year: number): Expense[] {
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  
  return getExpenses().filter(e => e.date >= yearStart && e.date <= yearEnd)
}

// Get monthly breakdown for year
export function getMonthlyExpenseBreakdown(year: number): {
  month: number
  total: number
  count: number
}[] {
  const expenses = getYearExpenses(year)
  
  return Array.from({ length: 12 }, (_, month) => {
    const monthExpenses = expenses.filter(e => {
      const expenseMonth = new Date(e.date).getMonth()
      return expenseMonth === month
    })
    
    return {
      month,
      total: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
      count: monthExpenses.length
    }
  })
}

// Get category breakdown
export function getCategoryBreakdown(expenses: Expense[]): {
  category: string
  total: number
  count: number
  percentage: number
}[] {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  
  const breakdown = EXPENSE_CATEGORIES.map(category => {
    const categoryExpenses = expenses.filter(e => e.category === category)
    const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.amount, 0)
    
    return {
      category,
      total: categoryTotal,
      count: categoryExpenses.length,
      percentage: total > 0 ? Math.round((categoryTotal / total) * 100) : 0
    }
  }).filter(c => c.total > 0)
  
  return breakdown.sort((a, b) => b.total - a.total)
}