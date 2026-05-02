'use client'

import Link from 'next/link'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative, languageColor } from '@/lib/utils'
import type { Repository } from '@/graphql/types'

interface RepoCardProps {
  repo: Repository
  onToggleTrack: (id: string, tracked: boolean) => void
  onSync: (id: string) => void
  syncing?: boolean
}

export function RepoCard({ repo, onToggleTrack, onSync, syncing }: RepoCardProps) {
  const [owner, name] = repo.fullName.split('/')

  return (
    <div className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40 hover:bg-surface-2">
      <Link href={`/repos/${repo.id}`} className="min-w-0 flex-1 cursor-pointer">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 text-sm">{owner}/</span>
          <span className="font-medium text-slate-100 text-sm">{name}</span>
          <ChevronRight className="h-3 w-3 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" />
          {repo.language && (
            <Badge variant="default" className="gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: languageColor(repo.language) }}
              />
              {repo.language}
            </Badge>
          )}
          {repo.syncState === 'SYNCING' && (
            <Badge variant="accent">syncing…</Badge>
          )}
          {repo.syncState === 'ERROR' && (
            <Badge variant="danger">sync failed</Badge>
          )}
        </div>
        {repo.lastSyncedAt && (
          <p className="mt-1 text-xs text-slate-600">
            Last synced {formatRelative(repo.lastSyncedAt)}
          </p>
        )}
      </Link>

      <div className="flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onSync(repo.id)}
          disabled={syncing || repo.syncState === 'SYNCING'}
          title="Sync now"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">{repo.isTracked ? 'Tracked' : 'Untracked'}</span>
          <Switch
            checked={repo.isTracked}
            onCheckedChange={(checked) => onToggleTrack(repo.id, checked)}
          />
        </div>
      </div>
    </div>
  )
}

export function RepoCardSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-9 rounded-full" />
    </div>
  )
}
