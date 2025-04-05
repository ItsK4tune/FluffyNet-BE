import { Injectable } from '@nestjs/common';
import { Account } from 'src/modules/authen/entities/account.entity';
import * as bcrypt from 'bcrypt';
import { Profile } from 'src/modules/profile/entities/profile.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AccountUtil {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
  ) {}

  async findByUserID(user_id: number) {
    return await this.repo.findOne({ where: { user_id } });
  }

  async findByUsername(username: string) {
    return await this.repo.findOne({ where: { username } });
  }

  async findByEmail(email: string) {
    return await this.repo.findOne({ where: { email } });
  }

  async findByUsernameOrEmail(username: string, email: string) {
    return await this.repo.findOne({
      where: [{ username }, { email }],
    });
  }

  async updatePassword(user: Account, newPassword: string) {
    user.password = await bcrypt.hash(newPassword, 12);
    await this.repo.save(user);
  }

  async updateVerifyEmail(userAccount: Account, email: string) {
    userAccount.email = email;
    await this.repo.save(userAccount);
  }

  create(username: string, ecryptPassword: string) {
    return this.repo.create({
      username,
      password: ecryptPassword,
      profile: new Profile(),
    });
  }

  async save(userAccount: Account) {
    await this.repo.save(userAccount);
  }

  async delete(userAccount: Account) {
    await this.repo.delete(userAccount);
  }
}
