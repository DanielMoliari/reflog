import { forwardRef, Module } from '@nestjs/common'
import { AnalyticsModule } from '../analytics/analytics.module'
import { ResendAdapter } from './infrastructure/email/resend.adapter'
import { NOTIFICATION_SERVICE } from './ports/notification.port'
import { DigestService } from './application/services/digest.service'
import { DigestCronService } from './application/jobs/digest-cron.service'
import { StreakAlertService } from './application/jobs/streak-alert.service'
import { WelcomeEmailService } from './application/services/welcome-email.service'
import { NotificationsResolver } from './graphql/resolvers/notifications.resolver'

@Module({
  imports: [forwardRef(() => AnalyticsModule)],
  providers: [
    DigestService,
    DigestCronService,
    StreakAlertService,
    WelcomeEmailService,
    NotificationsResolver,
    { provide: NOTIFICATION_SERVICE, useClass: ResendAdapter },
  ],
  exports: [DigestService, WelcomeEmailService],
})
export class NotificationsModule {}
