import { Module } from '@nestjs/common';
import { AuthenController } from './authen.controller';
import { AuthenService } from './authen.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAccount } from './entities/user-account.entity';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { env } from 'src/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FindUser } from './findUser.service';
import { MailService } from './mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAccount]),
    PassportModule,
    JwtModule.register({
      secret: env.jwt.secret, // Bí mật JWT
      signOptions: { expiresIn: env.jwt.time }, // Token hết hạn sau 1 giờ
    }),
  ],
  controllers: [AuthenController],
  providers: [AuthenService, MailService, FindUser, JwtStrategy, GoogleStrategy],
})

export class AuthenModule {}
