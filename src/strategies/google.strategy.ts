import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { env } from 'src/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAccount } from '../modules/authen/entities/user-account.entity';
import * as bcrypt from 'bcrypt';
import { UserProfile } from 'src/modules/profile/entities/user-profile.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @InjectRepository(UserAccount)
    private readonly userAccountRepo: Repository<UserAccount>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepo: Repository<UserProfile>,
    private readonly jwtService: JwtService,
  ) {
    super({
      clientID: env.google.id,
      clientSecret: env.google.secret,
      callbackURL: env.google.url,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { displayName, emails, photos } = profile;

    if (!emails || !emails.length || !emails[0].value) {
      throw new BadRequestException('Email unavailable');
    }

    const email = emails[0].value;

    let user = await this.userAccountRepo.findOne({ where: { email } });

    if (!user) {
      const newUser = this.userAccountRepo.create({
        email,
        password: await bcrypt.hash('default-password', 12),
        verifyEmail: true,
      });

      await this.userAccountRepo.save(newUser);

      const newProfile = this.userProfileRepo.create({
        name: displayName,
        avatar: photos[0].value,
        user: newUser,
      });

      await this.userProfileRepo.save(newProfile);

      user = await this.userAccountRepo.findOne({ where: { email } });
    }

    const jwtPayload = {
      user_id: user.user_id,
      username: user.username,
      email: email,
      role: user.role,
    };
    const token = this.jwtService.sign(jwtPayload);

    return done(null, { ...jwtPayload, token });
  }
}
