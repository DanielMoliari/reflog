import { Inject, Injectable, Logger } from '@nestjs/common'
import { NOTIFICATION_SERVICE, type INotificationService } from '../../ports/notification.port'

interface UserLike {
  id: string
  email: string | null
  name: string | null
  createdAt: Date
}

@Injectable()
export class WelcomeEmailService {
  private readonly logger = new Logger(WelcomeEmailService.name)

  constructor(
    @Inject(NOTIFICATION_SERVICE) private readonly notifier: INotificationService,
  ) {}

  async maybeSendWelcome(user: UserLike): Promise<void> {
    if (!user.email) return
    const ageMs = Date.now() - new Date(user.createdAt).getTime()
    if (ageMs > 120_000) return // only fire for accounts created in the last 2 minutes
    const displayName = user.name ?? user.email.split('@')[0] ?? user.email
    this.logger.log(`New user detected (${user.id}), queuing welcome email`)
    await this.notifier.sendWelcomeEmail(user.id, user.email, displayName)
  }
}
