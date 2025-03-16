import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { UserAccount } from '../authen/entities/user-account.entity';
import { UserAccountUtil } from 'src/modules/authen/user-account.util';
import { UserProfileUtil } from 'src/modules/profile/user-profile.util';
import { JwtModule } from '@nestjs/jwt';
import { env } from 'src/config';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { RedisCacheService } from '../redis-cache/redis-cache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProfile, UserAccount]),
    PassportModule,
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: env.jwt.time },
    }),
  ],
  controllers: [ProfileController],
  providers: [ProfileService, UserAccountUtil, UserProfileUtil, JwtStrategy, RedisCacheService],
})
export class ProfileModule {}
