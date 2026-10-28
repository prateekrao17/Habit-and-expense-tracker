import { NextResponse } from 'next/server'
import { getAdminClient, getAnonServerClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Same body + status for every failure, so the response never reveals
// whether a username / mobile / email exists.
const GENERIC = { error: 'Invalid login details' }
// Unknown identifiers still run one real sign-in against this address,
// keeping timing similar to a wrong-password attempt.
const DUMMY_EMAIL = 'no-such-user@invalid.example'

export async function POST(req: Request) {
  let identifier = ''
  let password = ''
  try {
    const body = await req.json()
    identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : ''
    password = typeof body?.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json(GENERIC, { status: 401 })
  }
  if (!identifier || !password || identifier.length > 254 || password.length > 200) {
    return NextResponse.json(GENERIC, { status: 401 })
  }

  try {
    let email: string | null = null
    const lower = identifier.toLowerCase()

    if (lower.includes('@')) {
      email = lower
    } else {
      const admin = getAdminClient()
      const isMobile = /^\d{10}$/.test(lower)
      const { data } = isMobile
        ? await admin.from('users').select('email').eq('mobile_no', lower).limit(1)
        : await admin.from('users').select('email').ilike('username', lower.replace(/[%_\\]/g, '\\$&')).limit(1)
      email = data && data.length === 1 ? String(data[0].email).toLowerCase() : null
    }

    const anon = getAnonServerClient()
    const { data, error } = await anon.auth.signInWithPassword({ email: email ?? DUMMY_EMAIL, password })

    if (error || !data.session || !email) {
      if (error && /confirm/i.test(error.message) && email) {
        // Only reachable with the correct password for an existing account.
        return NextResponse.json({ error: 'Please confirm your email first, then log in.' }, { status: 401 })
      }
      return NextResponse.json(GENERIC, { status: 401 })
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  } catch {
    console.error('[api/login] unexpected failure')
    return NextResponse.json(GENERIC, { status: 401 })
  }
}
