'use client'
import { useState, useEffect } from 'react'
import { 
  getHabits, 
  addHabit, 
  tickHabit, 
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
  EXPENSE_CATEGORIES,
  type Habit,
  type Expense
} from '@/lib/storage'
import { logout, getCurrentUsername, getCurrentUserId } from '@/lib/auth'
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
  BarChart3
} from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'habits' | 'expenses'>('habits')
  const [username, setUsername] = useState('')
  const [userId, setUserId] = useState('')
  
  const [habits, setHabits] = useState<Habit[]>([])
  const [showHabitModal, setShowHabitModal] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [habitView, setHabitView] = useState<'week' | 'month' | 'year'>('week')
  const [habitViewDate, setHabitViewDate] = useState(new Date())
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'Food',
    description: ''
  })
  const [expenseView, setExpenseView] = useState<'month' | 'year'>('month')
  const [expenseViewDate, setExpenseViewDate] = useState(new Date())

  useEffect(() => {
    setUsername(getCurrentUsername())
    setUserId(getCurrentUserId() || '')
    setHabits(getHabits())
    setExpenses(getExpenses())
  }, [])

  function handleAddHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!newHabitName.trim()) return
    
    const habit = addHabit(newHabitName.trim())
    setHabits([...habits, habit])
    setNewHabitName('')
    setShowHabitModal(false)
  }

  function handleTickHabit(habitId: string) {
    const updated = tickHabit(habitId)
    if (updated) {
      setHabits(getHabits())
    }
  }

  function handleDeleteHabit(habitId: string) {
    if (confirm('Delete this habit?')) {
      deleteHabit(habitId)
      setHabits(getHabits())
    }
  }

  function isHabitCompleted(habit: Habit, date: string): boolean {
    return habit.completions?.some(c => c.date === date) || false
  }

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) return
    
    addExpense(
      parseFloat(newExpense.amount),
      newExpense.category,
      newExpense.description.trim()
    )
    setExpenses(getExpenses())
    setNewExpense({ amount: '', category: 'Food', description: '' })
    setShowExpenseModal(false)
  }

  function handleDeleteExpense(expenseId: string) {
    if (confirm('Delete this expense?')) {
      deleteExpense(expenseId)
      setExpenses(getExpenses())
    }
  }

  function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      logout()
      window.location.href = '/auth'
    }
  }

  const weekDates = getCurrentWeekDates()
  const monthDates = getMonthDates(habitViewDate.getFullYear(), habitViewDate.getMonth())
  const yearMonths = getYearMonths(habitViewDate.getFullYear())

  const currentMonthExpenses = getMonthExpenses()
  const currentYearExpenses = getYearExpenses(expenseViewDate.getFullYear())
  const monthTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const yearTotal = currentYearExpenses.reduce((sum, e) => sum + e.amount, 0)
  const monthlyBreakdown = getMonthlyExpenseBreakdown(expenseViewDate.getFullYear())
  const categoryBreakdown = getCategoryBreakdown(
    expenseView === 'month' ? currentMonthExpenses : currentYearExpenses
  )
  
  return (
    <div className="min-h-screen bg-black">
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
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'habits' ? (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                  <button
                    onClick={() => setHabitView('week')}
                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                      habitView === 'week' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setHabitView('month')}
                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                      habitView === 'month' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setHabitView('year')}
                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                      habitView === 'year' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Year
                  </button>
                </div>

                {habitView !== 'week' && (
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                    <button
                      onClick={() => {
                        const newDate = new Date(habitViewDate)
                        habitView === 'month'
                          ? newDate.setMonth(newDate.getMonth() - 1)
                          : newDate.setFullYear(newDate.getFullYear() - 1)
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
                        habitView === 'month'
                          ? newDate.setMonth(newDate.getMonth() + 1)
                          : newDate.setFullYear(newDate.getFullYear() + 1)
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
                className="bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition font-medium flex items-center gap-2"
              >
                <Plus size={18} />
                Add Habit
              </button>
            </div>

            {habits.length === 0 ? (
              <div className="text-center py-20">
                <TrendingUp size={64} className="mx-auto text-zinc-700 mb-4" />
                <p className="text-zinc-500 text-lg">No habits yet</p>
                <p className="text-zinc-600 text-sm mt-2">Click "Add Habit" to start tracking</p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-800/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-zinc-400 text-sm font-medium sticky left-0 bg-zinc-800/50 z-10">
                          Habit
                        </th>
                        {habitView === 'week' && weekDates.map(date => {
                          const d = new Date(date)
                          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
                          return (
                            <th key={date} className="text-center px-2 py-3 text-zinc-400 text-xs font-medium min-w-[60px]">
                              <div>{dayName}</div>
                              <div className="text-zinc-500">{d.getDate()}</div>
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
                        <th className="text-center px-4 py-3 text-zinc-400 text-sm font-medium">Streak</th>
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
                            const completed = isHabitCompleted(habit, date)
                            const isToday = date === new Date().toISOString().split('T')[0]
                            const isPast = date < new Date().toISOString().split('T')[0]
                            
                            return (
                              <td key={date} className="text-center px-2 py-4">
                                <button
                                  onClick={() => handleTickHabit(habit.id)}
                                  disabled={completed}
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition ${
                                    completed
                                      ? 'bg-green-500 text-white'
                                      : isToday
                                      ? 'bg-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white'
                                      : isPast
                                      ? 'bg-zinc-800 text-zinc-600'
                                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                  }`}
                                >
                                  {completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
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
                              const completed = isHabitCompleted(habit, date)
                              return (
                                <td key={date} className="text-center px-2 py-4">
                                  <div className={`w-6 h-6 rounded-full mx-auto ${completed ? 'bg-green-500' : 'bg-zinc-800'}`} />
                                </td>
                              )
                            })
                          })()}
                          {habitView === 'year' && yearMonths.map(({ month }) => {
                            const monthDatesForYear = getMonthDates(habitViewDate.getFullYear(), month)
                            const completions = habit.completions?.filter(c =>
                              monthDatesForYear.includes(c.date)
                            ).length || 0
                            const percentage = Math.round((completions / monthDatesForYear.length) * 100)
                            
                            return (
                              <td key={month} className="text-center px-2 py-4">
                                <div className="flex flex-col items-center gap-1">
                                  <div
                                    className={`w-6 h-6 rounded-full ${
                                      percentage > 80 ? 'bg-green-500' : percentage > 50 ? 'bg-yellow-500' : percentage > 20 ? 'bg-orange-500' : 'bg-zinc-800'
                                    }`}
                                  />
                                  <span className="text-xs text-zinc-500">{percentage}%</span>
                                </div>
                              </td>
                            )
                          })}
                          <td className="text-center px-4 py-4">
                            <div className="text-white font-bold">{habit.currentStreak}</div>
                            <div className="text-zinc-500 text-xs">Best: {habit.bestStreak}</div>
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
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                  <button
                    onClick={() => setExpenseView('month')}
                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                      expenseView === 'month' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setExpenseView('year')}
                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                      expenseView === 'year' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Year
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <button
                    onClick={() => {
                      const newDate = new Date(expenseViewDate)
                      expenseView === 'month'
                        ? newDate.setMonth(newDate.getMonth() - 1)
                        : newDate.setFullYear(newDate.getFullYear() - 1)
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
                      expenseView === 'month'
                        ? newDate.setMonth(newDate.getMonth() + 1)
                        : newDate.setFullYear(newDate.getFullYear() + 1)
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
                className="bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition font-medium flex items-center gap-2"
              >
                <Plus size={18} />
                Add Expense
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <div className="flex items-center gap-3">
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

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/10 p-3 rounded-lg">
                    <Calendar className="text-green-500" size={24} />
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Transactions</p>
                    <p className="text-white text-3xl font-bold">
                      {expenseView === 'month' ? currentMonthExpenses.length : currentYearExpenses.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <div className="flex items-center gap-3">
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

            {expenseView === 'year' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 size={20} />
                  Monthly Breakdown
                </h3>
                <div className="space-y-3">
                  {monthlyBreakdown.map(({ month, total }) => {
                    const monthName = new Date(2000, month).toLocaleDateString('en-US', { month: 'short' })
                    const percentage = yearTotal > 0 ? (total / yearTotal) * 100 : 0
                    
                    return (
                      <div key={month}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-400">{monthName}</span>
                          <span className="text-white font-medium">₹{total.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <PieChart size={20} />
                Category Breakdown
              </h3>
              <div className="space-y-3">
                {categoryBreakdown.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">No expenses in this period</p>
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

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
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
                        className="flex justify-between items-center py-3 px-4 hover:bg-zinc-800/50 rounded-lg transition"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-white font-semibold">
                              ₹{expense.amount.toFixed(2)}
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
                            {new Date(expense.date).toLocaleDateString('en-IN', {
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
        )}
      </main>

      {showHabitModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Add New Habit</h2>
            <form onSubmit={handleAddHabit}>
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="Habit name (e.g., Morning Meditation)"
                className="w-full mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowHabitModal(false)}
                  className="flex-1 border border-zinc-800 text-white py-2 px-4 rounded-lg hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHabitName.trim()}
                  className="flex-1 bg-white text-black py-2 px-4 rounded-lg hover:bg-zinc-200 transition font-medium"
                >
                  Add Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Add New Expense</h2>
            <form onSubmit={handleAddExpense}>
              <div className="mb-3">
                <label className="block text-zinc-400 text-sm mb-2">Amount (₹)</label>
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
              <div className="mb-3">
                <label className="block text-zinc-400 text-sm mb-2">Category</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  className="w-full"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-zinc-400 text-sm mb-2">Description (optional)</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  placeholder="What did you spend on?"
                  className="w-full"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 border border-zinc-800 text-white py-2 px-4 rounded-lg hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newExpense.amount || parseFloat(newExpense.amount) <= 0}
                  className="flex-1 bg-white text-black py-2 px-4 rounded-lg hover:bg-zinc-200 transition font-medium"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
