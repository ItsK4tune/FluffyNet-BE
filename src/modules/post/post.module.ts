import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostUtil } from 'src/modules/post/post.util';
import { PostsController } from './post.controller';
import { Post } from './entities/post.entity';
import { MinioClientModule } from '../minio-client/minio-client.module';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    MinioClientModule,
    RedisCacheModule,
  ],
  providers: [PostService, PostUtil],
  controllers: [PostsController],
  exports: [PostUtil],
})
export class PostsModule {}
