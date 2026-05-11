import { UseGuards } from '@nestjs/common'
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql'
import { GqlAuthGuard } from '../../../../common/guards/gql-auth.guard'
import { CurrentUser, type JwtPayload } from '../../../../common/decorators/current-user.decorator'
import { TeamService } from '../../application/services/team.service'
import {
  TeamType,
  TeamMemberType,
  TeamInviteType,
  CreateTeamInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
} from '../types/team.types'
import type { TeamRole } from '../../domain/team.entity'

@Resolver()
@UseGuards(GqlAuthGuard)
export class TeamResolver {
  constructor(private readonly teamService: TeamService) {}

  @Query(() => [TeamType])
  async myTeams(@CurrentUser() user: JwtPayload): Promise<TeamType[]> {
    return this.teamService.getMyTeams(user.sub) as unknown as TeamType[]
  }

  @Query(() => TeamType)
  async team(
    @CurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TeamType> {
    return this.teamService.getTeam(id, user.sub) as unknown as TeamType
  }

  @Query(() => [TeamMemberType])
  async teamMembers(
    @CurrentUser() user: JwtPayload,
    @Args('teamId', { type: () => ID }) teamId: string,
  ): Promise<TeamMemberType[]> {
    return this.teamService.getMembers(teamId, user.sub) as unknown as TeamMemberType[]
  }

  @Query(() => [TeamInviteType])
  async teamInvites(
    @CurrentUser() user: JwtPayload,
    @Args('teamId', { type: () => ID }) teamId: string,
  ): Promise<TeamInviteType[]> {
    return this.teamService.getPendingInvites(teamId, user.sub) as unknown as TeamInviteType[]
  }

  @Mutation(() => TeamType)
  async createTeam(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: CreateTeamInput,
  ): Promise<TeamType> {
    return this.teamService.createTeam(user.sub, input.name) as unknown as TeamType
  }

  @Mutation(() => TeamInviteType)
  async inviteToTeam(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: InviteMemberInput,
  ): Promise<TeamInviteType> {
    return this.teamService.inviteMember(
      input.teamId,
      user.sub,
      input.email,
      input.role as unknown as TeamRole,
    ) as unknown as TeamInviteType
  }

  @Mutation(() => TeamType, { nullable: true })
  async acceptTeamInvite(
    @CurrentUser() user: JwtPayload,
    @Args('token') token: string,
  ): Promise<TeamType | null> {
    return this.teamService.acceptInvite(token, user.sub) as unknown as TeamType | null
  }

  @Mutation(() => Boolean)
  async removeTeamMember(
    @CurrentUser() user: JwtPayload,
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<boolean> {
    await this.teamService.removeMember(teamId, user.sub, userId)
    return true
  }

  @Mutation(() => TeamMemberType)
  async updateTeamMemberRole(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: UpdateMemberRoleInput,
  ): Promise<TeamMemberType> {
    return this.teamService.updateMemberRole(
      input.teamId,
      user.sub,
      input.userId,
      input.role as unknown as TeamRole,
    ) as unknown as TeamMemberType
  }

  @Mutation(() => Boolean)
  async deleteTeam(
    @CurrentUser() user: JwtPayload,
    @Args('teamId', { type: () => ID }) teamId: string,
  ): Promise<boolean> {
    await this.teamService.deleteTeam(teamId, user.sub)
    return true
  }
}
