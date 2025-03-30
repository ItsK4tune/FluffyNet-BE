import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Post]),
    PassportModule,
    PostModule,
    RedisCacheModule,
    MinioClientModule,
    NotificationModule,
    ProfileModule,
  ],
  controllers: [CommentController],
  providers: [CommentService, JwtStrategy, CommentUtil],
  exports: [CommentService]
})
export class CommentModule {}
