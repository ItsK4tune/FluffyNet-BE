import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { env } from 'src/config';

const REFRESH_COOKIE_NAME = 'jid'; 

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') { 
  constructor(private readonly configService: ConfigService) {
    console.log()
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
    return { user_id: payload.user_id }; 
  }
}