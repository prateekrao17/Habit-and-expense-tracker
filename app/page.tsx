'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsAuthenticated(true)
      } else {
        // For MVP, allow access without authentication
        setIsAuthenticated(true)
      }
    } catch (error: any) {
      if (error.message?.includes('Missing Supabase environment variables') ||
          error.message?.includes('dummy')) {
        // For MVP, allow access with dummy auth
        setIsAuthenticated(true)
      } else {
        console.error('Auth check failed:', error)
        router.push('/auth')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Setup Required</h1>
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
            <p className="text-destructive mb-4">{error}</p>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Please create a <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file in your project root with:</p>
              <pre className="bg-muted p-2 rounded text-left text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to /auth
  }

  return null
}
