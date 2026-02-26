// Simple in-memory auth system for localStorage-based app

interface User {
  id: string
  username: string
  password: string
  created_at: string
}

const USERS_KEY = 'app_users'
const CURRENT_USER_KEY = 'current_user_id'

function getUsers(): User[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(USERS_KEY)
  return data ? JSON.parse(data) : []
}

function saveUsers(users: User[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!sessionStorage.getItem(CURRENT_USER_KEY)
}

export function getCurrentUserId(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem(CURRENT_USER_KEY) || ''
}

export function getCurrentUsername(): string {
  if (typeof window === 'undefined') return ''
  const userId = getCurrentUserId()
  if (!userId) return ''
  
  const users = getUsers()
  const user = users.find(u => u.id === userId)
  return user?.username || ''
}

export async function signup(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (!username || !password) {
    return { success: false, error: 'Username and password required' }
  }
  
  if (username.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters' }
  }
  
  if (password.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters' }
  }
  
  const users = getUsers()
  
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: 'Username already exists' }
  }
  
  const user: User = {
    id: generateId(),
    username,
    password: btoa(password), // Simple encoding (not secure, for demo only)
    created_at: new Date().toISOString()
  }
  
  users.push(user)
  saveUsers(users)
  
  // Auto-login after signup
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(CURRENT_USER_KEY, user.id)
  }
  
  return { success: true }
}

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (!username || !password) {
    return { success: false, error: 'Username and password required' }
  }
  
  const users = getUsers()
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase())
  
  if (!user || user.password !== btoa(password)) {
    return { success: false, error: 'Invalid username or password' }
  }
  
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(CURRENT_USER_KEY, user.id)
  }
  
  return { success: true }
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(CURRENT_USER_KEY)
  }
}
