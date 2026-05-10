import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingService } from './application/services/billing.service'
import { BillingResolver } from './graphql/resolvers/billing.resolver'
import { StripeWebhookController } from './infrastructure/http/stripe-webhook.controller'
import { StripeAdapter } from './infrastructure/stripe.adapter'
import { BILLING_PORT } from './ports/billing.port'

@Module({
  imports: [ConfigModule],
  controllers: [StripeWebhookController],
  providers: [
    BillingService,
    BillingResolver,
    { provide: BILLING_PORT, useClass: StripeAdapter },
  ],
  exports: [BillingService],
})
export class BillingModule {}
