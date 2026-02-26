'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from '@/lib/auth'
import { Lock, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const result = await login(username, password)
        if (result.success) {
          router.push('/')
        } else {
          setError(result.error || 'Login failed')
        }
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        const result = await signup(username, password)
        if (result.success) {
          router.push('/')
        } else {
          setError(result.error || 'Signup failed')
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Life Tracker</h1>
          <p className="text-zinc-400">Track your habits and expenses</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-zinc-800/50 p-1 rounded-lg">
            <button
              onClick={() => {
                setIsLogin(true)
                setError('')
                setConfirmPassword('')
              }}
              className={`flex-1 py-2 px-4 rounded font-medium transition flex items-center justify-center gap-2 ${
                isLogin
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn size={18} />
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false)
                setError('')
                setConfirmPassword('')
              }}
              className={`flex-1 py-2 px-4 rounded font-medium transition flex items-center justify-center gap-2 ${
                !isLogin
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus size={18} />
              Signup
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-zinc-400 text-sm mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-zinc-400 text-sm mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Signup only) */}
            {!isLogin && (
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                  disabled={loading}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !username || !password || (!isLogin && !confirmPassword)}
              className="w-full bg-white text-black py-2 px-4 rounded-lg hover:bg-zinc-200 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock size={18} />
              {loading ? 'Loading...' : isLogin ? 'Login' : 'Signup'}
            </button>
          </form>

          {/* Info Text */}
          <p className="text-zinc-500 text-xs text-center mt-6">
            {isLogin
              ? 'Don\'t have an account? Use the Signup tab'
              : 'Already have an account? Use the Login tab'}
          </p>
        </div>
      </div>
    </div>
  )
}
