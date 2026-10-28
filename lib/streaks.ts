import { addDays } from './dates'

// Streak rule (documented):
// - A streak is the number of consecutive calendar days with a completion.
// - The current streak stays ACTIVE during today until the day ends: if the
//   last completion was yesterday, the streak still counts (the user can still
//   complete today). If the last completion is older than yesterday, the
//   current streak is 0.
// - Duplicate dates count once. Dates after `today` are ignored.

export interface StreakInfo {
  current: number
  longest: number
  last: string | null
}

export function computeStreaks(dates: string[], today: string): StreakInfo {
  const days = Array.from(new Set(dates.map((d) => d.slice(0, 10)))).filter((d) => d <= today).sort()
  if (days.length === 0) return { current: 0, longest: 0, last: null }

  let longest = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    run = addDays(days[i - 1], 1) === days[i] ? run + 1 : 1
    if (run > longest) longest = run
  }

  const last = days[days.length - 1]
  let current = 0
  if (last === today || last === addDays(today, -1)) {
    current = 1
    for (let i = days.length - 1; i > 0 && addDays(days[i - 1], 1) === days[i]; i--) current++
  }
  return { current, longest, last }
}

// Fibonacci milestones: 1, 2, 3, 5, 8, 13, 21, 34, 55, ...
export function fibonacciMilestones(upTo: number): number[] {
  const out: number[] = []
  let a = 1
  let b = 2
  while (a <= upTo) {
    out.push(a)
    ;[a, b] = [b, a + b]
  }
  return out
}

export function nextFibonacciMilestone(streak: number): number {
  let a = 1
  let b = 2
  while (a <= streak) [a, b] = [b, a + b]
  return a
}

export interface MilestoneProgress {
  reached: number | null // highest milestone reached by the current streak
  next: number // next milestone to aim for
  remaining: number // days to go
  bestEver: number | null // highest milestone ever reached (longest streak)
}

export function milestoneProgress(info: StreakInfo): MilestoneProgress {
  const reachedList = fibonacciMilestones(info.current)
  const bestList = fibonacciMilestones(info.longest)
  const next = nextFibonacciMilestone(info.current)
  return {
    reached: reachedList.length ? reachedList[reachedList.length - 1] : null,
    next,
    remaining: next - info.current,
    bestEver: bestList.length ? bestList[bestList.length - 1] : null,
  }
}
