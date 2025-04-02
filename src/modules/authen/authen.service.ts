import { BadRequestException, Injectable } from '@nestjs/common';
import { Account } from './entities/account.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthenDTO } from './dtos/authen.dto';
import { AccountUtil } from 'src/modules/authen/account.util';
import { MailService } from './mail.service';
import { env } from 'src/config';
import { v4 as uuidv4 } from 'uuid';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { RedisEnum } from 'src/utils/enums/enum';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import * as path from 'path';
import { promises as fsPromises } from 'fs';

@Injectable()
export class AuthenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly accountUtil: AccountUtil,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  async createUser({ username, password }: AuthenDTO): Promise<boolean> {
    const findUser = await this.accountUtil.findByUsername(username);
    if (findUser) return true;

    const ecryptPassword = await bcrypt.hash(password, 12);

    const user = this.accountUtil.create(username, ecryptPassword);
    await this.accountUtil.save(user);
  }

  async login({ username, email, password }: AuthenDTO): Promise<string> {
    let findUser: Account;
    if (username) {
      findUser = await this.accountUtil.findByUsername(username);
    }
    if (!findUser && email) {
      findUser = await this.accountUtil.findByEmail(email);
    }
    if (!findUser) return null;
    if (await bcrypt.compare(password, findUser.password)) {
      const {
        password,
        profile,
        created_at,
        updated_at,
        ...user
      } = findUser;
      return this.jwtService.sign({ user, jit: uuidv4() });
    }
    return null;
  }

  async logout(jit: string): Promise<boolean> {
    try{
      const key = `${RedisEnum.jit}`;
      await this.redisCacheService.sadd(key, jit);
      await this.redisCacheService.expire(key, convertToSeconds(env.jwt.time));
      return true;
    } catch {
      return false;
    }
  }
  
  async forgotPassword(email: string): Promise<boolean> {
    const user = await this.accountUtil.findByEmail(email);

    if (!user) return null;

    const payload = { email };
    const token = this.jwtService.sign(payload, { expiresIn: env.mailer.time });

    const resetLink = `${env.fe}/reset-password?token=${token}`;
    const templatePath = path.join(__dirname, '..', '..', '..', 'src', 'static', 'reset-mail.html');
    const htmlTemplate = await fsPromises.readFile(templatePath, 'utf-8');
    let htmlContent = htmlTemplate.replace(/{{resetLink}}/g, resetLink);
    htmlContent = htmlContent.replace(/{{env.mailer.time}}/g, env.mailer.time);
    htmlContent = htmlContent.replace(/{{year}}/g, new Date().getFullYear().toString());
    
    await this.mailService.sendMail({
      to: email,
      subject: 'Reset password',
      text: `Dear user,\n\nWe received a request to reset your password...`,
      html: htmlContent,
    });

    return true;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.verify(token);
      const email = decoded.email;

      const user = await this.accountUtil.findByEmail(email);
      if (!user) return null;
      await this.accountUtil.updatePassword(user, newPassword);
    } catch (error) {
      return false;
    }
  }

  async verifyEmail(user_id: number, email: string): Promise<boolean> {
    const user = await this.accountUtil.findByUserID(user_id);

    if (!user) return null;
    if (user.email != email && user.email) return false;

    const payload = { user_id, email };
    const token = this.jwtService.sign(payload, { expiresIn: env.mailer.time });

    const verifyLink = `${env.fe}/verify?token=${token}`;
    const templatePath = path.join(__dirname, '..', '..', '..', 'src', 'static', 'verify-mail.html');
    const htmlTemplate = await fsPromises.readFile(templatePath, 'utf-8');
    let htmlContent = htmlTemplate.replace(/{{verifyLink}}/g, verifyLink);
    htmlContent = htmlContent.replace(/{{env.mailer.time}}/g, env.mailer.time);
    htmlContent = htmlContent.replace(/{{year}}/g, new Date().getFullYear().toString());

    await this.mailService.sendMail({
      to: email,
      subject: 'Verify email',
      text: `Dear user,\n\nWe received a request to verify your email...`,
      html: htmlContent,
    });
  }

  async verify(token: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.verify(token);
      const { user_id, email } = decoded;

      const user = await this.accountUtil.findByUserID(user_id);
      if (!user) return null;
      
      await this.accountUtil.updateVerifyEmail(user, email);
    } catch (error) {
      return false;
    }
  }

  async unbind(user_id: number): Promise<boolean> {
    const user = await this.accountUtil.findByUserID(user_id);
    if (!user) return null;
    if (!user.email) return false;

    user.email = null;
    await this.accountUtil.save(user);
    return true;
  }
}
