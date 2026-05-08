'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { languageColor } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TechNode {
  id: string
  type: 'repo' | 'language'
  name: string
  value: number // bytes
}

export interface TechLink {
  source: string // repo id
  target: string // language id
  value: number
}

export type VisMode = 'icicle' | 'mosaic' | 'force'

interface LangStat {
  id: string
  name: string
  bytes: number
  pct: number
  repos: RepoStat[]
}

interface RepoStat {
  id: string
  name: string
  shortName: string
  bytes: number
}

interface Props {
  nodes: TechNode[]
  links: TechLink[]
  mode: VisMode
  onModeChange: (m: VisMode) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(b: number): string {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`
  if (b >= 1_024) return `${(b / 1_024).toFixed(0)} KB`
  return `${b} B`
}

function pct(b: number, total: number): number {
  return total > 0 ? Math.round((b / total) * 1000) / 10 : 0
}

function buildStats(nodes: TechNode[], links: TechLink[]): { langs: LangStat[]; total: number } {
  const langs = nodes.filter((n) => n.type === 'language')
  const repos = nodes.filter((n) => n.type === 'repo')

  const linksByLang = new Map<string, TechLink[]>()
  for (const l of links) {
    const arr = linksByLang.get(l.target) ?? []
    arr.push(l)
    linksByLang.set(l.target, arr)
  }

  const repoMap = new Map(repos.map((r) => [r.id, r]))
  const total = langs.reduce((s, l) => s + l.value, 0)

  const langStats: LangStat[] = langs
    .map((l) => {
      const repoLinks = (linksByLang.get(l.id) ?? []).sort((a, b) => b.value - a.value)
      return {
        id: l.id,
        name: l.name,
        bytes: l.value,
        pct: pct(l.value, total),
        repos: repoLinks
          .map((rl) => {
            const r = repoMap.get(rl.source)
            if (!r) return null
            return {
              id: r.id,
              name: r.name,
              shortName: r.name.split('/')[1] ?? r.name,
              bytes: rl.value,
            }
          })
          .filter(Boolean) as RepoStat[],
      }
    })
    .filter((l) => l.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes)

  return { langs: langStats, total }
}

// ── Mode selector ─────────────────────────────────────────────────────────────

const MODES: { value: VisMode; label: string; icon: string }[] = [
  { value: 'icicle', label: 'Icicle', icon: '▦' },
  { value: 'mosaic', label: 'Mosaic', icon: '⊞' },
  { value: 'force', label: 'Network', icon: '◎' },
]

export function TechModeSelector({ mode, onChange }: { mode: VisMode; onChange: (m: VisMode) => void }) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-border bg-surface p-0.5">
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
            mode === m.value
              ? 'bg-surface-2 text-slate-100 shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="font-mono text-[10px] opacity-70">{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  )
}

// ── Shared tooltip ─────────────────────────────────────────────────────────────

interface TooltipData {
  x: number
  y: number
  lang: LangStat
  repo?: RepoStat
}

function Tooltip({ data, total: _total }: { data: TooltipData; total: number }) {
  const { lang, repo } = data
  return (
    <div
      className="pointer-events-none fixed z-50 min-w-[160px] max-w-[220px] rounded-xl border border-white/10 bg-[#0d1117]/95 p-3 shadow-2xl backdrop-blur-sm"
      style={{ left: data.x + 14, top: data.y - 8 }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: languageColor(lang.name) }}
        />
        <span className="text-[13px] font-bold text-slate-100">{repo ? repo.shortName : lang.name}</span>
      </div>
      {repo ? (
        <>
          <p className="text-[11px] text-slate-400">
            <span style={{ color: languageColor(lang.name) }}>{lang.name}</span>
          </p>
          <p className="text-[11px] text-slate-500">{fmt(repo.bytes)}</p>
        </>
      ) : (
        <>
          <p className="text-[11px] text-slate-500">
            {lang.pct}% of source · {fmt(lang.bytes)}
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {lang.repos.length} repo{lang.repos.length !== 1 ? 's' : ''}
          </p>
          <div className="mt-2 space-y-0.5">
            {lang.repos.slice(0, 4).map((r) => (
              <p key={r.id} className="text-[10px] text-slate-600 truncate">
                · {r.shortName}
              </p>
            ))}
            {lang.repos.length > 4 && (
              <p className="text-[10px] text-slate-700">+{lang.repos.length - 4} more</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TechVisualization({ nodes, links, mode, onModeChange: _onModeChange }: Props) {
  const { langs, total } = useMemo(() => buildStats(nodes, links), [nodes, links])
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [activeLang, setActiveLang] = useState<string | null>(null)

  const showTooltip = useCallback((e: React.MouseEvent, lang: LangStat, repo?: RepoStat) => {
    setTooltip({ x: e.clientX, y: e.clientY, lang, repo })
  }, [])
  const hideTooltip = useCallback(() => setTooltip(null), [])
  const moveTooltip = useCallback((e: React.MouseEvent) => {
    setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)
  }, [])

  return (
    <div className="relative" onMouseMove={moveTooltip}>
      {mode === 'icicle' && (
        <IcicleView
          langs={langs}
          total={total}
          activeLang={activeLang}
          onActiveLang={setActiveLang}
          onTooltip={showTooltip}
          onHideTooltip={hideTooltip}
        />
      )}
      {mode === 'mosaic' && (
        <MosaicView
          langs={langs}
          total={total}
          activeLang={activeLang}
          onActiveLang={setActiveLang}
          onTooltip={showTooltip}
          onHideTooltip={hideTooltip}
        />
      )}
      {mode === 'force' && (
        <ForceView
          langs={langs}
          total={total}
          activeLang={activeLang}
          onActiveLang={setActiveLang}
          onTooltip={showTooltip}
          onHideTooltip={hideTooltip}
        />
      )}
      {tooltip && <Tooltip data={tooltip} total={total} />}
    </div>
  )
}

// ── Shared interaction types ───────────────────────────────────────────────────

interface ViewProps {
  langs: LangStat[]
  total: number
  activeLang: string | null
  onActiveLang: (id: string | null) => void
  onTooltip: (e: React.MouseEvent, lang: LangStat, repo?: RepoStat) => void
  onHideTooltip: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ICICLE VIEW ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function IcicleView({ langs, total: _total, activeLang, onActiveLang, onTooltip, onHideTooltip }: ViewProps) {
  return (
    <div className="space-y-1.5">
      {/* Top language bar */}
      <div className="flex gap-0.5 h-14 overflow-hidden rounded-lg">
        {langs.map((l) => {
          const isActive = activeLang === l.id
          const isDimmed = activeLang !== null && !isActive
          return (
            <div
              key={l.id}
              className="flex flex-col items-start justify-end overflow-hidden rounded-md px-2 pb-1.5 transition-all duration-300 cursor-pointer shrink-0"
              style={{
                flex: l.bytes,
                minWidth: l.pct > 3 ? 40 : l.pct > 0.5 ? 8 : 4,
                backgroundColor: languageColor(l.name),
                opacity: isDimmed ? 0.25 : 1,
                filter: isActive ? 'brightness(1.15)' : undefined,
              }}
              onMouseEnter={(e) => { onActiveLang(l.id); onTooltip(e, l) }}
              onMouseLeave={() => { onActiveLang(null); onHideTooltip() }}
            >
              {l.pct > 4 && (
                <span className="text-[10px] font-bold text-black/70 leading-none truncate max-w-full">
                  {l.name}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Repo rows per language */}
      {langs.slice(0, 5).map((l) => {
        const isActive = activeLang === l.id
        const isDimmed = activeLang !== null && !isActive
        if (!l.repos.length) return null

        return (
          <div
            key={l.id}
            className="flex gap-0.5 overflow-hidden"
            style={{ height: l === langs[0] ? 80 : l === langs[1] ? 52 : 34 }}
          >
            {/* Language label strip */}
            <div
              className="flex items-center justify-center rounded-md px-2 shrink-0 transition-all duration-300"
              style={{
                width: 72,
                backgroundColor: languageColor(l.name) + '18',
                borderLeft: `3px solid ${languageColor(l.name)}`,
                opacity: isDimmed ? 0.3 : 1,
              }}
            >
              <span
                className="text-[9px] font-bold uppercase tracking-wider truncate"
                style={{ color: languageColor(l.name) }}
              >
                {l.name}
              </span>
            </div>

            {/* Repo tiles */}
            <div className="flex gap-0.5 flex-1 overflow-hidden">
              {l.repos.slice(0, 12).map((r) => {
                const repoId = r.id.replace('repo:', '')
                return (
                  <Link
                    key={r.id}
                    href={`/repos/${repoId}`}
                    className="flex flex-col justify-end overflow-hidden rounded-md px-2 pb-1.5 transition-all duration-200 hover:brightness-110 shrink-0"
                    style={{
                      flex: r.bytes,
                      minWidth: 28,
                      maxWidth: 180,
                      backgroundColor: languageColor(l.name) + (isActive ? '50' : '30'),
                      opacity: isDimmed ? 0.2 : 1,
                    }}
                    onMouseEnter={(e) => { onActiveLang(l.id); onTooltip(e, l, r) }}
                    onMouseLeave={() => { onActiveLang(null); onHideTooltip() }}
                  >
                    <span className="text-[9px] text-white/60 truncate leading-none">{r.shortName}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Legend strip */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
        {langs.map((l) => (
          <div
            key={l.id}
            className="flex items-center gap-1.5 cursor-pointer transition-opacity duration-200"
            style={{ opacity: activeLang && activeLang !== l.id ? 0.3 : 1 }}
            onMouseEnter={() => onActiveLang(l.id)}
            onMouseLeave={() => onActiveLang(null)}
          >
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: languageColor(l.name) }} />
            <span className="text-[11px] text-slate-400">{l.name}</span>
            <span className="text-[10px] text-slate-600">{l.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MOSAIC VIEW ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function MosaicView({ langs, total: _total2, activeLang, onActiveLang, onTooltip, onHideTooltip }: ViewProps) {
  // Build a squarified-style mosaic: biggest lang gets a large hero cell (left col, full height),
  // next two share the top-right, remaining fill a bottom row.
  const top = langs.slice(0, 7)
  const [hero, ...rest] = top
  const mid = rest.slice(0, 2)
  const bottom = rest.slice(2)

  if (!hero) return null

  function cellClass(l: LangStat, _extra = '') {
    const isActive = activeLang === l.id
    const isDimmed = activeLang !== null && !isActive
    return {
      style: {
        backgroundColor: languageColor(l.name),
        opacity: isDimmed ? 0.25 : 1,
        filter: isActive ? 'brightness(1.1) saturate(1.1)' : undefined,
        transition: 'all 0.25s ease',
      } as React.CSSProperties,
      onMouseEnter: (e: React.MouseEvent) => { onActiveLang(l.id); onTooltip(e, l) },
      onMouseLeave: () => { onActiveLang(null); onHideTooltip() },
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: '3fr 2fr', gridTemplateRows: '220px' }}>
        {/* Hero cell */}
        <div
          className="relative overflow-hidden rounded-xl cursor-pointer row-span-1"
          {...cellClass(hero)}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 p-4">
            <p className="text-2xl font-black text-black/75 leading-none">{hero.name}</p>
            <p className="mt-1 text-sm font-semibold text-black/55">{hero.pct}%</p>
            <p className="text-xs text-black/40 mt-0.5">{fmt(hero.bytes)} · {hero.repos.length} repos</p>
            <div className="mt-2 space-y-0.5">
              {hero.repos.slice(0, 4).map((r) => {
                const repoId = r.id.replace('repo:', '')
                return (
                  <Link
                    key={r.id}
                    href={`/repos/${repoId}`}
                    className="block text-[11px] text-black/50 hover:text-black/70 truncate transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => { e.stopPropagation(); onTooltip(e, hero, r) }}
                    onMouseLeave={onHideTooltip}
                  >
                    {r.shortName}
                  </Link>
                )
              })}
              {hero.repos.length > 4 && (
                <p className="text-[10px] text-black/35">+{hero.repos.length - 4} more</p>
              )}
            </div>
          </div>
        </div>

        {/* Mid-right column */}
        <div className="grid gap-1.5" style={{ gridTemplateRows: '1fr 1fr' }}>
          {mid.map((l) => (
            <div
              key={l.id}
              className="relative overflow-hidden rounded-xl cursor-pointer"
              {...cellClass(l)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
              <div className="absolute bottom-0 left-0 p-3">
                <p className="text-base font-black text-black/70">{l.name}</p>
                <p className="text-xs text-black/45">{l.pct}% · {l.repos.length} repos</p>
              </div>
            </div>
          ))}
          {mid.length < 2 && <div className="rounded-xl bg-white/[0.02] border border-white/[0.05]" />}
        </div>
      </div>

      {/* Bottom row */}
      {bottom.length > 0 && (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${bottom.length}, 1fr)`, height: 80 }}>
          {bottom.map((l) => (
            <div
              key={l.id}
              className="relative overflow-hidden rounded-xl cursor-pointer"
              {...cellClass(l)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 p-2.5">
                <p className="text-xs font-bold text-black/65 truncate">{l.name}</p>
                <p className="text-[10px] text-black/40">{l.pct}%</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Language breakdown bar */}
      <div className="mt-1">
        <div className="flex gap-px h-1.5 rounded-full overflow-hidden">
          {langs.map((l) => (
            <div
              key={l.id}
              className="transition-all duration-300 cursor-pointer"
              style={{
                flex: l.bytes,
                backgroundColor: languageColor(l.name),
                opacity: activeLang && activeLang !== l.id ? 0.2 : 1,
              }}
              onMouseEnter={() => onActiveLang(l.id)}
              onMouseLeave={() => onActiveLang(null)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {langs.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-1.5 cursor-pointer transition-opacity duration-200"
              style={{ opacity: activeLang && activeLang !== l.id ? 0.3 : 1 }}
              onMouseEnter={() => onActiveLang(l.id)}
              onMouseLeave={() => onActiveLang(null)}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: languageColor(l.name) }} />
              <span className="text-[11px] text-slate-400">{l.name}</span>
              <span className="text-[10px] text-slate-600">{l.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── FORCE / NETWORK VIEW ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Hand-placed positions as percentages — elegant, stable, no d3 dependency
const LANG_POSITIONS: Record<string, { x: number; y: number }> = {
  TypeScript:  { x: 50,  y: 48 },
  JavaScript:  { x: 30,  y: 30 },
  PHP:         { x: 72,  y: 32 },
  HTML:        { x: 20,  y: 60 },
  CSS:         { x: 78,  y: 62 },
  Vue:         { x: 60,  y: 75 },
  Java:        { x: 40,  y: 78 },
  SCSS:        { x: 85,  y: 45 },
  Shell:       { x: 15,  y: 42 },
  Blade:       { x: 65,  y: 18 },
  Python:      { x: 35,  y: 15 },
  Go:          { x: 80,  y: 20 },
  Rust:        { x: 22,  y: 80 },
  Ruby:        { x: 88,  y: 78 },
  Swift:       { x: 55,  y: 12 },
  Kotlin:      { x: 10,  y: 25 },
  'C++':       { x: 10,  y: 70 },
  C:           { x: 92,  y: 55 },
  Dart:        { x: 45,  y: 92 },
}

function fallbackPos(i: number, total: number): { x: number; y: number } {
  const angle = (i / total) * Math.PI * 2 - Math.PI / 2
  return { x: 50 + 38 * Math.cos(angle), y: 50 + 35 * Math.sin(angle) }
}

function ForceView({ langs, total: _total3, activeLang, onActiveLang, onTooltip, onHideTooltip }: ViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 700, h: 460 })

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver((entries) => {
      const r = entries[0]!.contentRect
      setSize({ w: r.width, h: Math.max(380, r.width * 0.6) })
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const maxBytes = langs[0]?.bytes ?? 1

  // Assign positions: use hand-placed table, fallback to polar for unknowns
  const langPos = useMemo(() => {
    return langs.map((l, i) => {
      const pos = LANG_POSITIONS[l.name] ?? fallbackPos(i, langs.length)
      const x = (pos.x / 100) * size.w
      const y = (pos.y / 100) * size.h
      const r = Math.max(18, Math.min(52, 16 + Math.sqrt(l.bytes / maxBytes) * 42))
      return { lang: l, x, y, r }
    })
  }, [langs, size, maxBytes])

  // Distribute repos around their language node
  const repoPlacements = useMemo(() => {
    const result: Array<{ repo: RepoStat; lang: LangStat; x: number; y: number; langX: number; langY: number }> = []
    for (const { lang, x: lx, y: ly, r: lr } of langPos) {
      const repoCount = Math.min(lang.repos.length, 6)
      lang.repos.slice(0, repoCount).forEach((repo, i) => {
        const angle = ((i / repoCount) * Math.PI * 2) - Math.PI / 2
        const dist = lr + 28 + (i % 2) * 14
        result.push({
          repo,
          lang,
          x: lx + dist * Math.cos(angle),
          y: ly + dist * Math.sin(angle),
          langX: lx,
          langY: ly,
        })
      })
    }
    return result
  }, [langPos])

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl"
      style={{
        height: size.h,
        backgroundImage: 'radial-gradient(ellipse at 50% 48%, rgba(6,182,212,0.04) 0%, transparent 70%)',
      }}
    >
      <svg
        viewBox={`0 0 ${size.w} ${size.h}`}
        className="absolute inset-0 h-full w-full"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {langPos.map(({ lang, r: _r }) => (
            <radialGradient key={`glow-${lang.id}`} id={`fglow-${lang.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={languageColor(lang.name)} stopOpacity="0.35" />
              <stop offset="100%" stopColor={languageColor(lang.name)} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Subtle grid */}
        <pattern id="fgrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        </pattern>
        <rect width={size.w} height={size.h} fill="url(#fgrid)" />

        {/* Repo → language connection lines */}
        {repoPlacements.map(({ repo, lang, x, y, langX, langY }) => {
          const isActive = activeLang === lang.id
          return (
            <line
              key={`line-${lang.id}-${repo.id}`}
              x1={langX} y1={langY} x2={x} y2={y}
              stroke={isActive ? languageColor(lang.name) : 'rgba(255,255,255,0.05)'}
              strokeWidth={isActive ? 1.5 : 0.8}
              strokeDasharray={isActive ? undefined : '3 4'}
              style={{ transition: 'all 0.2s ease' }}
            />
          )
        })}

        {/* Glow halos */}
        {langPos.map(({ lang, x, y, r }) => {
          const isDimmed = activeLang !== null && activeLang !== lang.id
          return (
            <circle
              key={`halo-${lang.id}`}
              cx={x} cy={y} r={r * 2.8}
              fill={`url(#fglow-${lang.id})`}
              style={{ opacity: isDimmed ? 0 : 1, transition: 'opacity 0.25s ease' }}
            />
          )
        })}

        {/* Repo dots */}
        {repoPlacements.map(({ repo, lang, x, y }) => {
          const isLangActive = activeLang === lang.id
          const isDimmed = activeLang !== null && !isLangActive
          const repoId = repo.id.replace('repo:', '')
          return (
            <g key={`repo-${lang.id}-${repo.id}`} style={{ cursor: 'pointer' }}>
              <Link href={`/repos/${repoId}`}>
                <circle
                  cx={x} cy={y} r={5}
                  fill={isLangActive ? languageColor(lang.name) : '#1e293b'}
                  stroke={languageColor(lang.name)}
                  strokeWidth={1.5}
                  style={{
                    opacity: isDimmed ? 0.1 : isLangActive ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { onActiveLang(lang.id); onTooltip(e, lang, repo) }}
                  onMouseLeave={() => { onActiveLang(null); onHideTooltip() }}
                />
              </Link>
            </g>
          )
        })}

        {/* Language nodes */}
        {langPos.map(({ lang, x, y, r }) => {
          const isActive = activeLang === lang.id
          const isDimmed = activeLang !== null && !isActive
          const strokeW = isActive ? 2.5 : 1.5
          const strokeColor = isActive ? languageColor(lang.name) : '#0d1117'
          return (
            <g
              key={`lang-${lang.id}`}
              style={{ cursor: 'pointer', opacity: isDimmed ? 0.2 : 1, transition: 'opacity 0.25s ease' }}
              onMouseEnter={(e) => { onActiveLang(lang.id); onTooltip(e, lang) }}
              onMouseLeave={() => { onActiveLang(null); onHideTooltip() }}
            >
              {/* Ring pulse when active */}
              {isActive && (
                <circle
                  cx={x} cy={y} r={r + 6}
                  fill="none"
                  stroke={languageColor(lang.name)}
                  strokeWidth={1}
                  strokeOpacity={0.4}
                />
              )}

              <circle
                cx={x} cy={y} r={r}
                fill={languageColor(lang.name)}
                stroke={strokeColor}
                strokeWidth={strokeW}
                style={{ transition: 'all 0.2s ease' }}
              />

              {/* Language name */}
              <text
                x={x} y={y - (r > 30 ? 4 : 2)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.min(12, r * 0.38)}
                fontWeight={700}
                fill="rgba(0,0,0,0.75)"
                fontFamily="system-ui, sans-serif"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {lang.name.length > 8 ? lang.name.slice(0, 6) + '…' : lang.name}
              </text>

              {/* Repo count badge */}
              {r > 22 && (
                <text
                  x={x} y={y + r * 0.42}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  fill="rgba(0,0,0,0.5)"
                  fontFamily="system-ui, sans-serif"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {lang.repos.length}r
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-lg border border-border bg-surface/80 px-3 py-1.5 text-[10px] text-slate-500 backdrop-blur-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-cyan-500/60" /> language
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-slate-500 bg-slate-800" /> repository
        </span>
        <span className="text-slate-700">·</span>
        <span className="text-slate-600">hover to explore · click repo to open</span>
      </div>
    </div>
  )
}
