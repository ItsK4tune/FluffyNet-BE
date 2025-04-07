import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
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

    if (err) {
      const feRedirectUrl = new URL(`${env.fe}/login`);
      if (err.response.type == 'ban') {
        feRedirectUrl.searchParams.append('type', err.response.type);
        feRedirectUrl.searchParams.append('message', err.response.reason);
      } else if (err.response.type == 'suspend') {
        feRedirectUrl.searchParams.append('type', err.response.type);
        feRedirectUrl.searchParams.append('message', err.response.reason);
        feRedirectUrl.searchParams.append('until', err.response.until);
      } else {
        feRedirectUrl.searchParams.append('type', 'unknown');
      }
      console.log(feRedirectUrl.toString());
      return response.redirect(feRedirectUrl.toString());
    }

    if (user)
      return user;
  }
}
