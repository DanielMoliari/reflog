import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { Octokit } from '@octokit/rest'
import { throttling } from '@octokit/plugin-throttling'
import { retry } from '@octokit/plugin-retry'
import type {
  CommitActivityDto,
  GitHubRepoDto,
  IGitHubPort,
  PullRequestDto,
  RepoInsightDto,
  ReviewDto,
} from '../../ports/github.port'

const ThrottledOctokit = Octokit.plugin(throttling, retry)

@Injectable()
export class GitHubApiAdapter implements IGitHubPort {
  private readonly logger = new Logger(GitHubApiAdapter.name)

  private buildClient(accessToken: string): InstanceType<typeof ThrottledOctokit> {
    return new ThrottledOctokit({
      auth: accessToken,
      throttle: {
        onRateLimit: (retryAfter: number, options: Record<string, unknown>, _octokit: unknown, retryCount: number) => {
          this.logger.warn(`Rate limit hit, retryAfter=${retryAfter}s, attempt=${retryCount}`)
          return retryCount < 2
        },
        onSecondaryRateLimit: (_retryAfter: number, options: Record<string, unknown>) => {
          this.logger.warn(`Secondary rate limit for ${String(options['method'])} ${String(options['url'])}`)
          return false
        },
      },
      retry: { doNotRetry: ['429'] },
    })
  }

  async getUserRepositories(accessToken: string): Promise<GitHubRepoDto[]> {
    const octokit = this.buildClient(accessToken)
    const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      visibility: 'all',
      affiliation: 'owner',
      per_page: 100,
      sort: 'pushed',
    })
    return repos.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      language: r.language ?? null,
      private: r.private,
    }))
  }

  async getRepositoryInsights(accessToken: string, owner: string, repo: string): Promise<RepoInsightDto> {
    const octokit = this.buildClient(accessToken)
    // /repos/{owner}/{repo} returns metadata, /languages returns byte counts per language
    const [meta, langs] = await Promise.all([
      octokit.repos.get({ owner, repo }),
      octokit.repos.listLanguages({ owner, repo }),
    ])
    const r = meta.data
    return {
      description: r.description ?? null,
      homepage: r.homepage ?? null,
      defaultBranch: r.default_branch,
      stars: r.stargazers_count,
      forks: r.forks_count,
      watchers: r.subscribers_count ?? r.watchers_count,
      openIssues: r.open_issues_count,
      sizeKb: r.size,
      createdAt: new Date(r.created_at),
      pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
      topics: r.topics ?? [],
      license: r.license?.spdx_id ?? r.license?.name ?? null,
      languages: langs.data as Record<string, number>,
    }
  }

  async getCommitActivity(
    accessToken: string,
    owner: string,
    repo: string,
    since: Date,
  ): Promise<CommitActivityDto[]> {
    const octokit = this.buildClient(accessToken)
    // GraphQL v4 returns 100 commits with their additions/deletions in ONE request.
    // REST listCommits omits stats — we'd need 1 extra request per commit (massive N+1).
    const query = `query($owner:String!, $name:String!, $since:GitTimestamp!, $cursor:String) {
      repository(owner: $owner, name: $name) {
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100, since: $since, after: $cursor) {
                nodes { committedDate additions deletions }
                pageInfo { hasNextPage endCursor }
              }
            }
          }
        }
      }
    }`

    type Node = { committedDate: string; additions: number; deletions: number }
    type Page = {
      repository: {
        defaultBranchRef: {
          target: {
            history: { nodes: Node[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
          } | null
        } | null
      } | null
    }

    const all: Node[] = []
    let cursor: string | null = null
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const res: Page = await octokit.graphql(query, {
          owner, name: repo, since: since.toISOString(), cursor,
        })
        const history = res.repository?.defaultBranchRef?.target?.history
        if (!history) break
        all.push(...history.nodes)
        if (!history.pageInfo.hasNextPage) break
        cursor = history.pageInfo.endCursor
      }
    } catch (err) {
      this.logger.warn(`GraphQL commits failed for ${owner}/${repo}: ${String(err)}`)
      return []
    }

    const byDay = new Map<string, CommitActivityDto>()
    for (const c of all) {
      const key = new Date(c.committedDate).toISOString().slice(0, 10)
      const existing = byDay.get(key)
      if (existing) {
        existing.count++
        existing.additions += c.additions
        existing.deletions += c.deletions
      } else {
        byDay.set(key, {
          date: new Date(key),
          count: 1,
          additions: c.additions,
          deletions: c.deletions,
        })
      }
    }
    return Array.from(byDay.values())
  }

  async getPullRequests(
    accessToken: string,
    owner: string,
    repo: string,
    since: Date,
  ): Promise<PullRequestDto[]> {
    const octokit = this.buildClient(accessToken)
    try {
      const prs = await octokit.paginate(octokit.pulls.list, {
        owner,
        repo,
        state: 'all',
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
      })
      return prs
        .filter((pr) => new Date(pr.created_at) >= since)
        .map((pr) => ({
          number: pr.number,
          state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
          createdAt: new Date(pr.created_at),
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        }))
    } catch {
      return []
    }
  }

  async getReviews(
    accessToken: string,
    owner: string,
    repo: string,
    since: Date,
  ): Promise<ReviewDto[]> {
    const octokit = this.buildClient(accessToken)
    try {
      const prs = await octokit.paginate(octokit.pulls.list, {
        owner, repo, state: 'all', per_page: 50,
      })

      const reviews: ReviewDto[] = []
      // cap at 20 PRs — fetching reviews is a separate request per PR, gets expensive fast
      for (const pr of prs.slice(0, 20)) {
        const prReviews = await octokit.pulls.listReviews({ owner, repo, pull_number: pr.number })
        for (const review of prReviews.data) {
          if (review.submitted_at && new Date(review.submitted_at) >= since) {
            reviews.push({ pullNumber: pr.number, submittedAt: new Date(review.submitted_at) })
          }
        }
      }
      return reviews
    } catch {
      return []
    }
  }

  async getRateLimitStatus(accessToken: string): Promise<{ remaining: number; resetAt: Date }> {
    const octokit = this.buildClient(accessToken)
    try {
      const { data } = await octokit.rateLimit.get()
      return {
        remaining: data.rate.remaining,
        resetAt: new Date(data.rate.reset * 1000),
      }
    } catch {
      throw new ServiceUnavailableException('Could not reach GitHub API')
    }
  }

}
