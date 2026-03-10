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

function isMobileNumber(input: string): boolean {
  // Check if input is exactly 10 digits
  return /^\d{10}$/.test(input.trim())
}

function isEmail(input: string): boolean {
  return input.includes('@')
}

export async function signup(
  emailOrUsernameOrMobile: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    console.log('[Signup] Starting signup')
    
    const input = emailOrUsernameOrMobile.trim()
    const mobile = isMobileNumber(input) ? input : null
    const isEmailInput = isEmail(input)
    
    const email = mobile 
      ? `${mobile}@mobile.local`
      : isEmailInput 
      ? input.toLowerCase() 
      : `${input.toLowerCase()}@local.app`
    
    const username = mobile
      ? `user_${mobile}`
      : isEmailInput 
      ? input.split('@')[0].toLowerCase()
      : input.toLowerCase()

    console.log('[Signup] Processing:', { email, username, mobile })

    // Check if user exists (email, username, OR mobile)
    let query = supabase
      .from('users')
      .select('id')
    
    if (mobile) {
      query = query.eq('mobile', mobile)
    } else {
      query = query.or(`email.eq.${email},username.eq.${username}`)
    }
    
    const { data: existing } = await query

    if (existing && existing.length > 0) {
      return { 
        success: false, 
        error: mobile ? 'Mobile number already registered' : 'Email or username already exists' 
      }
    }

    // Create user
    const userData: any = {
      email,
      username,
      password_hash: hashPassword(password.trim())
    }
    
    if (mobile) {
      userData.mobile = mobile
    }

    const { data: newUser, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (error) {
      console.error('[Signup] Error:', error)
      return { success: false, error: `Failed to create account: ${error.message}` }
    }

    console.log('[Signup] Success!')
    setSession(newUser)
    return { success: true, user: newUser }

  } catch (error: any) {
    console.error('[Signup] Exception:', error)
    return { success: false, error: 'Signup failed' }
  }
}

export async function login(
  identifier: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const input = identifier.trim()
    const mobile = isMobileNumber(input) ? input : null
    const normalizedIdentifier = input.toLowerCase()

    console.log('[Login] Attempting login:', { input, isMobile: !!mobile })

    // Query by mobile OR email/username
    let query = supabase.from('users').select('*')
    
    if (mobile) {
      query = query.eq('mobile', mobile)
    } else {
      query = query.or(`email.eq.${normalizedIdentifier},username.eq.${normalizedIdentifier}`)
    }
    
    const { data: users, error: queryError } = await query

    if (queryError || !users || users.length === 0) {
      return { success: false, error: 'Invalid credentials' }
    }

    const user = users[0]
    const providedPasswordHash = hashPassword(password.trim())

    if (user.password_hash !== providedPasswordHash) {
      return { success: false, error: 'Invalid credentials' }
    }

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    setSession(user)
    console.log('[Login] Success!')
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