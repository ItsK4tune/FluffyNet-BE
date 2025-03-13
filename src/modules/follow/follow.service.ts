import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { FollowUtil } from 'src/modules/follow/follow.util';
import { UserProfileUtil } from 'src/modules/profile/user-profile.util';

@Injectable()
export class FollowService {
  constructor(
    private readonly followUtil: FollowUtil,
    private readonly userProfileUtil: UserProfileUtil,
  ) {}

  async getStatus(user_id: number, target_id: number) {
    if (user_id === target_id)
      throw new ConflictException('Cannot follow yourself');

    const user = this.userProfileUtil.getProfileByUserId(user_id);
    const target = this.userProfileUtil.getProfileByUserId(target_id);
    if (!user || !target) throw new BadRequestException('User not found');

    const log = await this.followUtil.findFollow(user_id, target_id);
    if (!log) return false;
    return true;
  }

  async followTarget(user_id: number, target_id: number) {
    const log = await this.getStatus(user_id, target_id);

    let status: boolean;
    if (log) status = await this.followUtil.deleteFollowing(user_id, target_id);
    else status = await this.followUtil.createFollow(user_id, target_id);

    return status;
  }

  async followingList(target_id: number) {
    const target = this.userProfileUtil.getProfileByUserId(target_id);
    if (!target) throw new BadRequestException('User not found');

    const list = this.followUtil.findFollowingList(target_id);

    return list;
  }

  async followerList(target_id: number) {
    const target = this.userProfileUtil.getProfileByUserId(target_id);
    if (!target) throw new BadRequestException('User not found');

    const list = this.followUtil.findFollowingList(target_id);

    return list;
  }
}
