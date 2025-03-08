import { Module } from '@nestjs/common';
import { AuthenController } from './authen.controller';
import { AuthenService } from './authen.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAccount } from './entities/user-account.entity';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { env } from 'src/config';
import { GoogleStrategy } from '../../strategies/google.strategy';
import { UserAccountUtil } from 'src/utils/queries/user-account.util';
import { MailService } from './mail.service';
import { UserProfileUtil } from 'src/utils/queries/user-profile.util';
import { UserProfile } from '../profile/entities/user-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAccount, UserProfile]),
    PassportModule,
    JwtModule.register({
      secret: env.jwt.secret, 
      signOptions: { expiresIn: env.jwt.time }, 
    }),
  ],
  controllers: [AuthenController],
  providers: [AuthenService, MailService, UserAccountUtil, UserProfileUtil, GoogleStrategy],
})

export class AuthenModule {}
