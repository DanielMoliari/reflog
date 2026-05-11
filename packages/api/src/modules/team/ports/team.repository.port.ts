import type { TeamEntity, TeamMemberEntity, TeamInviteEntity, TeamRole } from '../domain/team.entity'

export interface TeamMemberWithUser extends TeamMemberEntity {
  user: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
    plan: string
  }
}

export interface ITeamRepository {
  create(data: { name: string; slug: string; ownerId: string }): Promise<TeamEntity>
  findById(id: string): Promise<TeamEntity | null>
  findBySlug(slug: string): Promise<TeamEntity | null>
  findByOwner(ownerId: string): Promise<TeamEntity[]>
  findByMember(userId: string): Promise<TeamEntity[]>
  delete(id: string): Promise<void>

  addMember(teamId: string, userId: string, role: TeamRole): Promise<TeamMemberEntity>
  removeMember(teamId: string, userId: string): Promise<void>
  updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<TeamMemberEntity>
  getMembers(teamId: string): Promise<TeamMemberWithUser[]>
  getMembership(teamId: string, userId: string): Promise<TeamMemberEntity | null>

  createInvite(data: { teamId: string; email: string; role: TeamRole; expiresAt: Date }): Promise<TeamInviteEntity>
  findInviteByToken(token: string): Promise<TeamInviteEntity | null>
  findInviteByEmail(teamId: string, email: string): Promise<TeamInviteEntity | null>
  markInviteUsed(token: string): Promise<void>
  getPendingInvites(teamId: string): Promise<TeamInviteEntity[]>
}

export const TEAM_REPOSITORY = 'TEAM_REPOSITORY'
