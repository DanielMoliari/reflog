import { UseGuards } from '@nestjs/common'
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql'
import { GqlAuthGuard } from '../../../../common/guards/gql-auth.guard'
import { CurrentUser, type JwtPayload } from '../../../../common/decorators/current-user.decorator'
import { AnalyticsService } from '../../application/services/analytics.service'
import { StreakService } from '../../application/services/streak.service'
import {
  DailyMetricsType,
  HeatmapDayType,
  MetricsRangeInput,
  RepositoryType,
  StreakType,
  SyncResultType,
} from '../types/analytics.types'
import type { DailyMetrics } from '@prisma/client'

@Resolver()
@UseGuards(GqlAuthGuard)
export class AnalyticsResolver {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly streakService: StreakService,
  ) {}

  @Query(() => [RepositoryType], { description: 'List all tracked repositories' })
  async repositories(@CurrentUser() user: JwtPayload): Promise<RepositoryType[]> {
    const repos = await this.analyticsService.getRepositories(user.sub)
    return repos as unknown as RepositoryType[]
  }

  @Query(() => [DailyMetricsType], { description: 'Get daily metrics for a date range' })
  async metrics(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: MetricsRangeInput,
  ): Promise<DailyMetricsType[]> {
    const raw = await this.analyticsService.getDashboardMetrics(user.sub, input.from, input.to)
    // Each tracked repo stores its own row per day — collapse to one row per date so the dashboard
    // sees user-wide totals instead of duplicate points per repo.
    const byDate = new Map<string, DailyMetrics>()
    for (const m of raw) {
      const dateObj = m.date instanceof Date ? m.date : new Date(m.date as unknown as string)
      const key = dateObj.toISOString().slice(0, 10)
      const existing = byDate.get(key)
      if (existing) {
        existing.commits += m.commits
        existing.additions += m.additions
        existing.deletions += m.deletions
        existing.prsOpened += m.prsOpened
        existing.prsMerged += m.prsMerged
        existing.reviewsDone += m.reviewsDone
      } else {
        byDate.set(key, { ...m, date: dateObj })
      }
    }
    return [...byDate.values()].sort((a, b) => a.date.getTime() - b.date.getTime()).map(this.mapMetrics)
  }

  @Query(() => StreakType, { nullable: true, description: 'Get current streak stats' })
  async streak(@CurrentUser() user: JwtPayload): Promise<StreakType | null> {
    const s = await this.streakService.getStreak(user.sub)
    const lastActive = s.lastActiveDate
      ? (s.lastActiveDate instanceof Date ? s.lastActiveDate : new Date(s.lastActiveDate as unknown as string))
      : null
    return {
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
      ...(lastActive ? { lastActiveDate: lastActive } : {}),
    }
  }

  @Query(() => [HeatmapDayType], { description: 'Get contribution heatmap data' })
  async heatmap(
    @CurrentUser() user: JwtPayload,
    @Args('year', { type: () => Int, nullable: true }) year?: number,
  ): Promise<HeatmapDayType[]> {
    const targetYear = year ?? new Date().getFullYear()
    const from = new Date(`${targetYear}-01-01`)
    const to = new Date(`${targetYear}-12-31`)
    const metrics = await this.analyticsService.getDashboardMetrics(user.sub, from, to)

    // Aggregate commits across repos per day so the heatmap shows user-wide activity
    const byDay = new Map<string, number>()
    for (const m of metrics) {
      const dateObj = m.date instanceof Date ? m.date : new Date(m.date as unknown as string)
      const key = dateObj.toISOString().slice(0, 10)
      byDay.set(key, (byDay.get(key) ?? 0) + m.commits)
    }
    return [...byDay.entries()].map(([key, count]) => {
      const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4
      return { date: new Date(key), count, level }
    })
  }

  @Mutation(() => RepositoryType, { description: 'Start tracking a GitHub repository' })
  async trackRepository(
    @CurrentUser() user: JwtPayload,
    @Args('githubRepoId') githubRepoId: string,
  ): Promise<RepositoryType> {
    const repo = await this.analyticsService.trackRepository(user.sub, githubRepoId)
    return repo as unknown as RepositoryType
  }

  @Mutation(() => Boolean, { description: 'Re-import all GitHub repositories for the current user' })
  async importGitHubRepositories(@CurrentUser() user: JwtPayload): Promise<boolean> {
    await this.analyticsService.importFromGitHub(user.sub)
    return true
  }

  @Mutation(() => Boolean, { description: 'Stop tracking a repository' })
  async untrackRepository(
    @CurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.analyticsService.untrackRepository(user.sub, id)
  }

  @Mutation(() => SyncResultType, { description: 'Trigger an on-demand repository sync' })
  async syncRepository(
    @CurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<SyncResultType> {
    return this.analyticsService.triggerSync(user.sub, id)
  }

  private mapMetrics(m: DailyMetrics): DailyMetricsType {
    const total = m.additions + m.deletions
    const base = {
      id: m.id,
      // Prisma 7 + pg driver returns @db.Date columns as ISO strings — coerce to Date so the GraphQL DateTime scalar can serialize
      date: m.date instanceof Date ? m.date : new Date(m.date as unknown as string),
      commits: m.commits,
      additions: m.additions,
      deletions: m.deletions,
      prsOpened: m.prsOpened,
      prsMerged: m.prsMerged,
      reviewsDone: m.reviewsDone,
      netLines: m.additions - m.deletions,
    }
    return total > 0 ? { ...base, churnRatio: m.deletions / total } : base
  }
}
