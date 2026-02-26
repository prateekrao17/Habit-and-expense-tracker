'use client'

import { useState, useEffect, useRef } from 'react'
import { Sun } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createSupabaseClient } from '@/lib/supabase/client'

/**
 * SunlightTracker Component
 * 
 * Simple timer for tracking sunlight exposure:
 * - Start/Stop timer
 * - Shows total minutes for the day
 * - Saves to health_tracking table
 */
export function SunlightTracker() {
  const [isRunning, setIsRunning] = useState(false)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [sessionMinutes, setSessionMinutes] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createSupabaseClient()

  // Load today's total on mount
  useEffect(() => {
    loadTodayTotal()
  }, [])

  // Timer logic
  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date()
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60)
        setSessionMinutes(diff)
      }, 60000) // Update every minute
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, startTime])

  const loadTodayTotal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('health_tracking')
        .select('value')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .eq('category', 'sunlight')

      if (error) throw error

      // Sum up all sunlight minutes for today
      const total = data?.reduce((sum, entry) => {
        return sum + (entry.value?.minutes || 0)
      }, 0) || 0

      setTotalMinutes(total)
    } catch (error) {
      console.error('Error loading sunlight total:', error)
    }
  }

  const handleStart = () => {
    setIsRunning(true)
    setStartTime(new Date())
    setSessionMinutes(0)
  }

  const handleStop = async () => {
    if (!startTime) return

    setIsRunning(false)
    const minutes = sessionMinutes || 1 // At least 1 minute

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase
        .from('health_tracking')
        .insert({
          user_id: user.id,
          log_date: today,
          category: 'sunlight',
          value: {
            minutes,
            sessionStart: startTime.toISOString(),
            sessionEnd: new Date().toISOString(),
          },
        })

      if (error) throw error

      // Update total
      await loadTodayTotal()
      setStartTime(null)
      setSessionMinutes(0)
    } catch (error) {
      console.error('Error saving sunlight:', error)
      alert('Failed to save sunlight time. Please try again.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5" />
          Sunlight Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">
            {totalMinutes + sessionMinutes}
          </div>
          <div className="text-sm text-muted-foreground">Total Minutes Today</div>
        </div>

        {isRunning && (
          <div className="text-center">
            <div className="text-lg font-semibold text-muted-foreground">
              Current Session: {sessionMinutes} min
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} className="w-full">
              Start Sun Time
            </Button>
          ) : (
            <Button onClick={handleStop} variant="destructive" className="w-full">
              Stop Sun Time
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
