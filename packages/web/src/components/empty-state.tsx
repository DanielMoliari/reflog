'use client'

import type { ReactNode } from 'react'

type EmptyStateVariant = 'dashed' | 'gradient'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  variant?: EmptyStateVariant
  height?: number | string
  action?: ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  variant = 'dashed',
  height = 200,
  action,
}: EmptyStateProps) {
  if (variant === 'gradient') {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl p-8"
        style={{
          height,
          background: 'linear-gradient(#111827, #111827) padding-box, linear-gradient(135deg, rgba(6,182,212,.18), rgba(139,92,246,.1), transparent 60%) border-box',
          border: '1px solid transparent',
        }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-slate-500">
          {icon}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          {description && (
            <p className="mt-1 text-xs text-slate-600">{description}</p>
          )}
        </div>
        {action && <div className="mt-1">{action}</div>}
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.07] p-8"
      style={{ height }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.03] text-slate-500">
        {icon}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-slate-600">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
