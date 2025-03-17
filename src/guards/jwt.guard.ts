import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisCacheService } from 'src/modules/redis-cache/redis-cache.service';
import { RedisEnum } from 'src/utils/enums/enum';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor (
    private readonly redisCacheService: RedisCacheService,
  ) {super();}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isValid = await super.canActivate(context);
    if (!isValid) return false;

    const request = context.switchToHttp().getRequest();
    const jit = request.user.jit;
    const key = `${RedisEnum.jit}`;

    if (jit && (await this.redisCacheService.scheck(key, jit))) {
      console.log(jit);
      throw new UnauthorizedException('Token is blacklisted');
    }

    return true;
  }
}
