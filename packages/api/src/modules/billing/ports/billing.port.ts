export const BILLING_PORT = Symbol('IBillingPort')

export interface CheckoutSessionInput {
  userId: string
  customerId: string | null
  customerEmail: string | null
  plan: 'PRO' | 'TEAM'
  interval: 'monthly' | 'yearly'
  successUrl: string
  cancelUrl: string
}

export interface StripeSubscriptionData {
  status: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  interval: 'monthly' | 'yearly' | null
}

export interface IBillingPort {
  isConfigured(): boolean
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string; sessionId: string }>
  createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }>
  retrieveSubscription(subscriptionId: string): Promise<StripeSubscriptionData>
  verifyWebhookSignature(rawBody: Buffer, signature: string): { type: string; data: unknown } | null
}
