import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowModule } from '../follow/follow.module';
import { ChatroomController } from './chatroom.controller';
import { ChatroomService } from './chatroom.service';
import { ProfileModule } from '../profile/profile.module';
import { MemberModule } from '../chat-member/member.module';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { ChatRoomRepository } from './chatroom.repository';
import { ChatRoom } from './entities/room.entity';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom]),
    MemberModule,
    FollowModule,
    ProfileModule,
    RedisCacheModule,
    GatewayModule,
  ],
  controllers: [ChatroomController],
  providers: [ChatroomService, ChatRoomRepository],
  exports: [ChatroomService],
})
export class ChatroomModule {}
