import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { Account } from '../authen/entities/account.entity';
import { AccountUtil } from 'src/modules/authen/account.util';
import { ProfileUtil } from 'src/modules/profile/profile.util';
import { JwtModule } from '@nestjs/jwt';
import { env } from 'src/config';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { MinioClientModule } from '../minio-client/minio-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile, Account]),
    PassportModule,
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: env.jwt.time },
    }),
    MinioClientModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService, AccountUtil, ProfileUtil, JwtStrategy, RedisCacheService],
  exports: [ProfileService],
})
export class ProfileModule {}
