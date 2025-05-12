import { Profile } from '../entities/profile.entity';
import { MinioClientService } from '../../minio-client/minio-client.service';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import { env } from 'src/config';

export class UserProfileDto {
  user_id: number;
  username: string;
  avatar?: string;

  constructor(profile: Profile) {
    this.user_id = profile.user_id;
    this.username = profile.nickname || '';
    this.avatar = profile.avatar || null;
  }

  static fromEntity(profile: Profile): UserProfileDto {
    return new UserProfileDto(profile);
  }

  static async fromEntityWithProcessedAvatar(
    profile: Profile,
    minioClientService: MinioClientService,
  ): Promise<UserProfileDto> {
    const dto = new UserProfileDto(profile);

    if (profile.avatar) {
      if (profile.avatar.startsWith('https://lh3.googleusercontent.com/')) {
        dto.avatar = profile.avatar;
      } else {
        try {
          dto.avatar = await minioClientService.generatePresignedDownloadUrl(
            profile.avatar,
            convertToSeconds(env.minio.time),
          );
        } catch (error) {
          console.error(
            `Failed to get download URL for avatar ${profile.avatar}:`,
            error,
          );
          dto.avatar = null;
        }
      }
    } else {
      dto.avatar = null;
    }

    return dto;
  }
}
