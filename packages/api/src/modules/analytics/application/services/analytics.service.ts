import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import type { DailyMetrics, Repository } from '@prisma/client'
import { QUEUE_SYNC_REPOSITORY } from '../../../../infrastructure/queue/queue.module'
import { RedisService } from '../../../../infrastructure/cache/redis.service'
import { IdentityService } from '../../../identity/application/services/identity.service'
import { GITHUB_PORT, type IGitHubPort } from '../../ports/github.port'
import { METRICS_REPOSITORY, type IMetricsRepository } from '../../ports/metrics.repository.port'

export interface SyncJobData {
  userId: string
  repositoryId: string
  fullName: string
}

const DASHBOARD_CACHE_TTL = 300 // 5 minutes

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name)

  constructor(
    @Inject(GITHUB_PORT) private readonly github: IGitHubPort,
    @Inject(METRICS_REPOSITORY) private readonly metricsRepo: IMetricsRepository,
    private readonly identityService: IdentityService,
    private readonly redis: RedisService,
    @InjectQueue(QUEUE_SYNC_REPOSITORY) private readonly syncQueue: Queue,
  ) {}

  async getRepositories(userId: string): Promise<Repository[]> {
    const existing = await this.metricsRepo.findRepositoriesByUser(userId)
    if (existing.length > 0) return existing
    // First call after OAuth — populate from GitHub so the user sees their data
    await this.importFromGitHub(userId)
    return this.metricsRepo.findRepositoriesByUser(userId)
  }

  // Pull every repo the user owns, track them all, and queue sync jobs.
  // GitHub is a record of years of work — language stats and "all-time" metrics
  // are only meaningful when every repo contributes. BullMQ runs jobs in parallel
  // and the user just sees a "syncing" indicator while it backfills.
  async importFromGitHub(userId: string): Promise<{ imported: number; tracked: number }> {
    const accessToken = await this.identityService.getDecryptedToken(userId)
    const ghRepos = await this.github.getUserRepositories(accessToken)

    let imported = 0
    for (const ghRepo of ghRepos) {
      const repo = await this.metricsRepo.upsertRepository({
        userId,
        githubRepoId: String(ghRepo.id),
        fullName: ghRepo.fullName,
        language: ghRepo.language,
        isTracked: true,
      })
      await this.enqueueSyncJob(userId, repo.id, repo.fullName)
      imported++
    }

    this.logger.log(`Initial import for ${userId}: ${imported} repos imported and queued for sync`)
    return { imported, tracked: imported }
  }

  async trackRepository(userId: string, githubRepoId: string): Promise<Repository> {
    const accessToken = await this.identityService.getDecryptedToken(userId)
    const repos = await this.github.getUserRepositories(accessToken)
    const target = repos.find((r) => String(r.id) === githubRepoId)
    if (!target) throw new NotFoundException(`Repository ${githubRepoId} not found on GitHub`)

    const repo = await this.metricsRepo.upsertRepository({
      userId,
      githubRepoId,
      fullName: target.fullName,
      language: target.language,
    })

    await this.enqueueSyncJob(userId, repo.id, repo.fullName)
    return repo
  }

  async untrackRepository(userId: string, repoId: string): Promise<boolean> {
    const repo = await this.metricsRepo.findRepositoryById(repoId)
    if (!repo) throw new NotFoundException('Repository not found')
    if (repo.userId !== userId) throw new ForbiddenException('Not your repository')
    await this.metricsRepo.setRepositoryTracked(repoId, false)
    return true
  }

  async triggerSync(userId: string, repoId: string): Promise<{ repositoryId: string; queued: boolean }> {
    const repo = await this.metricsRepo.findRepositoryById(repoId)
    if (!repo) throw new NotFoundException('Repository not found')
    if (repo.userId !== userId) throw new ForbiddenException('Not your repository')
    await this.enqueueSyncJob(userId, repo.id, repo.fullName)
    return { repositoryId: repo.id, queued: true }
  }

  // Detail page fetches GitHub on demand and caches for 10 minutes — most metadata changes slowly
  async getRepositoryDetail(userId: string, repoId: string) {
    const repo = await this.metricsRepo.findRepositoryById(repoId)
    if (!repo) throw new NotFoundException('Repository not found')
    if (repo.userId !== userId) throw new ForbiddenException('Not your repository')

    const cacheKey = `analytics:repo-insight:${repo.id}`
    const insight = await this.redis.getOrSet(
      cacheKey,
      async () => {
        const accessToken = await this.identityService.getDecryptedToken(userId)
        const [owner, name] = repo.fullName.split('/') as [string, string]
        return this.github.getRepositoryInsights(accessToken, owner, name)
      },
      600,
    )

    // All-time slice — backfill window is bounded by the repo's createdAt on GitHub anyway,
    // so "since createdAt" gives us every metric we ever stored for this repo.
    const metrics = await this.metricsRepo.getDailyMetrics(
      userId,
      new Date(insight.createdAt),
      new Date(),
      repo.id,
    )

    return { repo, insight, metrics }
  }

  async getDashboardMetrics(userId: string, from: Date, to: Date): Promise<DailyMetrics[]> {
    const cacheKey = `analytics:dashboard:${userId}:${from.toISOString().slice(0, 10)}:${to.toISOString().slice(0, 10)}`
    return this.redis.getOrSet(
      cacheKey,
      () => this.metricsRepo.getDailyMetrics(userId, from, to),
      DASHBOARD_CACHE_TTL,
    )
  }

  async getRepositoryMetrics(userId: string, repoId: string, from: Date, to: Date): Promise<DailyMetrics[]> {
    return this.metricsRepo.getDailyMetrics(userId, from, to, repoId)
  }

  async invalidateDashboardCache(userId: string): Promise<void> {
    await this.redis.delPattern(`analytics:dashboard:${userId}:*`)
  }

  private async enqueueSyncJob(userId: string, repositoryId: string, fullName: string): Promise<void> {
    const jobData: SyncJobData = { userId, repositoryId, fullName }
    await this.syncQueue.add('sync', jobData, {
      jobId: `sync-${repositoryId}`,
      removeOnComplete: true,
    })
    this.logger.log(`Sync job queued for ${fullName}`)
  }
}
