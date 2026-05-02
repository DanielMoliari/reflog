'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery, useMutation } from '@apollo/client/react'
import {
  ArrowLeft, ExternalLink, Star, GitFork, Eye, AlertCircle,
  Calendar, GitBranch, Scale, RefreshCw, Globe, Zap, Sparkles, Activity,
  HardDrive, Clock, TrendingUp, Layers,
} from 'lucide-react'
import { ActivityChart } from '@/components/activity-chart'
import { LanguageBar } from '@/components/language-bar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { REPOSITORY_DETAIL_QUERY } from '@/graphql/queries'
import { SYNC_REPOSITORY } from '@/graphql/mutations'
import { formatRelative } from '@/lib/utils'

interface RepoDetail {
  repositoryDetail: {
    repository: { id: string; fullName: string; language: string | null; isTracked: boolean; syncState: string; lastSyncedAt: string | null }
    description: string | null
    homepage: string | null
    defaultBranch: string
    stars: number; forks: number; watchers: number; openIssues: number; sizeKb: number
    createdAt: string
    pushedAt: string | null
    topics: string[]
    license: string | null
    totalBytes: number
    languages: { name: string; bytes: number; percent: number }[]
    recentMetrics: { id: string; date: string; commits: number; additions: number; deletions: number; prsMerged: number; netLines: number; churnRatio: number | null }[]
    curiosities: { label: string; value: string }[]
  }
}

const CURIOSITY_ICONS: Record<string, typeof Clock> = {
  'Repository age': Clock,
  'Code size': HardDrive,
  'Languages': Layers,
  'Commits in last 90d': Activity,
  'Most productive day': Sparkles,
  'Best single day': TrendingUp,
  'Avg commits per active day': Zap,
  'Consistency (90d)': Calendar,
  'Lines added (90d)': TrendingUp,
  'Lines removed (90d)': TrendingUp,
  'Stars · Forks · Watchers': Star,
  'Open issues': AlertCircle,
  'Default branch': GitBranch,
  'License': Scale,
  'Topics': Sparkles,
}

export default function RepoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, loading, refetch } = useQuery<RepoDetail>(REPOSITORY_DETAIL_QUERY, { variables: { id } })
  const [syncRepo, { loading: syncing }] = useMutation(SYNC_REPOSITORY)

  if (loading || !data) return <RepoDetailSkeleton />
  const d = data.repositoryDetail
  const r = d.repository
  const [owner, name] = r.fullName.split('/')

  async function handleSync() {
    await syncRepo({ variables: { id } })
    setTimeout(() => refetch(), 4000)
  }

  return (
    <div className="space-y-6">
      {/* ─── Breadcrumb ─────────────────────────────────────────────────── */}
      <Link href="/repos" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300">
        <ArrowLeft className="h-3 w-3" /> Back to repositories
      </Link>

      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <Card className="relative overflow-hidden border-border-2">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">{owner}</span>
                <span className="text-slate-700">/</span>
                <Badge variant={r.isTracked ? 'accent' : 'default'} className="text-[10px]">
                  {r.isTracked ? 'TRACKED' : 'UNTRACKED'}
                </Badge>
                {r.syncState === 'SYNCING' && <Badge variant="accent" className="text-[10px]">SYNCING</Badge>}
                {r.syncState === 'ERROR'   && <Badge variant="danger" className="text-[10px]">SYNC FAILED</Badge>}
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-100">{name}</h1>
              {d.description && (
                <p className="mt-2 max-w-2xl text-sm text-slate-400">{d.description}</p>
              )}
              {d.topics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {d.topics.map((t) => (
                    <span key={t} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync now'}
              </Button>
              <a
                href={`https://github.com/${r.fullName}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-surface-2 hover:text-slate-100"
              >
                <ExternalLink className="h-3 w-3" /> View on GitHub
              </a>
            </div>
          </div>

          {r.lastSyncedAt && (
            <p className="mt-4 text-[11px] text-slate-600">
              Last synced {formatRelative(r.lastSyncedAt)} · default branch <span className="text-slate-400">{d.defaultBranch}</span>
            </p>
          )}
        </div>
      </Card>

      {/* ─── Quick stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Star}      label="Stars"        value={d.stars}       color="amber" />
        <StatTile icon={GitFork}   label="Forks"        value={d.forks}       color="violet" />
        <StatTile icon={Eye}       label="Watchers"     value={d.watchers}    color="teal" />
        <StatTile icon={AlertCircle} label="Open issues" value={d.openIssues}  color={d.openIssues > 0 ? 'orange' : 'slate'} />
      </div>

      {/* ─── Language breakdown ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" /> Tech composition
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Language byte counts pulled from GitHub's linguist analysis
          </p>
        </CardHeader>
        <CardContent>
          <LanguageBar languages={d.languages} totalBytes={d.totalBytes} />
        </CardContent>
      </Card>

      {/* ─── Activity chart ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Commits — full history</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Since {new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </CardHeader>
          <CardContent>
            <ActivityChart
              data={d.recentMetrics.map((m) => ({ date: m.date, value: m.commits }))}
              type="area"
              height={220}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net lines of code</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart
              data={d.recentMetrics.map((m) => ({ date: m.date, value: m.netLines }))}
              type="bar"
              color="#22c55e"
              height={220}
            />
          </CardContent>
        </Card>
      </div>

      {/* ─── Curiosities grid ───────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-100">Insights & curiosities</h2>
          <span className="text-[11px] uppercase tracking-widest text-slate-600">computed from sync data</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {d.curiosities.map((c) => {
            const Icon = CURIOSITY_ICONS[c.label] ?? Sparkles
            return (
              <div
                key={c.label}
                className="group relative overflow-hidden rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/30"
              >
                <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent/[0.03] blur-2xl transition-all group-hover:bg-accent/10" />
                <div className="relative">
                  <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                    <Icon className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600">{c.label}</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">{c.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Metadata footer ────────────────────────────────────────────── */}
      <Card>
        <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
          <MetaRow icon={Calendar} label="Created"  value={new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
          <MetaRow icon={Activity} label="Last push" value={d.pushedAt ? formatRelative(d.pushedAt) : '—'} />
          <MetaRow icon={HardDrive} label="Size"     value={d.sizeKb >= 1024 ? `${(d.sizeKb / 1024).toFixed(1)} MB` : `${d.sizeKb.toLocaleString()} KB`} />
          <MetaRow icon={Scale} label="License"      value={d.license ?? 'No license'} />
        </div>
        {d.homepage && (
          <a href={d.homepage} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
            <Globe className="h-3 w-3" /> {d.homepage}
          </a>
        )}
      </Card>
    </div>
  )
}

// ─── Tiles ─────────────────────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value, color }: {
  icon: typeof Star; label: string; value: number; color: 'amber' | 'violet' | 'teal' | 'orange' | 'slate'
}) {
  const palette = {
    amber:  { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
    teal:   { bg: 'bg-accent/10',     text: 'text-accent' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
    slate:  { bg: 'bg-slate-500/10',  text: 'text-slate-400' },
  }[color]

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${palette.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${palette.text}`} />
      </div>
      <p className="tabular text-2xl font-bold text-slate-100">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-600">{label}</p>
    </div>
  )
}

function MetaRow({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-slate-600" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-slate-600">{label}</p>
        <p className="truncate text-slate-300">{value}</p>
      </div>
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function RepoDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-40" />
      <Card>
        <Skeleton className="mb-3 h-7 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    </div>
  )
}
