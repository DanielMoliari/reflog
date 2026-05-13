import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-jwt'
import type { JwtPayload } from '../../../../common/decorators/current-user.decorator'

function extractFromCookieOrBearer(req: {
  cookies?: Record<string, string>
  headers?: { authorization?: string }
}): string | null {
  const cookie = req.cookies?.['auth_token']
  if (cookie) return cookie
  const auth = req.headers?.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: extractFromCookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: false,
    })
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload
  }
}
