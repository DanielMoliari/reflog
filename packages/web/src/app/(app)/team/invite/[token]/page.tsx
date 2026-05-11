'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@apollo/client/react'
import { Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { ACCEPT_TEAM_INVITE } from '@/graphql/mutations'
import { Button } from '@/components/ui/button'

interface PageProps { params: Promise<{ token: string }> }

export default function AcceptInvitePage({ params }: PageProps) {
  const { token } = use(params)
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [teamName, setTeamName] = useState('')

  const [acceptInvite] = useMutation<{ acceptTeamInvite: { id: string; name: string } }>(ACCEPT_TEAM_INVITE)

  useEffect(() => {
    async function accept() {
      setStatus('loading')
      try {
        const { data } = await acceptInvite({ variables: { token } })
        if (data?.acceptTeamInvite) {
          setTeamName(data.acceptTeamInvite.name)
          setStatus('success')
          setTimeout(() => router.push('/team'), 2500)
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Convite inválido ou expirado.')
        setStatus('error')
      }
    }
    void accept()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-2">
        {status === 'loading' && <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />}
        {status === 'success' && <CheckCircle2 className="h-8 w-8 text-emerald-400" />}
        {status === 'error' && <XCircle className="h-8 w-8 text-red-400" />}
        {status === 'idle' && <Users className="h-8 w-8 text-slate-500" />}
      </div>
      {status === 'loading' && (
        <div>
          <p className="text-lg font-semibold text-slate-200">Entrando no time…</p>
          <p className="mt-1 text-sm text-slate-500">Verificando seu convite</p>
        </div>
      )}
      {status === 'success' && (
        <div>
          <p className="text-lg font-semibold text-emerald-300">Bem-vindo ao {teamName}!</p>
          <p className="mt-1 text-sm text-slate-500">Redirecionando para o dashboard do time…</p>
        </div>
      )}
      {status === 'error' && (
        <div>
          <p className="text-lg font-semibold text-slate-200">Convite inválido</p>
          <p className="mt-1 text-sm text-slate-500">{errorMsg}</p>
          <Button className="mt-4 cursor-pointer" onClick={() => router.push('/team')}>
            Voltar
          </Button>
        </div>
      )}
    </div>
  )
}
