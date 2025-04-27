import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Account } from './entities/account.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthenDTO } from './dtos/authen.dto';
import { AccountUtil } from 'src/modules/authen/account.util';
import { MailService } from './mail.service';
import { env } from 'src/config';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { RefreshUtil } from './refresh.util';
import { RefreshToken } from './entities/refresh.entity';
import { AdminDTO } from './dtos/admin.dto';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import { ProfileUtil } from '../profile/profile.util';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { RedisEnum } from 'src/utils/enums/enum';

@Injectable()
export class AuthenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly accountUtil: AccountUtil,
    private readonly profileUtil: ProfileUtil,
    private readonly refreshUtil: RefreshUtil,
  ) {}

  async createUser({ username, password }: AuthenDTO): Promise<boolean> {
    const findUser = await this.accountUtil.findByUsername(username);
    if (findUser) return true;

    const ecryptPassword = await bcrypt.hash(password, 12);

    const user = this.accountUtil.create(username, ecryptPassword);
    await this.accountUtil.save(user);
  }

  async login({
    username,
    email,
    password,
  }: AuthenDTO): Promise<{ accessToken: string; refreshToken: string }> {
    let user: Account;

    if (username) {
      user = await this.accountUtil.findByUsername(username);
    }
    if (!user && email) {
      user = await this.accountUtil.findByEmail(email);
    }
    if (!user) return null;

    if (user.is_banned) {
      throw new ForbiddenException(user.ban_reason);
    }

    if (user.is_suspended) {
      if (user.suspended_until && new Date() < user.suspended_until) {
        throw new ForbiddenException({
          reason: user.suspend_reason,
          until: user.suspended_until,
        });
      } else {
        user.is_suspended = false;
        user.suspended_until = null;
        user.suspend_reason = null;
        await this.accountUtil.save(user);
      }
    }

    if (await bcrypt.compare(password, user.password)) {
      const payload = {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
      };

      const tokens = await this.generateTokens(payload);
      const refreshTokenExpiry = this.getRefreshTokenExpiryDate();
      await this.storeRefreshToken(
        tokens.refreshToken,
        user.user_id,
        refreshTokenExpiry,
      );

      return tokens;
    }
    return null;
  }

  async getStatus(user_id: number) {
    return await this.profileUtil.getProfileByUserId(user_id);
  }

  async refreshToken(
    user_id: number,
    currentRefreshToken: string,
  ): Promise<{ accessToken: string; newRefreshToken?: string }> {
    const userRefreshTokens = await this.refreshUtil.findToken(user_id);

    if (!userRefreshTokens.length) {
      throw new UnauthorizedException(
        'No valid refresh tokens found for user.',
      );
    }

    let validStoredToken: RefreshToken | null = null;
    for (const storedToken of userRefreshTokens) {
      if (
        (await bcrypt.compare(currentRefreshToken, storedToken.token)) &&
        storedToken.expires_at > new Date()
      ) {
        validStoredToken = storedToken;
        break;
      }
    }

    if (!validStoredToken) {
      await this.revokeAllUserTokens(user_id);
      throw new UnauthorizedException('Invalid refresh token.');
    }

    validStoredToken.is_revoked = true;
    await this.refreshUtil.saveToken(validStoredToken);

    if (!validStoredToken.user) {
      throw new InternalServerErrorException(
        'User data missing from refresh token entity.',
      );
    }

    const userPayload = {
      user_id: validStoredToken.user.user_id,
      username: validStoredToken.user.username,
      email: validStoredToken.user.email,
      role: validStoredToken.user.role,
    };

    const newTokens = await this.generateTokens(userPayload);

    const newExpiry = this.getRefreshTokenExpiryDate();
    await this.storeRefreshToken(
      newTokens.refreshToken,
      validStoredToken.user.user_id,
      newExpiry,
    );

    return {
      accessToken: newTokens.accessToken,
      newRefreshToken: newTokens.refreshToken,
    };
  }

  async logout(user_id: number, refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const userActiveRefreshTokens = await this.refreshUtil.findToken(user_id);

    let tokenToRevoke: RefreshToken | null = null;
    for (const storedToken of userActiveRefreshTokens) {
      if (await bcrypt.compare(refreshToken, storedToken.token)) {
        tokenToRevoke = storedToken;
        break;
      }
    }

    if (tokenToRevoke) {
      tokenToRevoke.is_revoked = true;
      await this.refreshUtil.saveToken(tokenToRevoke);
    }
  }

  async forgotPassword(email: string): Promise<boolean> {
    const user = await this.accountUtil.findByEmail(email);

    if (!user) return null;

    const payload = { email };
    const token = this.jwtService.sign(payload, { expiresIn: env.mailer.time });

    const resetLink = `${env.fe}/reset-password?token=${token}`;
    const templatePath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'src',
      'static',
      'reset-mail.html',
    );
    const htmlTemplate = await fsPromises.readFile(templatePath, 'utf-8');
    let htmlContent = htmlTemplate.replace(/{{resetLink}}/g, resetLink);
    htmlContent = htmlContent.replace(/{{env.mailer.time}}/g, env.mailer.time);
    htmlContent = htmlContent.replace(
      /{{year}}/g,
      new Date().getFullYear().toString(),
    );

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

      await this.revokeAllUserTokens(user.user_id);
    } catch (error) {
      return false;
    }
  }

  async verifyEmail(user_id: number, email: string): Promise<boolean> {
    const user = await this.accountUtil.findByUserID(user_id);
    if (!user) return null;

    const existedBind = await this.accountUtil.findByUsernameOrEmail(
      null,
      email,
    );
    if (existedBind) return false;

    const payload = { user_id, email };
    const token = this.jwtService.sign(payload, { expiresIn: env.mailer.time });

    const verifyLink = `${env.fe}/verify?token=${token}`;
    const templatePath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'src',
      'static',
      'verify-mail.html',
    );
    const htmlTemplate = await fsPromises.readFile(templatePath, 'utf-8');
    let htmlContent = htmlTemplate.replace(/{{verifyLink}}/g, verifyLink);
    htmlContent = htmlContent.replace(/{{env.mailer.time}}/g, env.mailer.time);
    htmlContent = htmlContent.replace(
      /{{year}}/g,
      new Date().getFullYear().toString(),
    );

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

  async handleOAuthLogin(
    user: Account,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!user) {
      throw new UnauthorizedException(
        'Invalid user account provided for OAuth login.',
      );
    }

    const payload = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const tokens = await this.generateTokens(payload);
    const refreshTokenExpiry = this.getRefreshTokenExpiryDate();
    await this.storeRefreshToken(
      tokens.refreshToken,
      user.user_id,
      refreshTokenExpiry,
    );

    return tokens;
  }

  async generateTokens(payload: {
    user_id: number;
    username: string;
    email?: string;
    role: string;
  }) {
    const accessToken = this.jwtService.sign(
      {
        user_id: payload.user_id,
        username: payload.username,
        email: payload.email,
        role: payload.role,
      },
      {
        secret: env.jwt.secret,
        expiresIn: env.jwt.time,
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        user_id: payload.user_id,
      },
      {
        secret: env.jwt.refreshSecret,
        expiresIn: env.jwt.refreshTime,
      },
    );

    return { accessToken, refreshToken };
  }

  async storeRefreshToken(token: string, user_id: number, expiryDate: Date) {
    const salt = await bcrypt.genSalt();
    const hashedToken = await bcrypt.hash(token, salt);

    await this.refreshUtil.createToken(user_id, hashedToken, expiryDate);
  }

  getRefreshTokenExpiryDate(): Date {
    const expiresIn = env.jwt.refreshTime;
    const now = new Date();
    if (expiresIn.endsWith('d')) {
      now.setDate(now.getDate() + parseInt(expiresIn.slice(0, -1), 10));
    }
    return now;
  }

  async revokeAllUserTokens(user_id: number): Promise<void> {
    await this.refreshUtil.revokeAll(user_id);
  }
}

