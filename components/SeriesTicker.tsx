'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Circle } from 'lucide-react'

interface Habit {
  id: string
  habit_name: string
  current_sequence: number
  best_sequence: number
  last_ticked_at: string | null
  color: string
}

export default function SeriesTicker({ userId }: { userId: string }) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHabits()
  }, [userId])

  async function fetchHabits() {
    const { data, error } = await supabase
      .from('habits_series')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setHabits(data)
    }
    setLoading(false)
  }

  async function tickHabit(habit: Habit) {
    const today = new Date().toISOString().split('T')[0]
    const lastTicked = habit.last_ticked_at?.split('T')[0]

    // Check if already ticked today
    if (lastTicked === today) {
      alert('Already ticked today!')
      return
    }

    // Calculate new sequence
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const isConsecutive = lastTicked === yesterdayStr
    const newSequence = isConsecutive ? habit.current_sequence + 1 : 1
    const newBest = Math.max(newSequence, habit.best_sequence)

    // Update habit
    // @ts-ignore
    const { error: habitError } = await supabase
      .from('habits_series')
      .update({
        current_sequence: newSequence,
        best_sequence: newBest,
        last_ticked_at: new Date().toISOString()
      })
      .eq('id', habit.id)

    // Log the tick
    const { error: logError } = await supabase
      .from('daily_logs')
      .insert({
        user_id: userId,
        habit_id: habit.id,
        log_date: today,
        sequence_number: newSequence,
        completed: true
      })

    if (!habitError && !logError) {
      fetchHabits() // Refresh
      if (newSequence > habit.current_sequence) {
        // Celebration for milestones
        if ([5, 10, 25, 50, 100].includes(newSequence)) {
          alert(`🎉 ${newSequence} day streak! Amazing!`)
        }
      }
    }
  }

  if (loading) {
    return <div className="text-white">Loading habits...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {habits.map(habit => (
        <div
          key={habit.id}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition"
        >
          <h3 className="text-white font-semibold text-lg mb-2">
            {habit.habit_name}
          </h3>

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-5xl font-bold text-white">
              {habit.current_sequence}
            </span>
            <span className="text-zinc-400">day streak</span>
          </div>

          <div className="text-sm text-zinc-400 mb-4">
            Best: {habit.best_sequence} days
          </div>

          <button
            onClick={() => tickHabit(habit)}
            className="w-full bg-white text-black py-2 px-4 rounded-lg hover:bg-zinc-200 transition font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            Tick Today
          </button>
        </div>
      ))}
    </div>
  )
}
