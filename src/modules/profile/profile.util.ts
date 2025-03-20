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

  async getAllProfilesExcludingUser(user_id: number): Promise<Profile[]> {
    return await this.repo.createQueryBuilder("profile")
      .where("profile.user_id != :user_id", { user_id })
      .orderBy("RAND()")
      .limit(20)
      .getMany();
  }
}