@Injectable()
export class AdminAuthenService {
  constructor(
    private readonly accountUtil: AccountUtil,
    private readonly redis: RedisCacheService,
  ) {}

  async getUser({ username, email }: AuthenDTO): Promise<Account> {
    let user: Account;
    if (username) {
      user = await this.accountUtil.findByUsername(username);
    }
    if (!user && email) {
      user = await this.accountUtil.findByEmail(email);
    }
    if (!user) return null;
    return user;
  }

  async banUser(
    user_id: number,
    role: string,
    reason: string,
  ): Promise<boolean> {
    const key = `${RedisEnum.ban}`;
    const cache = await this.redis.sgetall(key);

    if (cache.includes(user_id.toString())) return false;

    const user = await this.accountUtil.findByUserID(user_id);
    if (!user) return null;
    if (user.is_banned) return false;
    if (user.role == role)
      throw new ForbiddenException('Insufficient privileges');

    user.is_banned = true;
    user.ban_reason = reason;
    await this.accountUtil.save(user);
    await this.redis.sadd(key, user_id.toString());

    return true;
  }

  async unbanUser(user_id: number, role: string): Promise<boolean> {
    const key = `${RedisEnum.ban}`;
    const cache = await this.redis.sgetall(key);

    if (!cache.includes(user_id.toString())) return false;

    const user = await this.accountUtil.findByUserID(user_id);
    if (!user) return null;
    if (!user.is_banned) return false;
    if (user.role == role)
      throw new ForbiddenException('Insufficient privileges');

    user.is_banned = false;
    user.ban_reason = null;
    await this.accountUtil.save(user);
    await this.redis.srem(key, user_id.toString());
    return true;
  }

