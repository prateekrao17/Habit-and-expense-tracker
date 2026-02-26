'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { GoalType } from '@/lib/supabase/types'
import { createSupabaseClient } from '@/lib/supabase/client'

interface AddHabitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  userId: string
}

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'series', label: 'Series (Streak)' },
  { value: 'duration', label: 'Duration' },
  { value: 'count', label: 'Count' },
]

const COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
]

/**
 * AddHabitModal Component
 * 
 * Modal form for creating a new habit with:
 * - Habit name input
 * - Goal type selector (Series/Duration/Count)
 * - Optional target number
 * - Color picker for habit card
 */
export function AddHabitModal({ open, onOpenChange, onSuccess, userId }: AddHabitModalProps) {
  const [habitName, setHabitName] = useState('')
  const [goalType, setGoalType] = useState<GoalType>('series')
  const [targetNumber, setTargetNumber] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createSupabaseClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!habitName.trim()) {
      alert('Please enter a habit name')
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('habits_series')
        .insert({
          user_id: userId,
          habit_name: habitName.trim(),
          goal_type: goalType,
          target_number: targetNumber ? parseInt(targetNumber) : null,
          color: selectedColor,
          current_sequence: 0,
          best_sequence: 0,
          last_ticked_at: null
        })
        .select()

      if (error) {
        console.error('Error creating habit:', error)
        alert('Failed to create habit. Please try again.')
        return
      }

      // Reset form
      setHabitName('')
      setGoalType('series')
      setTargetNumber('')
      setSelectedColor(COLOR_PRESETS[0])

      // Close modal and refresh
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Error creating habit:', error)
      alert('Failed to create habit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Add New Habit</DialogTitle>
          <DialogDescription>
            Create a new habit to track with the series-based streak system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Habit Name */}
          <div className="space-y-2">
            <Label htmlFor="habit-name">Habit Name</Label>
            <Input
              id="habit-name"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              placeholder="e.g., Morning Meditation"
              required
            />
          </div>

          {/* Goal Type */}
          <div className="space-y-2">
            <Label htmlFor="goal-type">Goal Type</Label>
            <Select
              id="goal-type"
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as GoalType)}
            >
              {GOAL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Target Number (optional) */}
          {(goalType === 'duration' || goalType === 'count') && (
            <div className="space-y-2">
              <Label htmlFor="target-number">
                Target {goalType === 'duration' ? 'Minutes' : 'Count'} (Optional)
              </Label>
              <Input
                id="target-number"
                type="number"
                min="1"
                value={targetNumber}
                onChange={(e) => setTargetNumber(e.target.value)}
                placeholder={goalType === 'duration' ? '30' : '10'}
              />
            </div>
          )}

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Card Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`
                    w-10 h-10 rounded-full border-2 transition-all
                    ${selectedColor === color ? 'border-gray-900 scale-110' : 'border-gray-300'}
                  `}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Habit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
