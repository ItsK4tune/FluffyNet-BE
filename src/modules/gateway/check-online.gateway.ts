import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { RedisEnum } from 'src/utils/enums/enum';
import { Logger } from '@nestjs/common';
import { FollowService } from '../follow/follow.service';

@WebSocketGateway({ cors: true })
export class CheckOnlineGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private logger: Logger = new Logger('CheckOnlineGateway');
  constructor(
    private readonly redis: RedisCacheService,
    private readonly followService: FollowService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const user_id = client.data.user_id;
    if (user_id) {
      await this.redis.del(`online:${user_id}`);
      this.logger.error(`User ${user_id} disconnected and removed from Redis`);
    }
  }

  @SubscribeMessage('login')
  async handleLogin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { user_id: string },
  ) {
    client.data.user_id = data.user_id;
    await this.redis.set(`${RedisEnum.online}:${data.user_id}`, '1', 60);
    this.logger.log(`User ${data.user_id} logged in and marked online`);
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() _: any,
  ) {
    const user_id = client.data.user_id;
    if (user_id) {
      await this.redis.set(`${RedisEnum.online}:${user_id}`, '1', 70);
      this.logger.log(`User ${user_id} marked online`);
      await this.followService.pushFollowingToRedis(user_id, 70);

      const followingKey = `${RedisEnum.following}:${user_id}:`;
      const followings = await this.redis.sgetall(followingKey);

      const onlineFollowings = await this.redis.filterOnlineUsers(followings);

      client.emit('online-followings', onlineFollowings);
    }
  }
}
