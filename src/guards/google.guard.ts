import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isValid = await super.canActivate(context); 
    if (!isValid) return false;

    const request = context.switchToHttp().getRequest();
    return true;
  }
}