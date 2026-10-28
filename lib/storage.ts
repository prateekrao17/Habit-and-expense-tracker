import { supabase } from './supabase'
import { getCurrentUserId } from './auth'
import { toLocalDateStr, isDateStr, isWithinEditWindow } from './dates'
import { computeStreaks } from './streaks'
import { paiseToDbAmount } from './money'

// Data access for habits and expenses. Every request is authorised by the
// Supabase session; RLS (step 05) restricts rows to the signed-in owner.
// The user_id filters below are a second guard, not the security boundary.

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

const ok = <T,>(data: T): Result<T> => ({ ok: true, data })
const fail = (error: string): Result<never> => ({ ok: false, error })

export interface Habit {
  id: string
  name: string
  current_streak: number
  best_streak: number
  last_completed: string | null
  color?: string
  created_at?: string
  completions: string[] // local 'YYYY-MM-DD' dates, unique, ascending
}

export interface Expense {
  id: string
  amount: number | string
  category: string
  description: string | null
  expense_date: string
  created_at?: string
}

export const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Entertainment', 'Bills', 'Rent', 'Trip',
  'Health', 'Shopping', 'Education', 'Investment', 'Other',
]

function requireUser(): string | null {
  return getCurrentUserId()
}

// ---------------- Habits ----------------

export async function getHabits(): Promise<Result<Habit[]>> {
  const userId = requireUser()
  if (!userId) return fail('Not signed in')

  const [h, c] = await Promise.all([
    supabase.from('habits').select('id, name, current_streak, best_streak, last_completed, color, created_at')
      .eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('habit_completions').select('habit_id, completion_date')
      .eq('user_id', userId),
  ])
  if (h.error || c.error) return fail('Could not load habits')

  const byHabit = new Map<string, Set<string>>()
  for (const row of c.data || []) {
    const set = byHabit.get(row.habit_id) || new Set<string>()
    set.add(String(row.completion_date).slice(0, 10))
    byHabit.set(row.habit_id, set)
  }
  return ok((h.data || []).map((x) => ({
    ...x,
    completions: Array.from(byHabit.get(x.id) || []).sort(),
  })) as Habit[])
}

function validateHabitName(name: string): string | null {
  const n = name.trim()
  if (!n) return 'Habit name is required'
  if (n.length > 100) return 'Habit name must be 100 characters or fewer'
  return null
}

export async function addHabit(name: string): Promise<Result<Habit>> {
  const userId = requireUser()
  if (!userId) return fail('Not signed in')
  const err = validateHabitName(name)
  if (err) return fail(err)

  const { data, error } = await supabase
    .from('habits')
    .insert({ user_id: userId, name: name.trim(), current_streak: 0, best_streak: 0, color: '#3b82f6' })
    .select('id, name, current_streak, best_streak, last_completed, color, created_at')
    .single()
  if (error || !data) return fail('Could not add habit')
  return ok({ ...(data as Omit<Habit, 'completions'>), completions: [] })
}

export async function renameHabit(habitId: string, name: string): Promise<Result> {
  const userId = requireUser()
  if (!userId) return fail('Not signed in')
  const err = validateHabitName(name)
  if (err) return fail(err)
  const { error } = await supabase.from('habits').update({ name: name.trim() }).eq('id', habitId).eq('user_id', userId)
  return error ? fail('Could not update habit') : ok(undefined)
}

export async function deleteHabit(habitId: string): Promise<Result> {
  const userId = requireUser()
  if (!userId) return fail('Not signed in')
  // Remove the habit's check-ins first so nothing is left orphaned.
  const c = await supabase.from('habit_completions').delete().eq('habit_id', habitId).eq('user_id', userId)
  if (c.error) return fail('Could not delete habit')
  const { error } = await supabase.from('habits').delete().eq('id', habitId).eq('user_id', userId)
  return error ? fail('Could not delete habit') : ok(undefined)
}

// Keeps the cached streak columns on `habits` in step with the real history.
// The UI always calculates streaks from completions; these columns are only a cache.
async function syncStreakCache(habitId: string, userId: string): Promise<void> {
  const { data } = await supabase.from('habit_completions').select('completion_date')
    .eq('habit_id', habitId).eq('user_id', userId)
  const info = computeStreaks((data || []).map((r) => String(r.completion_date)), toLocalDateStr())
  await supabase.from('habits').update({
    current_streak: info.current,
    best_streak: info.longest,
    last_completed: info.last,
  }).eq('id', habitId).eq('user_id', userId)
}

