import { describe, it, expect, vi, afterEach } from 'vitest'
import { StreakCalculator } from './streak.calculator'

// Helper to create a Date from a YYYY-MM-DD string at noon UTC
function d(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00.000Z`)
}

describe('StreakCalculator.calculate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns zeros for an empty array', () => {
    const result = StreakCalculator.calculate([])
    expect(result.currentStreak).toBe(0)
    expect(result.longestStreak).toBe(0)
    expect(result.lastActiveDate).toBeNull()
  })

  it('returns streak of 1 for a single day equal to today', () => {
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    vi.setSystemTime(new Date(`${todayStr}T18:00:00.000Z`))

    const result = StreakCalculator.calculate([d(todayStr)])
    expect(result.currentStreak).toBe(1)
    expect(result.longestStreak).toBe(1)
    expect(result.lastActiveDate).not.toBeNull()
  })

  it('counts consecutive days correctly', () => {
    vi.setSystemTime(new Date('2026-04-29T18:00:00.000Z'))

    const dates = ['2026-04-27', '2026-04-28', '2026-04-29'].map(d)
    const result = StreakCalculator.calculate(dates)

    expect(result.currentStreak).toBe(3)
    expect(result.longestStreak).toBe(3)
  })

  it('resets current streak when there is a gap', () => {
    vi.setSystemTime(new Date('2026-04-29T18:00:00.000Z'))

    // gap: 25 → 26 is consecutive, then gap, 28 → 29 is consecutive
    const dates = ['2026-04-25', '2026-04-26', '2026-04-28', '2026-04-29'].map(d)
    const result = StreakCalculator.calculate(dates)

    expect(result.currentStreak).toBe(2)
  })

  it('tracks the longest streak across multiple runs', () => {
    vi.setSystemTime(new Date('2026-04-29T18:00:00.000Z'))

    // long run earlier: 5 days; current run: 2 days
    const dates = [
      '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05',
      '2026-04-28', '2026-04-29',
    ].map(d)
    const result = StreakCalculator.calculate(dates)

    expect(result.longestStreak).toBe(5)
    expect(result.currentStreak).toBe(2)
  })

  it('returns currentStreak=0 when last active day is more than yesterday', () => {
    vi.setSystemTime(new Date('2026-04-29T18:00:00.000Z'))

    const dates = ['2026-04-20', '2026-04-21'].map(d)
    const result = StreakCalculator.calculate(dates)

    expect(result.currentStreak).toBe(0)
    expect(result.longestStreak).toBe(2)
  })
})
