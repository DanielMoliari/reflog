'use client'

import { ArrowRight } from 'lucide-react'
import { languageColor } from '@/lib/utils'

interface TechGraduationCardProps {
  from: string
  to: string
  year: number
  message: string
  confidence: number
}

// Premium-feel transition card: from → to badges with a glowing arrow,
// year stamp top-right, message below, accent border that picks up the new language's color.
export function TechGraduationCard({ from, to, year, message, confidence }: TechGraduationCardProps) {
  const fromColor = languageColor(from)
  const toColor = languageColor(to)
  const opacity = Math.max(0.35, Math.min(1, confidence))

  return (
    <div
      className="group relative w-[300px] shrink-0 overflow-hidden rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40"
      style={{ boxShadow: `0 0 0 1px ${toColor}22, 0 8px 32px -8px ${toColor}33` }}
    >
      {/* Glow accent — leans into the new language's color */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: toColor, opacity: 0.12 }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${fromColor}00, ${fromColor}aa, ${toColor}aa, ${toColor}00)` }}
      />

      <div className="relative">
        {/* Year stamp */}
        <div className="mb-3 flex items-start justify-between">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600">Graduation</p>
          <span className="tabular rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
            {year}
          </span>
        </div>

        {/* From → To */}
        <div className="flex items-center gap-2">
          <LanguageBadge name={from} color={fromColor} dim />
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <LanguageBadge name={to} color={toColor} />
        </div>

        {/* Message */}
        <p className="mt-3 text-xs leading-relaxed text-slate-400">{message}</p>

        {/* Confidence bar */}
        <div className="mt-4 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.round(confidence * 100)}%`, backgroundColor: toColor, opacity }}
            />
          </div>
          <span className="tabular text-[10px] text-slate-600">{Math.round(confidence * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

function LanguageBadge({ name, color, dim }: { name: string; color: string; dim?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold transition-opacity ${
        dim ? 'opacity-60' : 'opacity-100'
      }`}
      style={{
        borderColor: `${color}66`,
        backgroundColor: `${color}1a`,
        color: color,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  )
}
