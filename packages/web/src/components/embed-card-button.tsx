'use client'

import { useState } from 'react'
import { Code2, Copy, Check } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tabs from '@radix-ui/react-tabs'
import { Button } from '@/components/ui/button'

interface EmbedCardButtonProps {
  username: string
}

export function EmbedCardButton({ username }: EmbedCardButtonProps) {
  const [copied, setCopied] = useState<'md' | 'html' | null>(null)

  const cardUrl = `https://reflog.app/api/v1/card/${username}`
  const profileUrl = `https://reflog.app/u/${username}`
  const markdown = `[![reflog card](${cardUrl})](${profileUrl})`
  const html = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer"><img src="${cardUrl}" alt="reflog card" width="495" height="195" /></a>`

  function handleCopy(type: 'md' | 'html') {
    const text = type === 'md' ? markdown : html
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 1800)
    })
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="sm">
          <Code2 className="h-3.5 w-3.5" />
          Embed card
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-80 rounded-lg border border-border-2 bg-surface-2 p-4 shadow-lg animate-in fade-in-0 zoom-in-95"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-500">
            Embed your reflog card
          </p>
          <p className="mb-3 text-xs text-slate-600">
            Drop this into any README or webpage — the card updates automatically.
          </p>

          <Tabs.Root defaultValue="md">
            <Tabs.List className="mb-3 flex gap-1 rounded-md bg-surface-3 p-0.5">
              <Tabs.Trigger
                value="md"
                className="flex-1 rounded px-2 py-1 text-xs text-slate-500 transition-colors data-[state=active]:bg-surface-2 data-[state=active]:text-slate-200"
              >
                Markdown
              </Tabs.Trigger>
              <Tabs.Trigger
                value="html"
                className="flex-1 rounded px-2 py-1 text-xs text-slate-500 transition-colors data-[state=active]:bg-surface-2 data-[state=active]:text-slate-200"
              >
                HTML
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="md">
              <div className="flex items-center gap-2 rounded-md border border-accent/20 bg-accent/5 px-2.5 py-1.5">
                <span className="flex-1 truncate font-mono text-[11px] text-accent">{markdown}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => handleCopy('md')} title="Copy markdown">
                  {copied === 'md'
                    ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                    : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </Tabs.Content>

            <Tabs.Content value="html">
              <div className="flex items-start gap-2 rounded-md border border-accent/20 bg-accent/5 px-2.5 py-1.5">
                <span className="flex-1 break-all font-mono text-[11px] leading-relaxed text-accent">{html}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => handleCopy('html')} title="Copy HTML" className="mt-0.5 shrink-0">
                  {copied === 'html'
                    ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                    : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
