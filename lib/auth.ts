import { supabase } from './supabase'

const SESSION_KEY = 'app_session'
const USER_KEY = 'current_user'

interface User {
  id: string
  email: string
  username: string
  created_at: string
}

// Simple password hash (use bcrypt in production)
function hashPassword(password: string): string {
  return btoa(password + 'life_tracker_salt')
}

// Signup - Direct without OTP
export async function signup(
  email: string,
  password: string,
  username: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    // Check if email or username already exists
    const { data: existing } = await (supabase
      .from('users') as any)
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)

    if (existing && existing.length > 0) {
      return { success: false, error: 'Email or username already exists' }
    }

    // Create user
    const { data: newUser, error } = await (supabase
      .from('users') as any)
      .insert({
        email,
        username,
        password_hash: hashPassword(password)
      })
      .select()
      .single()

    if (error || !newUser) {
      console.error('Signup error:', error)
      return { success: false, error: 'Failed to create account' }
    }

    setSession(newUser)
    return { success: true, user: newUser }
  } catch (error) {
    console.error('Signup error:', error)
    return { success: false, error: 'Signup failed' }
  }
}

// Login - Works with email OR username
export async function login(
  identifier: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    // Search by email or username
    const { data: users, error } = await (supabase
      .from('users')
      .select('*')
      .or(`email.eq.${identifier},username.eq.${identifier}`) as any)

    if (error || !users || users.length === 0) {
      return { success: false, error: 'Invalid credentials' }
    }

    const user = users[0] as any

    // Verify password
    if (user.password_hash !== hashPassword(password)) {
      return { success: false, error: 'Invalid credentials' }
    }

    // Update last login
    await (supabase
      .from('users') as any)
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    setSession(user)
    return { success: true, user }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Login failed' }
  }
}

// Password reset with OTP
export async function sendPasswordResetOTP(email: string) {
  try {
    // Check if email exists
    const { data: user } = await (supabase
      .from('users')
      .select('id, email, username')
      .eq('email', email)
      .single() as any)

    if (!user) {
      return { success: false, error: 'No account found with this email' }
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // Store OTP
    const { error } = await (supabase
      .from('otp_codes') as any)
      .insert({
        email,
        otp_code: otp,
        purpose: 'password_reset',
        expires_at: expiresAt.toISOString()
      })

    if (error) {
      console.error('OTP storage error:', error)
      return { success: false, error: 'Failed to generate reset code' }
    }

    // Log OTP to console (replace with email service later)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 PASSWORD RESET OTP')
    console.log('Email:', email)
    console.log('Username:', user.username)
    console.log('🔑 CODE:', otp)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return { success: true, username: user.username }
  } catch (error) {
    console.error('Send OTP error:', error)
    return { success: false, error: 'Failed to send reset code' }
  }
}

export async function verifyResetOTP(email: string, otp: string) {
  const { data, error } = await (supabase
    .from('otp_codes')
    .select('*')
    .eq('email', email)
    .eq('otp_code', otp)
    .eq('purpose', 'password_reset')
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as any)

  if (error || !data) {
    return { success: false, error: 'Invalid or expired code' }
  }

  // Mark as used
  await (supabase
    .from('otp_codes') as any)
    .update({ used: true })
    .eq('id', data.id)

  return { success: true }
}

export async function resetPassword(email: string, newPassword: string) {
  const { error } = await (supabase
    .from('users') as any)
    .update({ password_hash: hashPassword(newPassword) })
    .eq('email', email)

  if (error) {
    console.error('Password reset error:', error)
    return { success: false, error: 'Failed to reset password' }
  }

  return { success: true }
}
// Session management
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
  const user = getSession()
  return user?.id || null
}

export function getCurrentUsername(): string {
  const user = getSession()
  return user?.username || ''
}

export function getCurrentEmail(): string {
  const user = getSession()
  return user?.email || ''
}

export function logout() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(USER_KEY)
}