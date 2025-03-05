import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { env } from 'src/config';
import { AuthenService } from '../authen.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private readonly authenService: AuthenService,
        private readonly jwtService: JwtService,
    ) {
        super({
        clientID: env.google.id,
        clientSecret: env.google.secret, 
        callbackURL: env.google.url,
        scope: ['email', 'profile'],
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
        const { name, emails, photos } = profile;

        if (!emails || !emails.length || !emails[0].value) {
            throw new BadRequestException('Email unavailable');
        }

        const email = emails[0].value;

        let user = await this.authenService.findByUsername(email);

        if (!user) {
            await this.authenService.createUser({ username: email, password: 'default-password' });
            user = await this.authenService.findByUsername(email);
        }

        const jwtPayload = {
            id: user.id,
            username: user.username,
        };
        const token = this.jwtService.sign(jwtPayload);

        done(null, { ...jwtPayload, token });
    }
}