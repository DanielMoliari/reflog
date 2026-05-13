'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setToken } from '@/lib/auth'
import { LoadingScreen } from '@/components/loading-screen'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const token = params.get('token') ?? urlParams?.get('token') ?? null
    const error = params.get('error') ?? urlParams?.get('error') ?? null
    const intent = params.get('intent') ?? urlParams?.get('intent') ?? null
    if (token) {
      setToken(token)
      if (intent === 'pro') {
        setTimeout(() => window.location.replace('/settings?tab=billing&checkout=pro'), 2500)
      } else {
        setTimeout(() => window.location.replace('/dashboard'), 2500)
      }
    } else {
      router.replace(`/?error=${error ?? 'auth_failed'}`)
    }
  }, [router, params])

  return (
    <LoadingScreen
      message="Connecting your GitHub"
      subMessage="Fetching your repositories and activity…"
    />
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Connecting your GitHub" />}>
      <CallbackInner />
    </Suspense>
  )
}
