import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { env } from 'src/config';
import { JwtService } from '@nestjs/jwt';
import { FindUser } from '../modules/authen/findUser.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAccount } from '../modules/authen/entities/user-account.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        @InjectRepository(UserAccount) private readonly repo: Repository<UserAccount>,
        private readonly findUser: FindUser,
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

        let user = await this.findUser.findByEmail(email);

        if (!user) {
            const newUser = this.repo.create({ email, password: 'default-password' })
            await this.repo.save(newUser);
            user = await this.findUser.findByEmail(email);
        }

        const jwtPayload = {
            id: user.id,
            username: user.username,
        };
        const token = this.jwtService.sign(jwtPayload);

        done(null, { ...jwtPayload, token });
    }
}