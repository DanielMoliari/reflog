export type TeamRole = 'ADMIN' | 'MANAGER' | 'MEMBER'

export interface TeamEntity {
  id: string
  name: string
  slug: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export interface TeamMemberEntity {
  id: string
  teamId: string
  userId: string
  role: TeamRole
  joinedAt: Date
}

export interface TeamInviteEntity {
  id: string
  teamId: string
  email: string
  role: TeamRole
  token: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}
