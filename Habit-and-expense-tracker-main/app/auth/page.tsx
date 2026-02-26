'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup, isAuthenticated, isUsernameAvailable } from '@/lib/auth'
import { Lock, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPasswordInput] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/')
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      setLoading(false)
      return
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters')
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      // Signup validation
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      if (!isUsernameAvailable(username)) {
        setError('Username already taken. Please choose another.')
        setLoading(false)
        return
      }

      // Create account
      const success = signup(username, password)
      if (success) {
        router.push('/')
      } else {
        setError('Failed to create account')
      }
    } else {
      // Login
      const success = login(username, password)
      if (success) {
        router.push('/')
      } else {
        setError('Invalid username or password')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-500/10 p-4 rounded-full">
              <Lock className="text-blue-500" size={32} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-zinc-400 text-center mb-6">
            {mode === 'login' 
              ? 'Login to access your tracker' 
              : 'Sign up to start tracking'}
          </p>

          {/* Toggle Login/Signup */}
          <div className="flex bg-zinc-800 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
              }}
              className={`flex-1 py-2 rounded text-sm font-medium transition ${
                mode === 'login'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn className="inline mr-2" size={16} />
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError('')
              }}
              className={`flex-1 py-2 rounded text-sm font-medium transition ${
                mode === 'signup'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus className="inline mr-2" size={16} />
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-zinc-400 text-sm mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                autoFocus
                required
                autoComplete="username"
              />
            </div>

            <div className="mb-4">
              <label className="block text-zinc-400 text-sm mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 pr-10"
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="mb-4">
                <label className="block text-zinc-400 text-sm mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-3 px-4 rounded-lg hover:bg-zinc-200 transition font-medium disabled:opacity-50"
            >
              {loading 
                ? 'Please wait...' 
                : mode === 'login' 
                ? 'Login' 
                : 'Create Account'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-zinc-500 text-xs text-center mt-4">
              By signing up, your data is stored locally on this device
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
