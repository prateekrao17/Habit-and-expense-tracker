import { NextResponse } from 'next/server'
import { getAdminClient, getAnonServerClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CHECK_EMAIL = { ok: true, message: 'Check your email to confirm your account, then log in.' }

export async function POST(req: Request) {
  let email = '', password = '', username = '', mobile = '', redirectTo = ''
  try {
    const b = await req.json()
    email = typeof b?.email === 'string' ? b.email.trim().toLowerCase() : ''
    password = typeof b?.password === 'string' ? b.password : ''
    username = typeof b?.username === 'string' ? b.username.trim().toLowerCase() : ''
    mobile = typeof b?.mobile === 'string' ? b.mobile.replace(/\D/g, '') : ''
    redirectTo = typeof b?.redirectTo === 'string' ? b.redirectTo : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }
  if (password.length < 6 || password.length > 200) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }
  if (username && !/^[a-z0-9_.]{3,30}$/.test(username)) {
    return NextResponse.json({ error: 'Username: 3-30 letters, numbers, _ or .' }, { status: 400 })
  }
  if (mobile && !/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ error: 'Mobile number must be 10 digits' }, { status: 400 })
  }

  // Only allow redirects back to this same site.
  const origin = new URL(req.url).origin
  const emailRedirectTo = redirectTo.startsWith(origin) ? redirectTo : `${origin}/auth`

  try {
    const admin = getAdminClient()
    // Usernames / mobiles are public handles; saying "taken" is unavoidable.
    if (username) {
      const { data } = await admin.from('users').select('id').ilike('username', username.replace(/[%_\\]/g, '\\$&')).limit(1)
      if (data && data.length) return NextResponse.json({ error: 'Username is not available' }, { status: 409 })
    }
    if (mobile) {
      const { data } = await admin.from('users').select('id').eq('mobile_no', mobile).limit(1)
      if (data && data.length) return NextResponse.json({ error: 'Mobile number is not available' }, { status: 409 })
    }

    const anon = getAnonServerClient()
    const { error } = await anon.auth.signUp({
      email,
      password,
      options: { emailRedirectTo, data: { username: username || null, mobile: mobile || null } },
    })
    if (error && !/registered|exists/i.test(error.message)) {
      return NextResponse.json({ error: 'Signup failed. Please try again later.' }, { status: 400 })
    }
    // Same answer whether or not the email already exists.
    return NextResponse.json(CHECK_EMAIL)
  } catch {
    console.error('[api/signup] unexpected failure')
    return NextResponse.json({ error: 'Signup failed. Please try again later.' }, { status: 500 })
  }
}
