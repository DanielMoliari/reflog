'use client'

import { useState, useEffect } from 'react'
import { Flame, X } from 'lucide-react'
import type { StreakData } from '@/graphql/types'

interface StreakAtRiskBannerProps {
  streak: StreakData | undefined
  loading: boolean
}

function getTimeLeft(): { hoursLeft: number; minutesLeft: number; msUntilMidnight: number } {
  const now = new Date()
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const msLeft = nextMidnight.getTime() - now.getTime()
  const totalMinutes = Math.floor(msLeft / 1000 / 60)
  return {
    hoursLeft: Math.floor(totalMinutes / 60),
    minutesLeft: totalMinutes % 60,
    msUntilMidnight: msLeft,
  }
}

function isTodayUTC(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  )
}

function isAfter20UTC(): boolean {
  return new Date().getUTCHours() >= 20
}

export function StreakAtRiskBanner({ streak, loading }: StreakAtRiskBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(getTimeLeft())
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  if (loading || dismissed) return null
  if (!streak) return null

  const { currentStreak, lastActiveDate } = streak

  // Conditions: active streak, no commit today, and in the critical window (after 20:00 UTC)
  if (currentStreak <= 0) return null
  if (lastActiveDate && isTodayUTC(lastActiveDate)) return null
  if (!isAfter20UTC()) return null

  const { hoursLeft, minutesLeft } = timeLeft

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-surface to-surface p-4">
      {/* Glow orb */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 cursor-pointer rounded-md p-1 text-slate-600 transition-colors hover:text-slate-400"
        aria-label="Dismiss streak warning"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative flex items-start gap-3 pr-6 sm:items-center">
        {/* Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
          <Flame className="h-4.5 w-4.5 text-amber-400" fill="currentColor" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-300">Your streak is at risk</p>
          <p className="mt-0.5 text-xs text-slate-400">
            You haven&apos;t committed today.{' '}
            <span className="font-medium text-slate-200">{currentStreak}-day streak</span> ends at midnight UTC.
          </p>
        </div>

        {/* Time remaining */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold tabular-nums text-amber-400">
            {hoursLeft}h {minutesLeft}m
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-600">left</p>
        </div>
      </div>
    </div>
  )
}
