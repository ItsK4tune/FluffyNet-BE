import { Module } from '@nestjs/common';
import { AuthenController } from './authen.controller';
import { AuthenService } from './authen.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { env } from 'src/config';
import { JwtStrategy } from './strategy/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.register({
      secret: env.jwt.secret, // Bí mật JWT
      signOptions: { expiresIn: env.jwt.time }, // Token hết hạn sau 1 giờ
    }),
  ],
  controllers: [AuthenController],
  providers: [AuthenService, JwtStrategy],
})

export class AuthenModule {}
