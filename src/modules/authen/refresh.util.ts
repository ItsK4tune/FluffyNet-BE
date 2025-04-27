import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RefreshUtil {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  async createToken(user_id: number, hashedToken: string, expiryDate: Date) {
    const newRefreshToken = this.repo.create({
      user: { user_id: user_id },
      token: hashedToken,
      expires_at: expiryDate,
    });
    await this.repo.save(newRefreshToken);
  }

  async findToken(user_id: number) {
    return await this.repo.find({
      where: { user: { user_id: user_id }, is_revoked: false },
      relations: ['user'],
    });
  }

  async saveToken(token: RefreshToken) {
    await this.repo.save(token);
  }

  async revokeAll(user_id: number) {
    await this.repo.update(
      { user: { user_id: user_id } },
      { is_revoked: true },
    );
  }
}
