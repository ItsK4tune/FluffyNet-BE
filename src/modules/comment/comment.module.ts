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

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Post]),
    PassportModule,
    PostModule,
    RedisCacheModule,
  ],
  controllers: [CommentController],
  providers: [CommentService, JwtStrategy, CommentUtil],
})
export class CommentModule {}
