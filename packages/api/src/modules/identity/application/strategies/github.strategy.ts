import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-github2'
import { GitHubProfileVO } from '../../domain/value-objects/github-profile.vo'

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email', 'repo', 'read:org'],
    })
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: {
      id: string
      username?: string
      displayName?: string
      emails?: Array<{ value: string }>
      photos?: Array<{ value: string }>
    },
  ): Promise<GitHubProfileVO> {
    return GitHubProfileVO.fromPassportProfile(profile, accessToken)
  }
}
