import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { env } from 'src/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../modules/authen/entities/account.entity';
import * as bcrypt from 'bcrypt';
import { Profile } from 'src/modules/profile/entities/profile.entity';
import { AuthenService } from 'src/modules/authen/authen.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    private readonly authenService: AuthenService,
  ) {
    super({
      clientID: env.google.id,
      clientSecret: env.google.secret,
      callbackURL: env.google.url,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { displayName, emails, photos } = profile;

    if (!emails || !emails.length || !emails[0].value) {
      return done(new BadRequestException('Email not available from Google profile.'), false);
    }

    const email = emails[0].value;

    let user = await this.accountRepo.findOne({ where: { email } });

    if (user.is_banned) {
      return done(new ForbiddenException({type: 'ban', reason: user.ban_reason}), false);
    }

    if (user.is_suspended) {
      return done(new ForbiddenException({type: 'suspend', reason: user.suspend_reason, until: user.suspended_until}), false);
    }

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

    const { accessToken, refreshToken } = await this.authenService.handleOAuthLogin(user);

    const userPayloadForDone = {
      userId: user.user_id,
      username: user.username,  
      email: user.email,
      role: user.role, 
    };
    
    return done(null, { user: userPayloadForDone, accessToken, refreshToken });
  }
}
