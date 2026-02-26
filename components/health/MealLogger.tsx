'use client'

import { useState } from 'react'
import { Utensils } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { createSupabaseClient } from '@/lib/supabase/client'

const MEAL_TIMES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

/**
 * MealLogger Component
 * 
 * Log meals with:
 * - Time selector (Breakfast/Lunch/Dinner/Snack)
 * - Meal description input
 * - Photo upload (optional for MVP - placeholder)
 */
export function MealLogger() {
  const [mealTime, setMealTime] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createSupabaseClient()

  const handleSave = async () => {
    if (!mealTime || !description.trim()) {
      alert('Please select meal time and enter description')
      return
    }

    setIsSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase
        .from('health_tracking')
        .insert({
          user_id: user.id,
          log_date: today,
          category: 'meals',
          value: {
            mealTime,
            description: description.trim(),
            timestamp: new Date().toISOString(),
          },
        })

      if (error) throw error

      // Reset form
      setMealTime('')
      setDescription('')
      alert('Meal logged!')
    } catch (error) {
      console.error('Error logging meal:', error)
      alert('Failed to log meal. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5" />
          Meal Logger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="meal-time">Meal Time</Label>
          <Select
            id="meal-time"
            value={mealTime}
            onChange={(e) => setMealTime(e.target.value)}
          >
            <option value="">Select meal time</option>
            {MEAL_TIMES.map((time) => (
              <option key={time.value} value={time.value}>
                {time.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meal-description">Description</Label>
          <Input
            id="meal-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Grilled chicken with vegetables"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          Photo upload coming soon...
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || !mealTime || !description.trim()}
          className="w-full"
        >
          {isSaving ? 'Saving...' : 'Log Meal'}
        </Button>
      </CardContent>
    </Card>
  )
}
