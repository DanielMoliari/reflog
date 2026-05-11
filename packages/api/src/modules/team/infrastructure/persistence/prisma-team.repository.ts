import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { ITeamRepository, TeamMemberWithUser } from '../../ports/team.repository.port'
import type { TeamEntity, TeamMemberEntity, TeamInviteEntity, TeamRole } from '../../domain/team.entity'

@Injectable()
export class PrismaTeamRepository implements ITeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; slug: string; ownerId: string }): Promise<TeamEntity> {
    return this.prisma.team.create({ data }) as Promise<TeamEntity>
  }

  async findById(id: string): Promise<TeamEntity | null> {
    return this.prisma.team.findUnique({ where: { id } }) as Promise<TeamEntity | null>
  }

  async findBySlug(slug: string): Promise<TeamEntity | null> {
    return this.prisma.team.findUnique({ where: { slug } }) as Promise<TeamEntity | null>
  }

  async findByOwner(ownerId: string): Promise<TeamEntity[]> {
    return this.prisma.team.findMany({ where: { ownerId } }) as Promise<TeamEntity[]>
  }

  async findByMember(userId: string): Promise<TeamEntity[]> {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: { team: true },
    })
    return memberships.map((m) => m.team) as TeamEntity[]
  }

  async delete(id: string): Promise<void> {
    await this.prisma.team.delete({ where: { id } })
  }

  async addMember(teamId: string, userId: string, role: TeamRole): Promise<TeamMemberEntity> {
    return this.prisma.teamMember.create({ data: { teamId, userId, role } }) as Promise<TeamMemberEntity>
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await this.prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } })
  }

  async updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<TeamMemberEntity> {
    return this.prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: { role },
    }) as Promise<TeamMemberEntity>
  }

  async getMembers(teamId: string): Promise<TeamMemberWithUser[]> {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true, plan: true },
        },
      },
    })
    return members.map((m) => ({
      id: m.id,
      teamId: m.teamId,
      userId: m.userId,
      role: m.role as TeamRole,
      joinedAt: m.joinedAt,
      user: {
        id: m.user.id,
        name: m.user.name ?? '',
        username: m.user.username ?? '',
        avatarUrl: m.user.avatarUrl,
        plan: m.user.plan,
      },
    }))
  }

  async getMembership(teamId: string, userId: string): Promise<TeamMemberEntity | null> {
    return this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    }) as Promise<TeamMemberEntity | null>
  }

  async createInvite(data: { teamId: string; email: string; role: TeamRole; expiresAt: Date }): Promise<TeamInviteEntity> {
    return this.prisma.teamInvite.create({ data }) as Promise<TeamInviteEntity>
  }

  async findInviteByToken(token: string): Promise<TeamInviteEntity | null> {
    return this.prisma.teamInvite.findUnique({ where: { token } }) as Promise<TeamInviteEntity | null>
  }

  async findInviteByEmail(teamId: string, email: string): Promise<TeamInviteEntity | null> {
    return this.prisma.teamInvite.findUnique({
      where: { teamId_email: { teamId, email } },
    }) as Promise<TeamInviteEntity | null>
  }

  async markInviteUsed(token: string): Promise<void> {
    await this.prisma.teamInvite.update({ where: { token }, data: { usedAt: new Date() } })
  }

  async getPendingInvites(teamId: string): Promise<TeamInviteEntity[]> {
    return this.prisma.teamInvite.findMany({
      where: { teamId, usedAt: null, expiresAt: { gt: new Date() } },
    }) as Promise<TeamInviteEntity[]>
  }
}
