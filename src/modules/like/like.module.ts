import { Module } from '@nestjs/common';
import { LikeController } from './like.controller';
import { LikeService } from './like.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { env } from 'src/config';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { NotificationModule } from '../notification/notification.module';
import { ProfileModule } from '../profile/profile.module';
import { Like } from './entity/like.entity';
import { LikeUtil } from './like.util';
import { PostModule } from '../post/post.module';
import { Comment } from '../comment/entities/comment.entity';
import { CommentModule } from '../comment/comment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Like, Comment]),
    PassportModule,
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: env.jwt.time },
    }),
    RedisCacheModule,
    NotificationModule,
    ProfileModule,
    CommentModule,
    PostModule,
  ],
  controllers: [LikeController],
  providers: [LikeService, LikeUtil],
  exports: [LikeService],
})
export class LikeModule {}
