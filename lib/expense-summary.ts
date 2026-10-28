import { dbAmountToPaise } from './money'

export interface SummableExpense {
  id: string
  amount: number | string
  category: string
  expense_date: string
}

export type Period = 'day' | 'month' | 'year'

// Key for a period, derived from a local 'YYYY-MM-DD' date:
// day -> 'YYYY-MM-DD', month -> 'YYYY-MM', year -> 'YYYY'.
export function periodKey(date: string, period: Period): string {
  return date.slice(0, period === 'day' ? 10 : period === 'month' ? 7 : 4)
}

export function inPeriod(e: SummableExpense, date: string, period: Period): boolean {
  return (e.expense_date || '').slice(0, 10).startsWith(periodKey(date, period))
}

export function filterPeriod<T extends SummableExpense>(list: T[], date: string, period: Period): T[] {
  return list.filter((e) => inPeriod(e, date, period))
}

export function totalPaise(list: SummableExpense[]): number {
  const seen = new Set<string>()
  let sum = 0
  for (const e of list) {
    if (seen.has(e.id)) continue // never double-count the same record
    seen.add(e.id)
    sum += dbAmountToPaise(e.amount)
  }
  return sum
}

export function categoryBreakdown(list: SummableExpense[]): Array<{ category: string; paise: number; percentage: number }> {
  const map = new Map<string, number>()
  const total = totalPaise(list)
  const seen = new Set<string>()
  for (const e of list) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    map.set(e.category, (map.get(e.category) || 0) + dbAmountToPaise(e.amount))
  }
  return Array.from(map.entries())
    .map(([category, paise]) => ({ category, paise, percentage: total > 0 ? Math.round((paise / total) * 100) : 0 }))
    .sort((a, b) => b.paise - a.paise)
}
