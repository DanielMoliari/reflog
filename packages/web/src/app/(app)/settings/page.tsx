'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@apollo/client/react'
import { Save, Bell, GitBranch, Copy, Check, ExternalLink, User, Trash2, Eye } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ME_QUERY, REPOSITORIES_QUERY } from '@/graphql/queries'
import {
  UPDATE_PROFILE,
  UPDATE_NOTIFICATION_PREFS,
  UPDATE_PUBLIC_PROFILE_PREFS,
  DELETE_ACCOUNT,
} from '@/graphql/mutations'
import type { User as UserType } from '@/graphql/types'
import { clearToken } from '@/lib/auth'

type Section = 'profile' | 'connections' | 'notifications' | 'danger'

interface NavItem {
  id: Section
  label: string
  Icon: React.ComponentType<{ className?: string }>
  danger?: boolean
}

interface Repository {
  id: string
  fullName: string
  lastSyncedAt: string | null
}

const NAV_ITEMS: NavItem[] = [
  { id: 'profile', label: 'Profile', Icon: User },
  { id: 'connections', label: 'Connections', Icon: GitBranch },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'danger', label: 'Delete account', Icon: Trash2, danger: true },
]

export default function SettingsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<Section>('profile')

  const { data, loading } = useQuery<{ me: UserType }>(ME_QUERY)
  const { data: reposData } = useQuery<{ repositories: Repository[] }>(REPOSITORIES_QUERY)

  const [updateProfile, { loading: saving }] = useMutation(UPDATE_PROFILE, { refetchQueries: [ME_QUERY] })
  const [updateNotificationPrefs, { loading: savingPrefs }] = useMutation(UPDATE_NOTIFICATION_PREFS, { refetchQueries: [ME_QUERY] })
  const [updatePublicProfilePrefs, { loading: savingVis }] = useMutation(UPDATE_PUBLIC_PROFILE_PREFS, { refetchQueries: [ME_QUERY] })
  const [deleteAccountMutation, { loading: deleting }] = useMutation(DELETE_ACCOUNT)

  const user = data?.me
  const repos = reposData?.repositories ?? []

  const [name, setName] = useState('')
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [streakAlerts, setStreakAlerts] = useState(true)
  const [showStreak, setShowStreak] = useState(true)
  const [showRepos, setShowRepos] = useState(true)
  const [copied, setCopied] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  if (user && name === '') {
    if (user.name) setName(user.name)
  }

  useEffect(() => {
    if (!user) return
    setWeeklyDigest(user.notificationsEnabled)
    setStreakAlerts(user.streakAlertsEnabled)
    setShowStreak(user.publicShowStreak)
    setShowRepos(user.publicShowRepos)
  }, [user])

  function handleSave() {
    void updateProfile({ variables: { input: { name: name || undefined } } })
  }

  function handleToggleWeeklyDigest(next: boolean) {
    setWeeklyDigest(next)
    void updateNotificationPrefs({ variables: { input: { notificationsEnabled: next } } })
  }

  function handleToggleStreakAlerts(next: boolean) {
    setStreakAlerts(next)
    void updateNotificationPrefs({ variables: { input: { streakAlertsEnabled: next } } })
  }

  function handleToggleShowStreak(next: boolean) {
    setShowStreak(next)
    void updatePublicProfilePrefs({ variables: { input: { showStreak: next } } })
  }

  function handleToggleShowRepos(next: boolean) {
    setShowRepos(next)
    void updatePublicProfilePrefs({ variables: { input: { showRepos: next } } })
  }

  async function handleDeleteAccount() {
    await deleteAccountMutation()
    clearToken()
    router.replace('/')
  }

  function handleDisconnect() {
    clearToken()
    window.location.href = '/'
  }

  function handleCopyUrl() {
    if (!user?.username) return
    const url = `${window.location.origin}/u/${user.username}`
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.githubUsername ?? user?.username)?.slice(0, 2).toUpperCase() ?? '?'

  const lastSyncedAt = repos
    .map((r) => r.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .at(-1)

  // ── Section renderers ─────────────────────────────────────────────────────

  function renderProfile() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Profile</h2>
          <p className="mt-0.5 text-xs text-slate-500">Manage how your name appears across reflog.</p>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <Skeleton className="h-14 w-14 rounded-full" />
          ) : (
            <Avatar className="h-14 w-14">
              <AvatarImage src={user?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-base">{initials}</AvatarFallback>
            </Avatar>
          )}
          <div>
            {loading ? (
              <>
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <>
                <p className="font-medium text-slate-100">{user?.name ?? user?.githubUsername}</p>
                {user?.githubUsername && (
                  <p className="text-xs text-slate-500">@{user.githubUsername}</p>
                )}
              </>
            )}
          </div>
          {user?.plan === 'PRO' && <Badge variant="accent" className="ml-auto">Pro</Badge>}
        </div>

        <div className="space-y-4">
          {user?.username && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Public profile URL</label>
              <div className="flex items-center gap-2 rounded-md border border-border-2 bg-surface px-3 py-2 max-w-sm">
                <span className="flex-1 truncate font-mono text-xs text-slate-400">
                  {window.location.origin}/u/{user.username}
                </span>
                <Button variant="ghost" size="icon-sm" onClick={handleCopyUrl}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button asChild variant="ghost" size="icon-sm" title="Open">
                  <a href={`/u/${user.username}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">Your handle comes from GitHub — not editable</p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Display name</label>
            {loading ? <Skeleton className="h-9 w-full" /> : (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || loading} size="sm">
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    )
  }

  function renderConnections() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Connections</h2>
          <p className="mt-0.5 text-xs text-slate-500">Manage connected services and sync preferences.</p>
        </div>

        <div className="rounded-lg border border-border-2 bg-surface p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {loading ? (
                <Skeleton className="h-10 w-10 rounded-full" />
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatarUrl ?? undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              )}
              <div>
                <p className="text-sm font-medium text-slate-200">GitHub</p>
                {loading ? (
                  <Skeleton className="mt-0.5 h-3 w-36" />
                ) : (
                  <p className="text-xs text-slate-500">
                    @{user?.username} · Connected
                    {repos.length > 0 && ` · ${repos.length} ${repos.length === 1 ? 'repository' : 'repositories'}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">Active</Badge>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>Disconnect</Button>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-200">Auto-sync every 6 hours</p>
                <p className="text-[11px] text-slate-600">Keeps your metrics up to date automatically</p>
              </div>
              <Switch disabled checked={true} />
            </div>
          </div>

          {lastSyncedAt && (
            <p className="text-[11px] text-slate-600">
              Last synced{' '}
              {new Date(lastSyncedAt).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
    )
  }

  function renderNotifications() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Notifications</h2>
          <p className="mt-0.5 text-xs text-slate-500">Choose what reflog notifies you about.</p>
        </div>

        <div className="space-y-0 rounded-lg border border-border-2 bg-surface divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs font-medium text-slate-200">Streak at risk</p>
              <p className="text-[11px] text-slate-600">Email when your streak is about to break</p>
            </div>
            <Switch checked={streakAlerts} onCheckedChange={handleToggleStreakAlerts} disabled={loading || savingPrefs} />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs font-medium text-slate-200">Weekly digest</p>
              <p className="text-[11px] text-slate-600">Summary of your week, sent every Monday at 9 AM</p>
            </div>
            <Switch checked={weeklyDigest} onCheckedChange={handleToggleWeeklyDigest} disabled={loading || savingPrefs} />
          </div>
        </div>

        {/* Public profile visibility */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-400">Public profile visibility</span>
          </div>
          <div className="space-y-0 rounded-lg border border-border-2 bg-surface divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs font-medium text-slate-200">Show streak on public profile</p>
                <p className="text-[11px] text-slate-600">Visitors can see your current and longest streak</p>
              </div>
              <Switch checked={showStreak} onCheckedChange={handleToggleShowStreak} disabled={loading || savingVis} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs font-medium text-slate-200">Show repositories on public profile</p>
                <p className="text-[11px] text-slate-600">Visitors can see your tracked repos list</p>
              </div>
              <Switch checked={showRepos} onCheckedChange={handleToggleShowRepos} disabled={loading || savingVis} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderDanger() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-danger">Danger zone</h2>
          <p className="mt-0.5 text-xs text-slate-500">Irreversible actions — proceed with care.</p>
        </div>

        <div className="rounded-lg border border-border-2 bg-surface p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-200">Sign out of reflog</p>
            <p className="text-[11px] text-slate-600 mt-0.5">You can always reconnect your GitHub account.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleDisconnect}>Sign out</Button>
        </div>

        <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-200">Delete account</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Permanently removes your account, all repositories, metrics, and streaks. This cannot be undone.
              </p>
            </div>
            {!deleteConfirm && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(true)}>
                Delete account
              </Button>
            )}
          </div>
          {deleteConfirm && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-3 space-y-3">
              <p className="text-xs text-danger font-medium">Are you absolutely sure? This will delete everything permanently.</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { void handleDeleteAccount() }}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete my account'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const sectionContent: Record<Section, () => React.ReactNode> = {
    profile: renderProfile,
    connections: renderConnections,
    notifications: renderNotifications,
    danger: renderDanger,
  }

  return (
    <div className="max-w-2xl space-y-6">
      <nav className="flex items-center gap-1 border-b border-border pb-0">
        {NAV_ITEMS.map(({ id, label, Icon, danger }) => {
          const isActive = activeSection === id
          return (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={[
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium cursor-pointer transition-colors border-b-2 -mb-px',
                isActive
                  ? danger ? 'border-danger text-danger' : 'border-accent text-accent'
                  : danger ? 'border-transparent text-danger/50 hover:text-danger' : 'border-transparent text-slate-500 hover:text-slate-300',
              ].join(' ')}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          )
        })}
      </nav>
      <div>{sectionContent[activeSection]()}</div>
    </div>
  )
}
