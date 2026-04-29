import type { User } from '@prisma/client'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByGithubId(githubId: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  upsertFromGitHub(data: {
    githubId: string
    name: string | null
    email: string | null
    avatarUrl: string | null
    encryptedToken: string
  }): Promise<User>
  updateProfile(userId: string, data: { name?: string; email?: string }): Promise<User>
}

export const USER_REPOSITORY = Symbol('IUserRepository')
