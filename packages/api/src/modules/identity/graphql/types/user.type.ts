import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql'
import { Plan } from '@prisma/client'

registerEnumType(Plan, { name: 'Plan', description: 'User subscription plan' })

@ObjectType()
export class UserType {
  @Field(() => ID)
  id: string

  @Field({ nullable: true })
  name?: string

  @Field({ nullable: true, description: 'GitHub-style display handle — falls back to name or githubId' })
  username?: string

  @Field({ nullable: true })
  email?: string

  @Field({ nullable: true })
  avatarUrl?: string

  @Field(() => Plan)
  plan: Plan

  @Field()
  githubId: string

  @Field({ nullable: true, description: 'GitHub login handle, e.g. "DanielMoliari"' })
  githubUsername?: string

  @Field({ defaultValue: true })
  notificationsEnabled: boolean

  @Field({ defaultValue: true })
  streakAlertsEnabled: boolean

  @Field({ defaultValue: true, description: 'Include the tracked repositories list on the public profile' })
  publicShowRepos: boolean

  @Field({ defaultValue: true, description: 'Include current/longest streak on the public profile' })
  publicShowStreak: boolean

  @Field({ defaultValue: true, description: 'When false, the 6h cron skips this user' })
  autoSyncEnabled: boolean

  @Field(() => Int, { defaultValue: 6, description: 'Auto-sync interval in hours: 1, 6, or 24' })
  autoSyncIntervalHours: number

  @Field({ nullable: true, description: 'Stripe subscription status: active | trialing | past_due | canceled | etc.' })
  subscriptionStatus?: string

  @Field({ nullable: true, description: 'Date the current billing period ends (renews or cancels)' })
  currentPeriodEnd?: Date

  @Field({ nullable: true, description: 'monthly | yearly' })
  billingInterval?: string

  @Field()
  createdAt: Date
}