  async suspendUser(
    user_id: number,
    role: string,
    till: Date,
    reason: string,
  ): Promise<boolean> {
    const key = `${RedisEnum.suspend}`;
    const cache = await this.redis.sgetall(key);

    if (cache.includes(user_id.toString())) return false;

    const user = await this.accountUtil.findByUserID(user_id);
    if (!user) return null;
    if (user.is_suspended) return false;
    if (user.role == role)
      throw new ForbiddenException('Insufficient privileges');

    user.is_suspended = true;
    user.suspend_reason = reason;
    user.suspended_until = till;
    await this.accountUtil.save(user);
    const tillDate = new Date(till);
    await this.redis.sadd(
      key,
      user_id.toString(),
      Math.floor((tillDate.getTime() - Date.now()) / 1000),
    );
    return true;
  }

  async unsuspendUser(user_id: number, role: string): Promise<boolean> {
    const key = `${RedisEnum.suspend}`;
    const cache = await this.redis.sgetall(key);

    console.log(cache);

    if (!cache.includes(user_id.toString())) return false;

    const user = await this.accountUtil.findByUserID(user_id);
    if (!user) return null;
    if (!user.is_suspended) return false;
    if (user.role == role)
      throw new ForbiddenException('Insufficient privileges');

    user.is_suspended = false;
    user.suspend_reason = null;
    user.suspended_until = null;
    await this.accountUtil.save(user);
    await this.redis.srem(key, user_id.toString());
    return true;
  }

  async verifyUser(user_id: number, role: string): Promise<boolean> {
    const user = await this.accountUtil.findByUserID(user_id);
    if (!user) return null;
    if (user.is_verified) return false;
    if (user.role == role)
      throw new ForbiddenException('Insufficient privileges');

    user.is_verified = true;
    await this.accountUtil.save(user);
    return true;
  }

  async deleteUser(user_id: number, role: string): Promise<boolean> {
    const user = await this.accountUtil.findByUserID(user_id);
    if (!user) return null;
    if (user.role == role)
      throw new ForbiddenException('Insufficient privileges');

    await this.accountUtil.delete(user);
    return true;
  }
}

@Injectable()
export class SuperAdminAuthenService {
  constructor(private readonly accountUtil: AccountUtil) {}

  async createAdmin({ username, password }: AdminDTO): Promise<boolean> {
    const findUser = await this.accountUtil.findByUsername(username);
    if (findUser) return true;

    const ecryptPassword = await bcrypt.hash(password, 12);

    const user = this.accountUtil.create(username, ecryptPassword);
    user.role = 'admin';
    await this.accountUtil.save(user);
  }

  async changeRole(user_id: number, role: string): Promise<boolean> {
    const user = await this.accountUtil.findByUserID(user_id);
    if (!user) return null;
    if (user.role == 'superadmin')
      throw new ForbiddenException('Insufficient privileges');

    user.role = role;
    await this.accountUtil.save(user);
    return true;
  }
}
