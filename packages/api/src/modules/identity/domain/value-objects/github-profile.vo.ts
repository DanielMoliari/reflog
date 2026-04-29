export class GitHubProfileVO {
  constructor(
    readonly githubId: string,
    readonly username: string,
    readonly displayName: string | null,
    readonly email: string | null,
    readonly avatarUrl: string | null,
    readonly accessToken: string,
  ) {}

  static fromPassportProfile(profile: {
    id: string
    username?: string
    displayName?: string
    emails?: Array<{ value: string }>
    photos?: Array<{ value: string }>
    accessToken?: string
  }, accessToken: string): GitHubProfileVO {
    return new GitHubProfileVO(
      profile.id,
      profile.username ?? profile.id,
      profile.displayName ?? null,
      profile.emails?.[0]?.value ?? null,
      profile.photos?.[0]?.value ?? null,
      accessToken,
    )
  }
}
