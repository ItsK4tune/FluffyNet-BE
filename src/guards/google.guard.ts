import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { env } from 'src/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(err, user, info, context: ExecutionContext) {
    const response: Response = context.switchToHttp().getResponse();

    if (info && info.message === 'access_denied') {
      console.log('User denied access to Google account');
      return response.redirect(`${env.fe}/login`);
    }

    return user;
  }
}
