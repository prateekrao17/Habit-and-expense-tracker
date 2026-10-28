import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-only clients. `server-only` makes the build fail if any browser
// component imports this file. Never log keys or return them in responses.

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required server environment variable: ${name}`)
  return v
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }

// Privileged: bypasses RLS. Use only for identifier lookups in API routes.
export function getAdminClient(): SupabaseClient {
  return createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), noSession)
}

// Unprivileged: performs sign-in / sign-up exactly as a browser would.
export function getAnonServerClient(): SupabaseClient {
  return createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('NEXT_PUBLIC_SUPABASE_ANON_KEY'), noSession)
}
