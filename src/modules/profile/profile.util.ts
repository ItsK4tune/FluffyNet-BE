import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from 'src/modules/profile/entities/profile.entity';
import { ILike } from 'typeorm';

@Injectable()
export class ProfileUtil {
  constructor(
    @InjectRepository(Profile)
    private readonly repo: Repository<Profile>,
  ) {}

  async getProfileByUserId(user_id: number) {
    return await this.repo.findOne({
      where: { user_id },
      relations: ['user'],
      select: {
        user_id: true,
        nickname: true,
        realname: true,
        bio: true,
        dob: true,
        gender: true,
        avatar: true,
        background: true,
        theme: true,
        phoneNumber: true,
        hobby: true,
        socialLink: true,
        created_at: true,
        user: {
          is_banned: true,
          ban_reason: true,
          is_suspended: true,
          suspended_until: true,
          suspend_reason: true,
          is_verified: true,
        },
      },
    });
  }

  async save(userProfile: Profile) {
    const { user, ...profileWithoutUser } = userProfile;
    await this.repo.save(profileWithoutUser);
    return await this.getProfileByUserId(userProfile.user_id);
  }

  async getAllProfilesExcludingUser(user_id: number): Promise<Profile[]> {
    return await this.repo
      .createQueryBuilder('profile')
      .where('profile.user_id != :user_id', { user_id })
      .orderBy('RAND()')
      .limit(20)
      .getMany();
  }
  async searchProfilesByRealName(keyword: string): Promise<Profile[]> {
    return await this.repo.find({
      where: { realname: ILike(`%${keyword}%`) },
      select: {
        user_id: true,
        realname: true,
        avatar: true,
        background: true,
      },
      take: 10,
    });
  }
  
}
