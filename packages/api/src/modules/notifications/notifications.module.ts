import { Module } from '@nestjs/common'
import { AnalyticsModule } from '../analytics/analytics.module'
import { ResendAdapter } from './infrastructure/email/resend.adapter'
import { NOTIFICATION_SERVICE } from './ports/notification.port'
import { DigestService } from './application/services/digest.service'

@Module({
  imports: [AnalyticsModule],
  providers: [
    DigestService,
    { provide: NOTIFICATION_SERVICE, useClass: ResendAdapter },
  ],
  exports: [DigestService],
})
export class NotificationsModule {}
