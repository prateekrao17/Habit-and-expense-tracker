import { describe, it, expect } from 'vitest'
import { parseAmountToPaise, dbAmountToPaise, formatINR, paiseToDbAmount } from '../lib/money'
import { filterPeriod, totalPaise, categoryBreakdown } from '../lib/expense-summary'

describe('amount validation', () => {
  it('accepts valid amounts', () => {
    expect(parseAmountToPaise('120')).toBe(12000)
    expect(parseAmountToPaise('120.5')).toBe(12050)
    expect(parseAmountToPaise('0.01')).toBe(1)
  })
  it('rejects zero, negative, too many decimals, text', () => {
    for (const bad of ['0', '0.00', '-5', '1.234', 'abc', '', '1e3', '12,50']) expect(parseAmountToPaise(bad)).toBeNull()
  })
  it('round-trips to the database', () => {
    expect(paiseToDbAmount(12050)).toBe('120.50')
    expect(dbAmountToPaise(0.1 + 0.2)).toBe(30)
  })
  it('formats rupees', () => {
    expect(formatINR(123456789)).toBe('₹12,34,567.89')
  })
})

const E = [
  { id: 'a', amount: 0.1, category: 'Food', expense_date: '2026-10-28' },
  { id: 'b', amount: 0.2, category: 'Food', expense_date: '2026-10-28' },
  { id: 'c', amount: '100.00', category: 'Rent', expense_date: '2026-10-01' },
  { id: 'd', amount: 50, category: 'Trip', expense_date: '2026-09-30' },
  { id: 'e', amount: 7, category: 'Food', expense_date: '2025-10-28' },
]

describe('period totals', () => {
  it('daily total uses the exact calendar date', () => {
    expect(totalPaise(filterPeriod(E, '2026-10-28', 'day'))).toBe(30)
  })
  it('monthly total excludes other months', () => {
    expect(totalPaise(filterPeriod(E, '2026-10-15', 'month'))).toBe(10030)
  })
  it('yearly total excludes other years', () => {
    expect(totalPaise(filterPeriod(E, '2026-01-01', 'year'))).toBe(15030)
  })
  it('never double-counts the same record', () => {
    expect(totalPaise([E[2], E[2]])).toBe(10000)
  })
  it('totals reflect an edit and a delete', () => {
    const edited = E.map((e) => (e.id === 'c' ? { ...e, amount: 200 } : e)).filter((e) => e.id !== 'a')
    expect(totalPaise(filterPeriod(edited, '2026-10-15', 'month'))).toBe(20020)
  })
  it('category breakdown sums per category', () => {
    expect(categoryBreakdown(filterPeriod(E, '2026-10-01', 'month'))[0]).toEqual({ category: 'Rent', paise: 10000, percentage: 100 })
  })
})
