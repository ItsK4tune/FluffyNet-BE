import { Module } from '@nestjs/common';
import { MessageRepository } from './message.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { MemberModule } from '../chat-member/member.module';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { GatewayModule } from '../gateway/gateway.module';
import { MinioClientModule } from '../minio-client/minio-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    MemberModule,
    RedisCacheModule,
    GatewayModule,
    MinioClientModule,
  ],
  controllers: [MessageController],
  providers: [MessageService, MessageRepository],
  exports: [MessageService],
})
export class MessageModule {}
