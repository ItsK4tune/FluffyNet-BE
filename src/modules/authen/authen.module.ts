import { Module } from '@nestjs/common';
import {
  AdminController,
  AuthenController,
  SuperAdminController,
} from './authen.controller';
import {
  AdminAuthenService,
  AuthenService,
  SuperAdminAuthenService,
} from './authen.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { env } from 'src/config';
import { GoogleStrategy } from '../../strategies/google.strategy';
import { AccountUtil } from 'src/modules/authen/account.util';
import { MailService } from './mail.service';
import { ProfileUtil } from 'src/modules/profile/profile.util';
import { Profile } from '../profile/entities/profile.entity';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { RefreshToken } from './entities/refresh.entity';
import { RefreshUtil } from './refresh.util';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { RefreshJwtStrategy } from 'src/strategies/refresh-jwt.strategy';
import { MinioClientModule } from '../minio-client/minio-client.module';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, RefreshToken, Profile]),
    PassportModule,
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: env.jwt.time },
    }),
    MinioClientModule,
    RedisCacheModule,
  ],
  controllers: [AuthenController, AdminController, SuperAdminController],
  providers: [
    AuthenService,
    AdminAuthenService,
    SuperAdminAuthenService,
    MailService,
    AccountUtil,
    ProfileUtil,
    RefreshUtil,
    GoogleStrategy,
    JwtStrategy,
    RefreshJwtStrategy,
    RedisCacheService,
  ],
})
export class AuthenModule {}
