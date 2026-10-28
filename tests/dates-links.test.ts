import { describe, it, expect } from 'vitest'
import { toLocalDateStr, addDays, isWithinEditWindow, weekDates, monthDates, isDateStr } from '../lib/dates'
import { parseAuthLink } from '../lib/auth-links'

describe('local dates', () => {
  it('uses the local calendar day, not UTC', () => {
    expect(toLocalDateStr(new Date(2026, 9, 28, 23, 50))).toBe('2026-10-28')
  })
  it('adds days across months', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('edit window is today and the previous 3 days', () => {
    const t = '2026-10-28'
    expect(isWithinEditWindow('2026-10-28', t)).toBe(true)
    expect(isWithinEditWindow('2026-10-25', t)).toBe(true)
    expect(isWithinEditWindow('2026-10-24', t)).toBe(false)
    expect(isWithinEditWindow('2026-10-29', t)).toBe(false)
  })
  it('week is Sunday-first with 7 days', () => {
    const w = weekDates('2026-10-28')
    expect(w[0]).toBe('2026-10-25')
    expect(w).toHaveLength(7)
  })
  it('month dates handle leap years', () => {
    expect(monthDates(2024, 1)).toHaveLength(29)
  })
  it('rejects impossible dates', () => {
    expect(isDateStr('2026-02-30')).toBe(false)
    expect(isDateStr('2026-02-28')).toBe(true)
  })
})

describe('email link parsing', () => {
  it('token_hash link', () => {
    expect(parseAuthLink('?token_hash=abc&type=email', '')).toEqual({ kind: 'token_hash', tokenHash: 'abc', type: 'email' })
  })
  it('PKCE code link', () => {
    expect(parseAuthLink('?code=xyz', '')).toEqual({ kind: 'code', code: 'xyz' })
  })
  it('implicit-flow session in hash', () => {
    expect(parseAuthLink('', '#access_token=a&refresh_token=r&type=signup').kind).toBe('session')
  })
  it('expired link error in hash', () => {
    expect(parseAuthLink('', '#error=access_denied&error_code=otp_expired')).toEqual({ kind: 'error', code: 'otp_expired', expired: true })
  })
  it('missing token', () => {
    expect(parseAuthLink('', '').kind).toBe('none')
  })
})
