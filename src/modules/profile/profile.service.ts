import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ProfileUtil } from './profile.util';
import { ProfileDto } from './dtos/profile.dto';
import { RedisEnum } from 'src/utils/enums/enum';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import { env } from 'src/config';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { MinioClientService } from '../minio-client/minio-client.service';
import { Profile } from './entities/profile.entity';

@Injectable()
export class ProfileService {
  constructor(
    private readonly profileUtil: ProfileUtil,
    private readonly redisCacheService: RedisCacheService,
    private readonly minioClientService: MinioClientService,
  ) {}

  async getProfile(user_id: number): Promise<Profile | null> {
    const cacheKey = `${RedisEnum.profile}:${user_id}`;
    let profile: Profile | null = null;

    try {
      const cachedData = await this.redisCacheService.get(cacheKey);
      if (cachedData) {
        profile = JSON.parse(cachedData) as Profile;
      }
    } catch (cacheError) {
      throw new NotFoundException('Cache error');
    }

    profile = await this.profileUtil.getProfileByUserId(user_id);
    if (profile) {
      try {
        await this.redisCacheService.set(
          cacheKey,
          JSON.stringify(profile),
          convertToSeconds(env.redis.ttl),
        );
      } catch (cacheSetError) {
        throw new NotFoundException('Cache error');
      }
    }

    return await this.enrichProfileWithMediaUrls(profile);
  }

  async editProfileData(
    requestingUserId: number,
    profileUserIdToEdit: number,
    role: string,
    editData: ProfileDto,
  ): Promise<Profile> {
    if (role == 'user' && requestingUserId !== profileUserIdToEdit) {
      throw new ForbiddenException('You are not allowed to edit this profile.');
    }
    const cacheKey = `${RedisEnum.profile}:${profileUserIdToEdit}`;

    let userProfile =
      await this.profileUtil.getProfileByUserId(profileUserIdToEdit);
    if (!userProfile) {
      throw new NotFoundException('Profile not found to edit.');
    }

    Object.keys(editData).forEach((key) => {
      if (editData[key] !== undefined && key in userProfile) {
        userProfile[key] = editData[key];
      }
    });

    try {
      const updatedProfile = await this.profileUtil.save(userProfile);
      await this.redisCacheService.del(cacheKey);
      return await this.enrichProfileWithMediaUrls(updatedProfile);
    } catch (dbError) {
      throw new InternalServerErrorException('Failed to update profile data.');
    }
  }

  async updateAvatar(
    requestingUserId: number,
    profileUserIdToEdit: number,
    role: string,
    newAvatarObjectName: string | null,
  ): Promise<Profile> {
    if (role == 'user' && requestingUserId !== profileUserIdToEdit) {
      throw new ForbiddenException("You cannot update this user's avatar.");
    }

    const cacheKey = `${RedisEnum.profile}:${profileUserIdToEdit}`;

    let userProfile =
      await this.profileUtil.getProfileByUserId(profileUserIdToEdit);
    if (!userProfile) {
      throw new NotFoundException('Profile not found to update avatar.');
    }

    const oldAvatarObjectName = userProfile.avatar;
    if (oldAvatarObjectName === newAvatarObjectName) {
      return await this.enrichProfileWithMediaUrls(userProfile);
    }
    userProfile.avatar = newAvatarObjectName;

    try {
      const updatedProfile = await this.profileUtil.save(userProfile);

      if (oldAvatarObjectName && oldAvatarObjectName !== newAvatarObjectName) {
        await this.minioClientService.deleteFile(oldAvatarObjectName);
      }

      await this.redisCacheService.del(cacheKey);

      return await this.enrichProfileWithMediaUrls(updatedProfile);
    } catch (dbError) {
      throw new InternalServerErrorException(
        'Failed to update profile avatar.',
      );
    }
  }

  async updateBackground(
    requestingUserId: number,
    profileUserIdToEdit: number,
    role: string,
    newBackgroundObjectName: string | null,
  ): Promise<Profile> {
    if (role == 'user' && requestingUserId !== profileUserIdToEdit) {
      throw new ForbiddenException("You cannot update this user's background.");
    }

    const cacheKey = `${RedisEnum.profile}:${profileUserIdToEdit}`;

    let userProfile =
      await this.profileUtil.getProfileByUserId(profileUserIdToEdit);
    if (!userProfile) {
      throw new NotFoundException('Profile not found to update background.');
    }

    const oldBackgroundObjectName = userProfile.background;
    if (oldBackgroundObjectName === newBackgroundObjectName) {
      return await this.enrichProfileWithMediaUrls(userProfile);
    }
    userProfile.background = newBackgroundObjectName;

    try {
      const updatedProfile = await this.profileUtil.save(userProfile);

      if (
        oldBackgroundObjectName &&
        oldBackgroundObjectName !== newBackgroundObjectName
      ) {
        await this.minioClientService.deleteFile(oldBackgroundObjectName);
      }

      await this.redisCacheService.del(cacheKey);

      return await this.enrichProfileWithMediaUrls(updatedProfile);
    } catch (dbError) {
      throw new InternalServerErrorException(
        'Failed to update profile background.',
      );
    }
  }

  private async enrichProfileWithMediaUrls(
    profile: Profile | null,
  ): Promise<Profile | null> {
    if (!profile) return null;

    const enriched: Profile = { ...profile };

    if (profile.avatar) {
      if (profile.avatar.startsWith('https://lh3.googleusercontent.com/')) {
        enriched.avatar = profile.avatar;
      } else {
        try {
          enriched.avatar =
            await this.minioClientService.generatePresignedDownloadUrl(
              profile.avatar,
              convertToSeconds(env.minio.time),
            );
        } catch (error) {
          console.error(
            `Failed to get download URL for avatar ${profile.avatar}:`,
            error,
          );
          enriched.avatar = null;
        }
      }
    } else {
      enriched.avatar = null;
    }

    if (profile.background) {
      try {
        enriched.background =
          await this.minioClientService.generatePresignedDownloadUrl(
            profile.background,
            convertToSeconds(env.minio.time),
          );
      } catch (error) {
        console.error(
          `Failed to get download URL for background ${profile.background}:`,
          error,
        );
        enriched.background = null;
      }
    } else {
      enriched.background = null;
    }
    return enriched;
  }
}
