import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from 'src/config';
import { RedisCacheService } from 'src/modules/redis-cache/redis-cache.service';
import { RedisEnum } from 'src/utils/enums/enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly redis: RedisCacheService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.jwt.secret,
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

    return {
      user_id: payload.user_id,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };
  }
}
