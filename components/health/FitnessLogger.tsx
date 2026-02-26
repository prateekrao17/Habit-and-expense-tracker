'use client'

import { useState } from 'react'
import { Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSupabaseClient } from '@/lib/supabase/client'

const FITNESS_TYPES = ['Gym', 'Run', 'Yoga', 'Walk']

/**
 * FitnessLogger Component
 * 
 * Quick logging for fitness activities:
 * - Activity type buttons (Gym, Run, Yoga, Walk)
 * - Duration input
 * - Saves to health_tracking table
 */
export function FitnessLogger() {
  const [selectedType, setSelectedType] = useState<string>('')
  const [duration, setDuration] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createSupabaseClient()

  const handleSave = async () => {
    if (!selectedType || !duration) {
      alert('Please select an activity type and enter duration')
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
          category: 'fitness',
          value: {
            type: selectedType,
            duration: parseInt(duration),
            unit: 'minutes',
          },
        })

      if (error) throw error

      // Reset form
      setSelectedType('')
      setDuration('')
      alert('Fitness activity logged!')
    } catch (error) {
      console.error('Error logging fitness:', error)
      alert('Failed to log activity. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Fitness Logger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Activity Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {FITNESS_TYPES.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                onClick={() => setSelectedType(type)}
                className="w-full"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="30"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || !selectedType || !duration}
          className="w-full"
        >
          {isSaving ? 'Saving...' : 'Log Activity'}
        </Button>
      </CardContent>
    </Card>
  )
}
