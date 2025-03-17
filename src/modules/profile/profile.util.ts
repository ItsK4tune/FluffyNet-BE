import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from 'src/modules/profile/entities/profile.entity';

@Injectable()
export class ProfileUtil {
  constructor(
    @InjectRepository(Profile)
    private readonly repo: Repository<Profile>,
  ) {}

  async getProfileByUserId(user_id: number) {
    return await this.repo.findOne({
      where: { user_id },
    });
  }

  async save(userProfile: Profile) {
    await this.repo.save(userProfile);
  }
}
