'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resetPassword } from '@/lib/auth'
import { parseAuthLink } from '@/lib/auth-links'
import { Lock } from 'lucide-react'

// Password-reset landing page for the emailed recovery LINK.
// (The 6-digit code path on /auth still works too.)
// The recovery token is exchanged only when the person submits a new password.

type Stage = 'checking' | 'form' | 'invalid' | 'done'

export default function ResetPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('checking')
  const [tokenHash, setTokenHash] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const link = parseAuthLink(window.location.search, window.location.hash)
    window.history.replaceState(null, '', '/auth/reset')
    async function run() {
      if (link.kind === 'token_hash' && link.type === 'recovery') {
        setTokenHash(link.tokenHash)
        setStage('form')
      } else if (link.kind === 'code') {
        const { error } = await supabase.auth.exchangeCodeForSession(link.code)
        setStage(error ? 'invalid' : 'form')
      } else if (link.kind === 'session') {
        const { error } = await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
        setStage(error ? 'invalid' : 'form')
      } else {
        setStage('invalid')
      }
    }
    void run()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirm) return setError('Passwords do not match')
    setLoading(true)
    if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      if (error) {
        setLoading(false)
        setTokenHash(null)
        setStage('invalid')
        return
      }
      setTokenHash(null)
    }
    const res = await resetPassword('', password)
    setLoading(false)
    if (!res.success) {
      setError('Could not change the password. The link may have expired; request a new one.')
      return
    }
    setStage('done')
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-8 shadow-soft">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-500/10 p-4 rounded-full">
              <Lock className="text-blue-500" size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-6">Set a New Password</h1>

          {stage === 'checking' && <p className="text-zinc-400 text-center">Checking your link...</p>}

          {stage === 'invalid' && (
            <>
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm mb-4">
                This reset link is invalid, already used, or expired. Request a new one from the login page.
              </div>
              <button onClick={() => router.push('/auth')} className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl w-full transition">
                Back to Login
              </button>
            </>
          )}

          {stage === 'done' && (
            <>
              <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-lg text-sm mb-4">
                Password changed. Please log in with your new password.
              </div>
              <button onClick={() => router.push('/auth')} className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl w-full transition">
                Go to Login
              </button>
            </>
          )}

          {stage === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">New Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="••••••••" required autoFocus />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Confirm New Password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl w-full transition disabled:opacity-50">
                {loading ? 'Saving...' : 'Change Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
