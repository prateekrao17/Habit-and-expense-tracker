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
    console.log('[Signup] Starting signup attempt', { email, username })

    // Validate inputs
    if (!email || email.trim().length < 3) {
      return { success: false, error: 'Email must be at least 3 characters' }
    }
    if (!username || username.trim().length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' }
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' }
    }

    // Check if email or username already exists
    console.log('[Signup] Checking if user exists...')
    const { data: existing, error: checkError } = await (supabase
      .from('users') as any)
      .select('id, email, username')
      .or(`email.eq.${email},username.eq.${username}`)

    if (checkError) {
      console.error('[Signup] Check error:', checkError)
      return { 
        success: false, 
        error: 'Database connection failed. Check Supabase configuration.' 
      }
    }

    if (existing && existing.length > 0) {
      const conflict = existing[0]
      if (conflict.email === email) {
        return { success: false, error: 'Email already exists' }
      }
      if (conflict.username === username) {
        return { success: false, error: 'Username already exists' }
      }
    }

    // Create user
    console.log('[Signup] Creating user with data:', { email, username })
    const { data: newUser, error } = await (supabase
      .from('users') as any)
      .insert({
        email,
        username,
        password_hash: hashPassword(password)
      })
      .select()
      .single()

    if (error) {
      console.error('[Signup] Insert error:', error)
      console.error('[Signup] Error details:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
      })
      return { 
        success: false, 
        error: `Failed to create account: ${error.message}` 
      }
    }

    if (!newUser) {
      console.error('[Signup] No user returned')
      return { success: false, error: 'Account created but no data returned' }
    }

    console.log('[Signup] ✅ Success, user created:', newUser.id)
    setSession(newUser)
    return { success: true, user: newUser }
  } catch (error: any) {
    console.error('[Signup] Exception:', error)
    
    // Check for network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return { 
        success: false, 
        error: 'Network error: Cannot connect to database' 
      }
    }

    return { 
      success: false, 
      error: error?.message || 'Signup failed' 
    }
  }
}

// Login - Works with email OR username
export async function login(
  identifier: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    console.log('[Login] Starting login attempt', { identifier })

    // Validate inputs
    if (!identifier || identifier.trim().length < 3) {
      return { success: false, error: 'Email or username must be at least 3 characters' }
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' }
    }

    // Try to find by email first
    console.log('[Login] Searching by email...')
    let { data: users, error } = await (supabase
      .from('users') as any)
      .select('*')
      .eq('email', identifier)

    if (error) {
      console.error('[Login] Email search error:', error)
      return { success: false, error: 'Database connection failed. Check Supabase configuration.' }
    }

    // If not found by email, try username
    if (!users || users.length === 0) {
      console.log('[Login] Not found by email, searching by username...')
      const { data: usersByUsername, error: usernameError } = await (supabase
        .from('users') as any)
        .select('*')
        .eq('username', identifier)
      
      if (usernameError) {
        console.error('[Login] Username search error:', usernameError)
        return { success: false, error: 'Database connection failed. Check Supabase configuration.' }
      }
      users = usersByUsername
    }

    if (!users || users.length === 0) {
      console.log('[Login] User not found')
      return { success: false, error: 'Email/username or password is incorrect' }
    }

    const user = users[0] as any
    console.log('[Login] User found, verifying password...')

    // Verify password (check multiple hash formats for compatibility)
    const hashesToCompare = [
      hashPassword(password),
      btoa(password + 'life_tracker_salt') // For backward compatibility
    ]
    const passwordMatch = hashesToCompare.some(hash => hash === user.password_hash)

    if (!passwordMatch) {
      console.log('[Login] Password mismatch')
      return { success: false, error: 'Email/username or password is incorrect' }
    }

    // Update last login
    await (supabase
      .from('users') as any)
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    console.log('[Login] ✅ Login successful for user:', user.id)
    setSession(user)
    return { success: true, user }
  } catch (error: any) {
    console.error('[Login] Exception:', error)
    
    // Check for network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return { 
        success: false, 
        error: 'Network error: Cannot connect to database' 
      }
    }

    return { 
      success: false, 
      error: error?.message || 'Login failed' 
    }
  }
}

// Password reset with OTP
export async function sendPasswordResetOTP(email: string) {
  try {
    // Validate input
    if (!email || email.trim().length < 3) {
      return { success: false, error: 'Email must be at least 3 characters' }
    }

    console.log('[SendOTP] Checking if email exists...')
    
    // Check if email exists
    const { data: user, error: checkError } = await (supabase
      .from('users') as any)
      .select('id, email, username')
      .eq('email', email)
      .single()

    if (checkError) {
      console.error('[SendOTP] Email check error:', checkError)
      return { success: false, error: 'Database connection failed. Check Supabase configuration.' }
    }

    if (!user) {
      return { success: false, error: 'No account found with this email' }
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    console.log('[SendOTP] Storing OTP for email:', email)

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
      console.error('[SendOTP] OTP storage error:', error)
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
  } catch (error: any) {
    console.error('[SendOTP] Exception:', error)
    
    // Check for network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return { 
        success: false, 
        error: 'Network error: Cannot connect to database' 
      }
    }

    return { success: false, error: error?.message || 'Failed to send reset code' }
  }
}

export async function verifyResetOTP(email: string, otp: string) {
  try {
    // Validate inputs
    if (!email || email.trim().length < 3) {
      return { success: false, error: 'Email must be at least 3 characters' }
    }
    if (!otp || otp.length !== 6) {
      return { success: false, error: 'OTP must be 6 digits' }
    }

    console.log('[VerifyOTP] Checking OTP for email:', email)

    const { data, error } = await (supabase
      .from('otp_codes') as any)
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('purpose', 'password_reset')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      console.error('[VerifyOTP] Invalid or expired code')
      return { success: false, error: 'Invalid or expired code' }
    }

    console.log('[VerifyOTP] ✓ OTP valid, marking as used')

    // Mark as used
    const { error: updateError } = await (supabase
      .from('otp_codes') as any)
      .update({ used: true })
      .eq('id', data.id)

    if (updateError) {
      console.error('[VerifyOTP] Failed to mark OTP as used:', updateError)
      return { success: false, error: 'Failed to verify code' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('[VerifyOTP] Exception:', error)
    
    // Check for network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return { 
        success: false, 
        error: 'Network error: Cannot connect to database' 
      }
    }

    return { success: false, error: error?.message || 'Failed to verify code' }
  }
}

export async function resetPassword(email: string, newPassword: string) {
  try {
    // Validate inputs
    if (!email || email.trim().length < 3) {
      return { success: false, error: 'Email must be at least 3 characters' }
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' }
    }

    console.log('[ResetPassword] Resetting password for email:', email)

    const { error } = await (supabase
      .from('users') as any)
      .update({ password_hash: hashPassword(newPassword) })
      .eq('email', email)

    if (error) {
      console.error('[ResetPassword] Password reset error:', error)
      return { success: false, error: 'Failed to reset password' }
    }

    console.log('[ResetPassword] ✅ Password reset successful')
    return { success: true }
  } catch (error: any) {
    console.error('[ResetPassword] Exception:', error)
    
    // Check for network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return { 
        success: false, 
        error: 'Network error: Cannot connect to database' 
      }
    }

    return { success: false, error: error?.message || 'Failed to reset password' }
  }
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