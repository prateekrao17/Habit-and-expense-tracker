'use client'

import { useState, useEffect } from 'react'
import { Monitor } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSupabaseClient } from '@/lib/supabase/client'

/**
 * ScreenTimeTracker Component
 * 
 * Manual input for screen time:
 * - Hours input
 * - Daily log visualization (last 7 days)
 */
export function ScreenTimeTracker() {
  const [hours, setHours] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [recentLogs, setRecentLogs] = useState<Array<{ date: string; hours: number }>>([])
  const supabase = createSupabaseClient()

  useEffect(() => {
    loadRecentLogs()
  }, [])

  const loadRecentLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data, error } = await supabase
        .from('health_tracking')
        .select('log_date, value')
        .eq('user_id', user.id)
        .eq('category', 'screentime')
        .gte('log_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('log_date', { ascending: true })

      if (error) throw error

      const logs = (data || []).map((entry) => ({
        date: entry.log_date,
        hours: entry.value?.hours || 0,
      }))

      setRecentLogs(logs)
    } catch (error) {
      console.error('Error loading screen time logs:', error)
    }
  }

  const handleSave = async () => {
    const hoursNum = parseFloat(hours)
    if (!hours || isNaN(hoursNum) || hoursNum < 0) {
      alert('Please enter a valid number of hours')
      return
    }

    setIsSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const today = new Date().toISOString().split('T')[0]

      // Check if already logged today, update if exists
      const { data: existing } = await supabase
        .from('health_tracking')
        .select('id')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .eq('category', 'screentime')
        .single()

      if (existing) {
        const { error } = await supabase
          .from('health_tracking')
          .update({
            value: { hours: hoursNum },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('health_tracking')
          .insert({
            user_id: user.id,
            log_date: today,
            category: 'screentime',
            value: { hours: hoursNum },
          })

        if (error) throw error
      }

      setHours('')
      await loadRecentLogs()
      alert('Screen time logged!')
    } catch (error) {
      console.error('Error logging screen time:', error)
      alert('Failed to log screen time. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Get last 7 days for visualization
  const getLast7Days = () => {
    const days = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const log = recentLogs.find((l) => l.date === dateStr)

      days.push({
        date: dateStr,
        hours: log?.hours || 0,
        isToday: i === 0,
      })
    }

    return days
  }

  const last7Days = getLast7Days()
  const maxHours = Math.max(...last7Days.map((d) => d.hours), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Screen Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="screen-hours">Hours Today</Label>
          <Input
            id="screen-hours"
            type="number"
            step="0.5"
            min="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="2.5"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || !hours}
          className="w-full"
        >
          {isSaving ? 'Saving...' : 'Log Screen Time'}
        </Button>

        {/* Last 7 Days Visualization */}
        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground mb-2">Last 7 Days</div>
          <div className="space-y-2">
            {last7Days.map((day) => (
              <div key={day.date} className="flex items-center gap-2">
                <div className="text-xs w-12 text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                  })}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{
                      width: `${(day.hours / maxHours) * 100}%`,
                    }}
                  />
                </div>
                <div className="text-xs w-12 text-right">
                  {day.hours > 0 ? `${day.hours}h` : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
