import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { User } from '@prisma/client'
import type { JwtPayload } from '../../../../common/decorators/current-user.decorator'
import { EncryptionService } from '../../../../infrastructure/crypto/encryption.service'
import type { GitHubProfileVO } from '../../domain/value-objects/github-profile.vo'
import { USER_REPOSITORY, type IUserRepository } from '../../ports/user.repository.port'

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name)

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  async loginWithGitHub(profile: GitHubProfileVO): Promise<{ accessToken: string; user: User }> {
    const encryptedToken = await this.encryptionService.encrypt(profile.accessToken)

    const user = await this.userRepository.upsertFromGitHub({
      githubId: profile.githubId,
      name: profile.displayName,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      encryptedToken,
    })

    this.logger.log(`User authenticated: ${user.id} (github: ${profile.username})`)

    const accessToken = this.issueJwt(user)
    return { accessToken, user }
  }

  issueJwt(user: User): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      githubId: user.githubId,
      plan: user.plan,
    }
    return this.jwtService.sign(payload)
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId)
  }

  async getDecryptedToken(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId)
    if (!user) throw new UnauthorizedException('User not found')
    return this.encryptionService.decrypt(user.githubToken)
  }

  async updateProfile(userId: string, data: { name?: string; email?: string }): Promise<User> {
    return this.userRepository.updateProfile(userId, data)
  }
}