export async function setHabitCompletion(habitId: string, date: string, done: boolean): Promise<Result> {
  const userId = requireUser()
  if (!userId) return fail('Not signed in')
  if (!isWithinEditWindow(date)) return fail('You can only change today or the past 3 days')

  if (done) {
    const { data: existing, error: readErr } = await supabase.from('habit_completions').select('id')
      .eq('habit_id', habitId).eq('user_id', userId).eq('completion_date', date).limit(1)
    if (readErr) return fail('Could not save check-in')
    if (!existing || existing.length === 0) {
      const { error } = await supabase.from('habit_completions')
        .insert({ habit_id: habitId, user_id: userId, completion_date: date, completed: true })
      // 23505 = unique violation (already ticked, e.g. double click) -> fine.
      if (error && error.code !== '23505') return fail('Could not save check-in')
    }
  } else {
    const { error } = await supabase.from('habit_completions').delete()
      .eq('habit_id', habitId).eq('user_id', userId).eq('completion_date', date)
    if (error) return fail('Could not undo check-in')
  }

  await syncStreakCache(habitId, userId)
  return ok(undefined)
}

// ---------------- Expenses ----------------

export interface ExpenseInput {
  amountPaise: number
  category: string
  description: string
  date: string
}

function validateExpense(i: ExpenseInput): string | null {
  if (!Number.isSafeInteger(i.amountPaise) || i.amountPaise <= 0) return 'Enter an amount greater than 0'
  const cat = i.category.trim()
  if (!cat || cat.length > 50) return 'Choose a category'
  if (i.description.length > 300) return 'Description must be 300 characters or fewer'
  if (!isDateStr(i.date)) return 'Enter a valid date'
  if (i.date > toLocalDateStr()) return 'Date cannot be in the future'
  return null
}

export async function getExpenses(): Promise<Result<Expense[]>> {
  const userId = requireUser()
  if (!userId) return fail('Not signed in')
  const { data, error } = await supabase.from('expenses')
    .select('id, amount, category, description, expense_date, created_at')
    .eq('user_id', userId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return fail('Could not load expenses')
  return ok(((data || []) as Expense[]).map((e) => ({ ...e, expense_date: String(e.expense_date).slice(0, 10) })))
}

export async function addExpense(input: ExpenseInput): Promise<Result> {
  const userId = requireUser()
  if (!userId) return fail('Not signed in')
  const err = validateExpense(input)
  if (err) return fail(err)
  const { error } = await supabase.from('expenses').insert({
    user_id: userId,
    amount: paiseToDbAmount(input.amountPaise),
    category: input.category.trim(),
    description: input.description.trim(),
    expense_date: input.date,
  })
  return error ? fail('Could not add expense') : ok(undefined)
}

export async function updateExpense(expenseId: string, input: ExpenseInput): Promise<Result> {
  const userId = requireUser()
  if (!userId) return fail('Not signed in')
  const err = validateExpense(input)
  if (err) return fail(err)
  const { error } = await supabase.from('expenses').update({
    amount: paiseToDbAmount(input.amountPaise),
    category: input.category.trim(),
    description: input.description.trim(),
    expense_date: input.date,
  }).eq('id', expenseId).eq('user_id', userId)
  return error ? fail('Could not update expense') : ok(undefined)
}

export async function deleteExpense(expenseId: string): Promise<Result> {
  const userId = requireUser()
  if (!userId) return fail('Not signed in')
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId).eq('user_id', userId)
  return error ? fail('Could not delete expense') : ok(undefined)
}

// Custom categories are a per-browser display preference only (no private data).
export function getCustomCategories(): string[] {
  if (typeof window === 'undefined') return []
  const userId = getCurrentUserId()
  if (!userId) return []
  try {
    const parsed = JSON.parse(localStorage.getItem(`custom_categories_${userId}`) || '[]')
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : []
  } catch {
    return []
  }
}

export function saveCustomCategory(category: string): boolean {
  if (typeof window === 'undefined') return false
  const userId = getCurrentUserId()
  const c = category.trim()
  if (!userId || !c || c.length > 50) return false
  const custom = getCustomCategories()
  if (custom.includes(c) || EXPENSE_CATEGORIES.includes(c)) return false
  localStorage.setItem(`custom_categories_${userId}`, JSON.stringify([...custom, c]))
  return true
}

export function getAllExpenseCategories(extra: string[] = []): string[] {
  return Array.from(new Set([...EXPENSE_CATEGORIES, ...getCustomCategories(), ...extra]))
}
