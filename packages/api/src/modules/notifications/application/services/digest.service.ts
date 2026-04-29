import { Inject, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { AnalyticsService } from '../../../analytics/application/services/analytics.service'
import { NOTIFICATION_SERVICE, type INotificationService } from '../../ports/notification.port'

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
    @Inject(NOTIFICATION_SERVICE) private readonly notificationService: INotificationService,
  ) {}

  async generateAndSendDigestForUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user?.email) {
      this.logger.debug(`Skipping digest for ${userId} — no email`)
      return
    }

    const weekStart = this.getMondayOf(new Date())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const existing = await this.prisma.weeklyDigest.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    })
    if (existing?.sentAt) {
      this.logger.debug(`Digest already sent for ${userId} week ${weekStart.toISOString()}`)
      return
    }

    const metrics = await this.analyticsService.getDashboardMetrics(userId, weekStart, weekEnd)
    const repos = await this.analyticsService.getRepositories(userId)

    const repoCommitMap = new Map<string, number>()
    for (const m of metrics) {
      if (m.repoId) {
        repoCommitMap.set(m.repoId, (repoCommitMap.get(m.repoId) ?? 0) + m.commits)
      }
    }
    const topRepoId = [...repoCommitMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const topRepo = repos.find((r) => r.id === topRepoId)

    const summary = {
      totalCommits: metrics.reduce((s, m) => s + m.commits, 0),
      totalAdditions: metrics.reduce((s, m) => s + m.additions, 0),
      totalDeletions: metrics.reduce((s, m) => s + m.deletions, 0),
      totalPrsOpened: metrics.reduce((s, m) => s + m.prsOpened, 0),
      totalPrsMerged: metrics.reduce((s, m) => s + m.prsMerged, 0),
      totalReviewsDone: metrics.reduce((s, m) => s + m.reviewsDone, 0),
      activeDays: new Set(metrics.filter((m) => m.commits > 0).map((m) => m.date.toISOString().slice(0, 10))).size,
      topRepository: topRepo?.fullName ?? null,
      streakChange: 0,
    }

    await this.prisma.weeklyDigest.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, summary },
      update: { summary },
    })

    await this.notificationService.sendWeeklyDigest(userId, user.email, weekStart, summary)

    await this.prisma.weeklyDigest.update({
      where: { userId_weekStart: { userId, weekStart } },
      data: { sentAt: new Date() },
    })

    this.logger.log(`Digest sent to ${user.email}`)
  }

  private getMondayOf(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
  }
}
