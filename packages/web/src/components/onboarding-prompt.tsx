'use client'

import { GitBranch, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function OnboardingPrompt() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/8 via-surface to-surface p-8 text-center">
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="relative">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10">
          <GitBranch className="h-7 w-7 text-accent" />
        </div>
        <h2 className="mb-2 text-base font-semibold text-slate-100">Track your first repository</h2>
        <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-slate-500">
          Connect a GitHub repository to start tracking commits, streaks, and pull request metrics.
          reflog will sync your history and surface patterns you can&apos;t see on GitHub.
        </p>
        <Button asChild size="sm" className="gap-2">
          <Link href="/repos">
            <GitBranch className="h-3.5 w-3.5" />
            Add repositories
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
