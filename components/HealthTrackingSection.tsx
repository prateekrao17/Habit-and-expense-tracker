'use client'

import { FitnessLogger } from '@/components/health/FitnessLogger'
import { MealLogger } from '@/components/health/MealLogger'
import { SunlightTracker } from '@/components/health/SunlightTracker'
import { ScreenTimeTracker } from '@/components/health/ScreenTimeTracker'
import { QuickNotes } from '@/components/health/QuickNotes'

/**
 * HealthTrackingSection Component
 * 
 * Container for all health tracking components
 */
export function HealthTrackingSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Health Tracking</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FitnessLogger />
        <MealLogger />
        <SunlightTracker />
        <ScreenTimeTracker />
      </div>

      <QuickNotes />
    </div>
  )
}
