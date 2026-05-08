'use client'

import { useMemo, useState } from 'react'

interface HourlyActivityProps {
  hours: number[]          // 24 entries, UTC
  peakHour: number
  height?: number
}

function fmtHour(h: number): string {
  // 0 → "12am", 13 → "1pm", 23 → "11pm"
  const period = h < 12 ? 'am' : 'pm'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${period}`
}

// 24-bar mini chart in pure SVG. Peak hour glows teal, the rest in slate.
// Same aesthetic as activity-radial — gradient fill, soft glow underlay, JetBrains Mono labels.
export function HourlyActivity({ hours, peakHour, height = 160 }: HourlyActivityProps) {
  const [hover, setHover] = useState<number | null>(null)

  const layout = useMemo(() => {
    const max = Math.max(...hours, 1)
    const total = hours.reduce((s, n) => s + n, 0)
    return { max, total }
  }, [hours])

  const PAD = { top: 12, right: 8, bottom: 22, left: 8 }
  const W = 480
  const H = height
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const barGap = 3
  const barW = (innerW - barGap * 23) / 24

  return (
    <div className="relative" style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        <defs>
          <linearGradient id="ha-peak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="ha-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#64748b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="ha-glow" cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Peak-hour soft glow */}
        {layout.total > 0 && (
          <ellipse
            cx={PAD.left + (peakHour + 0.5) * (barW + barGap) - barGap / 2}
            cy={PAD.top + innerH}
            rx={barW * 4}
            ry={innerH * 0.6}
            fill="url(#ha-glow)"
          />
        )}

        {/* Bars */}
        {hours.map((count, h) => {
          const ratio = count / layout.max
          const barH = Math.max(ratio * innerH, count > 0 ? 2 : 1)
          const x = PAD.left + h * (barW + barGap)
          const y = PAD.top + innerH - barH
          const isPeak = h === peakHour && count > 0
          const isHover = hover === h
          return (
            <g
              key={h}
              onMouseEnter={() => setHover(h)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* invisible hit target spans full height for easier hover */}
              <rect x={x} y={PAD.top} width={barW} height={innerH} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={1.5}
                fill={isPeak ? 'url(#ha-peak)' : 'url(#ha-bar)'}
                stroke={isPeak ? '#22d3ee' : isHover ? 'rgba(148,163,184,0.6)' : 'transparent'}
                strokeWidth={isPeak ? 0.8 : 1}
                style={{ transition: 'stroke 150ms' }}
              />
              {/* Hour label every 4 hours, plus peak */}
              {(h % 4 === 0 || isPeak) && (
                <text
                  x={x + barW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isPeak ? '#22d3ee' : '#475569'}
                  fontWeight={isPeak ? 600 : 400}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {fmtHour(h)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {hover !== null && hours[hover] !== undefined && (
        <div
          className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-md border border-border-2 bg-surface-2/95 px-2.5 py-1 backdrop-blur-sm"
        >
          <p className="text-[11px] text-slate-100">
            <span className="font-semibold tabular">{fmtHour(hover)} UTC</span>
            <span className="ml-2 text-slate-500 tabular">{hours[hover]!.toLocaleString()} commits</span>
          </p>
        </div>
      )}
    </div>
  )
}
