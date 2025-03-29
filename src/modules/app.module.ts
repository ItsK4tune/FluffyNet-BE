import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { MessageModule } from './message/message.module';
import { ConversationModule } from './chat/conversation.module';
import { MemberModule } from './chat_member/member.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
    TypeOrmModule.forRoot(dataSource.options),
    RedisModule.forRoot({
      type: 'single',
      url: env.redis.url,
    }),
    HealthcheckModule,
    AuthenModule,
    ProfileModule,
    FollowModule,
    PostModule,
    MessageModule,
    ConversationModule,
    MemberModule,
    CommentModule,
    RedisCacheModule,
    MinioClientModule,
  ],
})
export class AppModule {}
