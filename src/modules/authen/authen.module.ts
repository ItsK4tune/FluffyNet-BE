import { Module } from '@nestjs/common';
import { AuthenController } from './authen.controller';
import { AuthenService } from './authen.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { env } from 'src/config';
import { GoogleStrategy } from '../../strategies/google.strategy';
import { AccountUtil } from 'src/modules/authen/account.util';
import { MailService } from './mail.service';
import { ProfileUtil } from 'src/modules/profile/profile.util';
import { Profile } from '../profile/entities/user-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, Profile]),
    PassportModule,
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: env.jwt.time },
    }),
  ],
  controllers: [AuthenController],
  providers: [
    AuthenService,
    MailService,
    AccountUtil,
    ProfileUtil,
    GoogleStrategy,
  ],
})
export class AuthenModule {}
