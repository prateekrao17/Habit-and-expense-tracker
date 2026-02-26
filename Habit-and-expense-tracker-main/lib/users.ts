export interface User {
  id: string
  username: string
  password: string // base64 encoded
  createdAt: string
  lastLogin: string
}

const USERS_KEY = 'app_users'

export function getAllUsers(): User[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(USERS_KEY)
  return stored ? JSON.parse(stored) : []
}

function saveAllUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function createUser(username: string, password: string): User {
  const users = getAllUsers()
  
  // Check if username exists
  if (users.some(u => u.username === username)) {
    throw new Error('Username already exists')
  }

  const newUser: User = {
    id: `user_${Date.now()}`,
    username,
    password: btoa(password),
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  }

  users.push(newUser)
  saveAllUsers(users)
  return newUser
}

export function verifyUser(username: string, password: string): User | null {
  const users = getAllUsers()
  const user = users.find(u => 
    u.username === username && u.password === btoa(password)
  )

  if (user) {
    // Update last login
    user.lastLogin = new Date().toISOString()
    saveAllUsers(users)
  }

  return user || null
}

export function getUserById(userId: string): User | null {
  return getAllUsers().find(u => u.id === userId) || null
}

export function getUserByUsername(username: string): User | null {
  return getAllUsers().find(u => u.username === username) || null
}

export function updateUserLastLogin(userId: string): void {
  const users = getAllUsers()
  const user = users.find(u => u.id === userId)
  if (user) {
    user.lastLogin = new Date().toISOString()
    saveAllUsers(users)
  }
}

// For admin/tracking purposes
export function getUserCount(): number {
  return getAllUsers().length
}

export function getUserStats(): {
  totalUsers: number
  usersCreatedToday: number
  activeUsersToday: number
} {
  const users = getAllUsers()
  const today = new Date().toISOString().split('T')[0]

  return {
    totalUsers: users.length,
    usersCreatedToday: users.filter(u => 
      u.createdAt.split('T')[0] === today
    ).length,
    activeUsersToday: users.filter(u => 
      u.lastLogin.split('T')[0] === today
    ).length
  }
}
