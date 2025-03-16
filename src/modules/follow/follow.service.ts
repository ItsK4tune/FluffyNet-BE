import {
  Injectable,
} from '@nestjs/common';
import { FollowUtil } from 'src/modules/follow/follow.util';
import { ProfileUtil } from 'src/modules/profile/profile.util';
import { Follow } from './entities/follow.entity';

@Injectable()
export class FollowService {
  constructor(
    private readonly followUtil: FollowUtil,
    private readonly profileUtil: ProfileUtil,
  ) {}

  async getStatus(user_id: number, target_id: number): Promise<number | Boolean> {
    if (user_id === target_id)
      return 409;

    const user = this.profileUtil.getProfileByUserId(user_id);
    const target = this.profileUtil.getProfileByUserId(target_id);
    
    if (!user || !target)
      return 400;

    const log = await this.followUtil.findFollow(user_id, target_id);
    if (!log) return false;
  }

  async followTarget(user_id: number, target_id: number): Promise<Boolean> {
    const log = await this.getStatus(user_id, target_id);

    let status: boolean;
    if (log) status = await this.followUtil.deleteFollowing(user_id, target_id);
    else status = await this.followUtil.createFollow(user_id, target_id);

    return status;
  }

  async followingList(target_id: number): Promise<Follow[]> {
    const target = this.profileUtil.getProfileByUserId(target_id);
    if (!target)  return null;

    const list = this.followUtil.findFollowingList(target_id);
    return list;
  }

  async followerList(target_id: number): Promise<Follow[]> {
    const target = this.profileUtil.getProfileByUserId(target_id);
    if (!target)  return null;

    const list = this.followUtil.findFollowingList(target_id);
    return list;
  }
}
