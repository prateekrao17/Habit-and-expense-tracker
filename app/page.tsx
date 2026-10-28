'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  getHabits,
  addHabit,
  renameHabit,
  setHabitCompletion,
  deleteHabit,
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getAllExpenseCategories,
  saveCustomCategory,
  type Habit,
  type Expense
} from '@/lib/storage'
import { getNotes, addNote, deleteNote, togglePinNote, type Note } from '@/lib/notes'
import { logout, ensureSession, getCurrentUsername } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toLocalDateStr, weekDates as getWeekDates, monthDates as getMonthDates, isWithinEditWindow, parseLocalDate, formatDisplayDate } from '@/lib/dates'
import { computeStreaks, milestoneProgress, fibonacciMilestones } from '@/lib/streaks'
import { parseAmountToPaise, dbAmountToPaise, formatINR } from '@/lib/money'
import { filterPeriod, totalPaise, categoryBreakdown, type Period } from '@/lib/expense-summary'
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  TrendingUp,
  DollarSign,
  Calendar,
  PieChart,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pin,
  Bell,
  Pencil,
  Award
} from 'lucide-react'

const YEAR_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type ExpenseForm = { amount: string; category: string; description: string; date: string }
const emptyExpenseForm = (): ExpenseForm => ({ amount: '', category: 'Food', description: '', date: toLocalDateStr() })

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [activeTab, setActiveTab] = useState<'habits' | 'expenses' | 'notes'>('habits')
  const [today, setToday] = useState(toLocalDateStr())

  // Habit State
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitModal, setHabitModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [habitName, setHabitName] = useState('')
  const [habitView, setHabitView] = useState<'week' | 'month' | 'year'>('week')
  const [habitViewDate, setHabitViewDate] = useState(new Date())
  const [pendingTicks, setPendingTicks] = useState<Record<string, boolean>>({})

  // Expense State
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseModal, setExpenseModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm())
  const [expenseFormError, setExpenseFormError] = useState('')
  const [expenseView, setExpenseView] = useState<Period>('month')
  const [expenseViewDate, setExpenseViewDate] = useState(toLocalDateStr())
  const [categoryFilter, setCategoryFilter] = useState('All')

  // Notes State
  const [notes, setNotes] = useState<Note[]>([])
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [newNote, setNewNote] = useState({ title: '', content: '', reminderDate: '', tags: '' })

  // Custom Categories State
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [allCategories, setAllCategories] = useState<string[]>([])

  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const loadSeq = useRef(0)

  const loadData = useCallback(async () => {
    const seq = ++loadSeq.current
    const [h, e, n] = await Promise.all([getHabits(), getExpenses(), getNotes()])
    if (seq !== loadSeq.current) return // a newer load (or sign-out) superseded this one
    if (!h.ok || !e.ok) {
      setLoadError('Some of your data could not be loaded. Check your connection and refresh.')
    } else {
      setLoadError('')
    }
    if (h.ok) setHabits(h.data)
    if (e.ok) setExpenses(e.data)
    setNotes(n)
    setAllCategories(getAllExpenseCategories(e.ok ? e.data.map((x) => x.category) : []))
  }, [])

  // Auth check + react to sign-out in this or another tab.
  useEffect(() => {
    let active = true
    ensureSession().then(async (ok) => {
      if (!active) return
      if (!ok) {
        router.replace('/auth')
        return
      }
      setUsername(getCurrentUsername())
      await loadData()
      if (active) setIsLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        loadSeq.current++
        setHabits([]); setExpenses([]); setNotes([])
        router.replace('/auth')
      }
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [router, loadData])

  // Roll over to the new calendar day if the tab stays open past midnight.
  useEffect(() => {
    const t = setInterval(() => setToday(toLocalDateStr()), 60_000)
    return () => clearInterval(t)
  }, [])

  // ---------- Habits ----------
  function openHabitModal(h?: Habit) {
    setActionError('')
    setHabitName(h?.name || '')
    setHabitModal({ open: true, id: h?.id || null })
  }

  async function handleSaveHabit(e: React.FormEvent) {
    e.preventDefault()
    if (saving || !habitName.trim()) return
    setSaving(true)
    const res = habitModal.id ? await renameHabit(habitModal.id, habitName) : await addHabit(habitName)
    setSaving(false)
    if (!res.ok) { setActionError(res.error); return }
    setHabitModal({ open: false, id: null })
    setHabitName('')
    await loadData()
  }

  async function handleToggleHabit(habit: Habit, date: string) {
    const key = `${habit.id}:${date}`
    if (pendingTicks[key]) return
    const done = !habit.completions.includes(date)
    setActionError('')
    setPendingTicks((p) => ({ ...p, [key]: true }))
    // Optimistic update; the reload below replaces it with saved data.
    setHabits((list) => list.map((h) => h.id !== habit.id ? h : {
      ...h,
      completions: done ? [...h.completions, date].sort() : h.completions.filter((d) => d !== date),
    }))
    const res = await setHabitCompletion(habit.id, date, done)
    if (!res.ok) setActionError(res.error)
    await loadData()
    setPendingTicks((p) => { const n = { ...p }; delete n[key]; return n })
  }

  async function handleDeleteHabit(habitId: string) {
    if (!confirm('Delete this habit and its check-in history?')) return
    const res = await deleteHabit(habitId)
    if (!res.ok) setActionError(res.error)
    await loadData()
  }

  // ---------- Expenses ----------
  function openExpenseModal(exp?: Expense) {
    setExpenseFormError('')
    setShowAddCategory(false)
    setExpenseForm(exp ? {
      amount: (dbAmountToPaise(exp.amount) / 100).toFixed(2),
      category: exp.category,
      description: exp.description || '',
      date: exp.expense_date,
    } : emptyExpenseForm())
    setExpenseModal({ open: true, id: exp?.id || null })
  }

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    const paise = parseAmountToPaise(expenseForm.amount)
    if (paise === null) { setExpenseFormError('Enter an amount greater than 0 with at most 2 decimals'); return }
    setSaving(true)
    const input = { amountPaise: paise, category: expenseForm.category, description: expenseForm.description, date: expenseForm.date }
    const res = expenseModal.id ? await updateExpense(expenseModal.id, input) : await addExpense(input)
    setSaving(false)
    if (!res.ok) { setExpenseFormError(res.error); return }
    setExpenseModal({ open: false, id: null })
    await loadData()
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!confirm('Delete this expense?')) return
    const res = await deleteExpense(expenseId)
    if (!res.ok) setActionError(res.error)
    await loadData()
  }

  function shiftExpensePeriod(dir: 1 | -1) {
    const d = parseLocalDate(expenseViewDate)
    if (expenseView === 'day') d.setDate(d.getDate() + dir)
    else if (expenseView === 'month') { d.setDate(1); d.setMonth(d.getMonth() + dir) }
    else { d.setMonth(0, 1); d.setFullYear(d.getFullYear() + dir) }
    setExpenseViewDate(toLocalDateStr(d))
  }

  // ---------- Notes ----------
  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (saving || !newNote.title.trim() || !newNote.content.trim()) return
    setSaving(true)
    const tags = newNote.tags.split(',').map(t => t.trim()).filter(Boolean)
    const reminderDate = newNote.reminderDate ? new Date(newNote.reminderDate).toISOString() : undefined
    const note = await addNote(newNote.title.trim(), newNote.content.trim(), reminderDate, tags)
    setSaving(false)
    if (!note) { setActionError('Could not add note'); return }
    await loadData()
    setNewNote({ title: '', content: '', reminderDate: '', tags: '' })
    setShowNoteModal(false)
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Delete this note?')) return
    if (!(await deleteNote(noteId))) setActionError('Could not delete note')
    await loadData()
  }

  async function handleTogglePin(noteId: string, currentPinned: boolean) {
    if (!(await togglePinNote(noteId, !currentPinned))) setActionError('Could not update note')
    await loadData()
  }

  function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      loadSeq.current++
      setHabits([]); setExpenses([]); setNotes([])
      logout().finally(() => router.replace('/auth'))
    }
  }

  // ---------- Derived data ----------
  const streaks = useMemo(() => {
    const m: Record<string, ReturnType<typeof computeStreaks>> = {}
    for (const h of habits) m[h.id] = computeStreaks(h.completions, today)
    return m
  }, [habits, today])

  const todayDone = habits.filter((h) => h.completions.includes(today)).length
  const dayTotal = totalPaise(filterPeriod(expenses, today, 'day'))
  const monthTotalNow = totalPaise(filterPeriod(expenses, today, 'month'))
  const yearTotalNow = totalPaise(filterPeriod(expenses, today, 'year'))

  const periodExpenses = useMemo(() => {
    const list = filterPeriod(expenses, expenseViewDate, expenseView)
    return categoryFilter === 'All' ? list : list.filter((e) => e.category === categoryFilter)
  }, [expenses, expenseViewDate, expenseView, categoryFilter])
  const periodTotal = totalPaise(periodExpenses)
  const breakdown = categoryBreakdown(periodExpenses)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const weekDates = getWeekDates(today)
  const monthDates = getMonthDates(habitViewDate.getFullYear(), habitViewDate.getMonth())
  const periodLabel = expenseView === 'day'
    ? formatDisplayDate(expenseViewDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : expenseView === 'month'
    ? parseLocalDate(expenseViewDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : String(parseLocalDate(expenseViewDate).getFullYear())
  const periodName = expenseView === 'day' ? 'This Day' : expenseView === 'month' ? 'This Month' : 'This Year'

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Life Tracker</h1>
              <p className="text-zinc-500 text-sm">Welcome, {username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-zinc-400 hover:text-white transition flex items-center gap-2"
            >
              <LogOut size={18} />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800 sticky top-[73px] bg-black z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2">
            {([
              ['habits', 'Habits', TrendingUp],
              ['expenses', 'Expenses', DollarSign],
              ['notes', 'Notes', FileText],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-6 py-3 font-medium transition relative ${
                  activeTab === key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className="inline mr-2" size={18} />
                {label}
                {activeTab === key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {(loadError || actionError) && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm mb-6 flex justify-between gap-4">
            <span>{loadError || actionError}</span>
            {actionError && !loadError && (
              <button onClick={() => setActionError('')} className="text-red-400 hover:text-white">Dismiss</button>
            )}
          </div>
        )}

        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 shadow-soft">
            <p className="text-zinc-400 text-sm">Habits done today</p>
            <p className="text-white text-2xl font-bold mt-1">{todayDone}/{habits.length}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 shadow-soft">
            <p className="text-zinc-400 text-sm">Spent today</p>
            <p className="text-white text-2xl font-bold mt-1">{formatINR(dayTotal)}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 shadow-soft">
            <p className="text-zinc-400 text-sm">This month</p>
            <p className="text-white text-2xl font-bold mt-1">{formatINR(monthTotalNow)}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 shadow-soft">
            <p className="text-zinc-400 text-sm">This year</p>
            <p className="text-white text-2xl font-bold mt-1">{formatINR(yearTotalNow)}</p>
          </div>
        </div>

        {activeTab === 'habits' ? (
          <>
            {/* Habits Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="flex bg-[#1a1a1a] border border-zinc-800 rounded-xl p-1.5 shadow-soft">
                  {(['week', 'month', 'year'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setHabitView(v)}
                      className={`px-4 py-2 rounded text-sm font-medium transition capitalize ${
                        habitView === v ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {habitView !== 'week' && (
                  <div className="flex items-center gap-2 bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-2.5 shadow-soft">
                    <button
                      onClick={() => {
                        const d = new Date(habitViewDate.getFullYear(), habitViewDate.getMonth(), 1)
                        if (habitView === 'month') d.setMonth(d.getMonth() - 1)
                        else d.setFullYear(d.getFullYear() - 1)
                        setHabitViewDate(d)
                      }}
                      className="text-zinc-400 hover:text-white"
                      aria-label="Previous"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-white text-sm font-medium min-w-[100px] text-center">
                      {habitView === 'month'
                        ? habitViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        : habitViewDate.getFullYear()}
                    </span>
                    <button
                      onClick={() => {
                        const d = new Date(habitViewDate.getFullYear(), habitViewDate.getMonth(), 1)
                        if (habitView === 'month') d.setMonth(d.getMonth() + 1)
                        else d.setFullYear(d.getFullYear() + 1)
                        setHabitViewDate(d)
                      }}
                      className="text-zinc-400 hover:text-white"
                      aria-label="Next"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => openHabitModal()}
                className="bg-white text-black px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition font-semibold flex items-center gap-2 shadow-medium"
              >
                <Plus size={18} />
                Add Habit
              </button>
            </div>

            {/* Streak & Fibonacci milestone cards */}
            {habits.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {habits.map(habit => {
                  const s = streaks[habit.id]
                  const m = milestoneProgress(s)
                  const ladder = fibonacciMilestones(Math.max(m.next, 8))
                  return (
                    <div key={habit.id} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition shadow-soft">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-white font-semibold">{habit.name}</h3>
                        {habit.completions.includes(today) ? (
                          <span className="text-xs text-green-500">Done today</span>
                        ) : (
                          <span className="text-xs text-zinc-500">Not done today</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Current streak</span>
                          <span className="text-white font-bold">{s.current} {s.current === 1 ? 'day' : 'days'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Longest streak</span>
                          <span className="text-white font-bold">{s.longest} {s.longest === 1 ? 'day' : 'days'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Last done</span>
                          <span className="text-zinc-300">{s.last ? formatDisplayDate(s.last) : '—'}</span>
                        </div>
                        <div className="pt-2">
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <Award size={16} className="text-yellow-500" />
                            <span className="text-zinc-300">
                              Next milestone: <span className="text-white font-bold">{m.next} days</span>
                              <span className="text-zinc-500"> ({m.remaining} to go)</span>
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ladder.map((f) => (
                              <span
                                key={f}
                                className={`text-xs px-2 py-0.5 rounded-full border ${
                                  s.current >= f
                                    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                                    : f === m.next
                                    ? 'border-blue-500/50 text-blue-400'
                                    : 'border-zinc-700 text-zinc-600'
                                }`}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Habits Table */}
            {habits.length === 0 ? (
              <div className="text-center py-20">
                <TrendingUp size={64} className="mx-auto text-zinc-700 mb-4" />
                <p className="text-zinc-500 text-lg">No habits yet</p>
                <p className="text-zinc-600 text-sm mt-2">
                  Click "Add Habit" to start tracking
                </p>
              </div>
            ) : (
              <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden shadow-medium">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-800/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-zinc-400 text-sm font-semibold sticky left-0 bg-zinc-900/90 backdrop-blur-sm z-10">
                          Habit
                        </th>
                        {habitView === 'week' && weekDates.map(date => {
                          const d = parseLocalDate(date)
                          return (
                            <th key={date} className="text-center px-2 py-3 text-zinc-400 text-xs font-medium min-w-[60px]">
                              <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                              <div className="text-zinc-500">{d.getDate()}</div>
                            </th>
                          )
                        })}
                        {habitView === 'month' && monthDates.map((date) => (
                          <th key={date} className="text-center px-1 py-3 text-zinc-400 text-xs font-medium min-w-[28px]">
                            {parseLocalDate(date).getDate()}
                          </th>
                        ))}
                        {habitView === 'year' && YEAR_MONTHS.map((name) => (
                          <th key={name} className="text-center px-2 py-3 text-zinc-400 text-xs font-medium min-w-[50px]">
                            {name}
                          </th>
                        ))}
                        <th className="text-center px-4 py-3 text-zinc-400 text-sm font-medium">
                          Streak
                        </th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {habits.map(habit => (
                        <tr key={habit.id} className="border-t border-zinc-800">
                          <td className="px-4 py-4 text-white font-medium sticky left-0 bg-zinc-900 z-10">
                            {habit.name}
                          </td>
                          {habitView === 'week' && weekDates.map(date => {
                            const completed = habit.completions.includes(date)
                            const isToday = date === today
                            const isAllowed = isWithinEditWindow(date, today)
                            const pending = !!pendingTicks[`${habit.id}:${date}`]
                            return (
                              <td key={date} className="text-center px-2 py-4">
                                <button
                                  onClick={() => handleToggleHabit(habit, date)}
                                  disabled={!isAllowed || pending}
                                  aria-label={`${completed ? 'Undo' : 'Mark'} ${habit.name} on ${date}`}
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition disabled:opacity-60 ${
                                    completed
                                      ? 'bg-green-500 text-white hover:bg-green-600'
                                      : !isAllowed
                                      ? 'bg-zinc-800 text-zinc-700 cursor-not-allowed'
                                      : isToday
                                      ? 'bg-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white'
                                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                  }`}
                                >
                                  {completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>
                              </td>
                            )
                          })}
                          {habitView === 'month' && monthDates.map((date) => (
                            <td key={date} className="text-center px-1 py-4">
                              <div className={`w-4 h-4 rounded-full mx-auto ${
                                habit.completions.includes(date) ? 'bg-green-500' : date > today ? 'bg-zinc-900' : 'bg-zinc-800'
                              }`} />
                            </td>
                          ))}
                          {habitView === 'year' && YEAR_MONTHS.map((name, month) => {
                            const dates = getMonthDates(habitViewDate.getFullYear(), month)
                            const done = dates.filter(d => habit.completions.includes(d)).length
                            const percentage = Math.round((done / dates.length) * 100)
                            return (
                              <td key={name} className="text-center px-2 py-4">
                                <div className="flex flex-col items-center gap-1">
                                  <div className={`w-6 h-6 rounded-full ${
                                    percentage > 80 ? 'bg-green-500'
                                      : percentage > 50 ? 'bg-yellow-500'
                                      : percentage > 20 ? 'bg-orange-500'
                                      : 'bg-zinc-800'
                                  }`} />
                                  <span className="text-xs text-zinc-500">{done}d</span>
                                </div>
                              </td>
                            )
                          })}
                          <td className="text-center px-4 py-4">
                            <div className="text-white font-bold">{streaks[habit.id]?.current ?? 0}</div>
                            <div className="text-zinc-500 text-xs">Best: {streaks[habit.id]?.longest ?? 0}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-3">
                              <button
                                onClick={() => openHabitModal(habit)}
                                className="text-zinc-600 hover:text-white transition"
                                aria-label={`Rename ${habit.name}`}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteHabit(habit.id)}
                                className="text-zinc-600 hover:text-red-500 transition"
                                aria-label={`Delete ${habit.name}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <p className="text-zinc-600 text-xs mt-3">
              You can mark today and the previous 3 days. A streak stays active until the end of today if you completed it yesterday.
            </p>
          </>
        ) : activeTab === 'expenses' ? (
          <>
            {/* Expenses Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                  {(['day', 'month', 'year'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setExpenseView(v)}
                      className={`px-4 py-2 rounded text-sm font-medium transition capitalize ${
                        expenseView === v ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <button onClick={() => shiftExpensePeriod(-1)} className="text-zinc-400 hover:text-white" aria-label="Previous period">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-white text-sm font-medium min-w-[120px] text-center">{periodLabel}</span>
                  <button onClick={() => shiftExpensePeriod(1)} className="text-zinc-400 hover:text-white" aria-label="Next period">
                    <ChevronRight size={18} />
                  </button>
                </div>

                <button
                  onClick={() => setExpenseViewDate(today)}
                  className="text-zinc-400 hover:text-white text-sm px-2"
                >
                  Today
                </button>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2"
                  aria-label="Filter by category"
                >
                  <option value="All">All categories</option>
                  {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <button
                onClick={() => openExpenseModal()}
                className="bg-white text-black px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition font-semibold flex items-center gap-2 shadow-medium"
              >
                <Plus size={18} />
                Add Expense
              </button>
            </div>

            {/* Expenses Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 shadow-soft hover:shadow-medium transition">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-500/10 p-3 rounded-lg">
                    <DollarSign className="text-blue-500" size={24} />
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">{periodName}</p>
                    <p className="text-white text-3xl font-bold">{formatINR(periodTotal)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 shadow-soft hover:shadow-medium transition">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-500/10 p-3 rounded-lg">
                    <Calendar className="text-green-500" size={24} />
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Transactions</p>
                    <p className="text-white text-3xl font-bold">{periodExpenses.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 shadow-soft hover:shadow-medium transition">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-500/10 p-3 rounded-lg">
                    <PieChart className="text-purple-500" size={24} />
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Top Category</p>
                    <p className="text-white text-lg font-bold">{breakdown[0]?.category || 'None'}</p>
                    <p className="text-zinc-500 text-sm">{formatINR(breakdown[0]?.paise || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <PieChart size={20} />
                Category Breakdown
              </h3>
              <div className="space-y-3">
                {breakdown.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">No expenses in this period</p>
                ) : (
                  breakdown.map(({ category, paise, percentage }) => (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-400">{category}</span>
                        <span className="text-white font-medium">{formatINR(paise)} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expense history for the selected period */}
            <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 shadow-soft">
              <h3 className="text-white font-semibold mb-4">Expenses — {periodLabel}</h3>
              {periodExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign size={48} className="mx-auto text-zinc-700 mb-3" />
                  <p className="text-zinc-500">{expenses.length === 0 ? 'No expenses recorded' : 'No expenses in this period'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {periodExpenses.map(expense => (
                    <div
                      key={expense.id}
                      className="flex justify-between items-center py-3 px-4 hover:bg-zinc-900/50 rounded-xl transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-semibold">{formatINR(dbAmountToPaise(expense.amount))}</span>
                          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">{expense.category}</span>
                        </div>
                        {expense.description && (
                          <p className="text-zinc-400 text-sm mt-1">{expense.description}</p>
                        )}
                        <p className="text-zinc-600 text-xs mt-1">{formatDisplayDate(expense.expense_date)}</p>
                      </div>
                      <div className="flex gap-3 ml-4">
                        <button
                          onClick={() => openExpenseModal(expense)}
                          className="text-zinc-600 hover:text-white transition"
                          aria-label="Edit expense"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-zinc-600 hover:text-red-500 transition"
                          aria-label="Delete expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">Your Notes</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  {notes.length} note{notes.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setShowNoteModal(true)}
                className="bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition font-medium flex items-center gap-2"
              >
                <Plus size={18} />
                Add Note
              </button>
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-20">
                <FileText size={64} className="mx-auto text-zinc-700 mb-4" />
                <p className="text-zinc-500 text-lg">No notes yet</p>
                <p className="text-zinc-600 text-sm mt-2">
                  Click "Add Note" to create your first note
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map(note => (
                  <div
                    key={note.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-white font-semibold text-lg flex-1">{note.title}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTogglePin(note.id, note.pinned)}
                          className={`transition ${note.pinned ? 'text-yellow-500' : 'text-zinc-600 hover:text-yellow-500'}`}
                          aria-label="Pin note"
                        >
                          <Pin size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-zinc-600 hover:text-red-500 transition"
                          aria-label="Delete note"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <p className="text-zinc-400 text-sm mb-3 line-clamp-3">{note.content}</p>

                    {note.reminder_date && (
                      <div className="flex items-center gap-2 text-xs text-blue-500 mb-3">
                        <Bell size={14} />
                        {new Date(note.reminder_date).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    )}

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {note.tags.map(tag => (
                          <span key={tag} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-zinc-600 mt-3 pt-3 border-t border-zinc-800">
                      {new Date(note.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Add / Rename Habit Modal */}
      {habitModal.open && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="modal-content w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {habitModal.id ? 'Rename Habit' : 'Add New Habit'}
            </h2>
            <p className="text-zinc-500 text-sm mb-6">
              {habitModal.id ? 'Your check-in history is kept' : 'Create a habit to track daily'}
            </p>
            {actionError && <p className="text-red-500 text-sm mb-4">{actionError}</p>}
            <form onSubmit={handleSaveHabit}>
              <input
                type="text"
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                placeholder="Habit name (e.g., Morning Meditation)"
                className="w-full mb-6"
                maxLength={100}
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setHabitModal({ open: false, id: null })} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={!habitName.trim() || saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : habitModal.id ? 'Save' : 'Add Habit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      {expenseModal.open && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="modal-content w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {expenseModal.id ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <p className="text-zinc-500 text-sm mb-6">Track your spending</p>
            {expenseFormError && <p className="text-red-500 text-sm mb-4">{expenseFormError}</p>}

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Amount (₹)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  max={today}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-zinc-400 text-sm font-medium">Category</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    className="text-blue-500 text-xs hover:underline"
                  >
                    + Add New
                  </button>
                </div>

                {showAddCategory && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="New category name"
                      className="flex-1 text-sm"
                      maxLength={50}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const c = newCategory.trim()
                        if (!c) return
                        if (saveCustomCategory(c)) {
                          setAllCategories(getAllExpenseCategories(expenses.map((x) => x.category)))
                          setExpenseForm({ ...expenseForm, category: c })
                          setNewCategory('')
                          setShowAddCategory(false)
                        } else {
                          setExpenseFormError('Category already exists')
                        }
                      }}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                      Add
                    </button>
                  </div>
                )}

                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full"
                >
                  {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Description (optional)</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="What did you spend on?"
                  className="w-full"
                  maxLength={300}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setExpenseModal({ open: false, id: null })} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={!expenseForm.amount || saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : expenseModal.id ? 'Save' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="modal-content w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Add New Note</h2>
            <p className="text-zinc-500 text-sm mb-6">Create a note with optional reminder</p>

            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder="Note title"
                  className="w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Content</label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Write your note here..."
                  className="w-full h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Reminder (optional)</label>
                <input
                  type="datetime-local"
                  value={newNote.reminderDate}
                  onChange={(e) => setNewNote({ ...newNote, reminderDate: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Tags (comma-separated, optional)</label>
                <input
                  type="text"
                  value={newNote.tags}
                  onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
                  placeholder="e.g., work, personal, urgent"
                  className="w-full"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNoteModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newNote.title.trim() || !newNote.content.trim() || saving}
                  className="btn-primary flex-1"
                >
                  Add Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
