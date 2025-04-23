import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import dataSource from 'src/libs/typeorm.config';
import { env } from 'src/config';
import { AuthenModule } from './authen/authen.module';
import { ProfileModule } from './profile/profile.module';
import { HealthcheckModule } from './healthcheck/healthcheck.module';
import { FollowModule } from './follow/follow.module';
import { PostModule } from './post/post.module';
import { CommentModule } from './comment/comment.module';
import { RedisCacheModule } from './redis-cache/redis-cache.module';
import { MinioClientModule } from './minio-client/minio-client.module';
import { NotificationModule } from './notification/notification.module';
import { MongooseModule } from '@nestjs/mongoose';
import { LikeModule } from './like/like.module';
import { MessageModule } from './message/message.module';
import { ChatroomModule } from './chat-room/chatroom.module';
import { MemberModule } from './chat-member/member.module';
import { GatewayModule } from './gateway/gateway.module';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TaskModule } from './task/task.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
    TypeOrmModule.forRoot(dataSource.options),
    RedisModule.forRoot({
      type: 'single',
      url: env.redis.url,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error(
            'REDIS_URL is not defined in the environment variables',
          );
        }
        return {
          redis: redisUrl,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 } /* ... */,
          },
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forRoot(env.mongodb.url),
    HealthcheckModule,
    AuthenModule,
    ProfileModule,
    FollowModule,
    PostModule,
    MessageModule,
    ChatroomModule,
    MemberModule,
    GatewayModule,
    CommentModule,
    RedisCacheModule,
    MinioClientModule,
    NotificationModule,
    LikeModule,
    TaskModule,
  ],
})
export class AppModule {}
