import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { Comment } from './entities/comment.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { CommentUtil } from './comment.util';
import { Post } from '../post/entities/post.entity';
import { PostModule } from '../post/post.module';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { MinioClientModule } from '../minio-client/minio-client.module';
import { NotificationModule } from '../notification/notification.module';
import { ProfileModule } from '../profile/profile.module';
import { LikeModule } from '../like/like.module';
import { Like } from '../like/entity/like.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Post, Like]),
    PassportModule,
    forwardRef(() => PostModule),
    RedisCacheModule,
    forwardRef(() => MinioClientModule),
    NotificationModule,
    ProfileModule,
    forwardRef(() => LikeModule),
  ],
  controllers: [CommentController],
  providers: [CommentService, JwtStrategy, CommentUtil],
  exports: [CommentService],
})
export class CommentModule {}
