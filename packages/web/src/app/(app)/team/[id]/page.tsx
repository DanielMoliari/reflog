'use client'

import { use, useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { Users, Crown, Shield, UserCheck, Plus, Mail, X } from 'lucide-react'
import { TEAM_MEMBERS_QUERY, TEAM_INVITES_QUERY, ME_QUERY } from '@/graphql/queries'
import { INVITE_TO_TEAM, REMOVE_TEAM_MEMBER, UPDATE_TEAM_MEMBER_ROLE } from '@/graphql/mutations'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { TeamMember, TeamInvite, User, TeamRole } from '@/graphql/types'

interface PageProps { params: Promise<{ id: string }> }

const ROLE_ICONS: Record<TeamRole, React.ReactNode> = {
  ADMIN: <Crown className="h-3.5 w-3.5 text-yellow-400" />,
  MANAGER: <Shield className="h-3.5 w-3.5 text-blue-400" />,
  MEMBER: <UserCheck className="h-3.5 w-3.5 text-slate-500" />,
}

const ROLE_LABELS: Record<TeamRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  MEMBER: 'Member',
}

export default function TeamDetailPage({ params }: PageProps) {
  const { id: teamId } = use(params)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('MEMBER')
  const [inviteError, setInviteError] = useState<string | null>(null)

  const { data: meData } = useQuery<{ me: User }>(ME_QUERY)
  const { data: membersData, loading, refetch } = useQuery<{ teamMembers: TeamMember[] }>(
    TEAM_MEMBERS_QUERY, { variables: { teamId } }
  )
  const { data: invitesData, refetch: refetchInvites } = useQuery<{ teamInvites: TeamInvite[] }>(
    TEAM_INVITES_QUERY, { variables: { teamId } }
  )

  const [inviteToTeam, { loading: inviting }] = useMutation(INVITE_TO_TEAM, {
    onCompleted: () => { void refetchInvites(); setShowInvite(false); setInviteEmail('') },
    onError: (e) => setInviteError(e.message),
  })
  const [removeMember] = useMutation(REMOVE_TEAM_MEMBER, {
    onCompleted: () => void refetch(),
  })
  const [updateRole] = useMutation(UPDATE_TEAM_MEMBER_ROLE, {
    onCompleted: () => void refetch(),
  })

  // updateRole is declared for future use; suppress lint with void reference
  void updateRole

  const members = membersData?.teamMembers ?? []
  const invites = invitesData?.teamInvites ?? []
  const myId = meData?.me?.id
  const myMembership = members.find((m) => m.userId === myId)
  const isAdmin = myMembership?.role === 'ADMIN'
  const isAdminOrManager = isAdmin || myMembership?.role === 'MANAGER'

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviteError(null)
    await inviteToTeam({ variables: { input: { teamId, email: inviteEmail.trim(), role: inviteRole } } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Team</p>
          <h1 className="text-3xl font-black text-slate-100 flex items-center gap-3">
            <Users className="h-7 w-7 text-slate-500" />
            Team Dashboard
          </h1>
        </div>
        {isAdminOrManager && (
          <Button size="sm" onClick={() => setShowInvite(!showInvite)} className="cursor-pointer">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Convidar
          </Button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Convidar membro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@empresa.com"
                type="email"
                className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-accent/50 focus:outline-none"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                className="cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-slate-200 focus:outline-none"
              >
                <option value="MEMBER">Member</option>
                <option value="MANAGER">Manager</option>
                {isAdmin && <option value="ADMIN">Admin</option>}
              </select>
            </div>
            {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handleInvite()}
                disabled={inviting || !inviteEmail.trim()}
                className="cursor-pointer"
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                {inviting ? 'Enviando…' : 'Enviar convite'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowInvite(false)} className="cursor-pointer">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle>Membros ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Nenhum membro ainda.</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-2 transition-colors">
                  <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden border border-border bg-surface-2 flex items-center justify-center">
                    {member.user?.avatarUrl ? (
                      <img src={member.user.avatarUrl} alt={member.user.name ?? 'Avatar'} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-500">
                        {(member.user?.name ?? 'U').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{member.user?.name ?? 'Unknown'}</p>
                    {member.user?.username && (
                      <p className="text-xs text-slate-500">@{member.user.username}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-surface-2 border border-border px-2 py-0.5">
                    {ROLE_ICONS[member.role]}
                    <span className="text-[10px] font-semibold text-slate-400">{ROLE_LABELS[member.role]}</span>
                  </div>
                  {isAdmin && member.userId !== myId && (
                    <button
                      onClick={() => void removeMember({ variables: { teamId, userId: member.userId } })}
                      className="cursor-pointer rounded-md p-1 text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Remover membro"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invites */}
      {isAdminOrManager && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Convites pendentes ({invites.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-slate-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{invite.email}</p>
                    <p className="text-xs text-slate-600">
                      {ROLE_LABELS[invite.role]} · Expira em {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coming Soon: Analytics */}
      <div className="rounded-xl border border-border bg-surface-2/50 p-6 text-center">
        <p className="text-sm font-semibold text-slate-400">Analytics de time em breve</p>
        <p className="mt-1 text-xs text-slate-600">
          Velocity charts, leaderboard, burnout detector e relatórios — chegando no lançamento do Team Plan.
        </p>
      </div>
    </div>
  )
}
