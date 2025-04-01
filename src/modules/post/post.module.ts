import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostUtil } from 'src/modules/post/post.util';
import { PostController } from './post.controller';
import { Post } from './entities/post.entity';
import { MinioClientModule } from '../minio-client/minio-client.module';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { FollowModule } from '../follow/follow.module';
import { NotificationModule } from '../notification/notification.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    MinioClientModule,
    RedisCacheModule,
    FollowModule,
    NotificationModule,
    ProfileModule,
  ],
  controllers: [PostController],
  providers: [PostService, PostUtil],
  exports: [PostService, PostUtil]
})
export class PostModule {}
