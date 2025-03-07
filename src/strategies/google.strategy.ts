import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { env } from 'src/config';
import { JwtService } from '@nestjs/jwt';
import { UserAccountUtil } from 'src/utils/user-account.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAccount } from '../modules/authen/entities/user-account.entity';
import * as bcrypt from "bcrypt";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        @InjectRepository(UserAccount) private readonly repo: Repository<UserAccount>,
        private readonly userAccountUtil: UserAccountUtil,
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

        let user = await this.userAccountUtil.findByEmail(email);

        if (!user) {
            const newUser = this.repo.create({ email, password: await bcrypt.hash('default-password', 12) })
            await this.repo.save(newUser);
            user = await this.userAccountUtil.findByEmail(email);
        }
        
        const jwtPayload = {
            username: user.username,
            email: email,
            role: user.role
        };
        const token = this.jwtService.sign(jwtPayload);

        return done(null, { ...jwtPayload, token });
    }
}