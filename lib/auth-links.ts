// Parses the query string + hash of an email link landing page.
// Supabase can deliver email links in three formats depending on the email
// template and auth flow configured in the dashboard:
//   1. ?token_hash=...&type=...        (custom template using {{ .TokenHash }})
//   2. ?code=...                       (PKCE flow, default {{ .ConfirmationURL }})
//   3. #access_token=...&refresh_token (implicit flow, default {{ .ConfirmationURL }})
// and errors as ?error=...&error_code=... or #error=...&error_code=...
// This parser never logs token values.

export type LinkKind =
  | { kind: 'token_hash'; tokenHash: string; type: string }
  | { kind: 'code'; code: string }
  | { kind: 'session'; accessToken: string; refreshToken: string; type: string | null }
  | { kind: 'error'; code: string; expired: boolean }
  | { kind: 'none' }

export function parseAuthLink(search: string, hash: string): LinkKind {
  const q = new URLSearchParams(search.replace(/^\?/, ''))
  const h = new URLSearchParams(hash.replace(/^#/, ''))
  const get = (k: string) => q.get(k) ?? h.get(k)

  const errCode = get('error_code')
  if (get('error') || errCode) {
    const code = errCode || get('error') || 'unknown'
    return { kind: 'error', code, expired: code === 'otp_expired' || /expired|invalid/i.test(get('error_description') || '') }
  }
  const tokenHash = get('token_hash')
  if (tokenHash) return { kind: 'token_hash', tokenHash, type: get('type') || 'email' }
  const code = q.get('code')
  if (code) return { kind: 'code', code }
  const at = h.get('access_token')
  const rt = h.get('refresh_token')
  if (at && rt) return { kind: 'session', accessToken: at, refreshToken: rt, type: h.get('type') }
  return { kind: 'none' }
}
