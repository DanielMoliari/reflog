import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { DigestService } from '../services/digest.service'

@Injectable()
export class DigestCronService {
  private readonly logger = new Logger(DigestCronService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly digestService: DigestService,
  ) {}

  @Cron('0 9 * * MON', { name: 'weekly-digest', timeZone: 'UTC' })
  async runWeeklyDigest(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { email: { not: null }, notificationsEnabled: true },
      select: { id: true, email: true },
    })

    this.logger.log(`Weekly digest run starting — ${users.length} eligible users`)

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const user of users) {
      try {
        if (!user.email) {
          skipped++
          continue
        }
        await this.digestService.generateAndSendDigestForUser(user.id)
        sent++
      } catch (err: unknown) {
        failed++
        const msg = err instanceof Error ? err.message : String(err)
        this.logger.error(`Digest failed for ${user.id}: ${msg}`)
      }
    }

    this.logger.log(`Weekly digest run complete — sent=${sent} skipped=${skipped} failed=${failed}`)
  }
}
