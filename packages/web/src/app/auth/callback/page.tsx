'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setToken } from '@/lib/auth'
import { BrandLogo } from '@/components/brand-logo'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const token = params.get('token') ?? urlParams?.get('token') ?? null
    const error = params.get('error') ?? urlParams?.get('error') ?? null
    if (token) {
      setToken(token)
      window.location.replace('/dashboard')
    } else {
      router.replace(`/?error=${error ?? 'auth_failed'}`)
    }
  }, [router, params])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
      <BrandLogo href={null} />
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <p className="text-sm text-slate-500">Completing authentication…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  )
}
