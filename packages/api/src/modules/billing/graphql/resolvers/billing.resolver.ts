import { ForbiddenException, UseGuards } from '@nestjs/common'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { CurrentUser, type JwtPayload } from '../../../../common/decorators/current-user.decorator'
import { GqlAuthGuard } from '../../../../common/guards/gql-auth.guard'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { UserType } from '../../../identity/graphql/types/user.type'
import { BillingService } from '../../application/services/billing.service'
import {
  BillingStatusType,
  CheckoutSessionType,
  PortalSessionType,
  UpdateAutoSyncPrefsInput,
} from '../types/billing.types'

@Resolver()
export class BillingResolver {
  constructor(
    private readonly billing: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => BillingStatusType, { description: 'Stripe configuration + current subscription state' })
  @UseGuards(GqlAuthGuard)
  async billingStatus(@CurrentUser() currentUser: JwtPayload): Promise<BillingStatusType> {
    const user = await this.prisma.user.findUnique({ where: { id: currentUser.sub } })
    const status = user?.subscriptionStatus ?? null
    return {
      configured: this.billing.isConfigured(),
      hasActiveSubscription: status === 'active' || status === 'trialing',
      ...(status ? { subscriptionStatus: status } : {}),
      ...(user?.currentPeriodEnd ? { currentPeriodEnd: user.currentPeriodEnd } : {}),
      ...(user?.billingInterval ? { billingInterval: user.billingInterval } : {}),
    }
  }

  @Mutation(() => CheckoutSessionType, { description: 'Create a Stripe Checkout session for upgrading' })
  @UseGuards(GqlAuthGuard)
  async createCheckoutSession(
    @CurrentUser() currentUser: JwtPayload,
    @Args('plan') plan: string,
    @Args('interval') interval: string,
  ): Promise<CheckoutSessionType> {
    if (plan !== 'PRO' && plan !== 'TEAM') throw new ForbiddenException('Invalid plan')
    if (interval !== 'monthly' && interval !== 'yearly') throw new ForbiddenException('Invalid interval')
    return this.billing.createCheckoutSession(currentUser.sub, plan, interval)
  }

  @Mutation(() => PortalSessionType, { description: 'Open the Stripe customer portal for self-service billing' })
  @UseGuards(GqlAuthGuard)
  async createPortalSession(@CurrentUser() currentUser: JwtPayload): Promise<PortalSessionType> {
    return this.billing.createPortalSession(currentUser.sub)
  }

  @Mutation(() => UserType, { description: 'Update auto-sync preferences (enabled flag and interval)' })
  @UseGuards(GqlAuthGuard)
  async updateAutoSyncPrefs(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: UpdateAutoSyncPrefsInput,
  ): Promise<UserType> {
    await this.billing.updateAutoSyncPrefs(currentUser.sub, input)
    const user = await this.prisma.user.findUnique({ where: { id: currentUser.sub } })
    return user as unknown as UserType
  }
}
