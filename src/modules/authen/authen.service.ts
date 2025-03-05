import { Injectable, BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAccount } from './entities/user-account.entity';
import { Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthenDTO } from './dtos/authen.dto';
import { FindUser } from './findUser.service';
import { MailService } from './mail.service';
import { env } from 'src/config';

@Injectable()
export class AuthenService {
    constructor(
        @InjectRepository(UserAccount) private readonly repo: Repository<UserAccount>,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService,
        private readonly findUser: FindUser,
    ) {}

    async createUser ({ username, password } : AuthenDTO) {
        if (!username || !password) throw new BadRequestException({ message: 'Username and password are required' });

        const findUser = await this.repo.findOne({ where: { username } });
        if (findUser) throw new ConflictException({ message: 'Username already exists' });

        const ecryptPassword = await bcrypt.hash(password, 12)

        const user = this.repo.create({ username, password: ecryptPassword });
        await this.repo.save(user);

        return { message: 'User created successfully' };
    }

    async validateUser ({ username, password } : AuthenDTO) {
        const findUser = await this.findUser.findByUsername(username);

        if (!findUser)  return null;

        if (await bcrypt.compare(password, findUser.password)) {
            const { password, ...user } = findUser;
            return this.jwtService.sign(user);
        }

        return null;
    }

    async forgotPassword(email: string) {
        const user = await this.findUser.findByEmail(email);
        if (!user) throw new BadRequestException('Account not exist');

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
        
            const user = await this.findUser.findByEmail(email);
            if (!user) throw new BadRequestException('Token không hợp lệ');
        
            const hashedPassword = await bcrypt.hash(newPassword, 12);
        
            await this.findUser.updatePassword(email, hashedPassword);
        
            return { message: 'New password set' };
        } catch (error) {
            throw new BadRequestException('Token invalid/expired');
        }
    }
}
