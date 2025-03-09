import { Module } from '@nestjs/common';
import { FollowController } from './follow.controller';
import { FollowService } from './follow.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { env } from 'src/config';
import { Follow } from './entities/follow.entity';
import { FollowUtil } from 'src/utils/queries/follow.util';
import { UserProfileUtil } from 'src/utils/queries/user-profile.util';
import { UserProfile } from '../profile/entities/user-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Follow, UserProfile]),
    PassportModule,
    JwtModule.register({
      secret: env.jwt.secret, 
      signOptions: { expiresIn: env.jwt.time }, 
    }),
  ],
  controllers: [FollowController],
  providers: [FollowService, FollowUtil, UserProfileUtil]
})
export class FollowModule {}
