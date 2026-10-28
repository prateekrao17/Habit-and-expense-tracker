'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ensureSession } from '@/lib/auth'
import { Lock, Mail } from 'lucide-react'

// Email confirmation landing page.
// The emailed link carries a one-time token_hash. It is verified ONLY when the
// person clicks the button, so email link scanners / prefetchers (which just
// load the page) cannot use up the token. Tokens are never logged.

const ALLOWED_TYPES: EmailOtpType[] = ['email', 'signup']

export default function ConfirmPage() {
  const router = useRouter()
  const [tokenHash, setTokenHash] = useState<string | null>(null)
  const [type, setType] = useState<EmailOtpType>('email')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendMsg, setResendMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const th = params.get('token_hash')
    const t = params.get('type') as EmailOtpType | null
    setTokenHash(th)
    if (t && ALLOWED_TYPES.includes(t)) setType(t)
    // Remove the token from the address bar / history.
    window.history.replaceState(null, '', '/auth/confirm')
    setReady(true)
  }, [])

  async function handleConfirm() {
    if (!tokenHash) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      // Maybe a second click after a successful first one.
      const { data } = await supabase.auth.getUser()
      setLoading(false)
      if (data.user?.email_confirmed_at) {
        await routeAfterConfirm()
        return
      }
      setTokenHash(null)
      setError('This confirmation link is invalid, already used, or expired. Request a new one below.')
      return
    }
    await routeAfterConfirm()
  }

  async function routeAfterConfirm() {
    const ok = await ensureSession()
    router.push(ok ? '/' : '/claim')
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    setResendMsg('')
    await supabase.auth.resend({
      type: 'signup',
      email: resendEmail.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })
    // Same message whether or not the address has an account.
    setResendMsg('If that email has an unconfirmed account, a new link has been sent. Use only the newest email.')
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
          <h1 className="text-2xl font-bold text-white text-center mb-2">Confirm Your Email</h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {ready && tokenHash ? (
            <>
              <p className="text-zinc-400 text-center mb-6">Click below to finish creating your account.</p>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl w-full transition disabled:opacity-50"
              >
                {loading ? 'Confirming...' : 'Confirm my email'}
              </button>
            </>
          ) : ready ? (
            <form onSubmit={handleResend} className="space-y-4">
              {!error && <p className="text-zinc-400 text-center">This link is missing its code. Request a new confirmation email.</p>}
              {resendMsg && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-lg text-sm">
                  {resendMsg}
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl w-full transition"
              >
                Send new confirmation link
              </button>
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="w-full text-blue-500 hover:underline text-sm"
              >
                Back to Login
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
