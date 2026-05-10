'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@apollo/client/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar, MobileDrawer } from '@/components/sidebar'
import { NavHeader } from '@/components/nav-header'
import { SyncPanel } from '@/components/sync-panel'
import { UpgradeModal } from '@/components/upgrade-modal'
import { isAuthenticated } from '@/lib/auth'
import { ME_QUERY, REPOSITORIES_QUERY } from '@/graphql/queries'
import type { Repository, User } from '@/graphql/types'
import { useUpgradeModalStore } from '@/store/upgrade-modal-store'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [syncOpen, setSyncOpen] = useState(false)
  const autoOpenedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/')
  }, [router])

  const { data: reposData } = useQuery<{ repositories: Repository[] }>(REPOSITORIES_QUERY)
  const { data: meData } = useQuery<{ me: User }>(ME_QUERY)
  const { open: upgradeOpen, headline: upgradeHeadline, closeModal: closeUpgradeModal } = useUpgradeModalStore()
  const currentPlan = (meData?.me?.plan ?? 'FREE') as 'FREE' | 'PRO' | 'TEAM'

  const isSyncing = (reposData?.repositories ?? []).some((r) => r.isTracked && r.syncState === 'SYNCING')

  // Auto-open the sync panel when background sync is detected (e.g. on first login import)
  useEffect(() => {
    if (isSyncing && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      setSyncOpen(true)
    }
    if (!isSyncing) {
      autoOpenedRef.current = false
    }
  }, [isSyncing])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full overflow-hidden bg-bg">
        <MobileDrawer />
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <NavHeader onSyncOpen={() => setSyncOpen(true)} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
          <SyncPanel open={syncOpen} onClose={() => setSyncOpen(false)} />
          <UpgradeModal
            open={upgradeOpen}
            onOpenChange={(o) => !o && closeUpgradeModal()}
            currentPlan={currentPlan}
            {...(upgradeHeadline ? { headline: upgradeHeadline } : {})}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
