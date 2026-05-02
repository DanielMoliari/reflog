import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { RedisService } from '../../../../infrastructure/cache/redis.service'
import { StreakService } from '../../../analytics/application/services/streak.service'
import { NOTIFICATION_SERVICE, type INotificationService } from '../../ports/notification.port'

@Injectable()
export class StreakAlertService {
  private readonly logger = new Logger(StreakAlertService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly streakService: StreakService,
    @Inject(NOTIFICATION_SERVICE) private readonly notificationService: INotificationService,
  ) {}

  @Cron('0 20 * * *', { name: 'streak-alerts', timeZone: 'UTC' })
  async runStreakAlerts(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { email: { not: null }, streakAlertsEnabled: true },
      select: { id: true, email: true },
    })

    this.logger.log(`Streak alert run starting — ${users.length} eligible users`)

    let sent = 0
    let skipped = 0
    let failed = 0

    const today = this.todayUtcKey()

    for (const user of users) {
      try {
        if (!user.email) {
          skipped++
          continue
        }

        const dedupeKey = `streak-alert-sent:${user.id}:${today}`
        const already = await this.redis.client.get(dedupeKey)
        if (already) {
          skipped++
          continue
        }

        const streak = await this.streakService.getStreak(user.id)
        if (streak.currentStreak <= 0 || !streak.lastActiveDate) {
          skipped++
          continue
        }

        if (!this.isAtRisk(streak.lastActiveDate)) {
          skipped++
          continue
        }

        await this.notificationService.sendStreakAlert(user.id, user.email, streak.currentStreak)
        await this.redis.client.setex(dedupeKey, 60 * 60 * 24, '1')
        sent++
      } catch (err: unknown) {
        failed++
        const msg = err instanceof Error ? err.message : String(err)
        this.logger.error(`Streak alert failed for ${user.id}: ${msg}`)
      }
    }

    this.logger.log(`Streak alert run complete — sent=${sent} skipped=${skipped} failed=${failed}`)
  }

  // "At risk" = the user has an active streak but hasn't done anything yet today (UTC).
  // If they don't commit before midnight UTC, the streak breaks.
  private isAtRisk(lastActiveDate: Date): boolean {
    const last = new Date(lastActiveDate)
    const lastKey = this.dateKey(last)
    return lastKey < this.todayUtcKey()
  }

  private todayUtcKey(): string {
    return this.dateKey(new Date())
  }

  private dateKey(d: Date): string {
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}
