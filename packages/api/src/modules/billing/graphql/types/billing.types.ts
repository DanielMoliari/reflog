import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class CheckoutSessionType {
  @Field()
  url: string
}

@ObjectType()
export class PortalSessionType {
  @Field()
  url: string
}

@ObjectType()
export class BillingStatusType {
  @Field({ description: 'Whether the Stripe integration has API keys configured in this environment' })
  configured: boolean

  @Field()
  hasActiveSubscription: boolean

  @Field({ nullable: true })
  subscriptionStatus?: string

  @Field({ nullable: true })
  currentPeriodEnd?: Date

  @Field({ nullable: true })
  billingInterval?: string
}

@InputType()
export class UpdateAutoSyncPrefsInput {
  @Field({ nullable: true })
  autoSyncEnabled?: boolean

  @Field(() => Int, { nullable: true })
  autoSyncIntervalHours?: number
}
