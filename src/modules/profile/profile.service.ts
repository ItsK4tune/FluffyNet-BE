import { Injectable, NotFoundException } from "@nestjs/common";
import { ProfileUtil } from './profile.util';
import { ProfileDto } from './dtos/profile.dto';
import { MinioEnum, RedisEnum } from 'src/utils/enums/enum';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import { env } from 'src/config';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { MinioClientService } from '../minio-client/minio-client.service';
import { AccountUtil } from '../authen/account.util';

@Injectable()
export class ProfileService {
  constructor(
    private readonly profileUtil: ProfileUtil,
    private readonly accountUtil: AccountUtil,
    private readonly redisCacheService: RedisCacheService,
    private readonly minioClientService: MinioClientService,
  ) {}

  async getProfile(user_id: number) {
    const key = `${RedisEnum.profile}:${user_id}`;
    const cache = await this.redisCacheService.hgetall(key);

    if (cache && Object.keys(cache).length > 0) {
      return Object.values(cache).map((c) => JSON.parse(c));
    }

    const profile = await this.profileUtil.getProfileByUserId(user_id);
    if (!profile) throw new NotFoundException('Profile not found');

    if (profile.avatar) {
      profile.avatar = this.minioClientService.getFileUrl(profile.avatar);
    }

    if (profile.background) {
      profile.background = this.minioClientService.getFileUrl(
        profile.background,
      );
    }

    await this.redisCacheService.hsetall(key, profile);
    await this.redisCacheService.expire(key, convertToSeconds(env.redis.ttl));

    return profile;
  }

  async editProfile(
    user_id: number,
    editData: ProfileDto,
    files: { avatar?: any; background?: any },
  ) {
    const key = `${RedisEnum.profile}:${user_id}`;
    await this.redisCacheService.del(key);

    let userProfile = await this.profileUtil.getProfileByUserId(user_id);
    if (!userProfile) return false;

    if (files?.avatar?.[0]) {
      const uploadedAvatar = await this.minioClientService.upload(
        files.avatar[0],
        MinioEnum.avatars,
      );
      userProfile.avatar = uploadedAvatar;
    }
    if (files?.background?.[0]) {
      const uploadedBackground = await this.minioClientService.upload(
        files.background[0],
        MinioEnum.backgrounds,
      );
      userProfile.background = uploadedBackground;
    }

    const userAccount = await this.accountUtil.findByUserID(user_id);

    userProfile = {
      ...userProfile,
      ...editData,
      avatar: userProfile.avatar,
      background: userProfile.background,
    };
    await this.profileUtil.save(userProfile);
    await this.accountUtil.save(userAccount);
  }
}
