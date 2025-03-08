import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isValid = await super.canActivate(context); 
    if (!isValid) return false;
    return true;
  }
}