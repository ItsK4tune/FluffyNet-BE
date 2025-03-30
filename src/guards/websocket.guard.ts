import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromHeader(client);

      if (!token) {
        throw new WsException('Unauthorized access');
      }

      const payload = await this.jwtService.verifyAsync(token);

      // Attach user to socket handshake auth for use in gateway handlers
      client.handshake.auth.user = payload;
      client.handshake.auth.userId = payload.user_id;

      return true;
    } catch (error) {
      console.error('WsJwtGuard error:', error);
      throw new WsException('Unauthorized access');
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    // Try to get token from handshake auth
    const token =
      client.handshake.auth?.token || client.handshake.headers?.authorization;

    if (!token) {
      return undefined;
    }

    // If token format is "Bearer TOKEN", extract the token part
    const parts = token.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }

    return token;
  }
}
