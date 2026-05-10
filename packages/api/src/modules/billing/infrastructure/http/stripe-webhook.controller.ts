import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { BillingService } from '../../application/services/billing.service'
import { BILLING_PORT, type IBillingPort } from '../../ports/billing.port'

@Controller('stripe')
export class StripeWebhookController {
  constructor(
    @Inject(BILLING_PORT) private readonly billing: IBillingPort,
    private readonly service: BillingService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) throw new BadRequestException('Missing stripe-signature header')
    if (!this.billing.isConfigured()) throw new BadRequestException('Billing not configured')

    const rawBody = req.rawBody
    if (!rawBody) throw new BadRequestException('Raw body not available')

    const event = this.billing.verifyWebhookSignature(rawBody, signature)
    if (!event) throw new BadRequestException('Invalid signature')

    await this.service.handleWebhookEvent(event.type, event.data)
    return { received: true }
  }
}
