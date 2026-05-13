import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import StripeCtor = require('stripe')
import type { CheckoutSessionInput, IBillingPort, StripeSubscriptionData } from '../ports/billing.port'

// `import = require(...)` works for `export =` modules without esModuleInterop.
// StripeCtor is both the constructor and a namespace exposing the Stripe type.
type StripeClient = StripeCtor.Stripe

@Injectable()
export class StripeAdapter implements IBillingPort {
  private readonly logger = new Logger(StripeAdapter.name)
  private _client: StripeClient | null = null

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('STRIPE_SECRET_KEY'))
  }

  // Lazy init — Stripe only matters when we actually need it.
  // Lets the API boot without STRIPE_SECRET_KEY in dev/staging.
  private get client(): StripeClient {
    if (this._client) return this._client
    const key = this.config.get<string>('STRIPE_SECRET_KEY')
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY not set — billing is not configured in this environment')
    }
    this._client = new StripeCtor(key, { apiVersion: '2026-04-22.dahlia' })
    return this._client
  }

  private resolvePriceId(plan: 'PRO' | 'TEAM', interval: 'monthly' | 'yearly'): string {
    const key = `STRIPE_${plan}_${interval.toUpperCase()}_PRICE_ID`
    const id = this.config.get<string>(key)
    if (!id) throw new Error(`Stripe price ID not configured: ${key}`)
    return id
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string; sessionId: string }> {
    const session = await this.client.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: this.resolvePriceId(input.plan, input.interval), quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      ...(input.customerId ? { customer: input.customerId } : {}),
      ...(input.customerEmail && !input.customerId ? { customer_email: input.customerEmail } : {}),
      client_reference_id: input.userId,
      metadata: { userId: input.userId, plan: input.plan, interval: input.interval },
      subscription_data: { metadata: { userId: input.userId, plan: input.plan } },
    })
    if (!session.url) throw new Error('Stripe did not return a checkout URL')
    return { url: session.url, sessionId: session.id }
  }

  async retrieveSubscription(subscriptionId: string): Promise<StripeSubscriptionData> {
    const sub = await this.client.subscriptions.retrieve(subscriptionId)
    const interval = sub.items.data[0]?.price?.recurring?.interval
    return {
      status: sub.status,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      interval: interval === 'year' ? 'yearly' : interval === 'month' ? 'monthly' : null,
    }
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    const session = await this.client.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return { url: session.url }
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): { type: string; data: unknown } | null {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')
    if (!secret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET not set — cannot verify webhook')
      return null
    }
    try {
      const event = this.client.webhooks.constructEvent(rawBody, signature, secret)
      return { type: event.type, data: event.data.object }
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err)
      return null
    }
  }
}
