'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AlertCircle, Bell, Check, LogOut, PanelLeftOpen, RefreshCw, Settings, User } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@apollo/client/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ME_QUERY, REPOSITORIES_QUERY } from '@/graphql/queries'
import type { Repository, User as UserType } from '@/graphql/types'
import { clearToken } from '@/lib/auth'
import { useUIStore } from '@/store/ui-store'
import { GlobalSearch } from '@/components/global-search'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/repos': 'Repositories',
  '/streaks': 'Streaks',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string, repositories?: Repository[]): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/repos/')) {
    const id = pathname.split('/repos/')[1]
    const repo = repositories?.find((r) => r.id === id)
    if (repo) {
      const name = repo.fullName.split('/')[1] ?? repo.fullName
      return name
    }
    return 'Repository'
  }
  return 'reflog'
}

function formatStaleAge(ms: number): string {
  const h = Math.floor(ms / (1000 * 60 * 60))
  if (h >= 1) return `${h}h without sync`
  const m = Math.floor(ms / (1000 * 60))
  return `${m}m without sync`
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const STALE_MS = 6 * 60 * 60 * 1000

type SyncPhase = 'idle' | 'stale' | 'syncing' | 'synced' | 'error'

const SYNC_STYLES: Record<SyncPhase, { border: string; bg: string; text: string }> = {
  idle:    { border: 'border-border-2',              bg: 'bg-transparent',        text: 'text-slate-500' },
  stale:   { border: 'border-warning/30',            bg: 'bg-warning/5',          text: 'text-warning' },
  syncing: { border: 'border-accent/30',             bg: 'bg-accent/5',           text: 'text-accent' },
  synced:  { border: 'border-emerald-500/30',        bg: 'bg-emerald-500/5',      text: 'text-emerald-400' },
  error:   { border: 'border-danger/30',             bg: 'bg-danger/5',           text: 'text-danger' },
}

interface Notification {
  id: string
  title: string
  body: string
  at: Date
  read: boolean
}

interface NavHeaderProps {
  onSyncOpen: () => void
}

export function NavHeader({ onSyncOpen }: NavHeaderProps) {
  const pathname = usePathname()
  const { data, loading } = useQuery<{ me: UserType }>(ME_QUERY)
  const { data: reposData, startPolling, stopPolling } = useQuery<{ repositories: Repository[] }>(REPOSITORIES_QUERY)
  const title = getPageTitle(pathname, reposData?.repositories)

  const [syncedFlash, setSyncedFlash] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const { toggleMobileMenu } = useUIStore()

  const tracked = (reposData?.repositories ?? []).filter((r) => r.isTracked)
  const isSyncing = tracked.some((r) => r.syncState === 'SYNCING')
  const hasError = !isSyncing && tracked.some((r) => r.syncState === 'ERROR')

  // Poll every 3s while syncing so UI updates when workers finish
  useEffect(() => {
    if (isSyncing) {
      startPolling(3000)
    } else {
      stopPolling()
    }
  }, [isSyncing, startPolling, stopPolling])

  // Flash "Synced" 2.5s when syncing transitions true → false
  useEffect(() => {
    if (isSyncing) return
    setSyncedFlash(true)
    const t = setTimeout(() => setSyncedFlash(false), 2500)
    return () => clearTimeout(t)
  }, [isSyncing])

  // Emit a notification when sync completes successfully
  const prevSyncing = useIsPrevious(isSyncing)
  useEffect(() => {
    if (prevSyncing && !isSyncing && !hasError && tracked.length > 0) {
      setNotifications((prev) => [
        {
          id: `sync-${Date.now()}`,
          title: 'Sync complete',
          body: `${tracked.length} ${tracked.length === 1 ? 'repo' : 'repos'} synced successfully.`,
          at: new Date(),
          read: false,
        },
        ...prev.slice(0, 9),
      ])
    }
  }, [isSyncing, prevSyncing, hasError, tracked.length])

  // Emit a notification when an error repo is detected
  useEffect(() => {
    if (!hasError) return
    const errRepos = tracked.filter((r) => r.syncState === 'ERROR')
    if (errRepos.length === 0) return
    const ids = errRepos.map((r) => r.id).join(',')
    setNotifications((prev) => {
      if (prev.some((n) => n.id === `err-${ids}`)) return prev
      return [
        {
          id: `err-${ids}`,
          title: 'Sync error',
          body: `${errRepos.length} ${errRepos.length === 1 ? 'repo' : 'repos'} failed to sync. Click Sync to retry.`,
          at: new Date(),
          read: false,
        },
        ...prev.slice(0, 9),
      ]
    })
  }, [hasError, tracked])

  const unread = notifications.filter((n) => !n.read).length

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const lastSyncedAt = tracked.reduce<number | null>((best, r) => {
    if (!r.lastSyncedAt) return best
    const t = new Date(r.lastSyncedAt).getTime()
    return best === null || t > best ? t : best
  }, null)

  const staleMs = lastSyncedAt !== null ? Date.now() - lastSyncedAt : null
  const isStale = !isSyncing && !syncedFlash && (
    lastSyncedAt === null || (staleMs !== null && staleMs > STALE_MS)
  )

  const syncPhase: SyncPhase = isSyncing ? 'syncing'
    : syncedFlash ? 'synced'
    : hasError ? 'error'
    : isStale ? 'stale'
    : 'idle'

  const { border, bg, text } = SYNC_STYLES[syncPhase]

  const syncIcon = syncPhase === 'syncing'
    ? <RefreshCw className={`h-3.5 w-3.5 animate-spin ${text}`} />
    : syncPhase === 'synced'
    ? <Check className={`h-3.5 w-3.5 ${text}`} />
    : syncPhase === 'error'
    ? <AlertCircle className={`h-3.5 w-3.5 ${text}`} />
    : <RefreshCw className={`h-3.5 w-3.5 ${text}`} />

  const syncLabel = syncPhase === 'syncing' ? 'Syncing…'
    : syncPhase === 'synced'  ? 'Synced'
    : syncPhase === 'error'   ? 'Retry'
    : 'Sync'

  function handleLogout() {
    clearToken()
    window.location.href = '/'
  }

  const user = data?.me
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 md:px-6">

      {/* Left — title + stale freshness indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileMenu}
          className="cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-surface-2 hover:text-slate-200 md:hidden"
          aria-label="Open menu"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-semibold text-slate-200">{title}</h1>
        {isStale && staleMs !== null && (
          <span className="hidden text-xs text-warning sm:block">
            · {formatStaleAge(staleMs)}
          </span>
        )}
        {syncPhase === 'syncing' && (
          <span className="hidden text-xs text-accent sm:block">· syncing now</span>
        )}
      </div>

      {/* Center — global search */}
      <div className="flex justify-center">
        <GlobalSearch />
      </div>

      {/* Right — sync + separator + bell + avatar */}
      <div className="flex items-center justify-end gap-2">

        {/* Sync button */}
        <button
          onClick={onSyncOpen}
          className={[
            'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
            border, bg,
          ].join(' ')}
        >
          {syncIcon}
          <span className={text}>{syncLabel}</span>
        </button>

        <div className="mx-1 h-4 w-px bg-border-2" />

        {/* Bell */}
        <DropdownMenu.Root open={bellOpen} onOpenChange={(o) => { setBellOpen(o); if (o) markAllRead() }}>
          <DropdownMenu.Trigger asChild>
            <button className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-surface-2 hover:text-slate-300 focus-visible:outline-none">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-2 w-2 items-center justify-center rounded-full bg-accent" />
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 w-80 rounded-lg border border-border-2 bg-surface-2 shadow-xl shadow-black/40 animate-in fade-in-0 zoom-in-95"
            >
              <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Notifications</span>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="cursor-pointer text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border-2 bg-surface">
                    <Bell className="h-4 w-4 text-slate-600" />
                  </div>
                  <p className="text-xs font-medium text-slate-500">No notifications yet</p>
                  <p className="text-[11px] text-slate-700">Sync results and streak alerts will appear here</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3">
                      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-accent'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-200">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-slate-700 mt-1">{timeAgo(n.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Avatar + profile dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex cursor-pointer items-center rounded-md p-1 transition-colors hover:bg-surface-2 focus-visible:outline-none">
              {loading ? (
                <Skeleton className="h-7 w-7 rounded-full" />
              ) : (
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.username ?? undefined} />
                  <AvatarFallback className="text-[10px] font-bold">{initials}</AvatarFallback>
                </Avatar>
              )}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 w-52 overflow-hidden rounded-lg border border-border-2 bg-surface-2 shadow-xl shadow-black/40 animate-in fade-in-0 zoom-in-95"
              align="end"
              sideOffset={6}
            >
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-slate-100">{user?.name ?? user?.githubUsername}</p>
                {user?.githubUsername && (
                  <p className="mt-0.5 text-xs text-accent">@{user.githubUsername}</p>
                )}
              </div>

              <div className="p-1">
                {user?.username && (
                  <DropdownMenu.Item asChild>
                    <a
                      href={`/u/${user.username}`}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-400 outline-none transition-colors hover:bg-surface-3 hover:text-slate-200"
                    >
                      <User className="h-3.5 w-3.5 shrink-0" />
                      View public profile
                    </a>
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Item asChild>
                  <a
                    href="/settings"
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-400 outline-none transition-colors hover:bg-surface-3 hover:text-slate-200"
                  >
                    <Settings className="h-3.5 w-3.5 shrink-0" />
                    Settings
                  </a>
                </DropdownMenu.Item>
              </div>

              <DropdownMenu.Separator className="h-px bg-border" />

              <div className="p-1">
                <DropdownMenu.Item asChild>
                  <button
                    onClick={handleLogout}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-danger outline-none transition-colors hover:bg-danger/8"
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0" />
                    Sign out
                  </button>
                </DropdownMenu.Item>
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

      </div>
    </header>
  )
}

// Tracks the previous value of a boolean across renders
function useIsPrevious(value: boolean): boolean {
  const [prev, setPrev] = useState(value)
  const [cur, setCur] = useState(value)
  if (value !== cur) {
    setPrev(cur)
    setCur(value)
  }
  return prev
}
