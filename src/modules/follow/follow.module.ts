import { forwardRef, Module } from '@nestjs/common';
import { FollowController } from './follow.controller';
import { FollowService } from './follow.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { env } from 'src/config';
import { Follow } from './entities/follow.entity';
import { FollowUtil } from 'src/modules/follow/follow.util';
import { ProfileUtil } from 'src/modules/profile/profile.util';
import { Profile } from '../profile/entities/profile.entity';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { NotificationModule } from '../notification/notification.module';
import { ProfileModule } from '../profile/profile.module';
import { MinioClientModule } from '../minio-client/minio-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Follow, Profile]),
    PassportModule,
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: env.jwt.time },
    }),
    RedisCacheModule,
    NotificationModule,
    forwardRef(() => MinioClientModule),
    forwardRef(() => ProfileModule),
    forwardRef(() =>
      import('../events/events.module').then((m) => m.EventsModule),
    ),
  ],
  controllers: [FollowController],
  providers: [FollowService, FollowUtil, ProfileUtil],
  exports: [FollowService],
})
export class FollowModule {}
