import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostUtil } from 'src/modules/post/post.util';
import { PostController } from './post.controller';
import { Post } from './entities/post.entity';
import { MinioClientModule } from '../minio-client/minio-client.module';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { FollowModule } from '../follow/follow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    MinioClientModule,
    RedisCacheModule,
    FollowModule,
  ],
  controllers: [PostController],
  providers: [PostService, PostUtil],
})
export class PostModule {}
