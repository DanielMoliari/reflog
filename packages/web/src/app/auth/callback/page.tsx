'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { markAuthenticated } from '@/lib/auth'
import { LoadingScreen } from '@/components/loading-screen'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const error = params.get('error')
    const intent = params.get('intent')
    if (error) {
      router.replace(`/?error=${error}`)
      return
    }
    // JWT is now in httpOnly cookie set by the API — no token in URL.
    // Mark session as authenticated so client-side guards work.
    markAuthenticated()
    if (intent === 'pro') {
      setTimeout(() => window.location.replace('/settings?tab=billing&checkout=pro'), 2500)
    } else {
      setTimeout(() => window.location.replace('/dashboard'), 2500)
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
