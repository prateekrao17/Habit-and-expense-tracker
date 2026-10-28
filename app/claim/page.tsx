'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { claimLegacyAccount, logout } from '@/lib/auth'
import { Lock, Mail, ArrowLeft } from 'lucide-react'

export default function ClaimPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)
  const [identifier, setIdentifier] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedInEmail(data.user?.email ?? null)
      setChecking(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await claimLegacyAccount(identifier, oldPassword)
    setLoading(false)
    if (result.success) {
      router.push('/')
    } else {
      setOldPassword('')
      setError(result.error || 'Could not verify that account.')
    }
  }

  const inputClass =
    'w-full bg-zinc-900 border border-zinc-700 text-white pl-10 px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500'

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-8 shadow-soft">
          <button
            onClick={() => { logout(); router.push('/auth') }}
            className="text-zinc-400 hover:text-white mb-4 flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Back to Login
          </button>

          <div className="flex justify-center mb-6">
            <div className="bg-blue-500/10 p-4 rounded-full">
              <Lock className="text-blue-500" size={32} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">Link Your Existing Account</h1>

          {checking ? (
            <p className="text-zinc-400 text-center">Loading...</p>
          ) : !signedInEmail ? (
            <div className="text-zinc-400 text-sm space-y-3">
              <p>To keep your old habits, expenses and notes:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Sign up using the <span className="text-white">same email</span> as your old account.</li>
                <li>Click the confirmation link we email you.</li>
                <li>Log in. You will come back here to confirm your old password once.</li>
              </ol>
              <p>If your old account had no real email or you forgot the old password, contact the app owner.</p>
              <button
                onClick={() => router.push('/auth')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl w-full transition mt-2"
              >
                Go to Sign Up / Login
              </button>
            </div>
          ) : (
            <>
              <p className="text-zinc-400 text-center mb-6">
                Signed in as <span className="text-white">{signedInEmail}</span>. Enter your old login details once to bring back your data.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-sm font-medium mb-2">Old Email / Username / Mobile Number</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className={inputClass}
                      placeholder="email / username / mobile"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm font-medium mb-2">Old Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl w-full transition disabled:opacity-50"
                >
                  {loading ? 'Checking...' : 'Link Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
