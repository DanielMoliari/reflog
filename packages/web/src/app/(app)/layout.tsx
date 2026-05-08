'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar, MobileDrawer } from '@/components/sidebar'
import { NavHeader } from '@/components/nav-header'
import { SyncPanel } from '@/components/sync-panel'
import { isAuthenticated } from '@/lib/auth'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [syncOpen, setSyncOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/')
  }, [router])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full overflow-hidden bg-bg">
        <MobileDrawer />
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <NavHeader onSyncOpen={() => setSyncOpen(true)} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
          <SyncPanel open={syncOpen} onClose={() => setSyncOpen(false)} />
        </div>
      </div>
    </TooltipProvider>
  )
}
