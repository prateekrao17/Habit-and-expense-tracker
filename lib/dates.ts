// Calendar-date helpers. All app dates are the user's LOCAL calendar date as
// 'YYYY-MM-DD'. Never use toISOString() for a calendar date: it converts to UTC
// and shifts the day for users east/west of UTC (e.g. India after 18:30 UTC).

export function toLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isDateStr(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = parseLocalDate(s)
  return toLocalDateStr(d) === s
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseLocalDate(s)
  d.setDate(d.getDate() + n)
  return toLocalDateStr(d)
}

// Habits can be ticked/unticked for today and the previous `days` days (existing app rule).
export function isWithinEditWindow(s: string, today: string = toLocalDateStr(), days = 3): boolean {
  return isDateStr(s) && s <= today && s >= addDays(today, -days)
}

// Sunday-first week containing `today` (matches the existing week view).
export function weekDates(today: string = toLocalDateStr()): string[] {
  const start = addDays(today, -parseLocalDate(today).getDay())
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function monthDates(year: number, monthIndex: number): string[] {
  const last = new Date(year, monthIndex + 1, 0).getDate()
  return Array.from({ length: last }, (_, i) => toLocalDateStr(new Date(year, monthIndex, i + 1)))
}

export function formatDisplayDate(s: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  return parseLocalDate(s).toLocaleDateString('en-IN', opts)
}
