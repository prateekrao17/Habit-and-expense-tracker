'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getHabits, 
  addHabit, 
  tickHabit,
  untickHabit,
  deleteHabit,
  getCurrentWeekDates,
  getMonthDates,
  getYearMonths,
  getHabitStats,
  getExpenses,
  addExpense,
  deleteExpense,
  getMonthExpenses,
  getYearExpenses,
  getMonthlyExpenseBreakdown,
  getCategoryBreakdown,
  getAllExpenseCategories,
  saveCustomCategory,
  deleteCustomCategory,
  EXPENSE_CATEGORIES,
  type Habit,
  type Expense
} from '@/lib/storage'
import { getNotes, addNote, updateNote, deleteNote, togglePinNote, type Note } from '@/lib/notes'
import { logout, isAuthenticated, getCurrentUsername, getCurrentUserId } from '@/lib/auth'
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
  BarChart3,
  FileText,
  Pin,
  Bell
} from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'habits' | 'expenses' | 'notes'>('habits')
  
  // Habit State
  const [habits, setHabits] = useState<Habit[]>([])
  const [showHabitModal, setShowHabitModal] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [habitView, setHabitView] = useState<'week' | 'month' | 'year'>('week')
  const [habitViewDate, setHabitViewDate] = useState(new Date())
  const [completionsCache, setCompletionsCache] = useState<Record<string, boolean>>({})
  
  // Expense State
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'Food',
    description: ''
  })
  const [expenseView, setExpenseView] = useState<'month' | 'year'>('month')
  const [expenseViewDate, setExpenseViewDate] = useState(new Date())

  // Notes State
  const [notes, setNotes] = useState<Note[]>([])
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    reminderDate: '',
    tags: ''
  })

  // Custom Categories State
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [allCategories, setAllCategories] = useState<string[]>([])

  // User State
  const [username, setUsername] = useState('')
  const [userId, setUserId] = useState('')

  // Auth check
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth')
    } else {
      setUsername(getCurrentUsername())
      setUserId(getCurrentUserId() || '')
      loadData()
      setIsLoading(false)
    }
  }, [router])

  async function loadData() {
    const habitsData = await getHabits()
    const expensesData = await getExpenses()
    const notesData = await getNotes()
    setHabits(habitsData)
    setExpenses(expensesData)
    setNotes(notesData)
    setAllCategories(getAllExpenseCategories())
  }

  // Habit Functions
  async function handleAddHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!newHabitName.trim()) return
    
    const habit = await addHabit(newHabitName.trim())
    if (habit) {
      await loadData()
      setNewHabitName('')
      setShowHabitModal(false)
    }
  }

  async function handleTickHabit(habitId: string) {
    const success = await tickHabit(habitId)
    if (success) {
      await loadData()
    }
  }

  async function handleUntickHabit(habitId: string, date: string) {
    const success = await untickHabit(habitId, date)
    if (success) {
      await loadData()
    }
  }

  async function handleDeleteHabit(habitId: string) {
    if (confirm('Delete this habit?')) {
      const success = await deleteHabit(habitId)
      if (success) {
        await loadData()
      }
    }
  }

  function checkHabitCompleted(habitId: string, date: string): boolean {
    const habit = habits.find(h => h.id === habitId)
    if (!habit) return false
    
    // Check in completions array if it exists
    if ('completions' in habit && Array.isArray((habit as any).completions)) {
      return (habit as any).completions.some((c: any) => c.date === date)
    }
    
    // Fallback: check if last completed date matches
    if (habit.last_completed) {
      const lastDate = habit.last_completed.split('T')[0]
      return lastDate === date
    }
    
    return false
  }

  // Expense Functions
  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) return
    
    const expense = await addExpense(
      parseFloat(newExpense.amount),
      newExpense.category,
      newExpense.description.trim()
    )
    if (expense) {
      await loadData()
      setNewExpense({ amount: '', category: 'Food', description: '' })
      setShowExpenseModal(false)
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (confirm('Delete this expense?')) {
      const success = await deleteExpense(expenseId)
      if (success) {
        await loadData()
      }
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.title.trim() || !newNote.content.trim()) return
    
    const tags = newNote.tags.split(',').map(t => t.trim()).filter(Boolean)
    const reminderDate = newNote.reminderDate ? new Date(newNote.reminderDate).toISOString() : undefined
    
    const note = await addNote(newNote.title, newNote.content, reminderDate, tags)
    if (note) {
      await loadData()
      setNewNote({ title: '', content: '', reminderDate: '', tags: '' })
      setShowNoteModal(false)
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (confirm('Delete this note?')) {
      const success = await deleteNote(noteId)
      if (success) {
        await loadData()
      }
    }
  }

  async function handleTogglePin(noteId: string, currentPinned: boolean) {
    const success = await togglePinNote(noteId, !currentPinned)
    if (success) {
      await loadData()
    }
  }

  function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      logout()
      router.push('/auth')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  // Get dates for current view
  const weekDates = getCurrentWeekDates()
  const monthDates = getMonthDates(
    habitViewDate.getFullYear(), 
    habitViewDate.getMonth()
  )
  const yearMonths = getYearMonths(habitViewDate.getFullYear())

  // Expense calculations
  const currentMonthExpenses = expenses.filter(e => {
    const expenseMonth = new Date(e.expense_date || e.date || '').toISOString().slice(0, 7)
    const currentMonth = new Date().toISOString().slice(0, 7)
    return expenseMonth === currentMonth
  })
  
  const currentYearExpenses = expenses.filter(e => {
    const expenseYear = new Date(e.expense_date || e.date || '').getFullYear()
    return expenseYear === expenseViewDate.getFullYear()
  })
  
  const monthTotal = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const yearTotal = currentYearExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const categoryBreakdown = getCategoryBreakdown(
    expenseView === 'month' ? currentMonthExpenses : currentYearExpenses
  )

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
            <button
              onClick={() => setActiveTab('habits')}
              className={`px-6 py-3 font-medium transition relative ${
                activeTab === 'habits'
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <TrendingUp className="inline mr-2" size={18} />
              Habits
              {activeTab === 'habits' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-6 py-3 font-medium transition relative ${
                activeTab === 'expenses'
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <DollarSign className="inline mr-2" size={18} />
              Expenses
              {activeTab === 'expenses' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-6 py-3 font-medium transition relative ${
                activeTab === 'notes'
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <FileText className="inline mr-2" size={18} />
              Notes
              {activeTab === 'notes' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'habits' ? (
          <>
            {/* Habits Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="flex bg-[#1a1a1a] border border-zinc-800 rounded-xl p-1.5 shadow-soft">
                  <button
                    onClick={() => setHabitView('week')}
                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                      habitView === 'week'
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setHabitView('month')}
                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                      habitView === 'month'
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setHabitView('year')}
                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                      habitView === 'year'
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Year
                  </button>
                </div>

                {habitView !== 'week' && (
                    <div className="flex items-center gap-2 bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-2.5 shadow-soft">
                    <button
                      onClick={() => {
                        const newDate = new Date(habitViewDate)
                        if (habitView === 'month') {
                          newDate.setMonth(newDate.getMonth() - 1)
                        } else {
                          newDate.setFullYear(newDate.getFullYear() - 1)
                        }
                        setHabitViewDate(newDate)
                      }}
                      className="text-zinc-400 hover:text-white"
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
                        const newDate = new Date(habitViewDate)
                        if (habitView === 'month') {
                          newDate.setMonth(newDate.getMonth() + 1)
                        } else {
                          newDate.setFullYear(newDate.getFullYear() + 1)
                        }
                        setHabitViewDate(newDate)
                      }}
                      className="text-zinc-400 hover:text-white"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowHabitModal(true)}
                className="bg-white text-black px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition font-semibold flex items-center gap-2 shadow-medium"
              >
                <Plus size={18} />
                Add Habit
              </button>
            </div>

            {/* Habits Dashboard (shown only in year view) */}
            {habitView === 'year' && habits.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {habits.slice(0, 3).map(habit => {
                  const stats = getHabitStats(habit.id)
                  if (!stats) return null

                  return (
                    <div key={habit.id} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition shadow-soft">
                      <h3 className="text-white font-semibold mb-3">{habit.name}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Current Streak</span>
                          <span className="text-white font-bold">{stats.currentStreak} days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">This Month</span>
                          <span className="text-green-500 font-bold">{stats.monthCompletions}/{stats.monthTotal}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${stats.monthPercentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm pt-2">
                          <span className="text-zinc-400">This Year</span>
                          <span className="text-blue-500 font-bold">{stats.yearCompletions} days</span>
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
                          const d = new Date(date)
                          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
                          const dayNum = d.getDate()
                          return (
                            <th key={date} className="text-center px-2 py-3 text-zinc-400 text-xs font-medium min-w-[60px]">
                              <div>{dayName}</div>
                              <div className="text-zinc-500">{dayNum}</div>
                            </th>
                          )
                        })}
                        {habitView === 'month' && (() => {
                          const daysToShow = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]
                          const lastDay = monthDates.length
                          if (lastDay === 31) daysToShow.push(31)
                          
                          return daysToShow.map(day => {
                            const date = monthDates[day - 1]
                            if (!date) return null
                            return (
                              <th key={date} className="text-center px-2 py-3 text-zinc-400 text-xs font-medium min-w-[50px]">
                                {day}
                              </th>
                            )
                          })
                        })()}
                        {habitView === 'year' && yearMonths.map(({ month, name }) => (
                          <th key={month} className="text-center px-2 py-3 text-zinc-400 text-xs font-medium min-w-[50px]">
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
                            const completed = checkHabitCompleted(habit.id, date)
                            const isToday = date === new Date().toISOString().split('T')[0]
                            const isPast = date < new Date().toISOString().split('T')[0]
                            const isFuture = date > new Date().toISOString().split('T')[0]
                            
                            return (
                              <td key={date} className="text-center px-2 py-4">
                                <button
                                  onClick={() => {
                                    if (completed) {
                                      handleUntickHabit(habit.id, date)
                                    } else {
                                      handleTickHabit(habit.id)
                                    }
                                  }}
                                  disabled={isFuture}
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition ${
                                    completed
                                      ? 'bg-green-500 text-white hover:bg-green-600'
                                      : isFuture
                                      ? 'bg-zinc-800 text-zinc-700 cursor-not-allowed'
                                      : isToday
                                      ? 'bg-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white'
                                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                  }`}
                                >
                                  {completed ? (
                                    <CheckCircle2 size={18} />
                                  ) : (
                                    <Circle size={18} />
                                  )}
                                </button>
                              </td>
                            )
                          })}
                          {habitView === 'month' && (() => {
                            const daysToShow = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]
                            const lastDay = monthDates.length
                            if (lastDay === 31) daysToShow.push(31)
                            
                            return daysToShow.map(day => {
                              const date = monthDates[day - 1]
                              if (!date) return null
                              const completed = checkHabitCompleted(habit.id, date)
                              
                              return (
                                <td key={date} className="text-center px-2 py-4">
                                  <div
                                    className={`w-6 h-6 rounded-full mx-auto ${
                                      completed ? 'bg-green-500' : 'bg-zinc-800'
                                    }`}
                                  />
                                </td>
                              )
                            })
                          })()}
                          {habitView === 'year' && yearMonths.map(({ month }) => {
                            const monthDatesForYear = getMonthDates(habitViewDate.getFullYear(), month)
                            const completions = monthDatesForYear.filter(date => 
                              checkHabitCompleted(habit.id, date)
                            ).length
                            const percentage = Math.round((completions / monthDatesForYear.length) * 100)
                            
                            return (
                              <td key={month} className="text-center px-2 py-4">
                                <div className="flex flex-col items-center gap-1">
                                  <div
                                    className={`w-6 h-6 rounded-full ${
                                      percentage > 80
                                        ? 'bg-green-500'
                                        : percentage > 50
                                        ? 'bg-yellow-500'
                                        : percentage > 20
                                        ? 'bg-orange-500'
                                        : 'bg-zinc-800'
                                    }`}
                                  />
                                  <span className="text-xs text-zinc-500">{percentage}%</span>
                                </div>
                              </td>
                            )
                          })}
                          <td className="text-center px-4 py-4">
                            <div className="text-white font-bold">{habit.current_streak}</div>
                            <div className="text-zinc-500 text-xs">Best: {habit.best_streak}</div>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => handleDeleteHabit(habit.id)}
                              className="text-zinc-600 hover:text-red-500 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'expenses' ? (
          <>
            {/* Expenses Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                  <button
                    onClick={() => setExpenseView('month')}
                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                      expenseView === 'month'
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setExpenseView('year')}
                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                      expenseView === 'year'
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Year
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <button
                    onClick={() => {
                      const newDate = new Date(expenseViewDate)
                      if (expenseView === 'month') {
                        newDate.setMonth(newDate.getMonth() - 1)
                      } else {
                        newDate.setFullYear(newDate.getFullYear() - 1)
                      }
                      setExpenseViewDate(newDate)
                    }}
                    className="text-zinc-400 hover:text-white"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-white text-sm font-medium min-w-[100px] text-center">
                    {expenseView === 'month'
                      ? expenseViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      : expenseViewDate.getFullYear()}
                  </span>
                  <button
                    onClick={() => {
                      const newDate = new Date(expenseViewDate)
                      if (expenseView === 'month') {
                        newDate.setMonth(newDate.getMonth() + 1)
                      } else {
                        newDate.setFullYear(newDate.getFullYear() + 1)
                      }
                      setExpenseViewDate(newDate)
                    }}
                    className="text-zinc-400 hover:text-white"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowExpenseModal(true)}
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
                    <p className="text-zinc-400 text-sm">
                      {expenseView === 'month' ? 'This Month' : 'This Year'}
                    </p>
                    <p className="text-white text-3xl font-bold">
                      ₹{(expenseView === 'month' ? monthTotal : yearTotal).toFixed(2)}
                    </p>
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
                    <p className="text-white text-3xl font-bold">
                      {expenseView === 'month' 
                        ? currentMonthExpenses.length 
                        : currentYearExpenses.length}
                    </p>
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
                    <p className="text-white text-lg font-bold">
                      {categoryBreakdown[0]?.category || 'None'}
                    </p>
                    <p className="text-zinc-500 text-sm">
                      ₹{categoryBreakdown[0]?.total.toFixed(2) || '0.00'}
                    </p>
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
                {categoryBreakdown.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">
                    No expenses in this period
                  </p>
                ) : (
                  categoryBreakdown.map(({ category, total, percentage }) => (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-400">{category}</span>
                        <span className="text-white font-medium">
                          ₹{total.toFixed(2)} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Expenses List */}
            <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 shadow-soft">
              <h3 className="text-white font-semibold mb-4">Recent Expenses</h3>
              {expenses.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign size={48} className="mx-auto text-zinc-700 mb-3" />
                  <p className="text-zinc-500">No expenses recorded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...expenses]
                    .filter(e => {
                      const expenseDate = e.expense_date || e.date || ''
                      if (expenseView === 'month') {
                        return currentMonthExpenses.some(ce => ce.id === e.id)
                      }
                      return currentYearExpenses.some(ye => ye.id === e.id)
                    })
                    .reverse()
                    .slice(0, 15)
                    .map(expense => (
                      <div
                        key={expense.id}
                        className="flex justify-between items-center py-3 px-4 hover:bg-zinc-900/50 rounded-xl transition"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-white font-semibold">
                              ₹{Number(expense.amount).toFixed(2)}
                            </span>
                            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                              {expense.category}
                            </span>
                          </div>
                          {expense.description && (
                            <p className="text-zinc-400 text-sm mt-1">
                              {expense.description}
                            </p>
                          )}
                          <p className="text-zinc-600 text-xs mt-1">
                            {new Date(expense.expense_date || expense.date || '').toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-zinc-600 hover:text-red-500 transition ml-4"
                        >
                          <Trash2 size={16} />
                        </button>
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
                      <h3 className="text-white font-semibold text-lg flex-1">
                        {note.title}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTogglePin(note.id, note.pinned)}
                          className={`transition ${
                            note.pinned ? 'text-yellow-500' : 'text-zinc-600 hover:text-yellow-500'
                          }`}
                        >
                          <Pin size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-zinc-600 hover:text-red-500 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <p className="text-zinc-400 text-sm mb-3 line-clamp-3">
                      {note.content}
                    </p>

                    {note.reminder_date && (
                      <div className="flex items-center gap-2 text-xs text-blue-500 mb-3">
                        <Bell size={14} />
                        {new Date(note.reminder_date).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {note.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
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

      {/* Add Habit Modal */}
      {showHabitModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="modal-content w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Add New Habit
            </h2>
            <p className="text-zinc-500 text-sm mb-6">
              Create a habit to track daily
            </p>
            
            <form onSubmit={handleAddHabit}>
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="Habit name (e.g., Morning Meditation)"
                className="w-full mb-6"
                autoFocus
              />
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowHabitModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHabitName.trim()}
                  className="btn-primary flex-1"
                >
                  Add Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="modal-content w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Add New Expense
            </h2>
            <p className="text-zinc-500 text-sm mb-6">
              Track your spending
            </p>
            
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  placeholder="0.00"
                  className="w-full"
                  autoFocus
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-zinc-400 text-sm font-medium">
                    Category
                  </label>
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
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCategory.trim()) {
                          const success = saveCustomCategory(newCategory.trim())
                          if (success) {
                            setAllCategories(getAllExpenseCategories())
                            setNewExpense({...newExpense, category: newCategory.trim()})
                            setNewCategory('')
                            setShowAddCategory(false)
                          } else {
                            alert('Category already exists')
                          }
                        }
                      }}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                      Add
                    </button>
                  </div>
                )}
                
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  className="w-full"
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  placeholder="What did you spend on?"
                  className="w-full"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newExpense.amount || parseFloat(newExpense.amount) <= 0}
                  className="btn-primary flex-1"
                >
                  Add Expense
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
            <h2 className="text-2xl font-bold text-white mb-2">
              Add New Note
            </h2>
            <p className="text-zinc-500 text-sm mb-6">
              Create a note with optional reminder
            </p>
            
            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                  placeholder="Note title"
                  className="w-full"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">
                  Content
                </label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                  placeholder="Write your note here..."
                  className="w-full h-24 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">
                  Reminder (optional)
                </label>
                <input
                  type="datetime-local"
                  value={newNote.reminderDate}
                  onChange={(e) => setNewNote({...newNote, reminderDate: e.target.value})}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">
                  Tags (comma-separated, optional)
                </label>
                <input
                  type="text"
                  value={newNote.tags}
                  onChange={(e) => setNewNote({...newNote, tags: e.target.value})}
                  placeholder="e.g., work, personal, urgent"
                  className="w-full"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newNote.title.trim() || !newNote.content.trim()}
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
