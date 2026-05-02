'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { languageColor } from '@/lib/utils'

interface Lang {
  name: string
  bytes: number
  percent: number
}

interface LanguageBarProps {
  languages: Lang[]
  totalBytes: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function LanguageBar({ languages, totalBytes }: LanguageBarProps) {
  if (languages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-slate-600">
        No languages detected on GitHub yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* GitHub-style stacked bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        {languages.map((l) => (
          <Tooltip key={l.name}>
            <TooltipTrigger asChild>
              <div
                className="h-full transition-opacity hover:opacity-80"
                style={{ width: `${l.percent}%`, backgroundColor: languageColor(l.name) }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <div className="font-medium">{l.name}</div>
              <div className="text-[11px] text-slate-400">
                {l.percent.toFixed(2)}% · {formatBytes(l.bytes)}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {languages.map((l) => (
          <div key={l.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: languageColor(l.name) }}
            />
            <span className="text-slate-300 flex-1 truncate">{l.name}</span>
            <span className="tabular text-slate-500">{l.percent.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-600">
        Computed from {formatBytes(totalBytes)} of source on GitHub · vendored & generated paths excluded
      </p>
    </div>
  )
}
