import { supabase } from './supabase'

const SESSION_KEY = 'app_session'
const USER_KEY = 'current_user'

interface User {
  id: string
  email: string
  username: string
  created_at: string
}

function hashPassword(password: string): string {
  return btoa(password + '_life_tracker_secret')
}

export async function signup(
  email: string,
  password: string,
  username: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    console.log('[Signup] Starting signup process', { email, username })
    
    const finalEmail = email.trim().toLowerCase()
    const finalUsername = username.trim().toLowerCase()

    console.log('[Signup] Processing:', { finalEmail, finalUsername })

    // Check if user exists
    console.log('[Signup] Checking for existing user...')
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${finalEmail},username.eq.${finalUsername}`)

    if (checkError) {
      console.error('[Signup] Check error:', checkError)
      return { success: false, error: `Check failed: ${checkError.message}` }
    }

    if (existing && existing.length > 0) {
      console.log('[Signup] User already exists')
      return { success: false, error: 'Email or username already taken' }
    }

    // Create user
    console.log('[Signup] Creating new user...')
    const userData = {
      email: finalEmail,
      username: finalUsername,
      password_hash: hashPassword(password.trim())
    }

    console.log('[Signup] Insert data:', { finalEmail, finalUsername, hasPassword: true })

    const { data: newUser, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (error) {
      console.error('[Signup] Insert error:', error)
      console.error('[Signup] Error message:', error.message)
      console.error('[Signup] Error code:', error.code)
      console.error('[Signup] Error details:', error.details)
      console.error('[Signup] Error hint:', error.hint)
      return { 
        success: false, 
        error: `Database error: ${error.message || 'Insert failed'}` 
      }
    }

    if (!newUser) {
      console.error('[Signup] No user returned')
      return { success: false, error: 'Account created but no data returned' }
    }

    console.log('[Signup] Success! User created:', newUser.id)
    setSession(newUser)
    return { success: true, user: newUser }

  } catch (error: any) {
    console.error('[Signup] Exception:', error)
    return { 
      success: false, 
      error: error?.message || 'Signup failed unexpectedly' 
    }
  }
}

export async function login(
  identifier: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    // Normalize input
    const normalizedIdentifier = identifier.trim().toLowerCase()
    
    console.log('[Login] Attempting login for:', normalizedIdentifier)

    // Query user from database
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${normalizedIdentifier},username.eq.${normalizedIdentifier}`)

    if (queryError) {
      console.error('[Login] Database error:', queryError)
      return { success: false, error: 'Database connection error' }
    }

    if (!users || users.length === 0) {
      console.log('[Login] User not found')
      return { success: false, error: 'Email/username or password is incorrect' }
    }

    const user = users[0]
    console.log('[Login] User found:', user.username)

    // Hash the provided password using THE SAME function as signup
    const providedPasswordHash = hashPassword(password.trim())
    const storedPasswordHash = user.password_hash

    console.log('[Login] Hash comparison:', {
      provided: providedPasswordHash.substring(0, 20) + '...',
      stored: storedPasswordHash.substring(0, 20) + '...',
      match: providedPasswordHash === storedPasswordHash
    })

    // Compare passwords
    if (storedPasswordHash !== providedPasswordHash) {
      console.log('[Login] Password does not match')
      return { success: false, error: 'Email/username or password is incorrect' }
    }

    console.log('[Login] Login successful!')

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Create session
    setSession(user)

    return { success: true, user }

  } catch (error: any) {
    console.error('[Login] Exception:', error)
    return { success: false, error: 'Login failed' }
  }
}

export async function sendPasswordResetOTP(email: string) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('email', email.toLowerCase())
      .single()

    if (!user) {
      return { success: false, error: 'No account found' }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    await supabase
      .from('otp_codes')
      .insert({
        email: email.toLowerCase(),
        otp_code: otp,
        purpose: 'password_reset',
        expires_at: expiresAt.toISOString()
      })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 RESET CODE:', otp)
    console.log('👤 Username:', user.username)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return { success: true, username: user.username }
  } catch (error: any) {
    return { success: false, error: 'Failed to send code' }
  }
}

export async function verifyResetOTP(email: string, otp: string) {
  const { data } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('otp_code', otp)
    .eq('purpose', 'password_reset')
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) {
    return { success: false, error: 'Invalid or expired code' }
  }

  await supabase
    .from('otp_codes')
    .update({ used: true })
    .eq('id', data.id)

  return { success: true }
}

export async function resetPassword(email: string, newPassword: string) {
  const { error } = await supabase
    .from('users')
    .update({ password_hash: hashPassword(newPassword) })
    .eq('email', email.toLowerCase())

  return error ? { success: false, error: 'Reset failed' } : { success: true }
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