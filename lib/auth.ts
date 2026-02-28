import { supabase } from './supabase'

const SESSION_KEY = 'app_session'
const USER_KEY = 'current_user'
const USERS_DB_KEY = 'app_users'

interface User {
  id: string
  email: string
  username: string
}

// Get all users from localStorage
function getAllUsers(): Record<string, any> {
  if (typeof window === 'undefined') return {}
  const stored = localStorage.getItem(USERS_DB_KEY)
  return stored ? JSON.parse(stored) : {}
}

// Save users to localStorage
function saveUsers(users: Record<string, any>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users))
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// Signup - Store in localStorage
export async function signup(username: string, password: string): Promise<{
  success: boolean
  error?: string
  user?: User
}> {
  try {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Client-side only' }
    }

    const users = getAllUsers()
    
    // Check if username exists
    if (Object.values(users).some((u: any) => u.username === username)) {
      return { success: false, error: 'Username already taken' }
    }

    // Create new user
    const userId = generateId()
    const newUser = {
      id: userId,
      username,
      email: `${username}@temp.local`,
      passwordHash: btoa(password), // Simple base64 encoding
      createdAt: new Date().toISOString()
    }

    users[userId] = newUser
    saveUsers(users)

    // Set session
    setSession({
      id: userId,
      username,
      email: newUser.email
    })

    return { 
      success: true, 
      user: {
        id: userId,
        username,
        email: newUser.email
      }
    }
  } catch (error) {
    console.error('Signup error:', error)
    return { success: false, error: 'Signup failed' }
  }
}

// Login - Check localStorage
export async function login(username: string, password: string): Promise<{
  success: boolean
  error?: string
  user?: User
}> {
  try {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Client-side only' }
    }

    const users = getAllUsers()
    
    // Find user
    const user = Object.values(users).find((u: any) => u.username === username)

    if (!user) {
      return { success: false, error: 'Invalid username or password' }
    }

    // Verify password
    const passwordHash = btoa(password)
    if (user.passwordHash !== passwordHash) {
      return { success: false, error: 'Invalid username or password' }
    }

    // Update last login
    user.lastLogin = new Date().toISOString()
    saveUsers(users)

    // Set session
    setSession({
      id: user.id,
      username: user.username,
      email: user.email
    })

    return { 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Login failed' }
  }
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

export function logout() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(USER_KEY)
}
