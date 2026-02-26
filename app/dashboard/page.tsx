'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SeriesTicker from '@/components/SeriesTicker'
import { AddHabitModal } from '@/components/AddHabitModal'
import { Plus, LogOut, User } from 'lucide-react'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    setUser(session.user)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Habit Tracker</h1>

          <div className="flex items-center gap-4">
            <div className="text-white flex items-center gap-2">
              <User size={20} />
              <span className="text-sm">{user?.email}</span>
            </div>
            <button
              onClick={signOut}
              className="text-zinc-400 hover:text-white transition"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Your Habits</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition font-medium flex items-center gap-2"
          >
            <Plus size={18} />
            Add Habit
          </button>
        </div>

        <SeriesTicker key={refreshKey} userId={user.id} />
      </main>

      {/* Add Habit Modal */}
      <AddHabitModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        userId={user.id}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  )
}