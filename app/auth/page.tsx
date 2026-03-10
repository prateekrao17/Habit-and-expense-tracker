'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  signup, 
  login,
  sendPasswordResetOTP,
  verifyResetOTP,
  resetPassword
} from '@/lib/auth'
import { Lock, Mail, Eye, EyeOff, ArrowLeft, User } from 'lucide-react'

type Mode = 'login' | 'signup' | 'forgot'
type ForgotStep = 'email' | 'verify' | 'reset'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email')
  
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const result = await login(identifier, password)
      if (result.success) {
        router.push('/')
      } else {
        setError(result.error || 'Login failed')
      }
    } else if (mode === 'signup') {
      if (!identifier) {
        setError('Email, username, or mobile number is required')
        setLoading(false)
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      const result = await signup(identifier, password)
      if (result.success) {
        router.push('/')
      } else {
        setError(result.error || 'Signup failed')
      }
    } else if (mode === 'forgot') {
      const result = await sendPasswordResetOTP(identifier)
      if (result.success) {
        setSuccess('Reset code sent! Check your console.')
        setForgotStep('verify')
      } else {
        setError(result.error || 'Failed to send reset code')
      }
    }

    setLoading(false)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (forgotStep === 'verify') {
      const result = await verifyResetOTP(identifier, otp)
      if (result.success) {
        setSuccess('Code verified!')
        setForgotStep('reset')
      } else {
        setError(result.error || 'Invalid code')
      }
    } else if (forgotStep === 'reset') {
      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      const result = await resetPassword(identifier, newPassword)
      if (result.success) {
        alert('Password reset successful!')
        setMode('login')
        setForgotStep('email')
        setIdentifier('')
        setPassword('')
        setOtp('')
        setNewPassword('')
        setError('')
        setSuccess('')
      } else {
        setError(result.error || 'Failed to reset password')
      }
    }

    setLoading(false)
  }

  function resetForm() {
    setIdentifier('')
    setPassword('')
    setConfirmPassword('')
    setOtp('')
    setNewPassword('')
    setError('')
    setSuccess('')
    setForgotStep('email')
  }

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-8 shadow-soft">
            <button
              onClick={() => { setMode('login'); resetForm(); }}
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

            <h1 className="text-2xl font-bold text-white text-center mb-2">Reset Password</h1>
            <p className="text-zinc-400 text-center mb-6">
              {forgotStep === 'email' && 'Enter your email'}
              {forgotStep === 'verify' && 'Verify your code'}
              {forgotStep === 'reset' && 'Create new password'}
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-lg text-sm mb-4">
                {success}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              {forgotStep === 'email' && (
                <div>
                  <label className="block text-zinc-400 text-sm font-medium mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                      placeholder="your@email.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {forgotStep === 'verify' && (
                <div>
                  <label className="block text-zinc-400 text-sm font-medium mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-center text-3xl font-mono px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
              )}

              {forgotStep === 'reset' && (
                <div>
                  <label className="block text-zinc-400 text-sm font-medium mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                      placeholder="••••••••"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl w-full transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Processing...' : (forgotStep === 'email' ? 'Send Code' : forgotStep === 'verify' ? 'Verify' : 'Reset Password')}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
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

          <h1 className="text-2xl font-bold text-white text-center mb-2">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-zinc-400 text-center mb-6">
            {mode === 'login' ? 'Login to your tracker' : 'Sign up to start tracking'}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            {mode === 'login' && (
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Email / Username / Mobile Number</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                    placeholder="email / username / mobile"
                    required
                    autoFocus
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Email / Username / Mobile Number</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                    placeholder="email / username / 10-digit mobile"
                    required
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-zinc-400 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 pr-10 px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl w-full transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Sign Up')}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => { setMode('forgot'); resetForm(); }}
                className="w-full text-blue-500 hover:underline text-sm mt-4"
              >
                Forgot password?
              </button>
            )}

            <div className="text-center text-zinc-500 text-sm mt-6">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); resetForm(); }}
                    className="text-blue-500 hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); resetForm(); }}
                    className="text-blue-500 hover:underline"
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
