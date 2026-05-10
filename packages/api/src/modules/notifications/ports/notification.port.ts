export interface DigestSummaryData {
  totalCommits: number
  totalAdditions: number
  totalDeletions: number
  totalPrsOpened: number
  totalPrsMerged: number
  totalReviewsDone: number
  activeDays: number
  topRepository: string | null
  streakChange: number
}

export interface INotificationService {
  sendWeeklyDigest(userId: string, email: string, weekStart: Date, summary: DigestSummaryData): Promise<void>
  sendStreakAlert(userId: string, email: string, streakLength: number): Promise<void>
  sendWelcomeEmail(userId: string, email: string, displayName: string): Promise<void>
}

export const NOTIFICATION_SERVICE = Symbol('INotificationService')
