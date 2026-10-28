import { supabase } from './supabase'

// Authentication is handled by Supabase Auth. No passwords are hashed,
// stored or compared in the browser. The cached profile below only holds
// display info + the app user id; every database request is authorised by
// the Supabase session token and enforced by RLS on the server.

const SESSION_KEY = 'app_session'
const USER_KEY = 'current_user'

interface User {
  id: string
  email: string
  username: string
  created_at: string
}

type Result = { success: boolean; error?: string; user?: User; needsClaim?: boolean; message?: string }

async function loadProfile(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users')
    .select('id, email, username, created_at')
    .eq('auth_id', user.id)
    .maybeSingle()
  return (data as User) || null
}

async function finishSignIn(): Promise<Result> {
  const profile = await loadProfile()
  if (!profile) {
    // Signed in, but this email belongs to an existing account that has not been claimed yet.
    return { success: false, needsClaim: true }
  }
  await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', profile.id)
  setSession(profile)
  return { success: true, user: profile }
}

export async function signup(
  email: string,
  password: string,
  username?: string,
  mobile?: string
): Promise<Result> {
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username, mobile, redirectTo: `${window.location.origin}/auth/confirm` }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { success: false, error: body.error || 'Signup failed' }
    return { success: true, message: body.message }
  } catch {
    return { success: false, error: 'Signup failed' }
  }
}

export async function login(identifier: string, password: string): Promise<Result> {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.access_token) return { success: false, error: body.error || 'Invalid login details' }

    const { error } = await supabase.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    })
    if (error) return { success: false, error: 'Login failed' }
    return await finishSignIn()
  } catch {
    return { success: false, error: 'Login failed' }
  }
}

// Link an existing (pre-migration) account. The old password is checked only
// inside the database function; this call returns just true/false.
export async function claimLegacyAccount(identifier: string, oldPassword: string): Promise<Result> {
  const { data, error } = await supabase.rpc('claim_legacy_account', {
    p_identifier: identifier,
    p_old_password: oldPassword,
  })
  if (error || data !== true) {
    return { success: false, error: 'Could not verify that account. Check the details, or contact the app owner.' }
  }
  return await finishSignIn()
}

// Password reset uses Supabase's emailed 6-digit code (Reset Password email
// template must include {{ .Token }}). Same answer whether or not the email exists.
export async function sendPasswordResetOTP(email: string): Promise<Result> {
  const clean = email.trim().toLowerCase()
  if (!clean.includes('@')) return { success: false, error: 'Enter the email address of your account' }
  await supabase.auth.resetPasswordForEmail(clean, { redirectTo: `${window.location.origin}/auth` })
  return { success: true }
}

export async function verifyResetOTP(email: string, otp: string): Promise<Result> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: otp.trim(),
    type: 'recovery',
  })
  return error ? { success: false, error: 'Invalid or expired code' } : { success: true }
}

export async function resetPassword(_email: string, newPassword: string): Promise<Result> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { success: false, error: 'Reset failed' }
  await supabase.auth.signOut()
  clearCache()
  return { success: true }
}

// Confirms there is a live Supabase session and refreshes the cached profile.
export async function ensureSession(): Promise<boolean> {
  const profile = await loadProfile()
  if (!profile) {
    clearCache()
    return false
  }
  setSession(profile)
  return true
}

export function setSession(user: User) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SESSION_KEY, 'true')
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getSession(): User | null {
  if (typeof window === 'undefined') return null
  const userStr = sessionStorage.getItem(USER_KEY)
  return userStr ? JSON.parse(userStr) : null
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

export function getCurrentUserId(): string | null {
  return getSession()?.id || null
}

export function getCurrentUsername(): string {
  return getSession()?.username || ''
}

export function getCurrentEmail(): string {
  return getSession()?.email || ''
}

function clearCache() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function logout() {
  clearCache()
  void supabase.auth.signOut()
}
