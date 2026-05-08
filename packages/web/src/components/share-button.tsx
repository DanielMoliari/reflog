'use client'

import { useState } from 'react'
import { Share2, Copy, Check, ExternalLink } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/utils'

interface ShareButtonProps {
  username: string
  displayName: string
  totalCommits: number
  currentStreak: number | null
  activeDays: number
}

function buildLinkedInPost(totalCommits: number, currentStreak: number | null, activeDays: number, url: string): string {
  const streakLine = currentStreak && currentStreak > 0
    ? `🔥 ${currentStreak}-day active streak\n`
    : ''
  return `Just hit ${formatNumber(totalCommits)} commits tracked on reflog — my developer pulse in one view.

${streakLine}📅 ${activeDays} active days in the last year
💻 All my GitHub stats, languages, and contribution patterns in one place

If you're a developer who likes tracking your progress like an athlete, check out reflog — Strava for developers.

👉 ${url}`
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#e2e8f0" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.26 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

export function ShareButton({ username, totalCommits, currentStreak, activeDays }: ShareButtonProps) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedPost, setCopiedPost] = useState(false)

  const profileUrl = `https://reflog.app/u/${username}`
  const postText = buildLinkedInPost(totalCommits, currentStreak, activeDays, profileUrl)
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Just hit ${formatNumber(totalCommits)} commits tracked on reflog — my developer pulse in one view.\n\n${currentStreak && currentStreak > 0 ? `🔥 ${currentStreak}-day streak · ` : ''}📅 ${activeDays} active days this year\n\n👉 ${profileUrl}`
  )}`

  function copyLink() {
    void navigator.clipboard.writeText(profileUrl).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 1800)
    })
  }

  function copyPost() {
    void navigator.clipboard.writeText(postText).then(() => {
      setCopiedPost(true)
      setTimeout(() => setCopiedPost(false), 1800)
    })
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-72 rounded-lg border border-border-2 bg-surface-2 p-2 shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          {/* Direct share links */}
          <DropdownMenu.Item asChild>
            <a
              href={linkedInShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-300 outline-none hover:bg-surface-3 hover:text-slate-100"
            >
              <LinkedInIcon />
              <span>Share on LinkedIn</span>
              <ExternalLink className="ml-auto h-3 w-3 text-slate-600" />
            </a>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <a
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-300 outline-none hover:bg-surface-3 hover:text-slate-100"
            >
              <XIcon />
              <span>Share on X / Twitter</span>
              <ExternalLink className="ml-auto h-3 w-3 text-slate-600" />
            </a>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />

          {/* Copy link */}
          <DropdownMenu.Item
            onSelect={(e) => { e.preventDefault(); copyLink() }}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-300 outline-none hover:bg-surface-3 hover:text-slate-100"
          >
            {copiedLink
              ? <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              : <Copy className="h-4 w-4 shrink-0" />}
            <span>{copiedLink ? 'Link copied!' : 'Copy profile link'}</span>
          </DropdownMenu.Item>

          {/* Copy LinkedIn post text */}
          <DropdownMenu.Item
            onSelect={(e) => { e.preventDefault(); copyPost() }}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-300 outline-none hover:bg-surface-3 hover:text-slate-100"
          >
            {copiedPost
              ? <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              : <LinkedInIcon />}
            <div className="min-w-0">
              <span className="block">{copiedPost ? 'Post text copied!' : 'Copy LinkedIn post text'}</span>
              <span className="block text-[11px] text-slate-600">Pre-written post ready to paste</span>
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
