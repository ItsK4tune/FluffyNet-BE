import { Member } from '../entities/member.entity';
import { UserProfileDto } from '../../profile/dtos/profile.dtos';
import { MinioClientService } from '../../minio-client/minio-client.service';

export class MemberResponseDto {
  member_id: number;
  user_id: number;
  room_id: number;
  nickname?: string;
  role: string;
  type: string;
  user: UserProfileDto;

  constructor(member: Member) {
    this.member_id = member.member_id;
    this.user_id = member.user_id;
    this.room_id = member.room_id;
    this.nickname = member.nickname;
    this.role = member.role;
    this.type = member.type;

    if (member.user) {
      this.user = UserProfileDto.fromEntity(member.user);
    }
  }

  static fromEntity(member: Member): MemberResponseDto {
    return new MemberResponseDto(member);
  }

  static async fromEntityWithProcessedAvatar(
    member: Member,
    minioClientService: MinioClientService,
  ): Promise<MemberResponseDto> {
    const dto = new MemberResponseDto(member);

    if (member.user) {
      dto.user = await UserProfileDto.fromEntityWithProcessedAvatar(
        member.user,
        minioClientService,
      );
    }

    return dto;
  }

  static fromEntities(members: Member[]): MemberResponseDto[] {
    return members.map((member) => MemberResponseDto.fromEntity(member));
  }

  static async fromEntitiesWithProcessedAvatars(
    members: Member[],
    minioClientService: MinioClientService,
  ): Promise<MemberResponseDto[]> {
    return Promise.all(
      members.map((member) =>
        MemberResponseDto.fromEntityWithProcessedAvatar(
          member,
          minioClientService,
        ),
      ),
    );
  }
}
