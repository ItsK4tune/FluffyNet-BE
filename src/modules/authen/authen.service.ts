import { Injectable, BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAccount } from './entities/user-account.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthenDTO } from './dtos/authen.dto';
import { UserAccountUtil } from 'src/utils/queries/user-account.util';
import { MailService } from './mail.service';
import { env } from 'src/config';
import { UserProfile } from '../profile/entities/user-profile.entity';

@Injectable()
export class AuthenService {
    constructor(
        @InjectRepository(UserAccount) private readonly repo: Repository<UserAccount>,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService,
        private readonly userAccountUtil: UserAccountUtil,
    ) {}

    async createUser ({ username, password } : AuthenDTO) {
        if (!username || !password) throw new BadRequestException({ message: 'Username and password are required' });

        const findUser = await this.repo.findOne({ where: { username } });
        if (findUser) throw new ConflictException({ message: 'Username already exists' });

        const ecryptPassword = await bcrypt.hash(password, 12)

        const user = this.repo.create({ username, password: ecryptPassword, profile: new UserProfile() });
        await this.repo.save(user);

        return { message: 'User created successfully' };
    }

    async validateUser ({ username, email, password } : AuthenDTO) {
        if (username && email) return null;

        let findUser: UserAccount;
        if (username) {
            findUser = await this.userAccountUtil.findByUsername(username);
        }
        
        if (!findUser && email) {
            const userByEmail = await this.userAccountUtil.findByEmail(email);
            if (userByEmail?.verifyEmail) {
                findUser = userByEmail;
            }
        }

        if (!findUser)  return null;

        if (await bcrypt.compare(password, findUser.password)) {
            const { password, profile, verifyEmail, created_at, updated_at, ...user } = findUser;
            return this.jwtService.sign(user);
        }

        return null;
    }

    async verifyEmail(email: string) {
        const user = await this.userAccountUtil.findByEmail(email);
        
        if (!user) throw new BadRequestException({message: 'Account not exist'});

        if (user.verifyEmail)   throw new BadRequestException({message: 'Email has been verified'});

        const payload = { email };
        const token = this.jwtService.sign(payload, { expiresIn: env.mailer.time });

        const verifyLink = `${env.dns}/verify?token=${token}`;
        await this.mailService.sendMail({
            to: email,
            subject: 'Verify email',
            text: `Dear user,\n\nWe received a request to verify your email...`, 
            html: `
                <h1>Dear user,</h1>
                <p>We received a request to verify your email. If you did not make this request, please ignore this email.</p>
                <p>To verify your email, click the link below:</p>
                <p><a href="${verifyLink}">${verifyLink}</a></p>
                <p>This link will expire in <strong>${env.mailer.time}</strong> for security reasons.</p>
                <p>If you have any issues, please contact our support team.</p>
                <p>Best regards,<br>Your Website Team</p>
            `,
        });

        return { message: 'Reset link sent' };
    }

    async verify(token: string) {
        try {
            const decoded = this.jwtService.verify(token);
            const email = decoded.email;
        
            const user = await this.userAccountUtil.findByEmail(email);
            if (!user) throw new BadRequestException('Wrong token');
        
            await this.userAccountUtil.updateVerifyEmail(user);
        
            return { message: 'Verified' };
        } catch (error) {
            throw new BadRequestException({ message: 'Token invalid/expired' });
        }
    }

    async forgotPassword(email: string) {
        console.log(email);
        const user = await this.userAccountUtil.findByEmail(email);
        console.log(user);
        if (!user) throw new BadRequestException({message: 'Account not exist'});

        const payload = { email };
        const token = this.jwtService.sign(payload, { expiresIn: env.mailer.time });

        const resetLink = `${env.dns}/reset-password?token=${token}`;
        await this.mailService.sendMail({
            to: email,
            subject: 'Reset password',
            text: `Dear user,\n\nWe received a request to reset your password...`, 
            html: `
                <h1>Dear user,</h1>
                <p>We received a request to reset your password. If you did not make this request, please ignore this email.</p>
                <p>To reset your password, click the link below:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>This link will expire in <strong>${env.mailer.time}</strong> for security reasons.</p>
                <p>If you have any issues, please contact our support team.</p>
                <p>Best regards,<br>Your Website Team</p>
            `,
        });

        return { message: 'Reset link sent' };
    }

    async resetPassword(token: string, newPassword: string) {
        try {
            const decoded = this.jwtService.verify(token);
            const email = decoded.email;
        
            const user = await this.userAccountUtil.findByEmail(email);
            if (!user) throw new BadRequestException('Wrong token');
        
            await this.userAccountUtil.updatePassword(user, newPassword);
        
            return { message: 'New password set' };
        } catch (error) {
            throw new BadRequestException({ message: 'Token invalid/expired' });
        }
    }
}
