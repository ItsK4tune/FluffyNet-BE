import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { env } from 'src/config';
import { RedisCacheService } from 'src/modules/redis-cache/redis-cache.service';
import { RedisEnum } from 'src/utils/enums/enum';

const REFRESH_COOKIE_NAME = 'jid';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly redis: RedisCacheService) {
    console.log();
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.[REFRESH_COOKIE_NAME];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: env.jwt.refreshSecret,
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    const userId = payload.user_id;

    const isBanned = await this.redis.sgetall(`${RedisEnum.ban}`);
    const isSuspended = await this.redis.sgetall(`${RedisEnum.suspend}`);
    if (isBanned.includes(userId.toString()))
      throw new UnauthorizedException('User is banned');
    if (isSuspended.includes(userId.toString()))
      throw new UnauthorizedException('User is suspended.');

    return { user_id: payload.user_id };
  }
}
