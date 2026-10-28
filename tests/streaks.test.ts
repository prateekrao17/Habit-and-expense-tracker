import { describe, it, expect } from 'vitest'
import { computeStreaks, fibonacciMilestones, nextFibonacciMilestone, milestoneProgress } from '../lib/streaks'

const T = '2026-10-28'

describe('computeStreaks', () => {
  it('is 0 with no completions', () => {
    expect(computeStreaks([], T)).toEqual({ current: 0, longest: 0, last: null })
  })
  it('counts consecutive days ending today', () => {
    expect(computeStreaks(['2026-10-26', '2026-10-27', '2026-10-28'], T).current).toBe(3)
  })
  it('stays active today when last completion was yesterday', () => {
    expect(computeStreaks(['2026-10-26', '2026-10-27'], T).current).toBe(2)
  })
  it('resets to 0 after a missed day', () => {
    const s = computeStreaks(['2026-10-24', '2026-10-25', '2026-10-26'], T)
    expect(s.current).toBe(0)
    expect(s.longest).toBe(3)
  })
  it('a gap breaks the current run', () => {
    expect(computeStreaks(['2026-10-20', '2026-10-21', '2026-10-27', '2026-10-28'], T).current).toBe(2)
  })
  it('ignores duplicate dates', () => {
    expect(computeStreaks(['2026-10-28', '2026-10-28', '2026-10-27'], T)).toEqual({ current: 2, longest: 2, last: '2026-10-28' })
  })
  it('ignores future dates', () => {
    expect(computeStreaks(['2026-10-28', '2026-10-29'], T).current).toBe(1)
  })
  it('crosses month and year boundaries', () => {
    expect(computeStreaks(['2025-12-30', '2025-12-31', '2026-01-01'], '2026-01-01').current).toBe(3)
    expect(computeStreaks(['2024-02-28', '2024-02-29', '2024-03-01'], '2024-03-01').current).toBe(3)
  })
  it('longest streak is the max run in history', () => {
    expect(computeStreaks(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-28'], T).longest).toBe(4)
  })
})

describe('Fibonacci milestones', () => {
  it('sequence is 1,2,3,5,8,13,21,34,55', () => {
    expect(fibonacciMilestones(55)).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55])
  })
  it('a 4-day streak has next milestone 5', () => {
    expect(nextFibonacciMilestone(4)).toBe(5)
  })
  it('0-day streak aims for 1; reaching 5 aims for 8', () => {
    expect(nextFibonacciMilestone(0)).toBe(1)
    expect(nextFibonacciMilestone(5)).toBe(8)
  })
  it('progress reports reached, next and remaining', () => {
    expect(milestoneProgress({ current: 4, longest: 9, last: T })).toEqual({ reached: 3, next: 5, remaining: 1, bestEver: 8 })
  })
  it('after a reset, reached milestone drops but best-ever stays', () => {
    expect(milestoneProgress({ current: 0, longest: 13, last: '2026-10-01' })).toEqual({ reached: null, next: 1, remaining: 1, bestEver: 13 })
  })
})
