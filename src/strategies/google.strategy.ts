import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { env } from 'src/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../modules/authen/entities/account.entity';
import * as bcrypt from 'bcrypt';
import { Profile } from 'src/modules/profile/entities/profile.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
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

    let user = await this.accountRepo.findOne({ where: { email } });

    if (!user) {
      const newUser = this.accountRepo.create({
        email,
        password: await bcrypt.hash('default-password', 12),
      });

      await this.accountRepo.save(newUser);

      const newProfile = this.profileRepo.create({
        name: displayName,
        avatar: photos[0].value,
        user: newUser,
      });

      await this.profileRepo.save(newProfile);

      user = await this.accountRepo.findOne({ where: { email } });
    }

    const jwtPayload = {
      user_id: user.user_id,
      username: user.username,
      email: email,
      role: user.role,
    };
    const token = this.jwtService.sign({ user: jwtPayload, jit: uuidv4() });

    return done(null, { ...jwtPayload, token });
  }
}
