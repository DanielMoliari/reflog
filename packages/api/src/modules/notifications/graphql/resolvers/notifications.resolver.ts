import { UseGuards } from '@nestjs/common'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { GqlAuthGuard } from '../../../../common/guards/gql-auth.guard'
import { CurrentUser, type JwtPayload } from '../../../../common/decorators/current-user.decorator'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { UserType } from '../../../identity/graphql/types/user.type'
import { DigestService } from '../../application/services/digest.service'
import { UpdateNotificationPrefsInput } from '../types/update-notification-prefs.input'

@Resolver()
export class NotificationsResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly digestService: DigestService,
  ) {}

  @Mutation(() => UserType, { description: 'Update notification preferences for the authenticated user' })
  @UseGuards(GqlAuthGuard)
  async updateNotificationPrefs(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: UpdateNotificationPrefsInput,
  ): Promise<UserType> {
    const data: { notificationsEnabled?: boolean; streakAlertsEnabled?: boolean } = {}
    if (input.notificationsEnabled !== undefined) data.notificationsEnabled = input.notificationsEnabled
    if (input.streakAlertsEnabled !== undefined) data.streakAlertsEnabled = input.streakAlertsEnabled

    const user = await this.prisma.user.update({
      where: { id: currentUser.sub },
      data,
    })
    return { ...user, username: user.name ?? user.githubId } as unknown as UserType
  }

  @Mutation(() => Boolean, { description: 'Send a test weekly digest email to the authenticated user' })
  @UseGuards(GqlAuthGuard)
  async sendTestDigest(@CurrentUser() currentUser: JwtPayload): Promise<boolean> {
    await this.digestService.generateAndSendDigestForUser(currentUser.sub)
    return true
  }
}
