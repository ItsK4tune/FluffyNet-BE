import { forwardRef, Module } from "@nestjs/common";
import { ChatGateway } from "./chat.gateway";
import { WsJwtGuard } from "../../guards/websocket.guard";
import { JwtModule } from "@nestjs/jwt";
import { env } from "../../config";
import { NotificationGateway } from "./notification.gateway";
import { RedisCacheModule } from "../redis-cache/redis-cache.module";
import { CheckOnlineGateway } from "./check-online.gateway";
import { FollowModule } from "../follow/follow.module";
import { ChatroomModule } from '../chat-room/chatroom.module';
import { MemberModule } from '../chat-member/member.module';

@Module({
  imports: [
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: env.jwt.time },
    }),
    RedisCacheModule,
    forwardRef(() => FollowModule),
  ],
  providers: [ChatGateway, WsJwtGuard, NotificationGateway, CheckOnlineGateway],
  exports: [ChatGateway, NotificationGateway],
})
export class GatewayModule {}
