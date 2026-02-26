import { createUser, verifyUser, getUserById, getUserByUsername, type User } from './users'

const SESSION_KEY = 'app_session'
const CURRENT_USER_KEY = 'current_user_id'

export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(CURRENT_USER_KEY)
}

export function setCurrentUserId(userId: string): void {
  sessionStorage.setItem(CURRENT_USER_KEY, userId)
  sessionStorage.setItem(SESSION_KEY, 'true')
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(SESSION_KEY) === 'true' && !!getCurrentUserId()
}

export function getCurrentUsername(): string {
  const userId = getCurrentUserId()
  if (!userId) return ''
  
  const user = getUserById(userId)
  return user?.username || ''
}

export function login(username: string, password: string): boolean {
  const user = verifyUser(username, password)
  if (user) {
    setCurrentUserId(user.id)
    return true
  }
  return false
}

export function signup(username: string, password: string): boolean {
  try {
    const user = createUser(username, password)
    setCurrentUserId(user.id)
    return true
  } catch (error) {
    return false
  }
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(CURRENT_USER_KEY)
}

export function isUsernameAvailable(username: string): boolean {
  return !getUserByUsername(username)
}