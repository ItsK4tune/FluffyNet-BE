import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { Comment } from './entities/comment.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { CommentUtil } from './comment.util';
import { PostUtil } from '../post/post.util';
import { Post } from '../post/entities/post.entity';
import { RedisCacheService } from '../redis-cache/redis-cache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Post]),
    PassportModule,
  ],
  controllers: [CommentController],
  providers: [CommentService, JwtStrategy, CommentUtil, PostUtil, RedisCacheService],
})
export class CommentModule {}
